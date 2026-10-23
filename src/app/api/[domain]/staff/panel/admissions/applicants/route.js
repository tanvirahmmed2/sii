import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';
import { autoPublishDueResults } from '../results/publish/route.js';

/**
 * GET /api/[domain]/staff/panel/admissions/applicants
 * Fetches applicants with full candidate details, fees, previous background, and media.
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
    const sortBy = searchParams.get('sort_by') || 'created_at'; // 'created_at' | 'merit' | 'score'

    let sql = `
      SELECT a.*,
             adm.title AS circular_title,
             adm.selection_method,
             adm.capacity AS circular_capacity,
             c.name AS class_name,
             c.max_seats AS class_max_seats,
             ses.name AS session_name,
             dept.name AS department_name,
             COALESCE(p.payment_status, 'unpaid') AS payment_status,
             COALESCE(p.amount, af.amount, 0.00) AS fee_amount,
             COALESCE(p.currency, af.currency, 'BDT') AS fee_currency,
             p.transaction_id, p.paid_date, p.gateway_code, p.invoice_no,
             img.photo_url,
             img.signature_url,
             inf.data AS info_data,
             grd.data AS guardian_data,
             addr.data AS address_data,
             grd.data->>'father_name' AS father_name,
             grd.data->>'father_phone' AS father_phone,
             grd.data->>'mother_name' AS mother_name,
             grd.data->>'guardian_name' AS guardian_name,
             grd.data->>'guardian_phone' AS guardian_phone,
             addr.data->>'present_address' AS present_address,
             addr.data->>'permanent_address' AS permanent_address,
             a.created_at AS submitted_at
      FROM website_admission_applicants a
      JOIN website_admissions adm ON adm.id = a.admission_id
      LEFT JOIN website_classes c ON c.id = adm.class_id
      LEFT JOIN website_sessions ses ON ses.id = adm.session_id
      LEFT JOIN website_departments dept ON dept.id = adm.department_id
      LEFT JOIN website_admission_fees af ON af.admission_id = adm.id AND af.status = 'active'
      LEFT JOIN website_admission_fee_payments p ON p.applicant_id = a.id
      LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      LEFT JOIN website_admission_applicant_guardians grd ON grd.applicant_id = a.id
      LEFT JOIN website_admission_applicant_addresses addr ON addr.applicant_id = a.id
      WHERE a.website_id = $1
    `;

    const params = [auth.website.id];
    let paramIndex = 2;

    const scope = searchParams.get('scope'); // 'applicants' | 'spam' | 'incomplete' | 'completed' | 'all_raw'

    if (admissionId) {
      sql += ` AND a.admission_id = $${paramIndex++}`;
      params.push(parseInt(admissionId, 10));
    }

    if (status === 'unpaid' || scope === 'spam' || scope === 'unpaid') {
      sql += ` AND a.status = 'unpaid'`;
    } else if (status === 'incomplete' || scope === 'incomplete') {
      sql += ` AND a.status = 'incomplete'`;
    } else if (status === 'completed' || scope === 'completed') {
      sql += ` AND a.status = 'completed'`;
    } else if (status === 'selected') {
      sql += ` AND a.status IN ('selected', 'accepted')`;
    } else if (status === 'rejected') {
      sql += ` AND a.status = 'rejected'`;
    } else if (status === 'enrolled') {
      sql += ` AND a.status = 'enrolled'`;
    } else if (status === 'paid') {
      sql += ` AND a.status = 'paid'`;
    } else if (status && status !== 'all') {
      sql += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    } else if (scope !== 'all_raw') {
      // Default for /staff-panel/admission-applicants (all / omitted):
      // STRICT RULE: exclude 'incomplete' and 'unpaid' so they only appear in their dedicated desks!
      sql += ` AND a.status NOT IN ('incomplete', 'unpaid')`;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      sql += ` AND COALESCE(p.payment_status, 'unpaid') = $${paramIndex++}`;
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

    if (sortBy === 'merit') {
      sql += ` ORDER BY a.last_class_grade DESC NULLS LAST, a.score DESC NULLS LAST, a.created_at ASC`;
    } else if (sortBy === 'score') {
      sql += ` ORDER BY a.score DESC NULLS LAST, a.created_at ASC`;
    } else {
      sql += ` ORDER BY a.created_at DESC`;
    }

    const res = await queryDb(sql, params);

    // Compute status counts across this website/circular
    const statsRes = await queryDb(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'incomplete' THEN 1 END)::int AS incomplete,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END)::int AS unpaid,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int AS paid,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed,
        COUNT(CASE WHEN status IN ('selected', 'accepted') THEN 1 END)::int AS selected,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int AS rejected,
        COUNT(CASE WHEN status = 'enrolled' THEN 1 END)::int AS enrolled
      FROM website_admission_applicants
      WHERE website_id = $1 ${admissionId ? 'AND admission_id = $2' : ''}
    `, admissionId ? [auth.website.id, parseInt(admissionId, 10)] : [auth.website.id]);

    const stats = statsRes.rows[0] || {
      total: 0,
      incomplete: 0,
      unpaid: 0,
      paid: 0,
      pending: 0,
      completed: 0,
      selected: 0,
      rejected: 0,
      enrolled: 0
    };

    const completedEligibleTotal =
      (stats.completed || 0) +
      (stats.selected || 0) +
      (stats.rejected || 0) +
      (stats.enrolled || 0) +
      (stats.paid || 0);

    const enrichedApplicants = res.rows.map(row => ({
      ...row,
      ...(row.info_data || {}),
      ...(row.guardian_data || {}),
      ...(row.address_data || {})
    }));

    return NextResponse.json({
      success: true,
      applicants: enrichedApplicants,
      counts: stats,
      status_counts: {
        all: completedEligibleTotal,
        raw_total: stats.total || 0,
        incomplete: stats.incomplete || 0,
        unpaid: stats.unpaid || 0,
        paid: stats.paid || 0,
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
 * Allows staff to Select, Reject, issue admit cards, or update evaluation score/notes
 */
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      action,
      admission_id,
      id,
      status, // 'selected' | 'rejected' | 'pending' | 'completed' | 'paid' | 'unpaid'
      selection_notes,
      score,
      roll_no,
      merit_position
    } = body;

    // Handle bulk or single Admit Card Issuance
    if (action === 'issue_admit_cards' || body.issue_admit_cards) {
      const targetAdmId = admission_id || body.circular_id;
      if (!targetAdmId) {
        return NextResponse.json({ success: false, error: 'Admission circular ID is required to issue admit cards.' }, { status: 400 });
      }

      const issueRes = await queryDb(`
        UPDATE website_admission_applicants
        SET is_admit_card_issued = TRUE,
            admit_card_issued_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE website_id = $1 AND admission_id = $2 AND status IN ('completed', 'selected', 'enrolled')
        RETURNING id
      `, [auth.website.id, parseInt(targetAdmId, 10)]);

      return NextResponse.json({
        success: true,
        message: `Admit cards successfully issued to ${issueRes.rowCount} completed applicants.`,
        issued_count: issueRes.rowCount
      });
    }

    if (action === 'issue_single_admit_card') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
      }
      await queryDb(`
        UPDATE website_admission_applicants
        SET is_admit_card_issued = TRUE,
            admit_card_issued_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND website_id = $2
      `, [parseInt(id, 10), auth.website.id]);

      return NextResponse.json({
        success: true,
        message: 'Admit card issued to applicant.'
      });
    }

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

    const isSelected = status === 'selected' || status === 'accepted';
    const isRejected = status === 'rejected';

    const normalizedStatus = isSelected ? 'selected' : (status || null);

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
      normalizedStatus,
      selection_notes !== undefined ? selection_notes : null,
      score !== undefined && score !== null ? parseFloat(score) : null,
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

/**
 * DELETE /api/[domain]/staff/panel/admissions/applicants
 * Allows staff to permanently delete a candidate application record.
 */
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    const applicantId = parseInt(id, 10);

    // Cascade delete any child records cleanly
    await queryDb(`DELETE FROM website_admission_applicant_images WHERE applicant_id = $1`, [applicantId]);
    await queryDb(`DELETE FROM website_admission_applicant_info WHERE applicant_id = $1`, [applicantId]);
    await queryDb(`DELETE FROM website_admission_exam_marks WHERE applicant_id = $1`, [applicantId]);
    await queryDb(`DELETE FROM website_admission_results WHERE applicant_id = $1`, [applicantId]);
    await queryDb(`DELETE FROM website_admission_fee_payments WHERE applicant_id = $1`, [applicantId]);
    await queryDb(`
      DELETE FROM website_admission_applicants
      WHERE id = $1 AND website_id = $2
    `, [applicantId, auth.website.id]);

    return NextResponse.json({
      success: true,
      message: 'Applicant record deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /staff/panel/admissions/applicants:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
