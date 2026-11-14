import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { hashPassword } from 'src/lib/middleware/teacher.js';
import {
  inspectMalwareAndAttacks,
  checkRateLimit,
  extractClientIp,
} from 'src/lib/security/shield.js';

export async function POST(request, context) {
  try {
    const attackCheck = inspectMalwareAndAttacks(request);
    if (attackCheck.blocked) {
      return NextResponse.json(
        { success: false, error: 'Suspicious request payload detected.' },
        { status: 403 }
      );
    }

    const clientIp = extractClientIp(request);
    const rateCheck = checkRateLimit(`teacher_verify_req:${clientIp}`, {
      windowMs: 60 * 1000,
      max: 30,
    });
    if (rateCheck.limited) {
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts. Please wait.' },
        { status: 429 }
      );
    }

    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required.' },
        { status: 400 }
      );
    }

    const cleanToken = String(token).trim();

    const teacherRes = await queryDb(
      `SELECT wt.id, wt.website_id, wt.name, wt.email, wt.number, COALESCE(wt.phone, wt.number) AS phone,
              wt.emergency_contact, wt.gender, wt.blood_group, wt.date_of_birth, wt.religion, wt.address,
              wt.permanent_address, wt.joining_date, wt.photo_url, wt.is_registered, wt.is_active,
              wt.verification_token, wt.verification_token_expires,
              wd.title AS designation_title
       FROM website_teachers wt
       LEFT JOIN website_designations wd ON wd.id = wt.designation_id
       WHERE wt.website_id = $1 AND wt.verification_token = $2
       LIMIT 1`,
      [website.id, cleanToken]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized verification token.' },
        { status: 404 }
      );
    }

    const teacher = teacherRes.rows[0];

    if (teacher.is_registered) {
      return NextResponse.json(
        { success: false, error: 'This teacher account has already been configured.' },
        { status: 400 }
      );
    }

    if (teacher.verification_token_expires && new Date(teacher.verification_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This verification link has expired. Please contact campus administration.' },
        { status: 410 }
      );
    }

    const teacherPayload = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      number: teacher.phone || teacher.number,
      phone: teacher.phone || teacher.number,
      emergencyContact: teacher.emergency_contact,
      designation: teacher.designation_title || 'Faculty Member',
      gender: teacher.gender,
      bloodGroup: teacher.blood_group,
      dateOfBirth: teacher.date_of_birth,
      religion: teacher.religion,
      address: teacher.address || '',
      permanentAddress: teacher.permanent_address || '',
      photoUrl: teacher.photo_url,
    };

    return NextResponse.json({
      success: true,
      teacher: teacherPayload,
      payload: { teacher: teacherPayload },
      paylod: { teacher: teacherPayload },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error while validating token.' },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const attackCheck = inspectMalwareAndAttacks(request);
    if (attackCheck.blocked) {
      return NextResponse.json(
        { success: false, error: 'Suspicious request payload detected.' },
        { status: 403 }
      );
    }

    const clientIp = extractClientIp(request);
    const rateCheck = checkRateLimit(`teacher_verify_put:${clientIp}`, {
      windowMs: 60 * 1000,
      max: 15,
    });
    if (rateCheck.limited) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { token, address, password } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required.' },
        { status: 400 }
      );
    }

    if (!password || String(password).length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters in length.' },
        { status: 400 }
      );
    }

    const cleanToken = String(token).trim();

    const teacherRes = await queryDb(
      `SELECT id, is_registered, verification_token_expires
       FROM website_teachers
       WHERE website_id = $1 AND verification_token = $2
       LIMIT 1`,
      [website.id, cleanToken]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized verification token.' },
        { status: 404 }
      );
    }

    const teacher = teacherRes.rows[0];

    if (teacher.is_registered) {
      return NextResponse.json(
        { success: false, error: 'This teacher account has already been configured.' },
        { status: 400 }
      );
    }

    if (teacher.verification_token_expires && new Date(teacher.verification_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Verification token has expired.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const cleanAddress = address ? String(address).trim() : null;

    await queryDb(
      `UPDATE website_teachers
       SET password = $1,
           address = COALESCE($2, address),
           is_registered = TRUE,
           is_active = TRUE,
           verification_token = NULL,
           verification_token_expires = NULL,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [hashedPassword, cleanAddress, teacher.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Teacher account setup completed successfully. You may now log in.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error while completing account setup.' },
      { status: 500 }
    );
  }
}
