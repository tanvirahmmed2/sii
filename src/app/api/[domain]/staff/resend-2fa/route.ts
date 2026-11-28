import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { sendEmail, buildStyledEmail } from 'src/lib/database/mailer';
import { getClientIp, inspectMalwareAndAttacks, checkRateLimit, checkOtpDispatchRateLimit, recordOtpDispatch, generateSecureOtp, } from 'src/lib/security/shield';
export async function POST(request: any, context: any) {
    try {
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        const body = await request.json().catch(() => ({}));
        const attackInspection = await inspectMalwareAndAttacks(request, body);
        if (attackInspection.isBlocked) {
            return NextResponse.json({ success: false, error: attackInspection.error }, { status: attackInspection.status || 403 });
        }
        const ip = getClientIp(request);
        const raw = String(body.identifier || body.email || body.phone || body.number || '').trim();
        if (!raw) {
            return NextResponse.json({ success: false, error: 'Staff email or phone number is required.' }, { status: 400 });
        }
        const cleanEmail = raw.toLowerCase();
        const phoneDigits = raw.replace(/\D/g, '');
        const rateCheck = await checkRateLimit({
            ip,
            identifier: cleanEmail || raw,
            action: 'staff_resend_2fa',
            maxAttempts: 5,
            windowSeconds: 600,
            blockDurationSeconds: 900,
        });
        if (!rateCheck.isAllowed) {
            return NextResponse.json({ success: false, error: rateCheck.error }, { status: 429 });
        }
        const otpRate = await checkOtpDispatchRateLimit({
            identifier: cleanEmail || raw,
            phone: phoneDigits,
            email: cleanEmail,
            ip,
        });
        if (!otpRate.isAllowed) {
            return NextResponse.json({
                success: false,
                error: otpRate.error,
                waitSeconds: otpRate.waitSeconds,
                remainingMinutes: otpRate.remainingMinutes,
            }, { status: 429 });
        }
        const staffRes = await queryDb(`SELECT id, name, email, number, COALESCE(phone, number) AS phone,
              is_active, is_two_factor_enabled, two_factor_expires
       FROM website_staffs
       WHERE website_id = $1 
         AND (
           LOWER(email) = $2 
           OR number = $3 
           OR phone = $3 
           OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(phone, number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
         )
       LIMIT 1`, [website.id, cleanEmail, raw, phoneDigits]);
        if (staffRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Staff account not found.' }, { status: 404 });
        }
        const staff = staffRes.rows[0];
        if (!staff.is_active) {
            return NextResponse.json({ success: false, error: 'Staff account is deactivated.' }, { status: 403 });
        }
        if (!staff.email) {
            return NextResponse.json({ success: false, error: 'No email address is registered on this staff account.' }, { status: 400 });
        }
        const channel = 'email';
        const otpCode = generateSecureOtp(6);
        await queryDb(`UPDATE website_staffs
       SET two_factor_code = $1, two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [otpCode, staff.id]);
        await recordOtpDispatch({
            identifier: staff.email,
            phone: staff.phone || staff.number,
            email: staff.email,
            channel,
            purpose: 'staff_resend_2fa',
            ip,
        });
        try {
            const html = buildStyledEmail({
                title: 'Staff Security Verification',
                subtitle: `${website.name} — Staff Operations Portal`,
                institutionName: website.name,
                recipientName: staff.name,
                bodyParagraphs: [
                    'A new two-factor security code was requested for your staff portal login.',
                    'Please enter the 6-digit code below to authenticate. This code is valid for 10 minutes.',
                ],
                code: otpCode,
                codeLabel: 'New Security Code',
            });
            await sendEmail({
                to: staff.email,
                toName: staff.name,
                fromName: website.name || undefined,
                subject: `${website.name} - Resent Staff Security Code`,
                html,
                text: `Your new ${website.name} staff two-factor code is: ${otpCode}. Valid for 10 minutes.`,
                websiteId: website.id,
                recipientType: 'staff',
                recipientId: staff.id,
                purpose: 'staff_2fa',
                ip,
            });
        }
        catch (mailErr: any) {
            return NextResponse.json({ success: false, error: mailErr.message || 'Failed to dispatch security email.' }, { status: 500 });
        }
        return NextResponse.json({
            success: true,
            message: 'A new security code has been sent to your email address.',
            channel,
            hasPhone: Boolean(staff.phone || staff.number),
            hasEmail: Boolean(staff.email),
        });
    }
    catch (error: any) {
        console.error('Error in resend-2fa:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error while resending 2FA code.' }, { status: 500 });
    }
}
