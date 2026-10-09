import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  comparePassword,
  generateToken,
  setStudentSessionCookie,
  createStudentLoginSession,
} from 'src/lib/middleware/students.js';

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json();
    const identifier = (body.registration_number || body.registration_no || body.email || '').trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Registration number / Email and password are required.' },
        { status: 400 }
      );
    }

    // Lookup student joining website_students with website_student_info
    let res = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active,
              i.name, i.email, i.password, i.is_registered, i.is_verified,
              i.verification_status, i.verification_notes, i.rejection_reason,
              c.name AS class_name,
              sec.name AS section_name,
              ses.name AS session_name
       FROM website_students s
       JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.website_id = $1 AND (
         LOWER(s.registration_no) = LOWER($2) OR
         LOWER(i.email) = LOWER($2) OR
         LOWER(s.student_unique_id) = LOWER($2)
       )
       LIMIT 1`,
      [website.id, identifier]
    );

    // Fallback lookup in legacy students table
    if (res.rows.length === 0) {
      res = await queryDb(
        `SELECT id, name, email, registration_number AS registration_no,
                password, is_active, is_registered,
                TRUE AS is_verified, 'verified' AS verification_status,
                website_id
         FROM students
         WHERE (website_id = $1 OR website_id IS NULL) AND (
           LOWER(registration_number) = LOWER($2) OR
           LOWER(email) = LOWER($2)
         )
         LIMIT 1`,
        [website.id, identifier]
      ).catch(() => ({ rows: [] }));
    }

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid registration credentials. Please check your details.' },
        { status: 401 }
      );
    }

    const student = res.rows[0];

    // Password comparison
    const passwordMatch = await comparePassword(password, student.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid password. Please verify and try again.' },
        { status: 401 }
      );
    }

    // Account status verifications
    if (!student.is_registered || student.verification_status === 'pending_setup') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your account setup is incomplete. Please complete your registration profile first.',
          verification_status: 'pending_setup',
        },
        { status: 403 }
      );
    }

    if (student.verification_status === 'submitted' || !student.is_verified) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your profile has been submitted and is currently awaiting staff verification. You will be able to log in once approved.',
          verification_status: 'submitted',
        },
        { status: 403 }
      );
    }

    if (student.verification_status === 'rejected') {
      return NextResponse.json(
        {
          success: false,
          error: `Your profile verification was rejected: ${student.rejection_reason || student.verification_notes || 'Please contact school administration.'}`,
          verification_status: 'rejected',
        },
        { status: 403 }
      );
    }

    if (!student.is_active) {
      return NextResponse.json(
        { success: false, error: 'Your student account is currently deactivated. Please contact administration.' },
        { status: 403 }
      );
    }

    // Issue JWT Token
    const token = generateToken({
      id: student.id,
      email: student.email,
      name: student.name,
      registration_no: student.registration_no,
      website_id: student.website_id,
      role: 'student',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully! Redirecting to student portal...',
      payload: {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          registration_no: student.registration_no,
          roll_no: student.roll_no,
          student_unique_id: student.student_unique_id,
          class_name: student.class_name,
          section_name: student.section_name,
          session_name: student.session_name,
          verification_status: student.verification_status,
          is_verified: student.is_verified,
        },
        token,
      },
    });

    // Set HTTP-Only Cookie
    await setStudentSessionCookie(response, token);

    // Record session tracking
    await createStudentLoginSession(student.id, student.website_id, token, request);

    return response;
  } catch (error) {
    console.error('Error in student login:', error);
    return NextResponse.json({ success: false, error: 'Internal server error during authentication.' }, { status: 500 });
  }
}
