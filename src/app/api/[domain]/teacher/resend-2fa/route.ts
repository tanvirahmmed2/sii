import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { sendEmail, buildStyledEmail } from 'src/lib/database/mailer';
import { inspectMalwareAndAttacks, checkRateLimit, checkOtpDispatchRateLimit, recordOtpDispatch, generateSecureOtp, extractClientIp, } from 'src/lib/security/shield';
export async function POST(request: any, context: any) {
    try {
        const attackCheck = await inspectMalwareAndAttacks(request);
        if (attackCheck.blocked) {
            return NextResponse.json({ success: false, error: 'Suspicious request payload detected.' }, { status: 403 });
        }
        const clientIp = extractClientIp(request);
        const rateCheck = await checkRateLimit(`teacher_resend_2fa:${clientIp}`, {
            windowMs: 60 * 1000,
            max: 10,
        });
        if (rateCheck.limited) {
            return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 });
        }
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        const body = await request.json().catch(() => ({}));
        const identifier = body.identifier || body.email || body.phone || body.number;
        if (!identifier) {
            return NextResponse.json({ success: false, error: 'Teacher email or phone number is required.' }, { status: 400 });
        }
        const cleanId = String(identifier).trim();
        const cleanEmail = cleanId.toLowerCase();
        const raw = cleanId;
        const digits = raw.replace(/\D/g, '');
        const teacherRes = await queryDb(`SELECT wt.id, wt.name, wt.email, wt.number, COALESCE(wt.phone, wt.number) AS phone,
              wt.is_active, wt.is_registered, wt.two_factor_expires
       FROM website_teachers wt
       WHERE wt.website_id = $1 AND (
         LOWER(wt.email) = $2
         OR wt.number = $3
         OR wt.phone = $3
         OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(wt.phone, wt.number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
       )
       LIMIT 1`, [website.id, cleanEmail, raw, digits]);
        if (teacherRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Teacher account not found.' }, { status: 404 });
        }
        const teacher = teacherRes.rows[0];
        if (!teacher.is_active || !teacher.is_registered) {
            return NextResponse.json({ success: false, error: 'Account is inactive or pending registration verification.' }, { status: 403 });
        }
        if (!teacher.email) {
            return NextResponse.json({ success: false, error: 'No email address registered on teacher profile.' }, { status: 400 });
        }
        const targetPhone = teacher.phone || teacher.number;
        const selectedChannel = 'email';
        const dispatchLimitCheck = await checkOtpDispatchRateLimit({
            identifier: teacher.email,
            phone: targetPhone,
            email: teacher.email,
            ip: clientIp,
        });
        if (!dispatchLimitCheck.isAllowed) {
            return NextResponse.json({ success: false, error: dispatchLimitCheck.error }, { status: 429 });
        }
        const secureOtp = generateSecureOtp(6);
        await queryDb(`UPDATE website_teachers
       SET two_factor_code = $1, 
           two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [secureOtp, teacher.id]);
        await recordOtpDispatch({
            identifier: teacher.email,
            phone: targetPhone,
            email: teacher.email,
            channel: selectedChannel,
            purpose: 'teacher_2fa',
            ip: clientIp,
        });
        const institutionName = website.name || 'Institution Teacher Portal';
        try {
            const html = buildStyledEmail({
                title: 'Teacher Security Verification',
                subtitle: `${institutionName} — Faculty Operations Portal`,
                institutionName,
                recipientName: teacher.name,
                bodyParagraphs: [
                    'A new two-factor authentication code was requested for your teacher account.',
                    'Please use the verification code below to complete your authentication. This security code will expire in 10 minutes.',
                ],
                code: secureOtp,
                codeLabel: 'Two-Factor Authentication Code',
            });
            await sendEmail({
                to: teacher.email,
                toName: teacher.name,
                fromName: institutionName,
                subject: `${institutionName} - New Teacher Verification Passcode`,
                html,
                text: `Your new ${institutionName} teacher verification passcode is: ${secureOtp}. Valid for 10 minutes.`,
                websiteId: website.id,
                recipientType: 'teacher',
                recipientId: teacher.id,
                purpose: 'teacher_2fa',
                ip: clientIp,
            });
        }
        catch (mailErr: any) {
            return NextResponse.json({ success: false, error: mailErr.message || 'Failed to dispatch email code.' }, { status: 500 });
        }
        return NextResponse.json({
            success: true,
            message: 'New verification code dispatched to your registered email address.',
            channel: selectedChannel,
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal server error dispatching verification code.' }, { status: 500 });
    }
}
