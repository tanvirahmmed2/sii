import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
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
             s.id AS student_id, s.name AS student_name, s.registration_number, s.roll,
             s.blood_group, s.phone, s.image,
             c.name AS class_name, sec.name AS section_name
      FROM student_id_cards idc
      JOIN students s ON s.id = idc.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE LOWER(idc.id_card_no) LIKE $1
         OR LOWER(s.registration_number) LIKE $1
      ORDER BY idc.id DESC
      LIMIT 1
    `, [qTerm]);

    if (cardRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active Student ID Card found matching the provided identifier.'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Student ID Card verified successfully.',
      paylod: {
        idCard: cardRes.rows[0]
      }
    });

  } catch (error) {
    console.error('Error verifying Student ID Card:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
