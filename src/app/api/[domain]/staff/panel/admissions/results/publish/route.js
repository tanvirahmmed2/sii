import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';

/**
 * POST /api/[domain]/staff/panel/admissions/results/publish
 * Automatically publishes admission results strictly for candidates with status = 'selected'.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const admission_id = body.admission_id || body.circular_id;
    const { remarks_template = 'Selected in Official Merit Intake' } = body;

    if (!admission_id) {
      return NextResponse.json({ success: false, error: 'admission_id or circular_id is required.' }, { status: 400 });
    }

    const admId = parseInt(admission_id, 10);

    // Verify circular belongs to this website
    const admCheck = await queryDb(`
      SELECT id, title FROM website_admissions
      WHERE id = $1 AND website_id = $2
    `, [admId, auth.website.id]);

    if (admCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admission circular not found.' }, { status: 404 });
    }

    const staffId = auth.user?.id || null;

    // 1. Fetch only candidates with status = 'selected' or 'enrolled'
    const selectedRes = await queryDb(`
      SELECT id, application_no, roll_no, applicant_name, score, selection_notes
      FROM website_admission_applicants
      WHERE website_id = $1 AND admission_id = $2 AND status IN ('selected', 'enrolled')
      ORDER BY score DESC NULLS LAST, created_at ASC
    `, [auth.website.id, admId]);

    if (selectedRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No candidates with "selected" status found for this circular. Please evaluate and select candidates before publishing results.'
      }, { status: 400 });
    }

    // 2. Clear old unpublished/stale results for this circular
    await queryDb(`
      DELETE FROM website_admission_results
      WHERE website_id = $1 AND admission_id = $2
    `, [auth.website.id, admId]);

    // 3. Insert each selected candidate into website_admission_results with merit ranking
    let merit = 1;
    for (const cand of selectedRes.rows) {
      await queryDb(`
        INSERT INTO website_admission_results (
          website_id, admission_id, applicant_id, roll_no, applicant_name,
          merit_position, score, selection_status, remarks, is_published,
          published_by_staff_id, published_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, 'selected', $8, true,
          $9, CURRENT_TIMESTAMP
        )
      `, [
        auth.website.id,
        admId,
        cand.id,
        cand.roll_no || `ROL-${cand.id}`,
        cand.applicant_name,
        merit++,
        cand.score || 0.00,
        cand.selection_notes || remarks_template,
        staffId
      ]);
    }

    return NextResponse.json({
      success: true,
      message: `Results successfully published for ${selectedRes.rows.length} selected candidates of '${admCheck.rows[0].title}'.`,
      published_count: selectedRes.rows.length,
      circular: admCheck.rows[0]
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/admissions/results/publish:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/[domain]/staff/panel/admissions/results/publish?admission_id=...
 * Returns published results for staff inspection
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get('admission_id');

    let sql = `
      SELECT r.*, a.email, a.phone, a.application_no, adm.title AS circular_title
      FROM website_admission_results r
      JOIN website_admission_applicants a ON a.id = r.applicant_id
      JOIN website_admissions adm ON adm.id = r.admission_id
      WHERE r.website_id = $1
    `;
    const params = [auth.website.id];

    if (admissionId) {
      sql += ` AND r.admission_id = $2`;
      params.push(parseInt(admissionId, 10));
    }

    sql += ` ORDER BY r.merit_position ASC NULLS LAST, r.score DESC`;

    const res = await queryDb(sql, params);

    return NextResponse.json({
      success: true,
      results: res.rows
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/admissions/results/publish:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
