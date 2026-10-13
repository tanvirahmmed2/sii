import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';
import { autoPublishDueResults } from '../results/publish/route.js';

/**
 * GET /api/[domain]/staff/panel/admissions/applicants
 * Fetches applicants with advanced filters (status, circular, payment, search)
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    // Automatically check and publish any circulars whose result_date has arrived
    await autoPublishDueResults(auth.website.id);

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get('admission_id');
    const status = searchParams.get('status') || 'all';
    const paymentStatus = searchParams.get('payment_status') || 'all';
    const search = searchParams.get('search')?.trim();

    let sql = `
      SELECT a.*,
             adm.title AS circular_title, adm.circular_number,
             c.name AS class_name,
             ses.name AS session_name,
             dept.name AS department_name,
             inf.father_name, inf.father_phone, inf.mother_name, inf.mother_phone,
             inf.guardian_name, inf.guardian_phone, inf.guardian_relation,
             inf.present_address, inf.permanent_address,
             inf.previous_school, inf.previous_gpa,
             inf.photo_url, inf.signature_url, inf.submitted_at
      FROM website_admission_applicants a
      JOIN website_admissions adm ON adm.id = a.admission_id
      LEFT JOIN website_classes c ON c.id = adm.class_id
      LEFT JOIN website_sessions ses ON ses.id = adm.session_id
      LEFT JOIN website_departments dept ON dept.id = adm.department_id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      WHERE a.website_id = $1
    `;

    const params = [auth.website.id];
    let paramIndex = 2;

    if (admissionId) {
      sql += ` AND a.admission_id = $${paramIndex++}`;
      params.push(parseInt(admissionId, 10));
    }

    if (status && status !== 'all') {
      sql += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      sql += ` AND a.payment_status = $${paramIndex++}`;
      params.push(paymentStatus);
    }

    if (search) {
      sql += ` AND (
        a.applicant_name ILIKE $${paramIndex}
        OR a.application_no ILIKE $${paramIndex}
        OR a.email ILIKE $${paramIndex}
        OR a.phone ILIKE $${paramIndex}
        OR a.roll_no ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY a.created_at DESC`;

    const res = await queryDb(sql, params);

    // Compute status counts across this website/circular
    const statsRes = await queryDb(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed,
        COUNT(CASE WHEN status IN ('selected', 'accepted') THEN 1 END)::int AS selected,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int AS rejected,
        COUNT(CASE WHEN status = 'enrolled' THEN 1 END)::int AS enrolled
      FROM website_admission_applicants
      WHERE website_id = $1 ${admissionId ? 'AND admission_id = $2' : ''}
    `, admissionId ? [auth.website.id, parseInt(admissionId, 10)] : [auth.website.id]);

    const stats = statsRes.rows[0] || { total: 0, pending: 0, completed: 0, selected: 0, rejected: 0, enrolled: 0 };
    return NextResponse.json({
      success: true,
      applicants: res.rows,
      counts: stats,
      status_counts: {
        all: stats.total || 0,
        pending: stats.pending || 0,
        completed: stats.completed || 0,
        selected: stats.selected || 0,
        accepted: stats.selected || 0,
        rejected: stats.rejected || 0,
        enrolled: stats.enrolled || 0
      }
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/admissions/applicants:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/[domain]/staff/panel/admissions/applicants
 * Allows staff to Select, Reject, or update an applicant's evaluation score/notes
 */
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      status, // 'selected' | 'rejected' | 'pending'
      selection_notes,
      score,
      roll_no,
      merit_position
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    // Verify applicant belongs to this website
    const checkRes = await queryDb(`
      SELECT id, admission_id, applicant_name, email, status
      FROM website_admission_applicants
      WHERE id = $1 AND website_id = $2
    `, [id, auth.website.id]);

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const applicant = checkRes.rows[0];
    const staffId = auth.user?.id || null;

    const isSelected = status === 'selected';
    const isRejected = status === 'rejected';

    const updateRes = await queryDb(`
      UPDATE website_admission_applicants
      SET status = COALESCE($1, status),
          selection_notes = COALESCE($2, selection_notes),
          score = COALESCE($3, score),
          roll_no = COALESCE($4, roll_no),
          merit_position = COALESCE($5, merit_position),
          selected_at = CASE WHEN $1 = 'selected' THEN CURRENT_TIMESTAMP ELSE selected_at END,
          selected_by_staff_id = CASE WHEN $1 IN ('selected', 'rejected') THEN $6 ELSE selected_by_staff_id END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND website_id = $8
      RETURNING *
    `, [
      status || null,
      selection_notes !== undefined ? selection_notes : null,
      score !== undefined ? parseFloat(score) : null,
      roll_no ? roll_no.trim() : null,
      merit_position ? parseInt(merit_position, 10) : null,
      staffId,
      id,
      auth.website.id
    ]);

    const updated = updateRes.rows[0];

    // If candidate status is updated to 'selected', automatically sync into website_admission_results
    if (isSelected) {
      await queryDb(`
        INSERT INTO website_admission_results (
          website_id, admission_id, applicant_id, roll_no, applicant_name,
          score, merit_position, selection_status, remarks, is_published, published_by_staff_id
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, 'selected', $8, true, $9
        )
        ON CONFLICT (admission_id, applicant_id) DO UPDATE SET
          roll_no = EXCLUDED.roll_no,
          applicant_name = EXCLUDED.applicant_name,
          score = EXCLUDED.score,
          merit_position = EXCLUDED.merit_position,
          selection_status = 'selected',
          remarks = EXCLUDED.remarks,
          is_published = true,
          updated_at = CURRENT_TIMESTAMP
      `, [
        auth.website.id,
        applicant.admission_id,
        id,
        updated.roll_no || `ROL-${id}`,
        applicant.applicant_name,
        updated.score || 0.00,
        updated.merit_position || null,
        selection_notes || 'Selected for admission.',
        staffId
      ]);
    } else if (isRejected) {
      // If rejected, remove from published results
      await queryDb(`
        DELETE FROM website_admission_results
        WHERE website_id = $1 AND admission_id = $2 AND applicant_id = $3
      `, [auth.website.id, applicant.admission_id, id]);
    }

    return NextResponse.json({
      success: true,
      message: `Applicant '${applicant.applicant_name}' status updated to '${updated.status}'.`,
      applicant: updated
    });
  } catch (error) {
    console.error('Error in PUT /staff/panel/admissions/applicants:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
