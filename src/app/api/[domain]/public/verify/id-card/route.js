import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q') || searchParams.get('id_card_no') || searchParams.get('reg_no') || '';

    if (!searchQuery.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Please enter an ID Card Number or Student Registration Number.'
      }, { status: 400 });
    }

    const qTerm = `%${searchQuery.trim().toLowerCase()}%`;

    const cardRes = await query(`
      SELECT idc.id, idc.id_card_no, idc.issue_date, idc.expiry_date, idc.status,
             s.id AS student_id, s.name AS student_name, s.registration_number, s.image,
             si.roll, si.blood_group, s.phone,
             c.name AS class_name, sec.name AS section_name
      FROM website_student_id_cards idc
      JOIN website_students s ON s.id = idc.student_id AND s.website_id = $1
      LEFT JOIN website_student_information si ON si.student_id = s.id AND si.website_id = $1
      LEFT JOIN website_classes c ON c.id = si.class_id AND c.website_id = $1
      LEFT JOIN website_sections sec ON sec.id = si.section_id AND sec.website_id = $1
      WHERE idc.website_id = $1
        AND (LOWER(idc.id_card_no) LIKE $2 OR LOWER(s.registration_number) LIKE $2)
      ORDER BY idc.id DESC
      LIMIT 1
    `, [website.id, qTerm]);

    if (cardRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active Student ID Card found matching the provided identifier.'
      }, { status: 404 });
    }

    const res_data = { idCard: cardRes.rows[0] };
    return NextResponse.json({
      success: true,
      message: 'Student ID Card verified successfully.',
      payload: res_data,
      paylod: res_data
    });

  } catch (error) {
    console.error('Error verifying Student ID Card:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
