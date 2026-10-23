import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { autoPublishDueResults } from 'src/app/api/[domain]/staff/panel/admissions/results/publish/route.js';

/**
 * GET /api/[domain]/admissions/results
 * Public lookup for published admission results (strictly shows only 'selected' candidates).
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    // Auto-publish any circular whose result_date has arrived
    await autoPublishDueResults(website.id);

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get('admission_id') || searchParams.get('circular_id');
    const query = searchParams.get('query')?.trim();

    let sql = `
      SELECT r.id, r.roll_no, r.applicant_name, r.merit_position, r.score,
             r.selection_status, r.selection_status AS status, r.merit_position AS merit_rank,
             r.remarks, r.published_at,
             a.id AS applicant_id, a.application_no, a.email, a.phone, a.enrolled_student_id,
             adm.id AS admission_id, adm.title AS circular_title, c.name AS class_name,
             ses.name AS session_name,
             inf.data AS info_data,
             grd.data AS guardian_data,
             addr.data AS address_data,
             COALESCE(inf.data->>'gender', 'Male') AS gender,
             inf.data->>'date_of_birth' AS date_of_birth,
             inf.data->>'blood_group' AS blood_group,
             inf.data->>'religion' AS religion,
             grd.data->>'father_name' AS father_name,
             grd.data->>'mother_name' AS mother_name,
             grd.data->>'guardian_name' AS guardian_name,
             grd.data->>'guardian_phone' AS guardian_phone,
             addr.data->>'present_address' AS present_address,
             addr.data->>'permanent_address' AS permanent_address,
             addr.data->>'district' AS district,
             img.photo_url
      FROM website_admission_results r
      JOIN website_admission_applicants a ON a.id = r.applicant_id
      JOIN website_admissions adm ON adm.id = r.admission_id
      LEFT JOIN website_classes c ON c.id = adm.class_id
      LEFT JOIN website_sessions ses ON ses.id = adm.session_id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      LEFT JOIN website_admission_applicant_guardians grd ON grd.applicant_id = a.id
      LEFT JOIN website_admission_applicant_addresses addr ON addr.applicant_id = a.id
      LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
      WHERE r.website_id = $1 AND r.is_published = TRUE AND r.selection_status = 'selected'
    `;

    const params = [website.id];
    let paramIndex = 2;

    if (admissionId) {
      sql += ` AND r.admission_id = $${paramIndex++}`;
      params.push(parseInt(admissionId, 10));
    }

    if (query) {
      sql += ` AND (
        a.application_no ILIKE $${paramIndex}
        OR r.roll_no ILIKE $${paramIndex}
        OR r.applicant_name ILIKE $${paramIndex}
      )`;
      params.push(`%${query}%`);
      paramIndex++;
    }

    sql += ` ORDER BY r.merit_position ASC NULLS LAST, r.score DESC LIMIT 100`;

    const res = await queryDb(sql, params);

    const enrichedResults = res.rows.map(row => ({
      ...row,
      ...(row.info_data || {}),
      ...(row.guardian_data || {}),
      ...(row.address_data || {})
    }));

    // Also fetch available circulars with published results for selection dropdown
    const circularsRes = await queryDb(`
      SELECT DISTINCT adm.id, adm.title
      FROM website_admissions adm
      JOIN website_admission_results r ON r.admission_id = adm.id
      WHERE adm.website_id = $1 AND r.is_published = TRUE
      ORDER BY adm.id DESC
    `, [website.id]);

    return NextResponse.json({
      success: true,
      results: enrichedResults,
      circulars: circularsRes.rows
    });
  } catch (error) {
    console.error('Error in GET /admissions/results:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
