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
      `SELECT s.id, s.website_id,
              COALESCE(s.registration_no, s.student_unique_id, i.data->>'registration_no', i.data->>'registration_number') AS registration_no,
              s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active,
              s.created_at, s.updated_at,
              COALESCE(s.name, i.data->>'name', 'Student') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              COALESCE(s.gender, i.data->>'gender') AS gender,
              COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
              COALESCE(s.date_of_birth, CASE WHEN i.data->>'date_of_birth' ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN (i.data->>'date_of_birth')::date ELSE NULL END) AS date_of_birth,
              COALESCE(s.religion, i.data->>'religion') AS religion,
              COALESCE(s.admission_date, CASE WHEN i.data->>'admission_date' ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN (i.data->>'admission_date')::date ELSE NULL END) AS admission_date,
              COALESCE(i.is_registered, s.is_registered) AS is_registered,
              s.is_verified,
              COALESCE(i.verification_status, s.verification_status) AS verification_status,
              i.data AS info_data,
              COALESCE(c.name, i.data->>'class_name', 'General Enrollment') AS class_name,
              c.code AS class_code,
              sec.name AS section_name,
              ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
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
      queryDb(`SELECT * FROM website_student_addresses WHERE student_id = $1 LIMIT 1`, [student.id]).catch(() => ({ rows: [] })),
      queryDb(`SELECT * FROM website_student_guardians WHERE student_id = $1 LIMIT 1`, [student.id]).catch(() => ({ rows: [] })),
      queryDb(`SELECT * FROM website_student_pictures WHERE student_id = $1 ORDER BY is_primary DESC, id DESC LIMIT 1`, [student.id]).catch(() => ({ rows: [] })),
      queryDb(`SELECT * FROM website_student_signatures WHERE student_id = $1 LIMIT 1`, [student.id]).catch(() => ({ rows: [] })),
    ]);

    const address = addrRes.rows[0] ? { ...addrRes.rows[0], ...(addrRes.rows[0].data || {}) } : null;
    const guardian = guardRes.rows[0] ? { ...guardRes.rows[0], ...(guardRes.rows[0].data || {}) } : null;
    const picture = picRes.rows[0] || null;
    const signature = sigRes.rows[0] || null;

    // Harmonize student fields with both modern and legacy portal keys
    const enrichedStudent = {
      ...student,
      registration_number: student.registration_no || student.student_unique_id || 'N/A',
      registration_no: student.registration_no || student.student_unique_id || 'N/A',
      class_name: student.class_name || 'General Enrollment',
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
      student: enrichedStudent,
      payload: responsePayload,
      paylod: responsePayload,
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export { PUT } from '../profile/route.js';
