import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    // Fetch complete student record with joined academic and profile information
    const studentRes = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active,
              s.created_at, s.updated_at,
              i.name, i.email, i.number, i.gender, i.blood_group,
              i.date_of_birth, i.religion, i.admission_date,
              i.is_registered, i.is_verified, i.verification_status,
              c.name AS class_name, c.code AS class_code,
              sec.name AS section_name,
              ses.name AS session_name
       FROM website_students s
       JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }

    const student = studentRes.rows[0];

    const [addrRes, guardRes, picRes, sigRes] = await Promise.all([
      queryDb(`SELECT * FROM website_student_addresses WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_guardians WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_pictures WHERE student_id = $1 ORDER BY is_primary DESC, id DESC LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_signatures WHERE student_id = $1 LIMIT 1`, [student.id]),
    ]);

    const address = addrRes.rows[0] || null;
    const guardian = guardRes.rows[0] || null;
    const picture = picRes.rows[0] || null;
    const signature = sigRes.rows[0] || null;

    // Harmonize student fields with both modern and legacy portal keys
    const enrichedStudent = {
      ...student,
      registration_number: student.registration_no,
      roll: student.roll_no,
      phone: student.number,
      address: address?.present_address || '',
      present_address: address?.present_address || '',
      permanent_address: address?.permanent_address || '',
      father_name: guardian?.father_name || '',
      father_phone: guardian?.father_phone || '',
      mother_name: guardian?.mother_name || '',
      mother_phone: guardian?.mother_phone || '',
      photo_url: picture?.image_url || null,
      signature_url: signature?.signature_url || null,
    };

    const responsePayload = {
      student: enrichedStudent,
      address,
      guardian,
      picture,
      signature,
    };

    return NextResponse.json({
      success: true,
      payload: responsePayload,
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
