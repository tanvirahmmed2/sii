import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

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

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get('admission_id') || searchParams.get('circular_id');
    const query = searchParams.get('query')?.trim();

    let sql = `
      SELECT r.id, r.roll_no, r.applicant_name, r.merit_position, r.score,
             r.selection_status, r.selection_status AS status, r.merit_position AS merit_rank,
             r.remarks, r.published_at,
             a.application_no, adm.title AS circular_title, c.name AS class_name
      FROM website_admission_results r
      JOIN website_admission_applicants a ON a.id = r.applicant_id
      JOIN website_admissions adm ON adm.id = r.admission_id
      LEFT JOIN website_classes c ON c.id = adm.class_id
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

    // Also fetch available circulars with published results for selection dropdown
    const circularsRes = await queryDb(`
      SELECT DISTINCT adm.id, adm.title, adm.circular_number
      FROM website_admissions adm
      JOIN website_admission_results r ON r.admission_id = adm.id
      WHERE adm.website_id = $1 AND r.is_published = TRUE
      ORDER BY adm.id DESC
    `, [website.id]);

    return NextResponse.json({
      success: true,
      results: res.rows,
      circulars: circularsRes.rows
    });
  } catch (error) {
    console.error('Error in GET /admissions/results:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
