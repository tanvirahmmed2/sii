import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 401 });
    }

    const studentId = decoded.id;

    // Fetch complete student profile
    const studentRes = await query(`
      SELECT s.id, s.name, s.registration_number, s.roll, s.date_of_birth, s.gender, s.class_id, s.section_id,
             s.father_name, s.mother_name, s.parents_info, s.image, s.blood_group, s.phone,
             c.name AS class_name, sec.name AS section_name
      FROM students s
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE s.id = $1
    `, [studentId]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Student profile not found'
      }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // Query student_id_cards table for this student
    const cardRes = await query(`
      SELECT * FROM student_id_cards
      WHERE student_id = $1 AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `, [studentId]);

    const idCard = cardRes.rows[0] || null;

    return NextResponse.json({
      success: true,
      paylod: {
        student,
        idCard,
        isProvided: !!idCard
      }
    });

  } catch (error) {
    console.error('Error fetching student ID card:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
