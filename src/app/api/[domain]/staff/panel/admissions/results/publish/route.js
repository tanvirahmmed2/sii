import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';

/**
 * Helper to auto-publish results for any circular whose result_date has arrived
 */
export async function autoPublishDueResults(websiteId) {
  try {
    const dueRes = await queryDb(`
      SELECT a.id, a.title 
      FROM website_admissions a
      WHERE a.website_id = $1 
        AND a.result_date IS NOT NULL 
        AND a.result_date <= CURRENT_DATE
        AND a.id NOT IN (SELECT DISTINCT admission_id FROM website_admission_results WHERE website_id = $1)
    `, [websiteId]);

    for (const circ of dueRes.rows) {
      // 1. Fetch candidates with status = 'selected' or 'accepted'
      const selRes = await queryDb(`
        SELECT id, application_no, roll_no, applicant_name, score, selection_notes
        FROM website_admission_applicants
        WHERE website_id = $1 AND admission_id = $2 AND status IN ('selected', 'accepted')
        ORDER BY score DESC NULLS LAST, created_at ASC
      `, [websiteId, circ.id]);

      let merit = 1;
      for (const cand of selRes.rows) {
        await queryDb(`
          INSERT INTO website_admission_results (
            website_id, admission_id, applicant_id, roll_no, applicant_name,
            merit_position, score, selection_status, remarks, is_published, published_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, 'selected', $8, true, CURRENT_TIMESTAMP
          )
          ON CONFLICT (admission_id, applicant_id) DO NOTHING
        `, [
          websiteId,
          circ.id,
          cand.id,
          cand.roll_no || `ROL-${cand.id}`,
          cand.applicant_name,
          merit++,
          cand.score || 0.00,
          cand.selection_notes || 'Selected in Official Merit Intake'
        ]);
      }

      // 2. Delete rejected students per specification
      await queryDb(`
        DELETE FROM website_admission_applicants
        WHERE website_id = $1 AND admission_id = $2 AND status = 'rejected'
      `, [websiteId, circ.id]);
    }
  } catch (err) {
    console.error('Error auto-publishing due results:', err);
  }
}

/**
 * POST /api/[domain]/staff/panel/admissions/results/publish
 * Publishes admission results for accepted/selected students and deletes rejected students.
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

    // 1. Fetch only candidates with status = 'selected' or 'accepted'
    const selectedRes = await queryDb(`
      SELECT id, application_no, roll_no, applicant_name, score, selection_notes
      FROM website_admission_applicants
      WHERE website_id = $1 AND admission_id = $2 AND status IN ('selected', 'accepted', 'enrolled')
      ORDER BY score DESC NULLS LAST, created_at ASC
    `, [auth.website.id, admId]);

    if (selectedRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No accepted candidates found for this circular. Please accept or select candidates before publishing results.'
      }, { status: 400 });
    }

    // 2. Clear old unpublished/stale results for this circular
    await queryDb(`
      DELETE FROM website_admission_results
      WHERE website_id = $1 AND admission_id = $2
    `, [auth.website.id, admId]);

    // 3. Insert each selected/accepted candidate into website_admission_results with merit ranking
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

    // 4. Delete the rejected students as instructed
    const delRes = await queryDb(`
      DELETE FROM website_admission_applicants
      WHERE website_id = $1 AND admission_id = $2 AND status = 'rejected'
      RETURNING id
    `, [auth.website.id, admId]);

    return NextResponse.json({
      success: true,
      message: `Results published for ${selectedRes.rows.length} accepted students. ${delRes.rowCount} rejected applicants were removed.`,
      published_count: selectedRes.rows.length,
      deleted_rejected_count: delRes.rowCount,
      circular: admCheck.rows[0]
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/admissions/results/publish:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/[domain]/staff/panel/admissions/results/publish?admission_id=...
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    // Trigger auto-publish for any circulars whose result_date has arrived
    await autoPublishDueResults(auth.website.id);

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
