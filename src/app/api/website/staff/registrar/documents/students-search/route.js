import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'active';
    const classId = searchParams.get('class_id') || '';

    let whereClause = '';
    const params = [];

    if (status === 'active') {
      whereClause = "WHERE (s.status = 'active' OR s.status IS NULL) AND s.is_active = TRUE";
    } else if (status === 'transferred') {
      whereClause = "WHERE s.status = 'transferred'";
    } else {
      whereClause = "WHERE 1=1";
    }

    if (classId) {
      params.push(classId);
      whereClause += ` AND s.class_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      whereClause += ` AND (LOWER(s.name) LIKE $${params.length} OR LOWER(s.registration_number) LIKE $${params.length} OR CAST(s.roll AS TEXT) LIKE $${params.length})`;
    }

    const studentsRes = await query(`
      SELECT s.id, s.name, s.email, s.phone, s.registration_number, s.roll, s.status, s.is_active,
             s.father_name, s.mother_name, s.parents_info, s.image, s.blood_group, s.date_of_birth,
             c.id AS class_id, c.name AS class_name, sec.id AS section_id, sec.name AS section_name,
             idc.id AS id_card_id, idc.id_card_no, idc.expiry_date, idc.issue_date AS id_card_issue_date
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN student_id_cards idc ON idc.student_id = s.id AND idc.status = 'active'
      ${whereClause}
      ORDER BY c.name ASC NULLS LAST, s.roll ASC NULLS LAST
      LIMIT 200
    `, params);

    // Fetch list of classes
    const classesRes = await query(`SELECT id, name FROM classes ORDER BY name ASC`);

    // Fetch list of exams for admit cards dropdown
    const examsRes = await query(`
      SELECT e.id, e.name, e.term, e.class_id, c.name AS class_name
      FROM exams e
      JOIN classes c ON c.id = e.class_id
      ORDER BY e.start_date DESC
    `);

    return NextResponse.json({
      success: true,
      paylod: {
        students: studentsRes.rows,
        classes: classesRes.rows,
        exams: examsRes.rows
      }
    });

  } catch (error) {
    console.error('Error fetching students for documents:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
