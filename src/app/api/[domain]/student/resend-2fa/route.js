import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { sendSms } from 'src/lib/database/smsSender.js';
import {
  inspectMalwareAndAttacks,
  checkRateLimit,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
  generateSecureOtp,
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
    const rateCheck = checkRateLimit(`student_resend_2fa:${clientIp}`, {
      windowMs: 60 * 1000,
      max: 10,
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
    const identifier = body.identifier || body.registration_number || body.registration_no || body.email || body.phone || body.number;
    const requestedChannel = String(body.channel || 'email').toLowerCase();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Student identifier is required.' },
        { status: 400 }
      );
    }

    const cleanId = String(identifier).trim();
    const cleanLower = cleanId.toLowerCase();
    const raw = cleanId;
    const digits = raw.replace(/\D/g, '');

    const studentRes = await queryDb(
      `SELECT s.id, s.name, s.email, s.registration_no, s.is_active, s.two_factor_expires,
              COALESCE(s.phone, s.number) AS phone, s.number
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1 AND (
         LOWER(s.registration_no) = $2
         OR LOWER(COALESCE(s.email, i.data->>'email')) = $2
         OR LOWER(s.student_unique_id) = $2
         OR s.number = $3
         OR s.phone = $3
         OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(s.phone, s.number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
       )
       LIMIT 1`,
      [website.id, cleanLower, raw, digits]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student account not found.' },
        { status: 404 }
      );
    }

    const student = studentRes.rows[0];

    const targetPhone = student.phone || student.number;
    const selectedChannel = requestedChannel === 'sms' && targetPhone ? 'sms' : 'email';

    const dispatchLimitCheck = await checkOtpDispatchRateLimit({
      identifier: student.email || student.registration_no,
      phone: targetPhone,
      email: student.email,
      ip: clientIp,
    });

    if (!dispatchLimitCheck.isAllowed) {
      return NextResponse.json(
        { success: false, error: dispatchLimitCheck.error },
        { status: 429 }
      );
    }

    const secureOtp = generateSecureOtp(6);

    await queryDb(
      `UPDATE website_students
       SET two_factor_code = $1, 
           two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [secureOtp, student.id]
    );

    await recordOtpDispatch({
      identifier: student.email || student.registration_no,
      phone: targetPhone,
      email: student.email,
      channel: selectedChannel,
      purpose: 'student_2fa',
      ip: clientIp,
    });

    const institutionName = website.name || 'Institution Student Portal';

    if (selectedChannel === 'sms') {
      try {
        await sendSms({
          to: targetPhone,
          message: `Your ${institutionName} student 2FA security code is: ${secureOtp}. Valid for 10 minutes.`,
          purpose: '2fa',
          userId: student.id,
          userType: 'student',
          ip: clientIp,
          websiteId: website.id,
        });
      } catch (smsErr) {
        return NextResponse.json(
          { success: false, error: smsErr.message || 'Failed to dispatch SMS code.' },
          { status: 500 }
        );
      }
    } else {
      if (!student.email) {
        return NextResponse.json(
          { success: false, error: 'No email registered on student profile.' },
          { status: 400 }
        );
      }
      try {
        const html = buildStyledEmail({
          title: 'Student Security Verification',
          subtitle: `${institutionName} — Student Services Portal`,
          recipientName: student.name || 'Student',
          bodyParagraphs: [
            'A new two-factor authentication code was requested for your student account.',
            'Please use the code below to complete login. This code is valid for 10 minutes.',
          ],
          code: secureOtp,
          codeLabel: 'Two-Factor Security Code',
        });

        await sendEmail({
          to: student.email,
          toName: student.name || 'Student',
          subject: `${institutionName} - New Student Verification Passcode`,
          html,
          websiteId: website.id,
        });
      } catch (mailErr) {
        return NextResponse.json(
          { success: false, error: mailErr.message || 'Failed to dispatch email code.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `New verification code dispatched to your registered ${selectedChannel === 'sms' ? 'phone number via SMS' : 'email address'}.`,
      channel: selectedChannel,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error dispatching verification code.' },
      { status: 500 }
    );
  }
}

