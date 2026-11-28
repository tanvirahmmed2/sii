import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth';
import { sendEmail, buildStyledEmail } from 'src/lib/database/mailer';
import { buildTeacherVerificationUrl } from "../route";
export async function POST(request: any, context: any) {
    try {
        const auth = await verifyTeacherStaffAccess(request, context, 'edit');
        if (auth.error) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { website } = auth;
        const body = await request.json().catch(() => ({}));
        const teacherId = body.teacherId || body.teacher_id || body.id;
        const email = body.email?.trim()?.toLowerCase();
        if (!teacherId && !email) {
            return NextResponse.json({ success: false, error: 'Teacher ID or email is required to resend verification link.' }, { status: 400 });
        }
        let queryStr = `
      SELECT wt.id, wt.name, wt.email, COALESCE(wt.phone, wt.number) AS phone, wt.is_active, wt.is_registered,
             wd.title AS designation_title, dept.name AS department_name
      FROM website_teachers wt
      LEFT JOIN website_teacher_designation wd ON wd.id = wt.designation_id
      LEFT JOIN website_departments dept ON dept.id = wt.department_id
      WHERE wt.website_id = $1
    `;
        const queryParams = [website.id];
        if (teacherId) {
            queryStr += ` AND wt.id = $2`;
            queryParams.push(teacherId);
        }
        else {
            queryStr += ` AND LOWER(wt.email) = LOWER($2)`;
            queryParams.push(email);
        }
        const teacherRes = await queryDb(queryStr, queryParams);
        if (teacherRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Teacher not found in this institution.' }, { status: 404 });
        }
        const teacher = teacherRes.rows[0];
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await queryDb(`UPDATE website_teachers
       SET verification_token = $1,
           verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '7 days',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND website_id = $3`, [verificationToken, teacher.id, website.id]);
        const verificationUrl = buildTeacherVerificationUrl(website, verificationToken, request);
        let emailSent = false;
        let emailError = null;
        try {
            const emailHtml = buildStyledEmail({
                title: 'Teacher Account Verification',
                institutionName: website.name,
                bodyHtml: `
                  <p style="margin: 0 0 14px 0;">Dear ${teacher.name},</p>
                  <p style="margin: 0 0 14px 0;">A new verification link has been issued for your teacher account at ${website.name}.</p>
                  <p style="margin: 0;">Click the verification button below to confirm your account and configure your portal password.</p>
                `,
                actionUrl: verificationUrl,
                actionText: 'Verify Your Account',
                footerNote: 'This verification link is valid for 7 days.',
            });
            await sendEmail({
                to: teacher.email,
                toName: teacher.name,
                fromName: website.name || undefined,
                subject: `${website.name} - Verify Your Teacher Account`,
                html: emailHtml,
                text: `Dear ${teacher.name},\n\nA new verification link has been issued for your teacher account at ${website.name}.\n\nClick the link below to verify your account and configure your portal password:\n${verificationUrl}\n\nThis verification link is valid for 7 days.`,
                websiteId: website.id,
                recipientType: 'teacher',
                recipientId: teacher.id,
                purpose: 'teacher_verification',
            });
            emailSent = true;
        }
        catch (mailErr: any) {
            emailError = mailErr.message;
            console.warn('[Teacher Resend Verification] Email dispatch error:', mailErr.message);
        }
        return NextResponse.json({
            success: true,
            message: emailSent
                ? `Verification activation email successfully resent to ${teacher.email}.`
                : `New verification link generated for ${teacher.email}.`,
            verificationUrl,
            emailSent,
            emailError: emailSent ? null : emailError,
        });
    }
    catch (error: any) {
        console.error('Error resending teacher verification link:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to resend verification link.' }, { status: 500 });
    }
}
