import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { sendEmail } from 'src/lib/database/mailer';
import { SITE_NAME } from 'src/lib/database/secret';

function escapeHtml(text: string): string {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
export async function POST(request: any) {
    try {
        const auth = await hasModulePermission(request, 'contacts');
        if (!auth.success) {
            return NextResponse.json({
                success: false,
                error: auth.message || 'Access denied: Permission contacts required to reply.'
            }, { status: auth.status || 403 });
        }
        const body = await request.json();
        const id = body.id;
        const replyText = body.reply?.trim();
        if (!id) {
            return NextResponse.json({ success: false, error: 'Contact inquiry ID is required.' }, { status: 400 });
        }
        if (!replyText) {
            return NextResponse.json({ success: false, error: 'Reply message cannot be empty.' }, { status: 400 });
        }
        const contactRes = await queryDb('SELECT * FROM contacts WHERE id = $1 LIMIT 1', [id]);
        if (contactRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Contact inquiry not found.' }, { status: 404 });
        }
        const contact = contactRes.rows[0];
        if (String(contact.status || '').toLowerCase() === 'closed') {
            return NextResponse.json({ success: false, error: 'This contact inquiry is already replied and closed.' }, { status: 400 });
        }
        const dev = auth.user || auth.staff || {};
        const siteName = SITE_NAME || 'Disibin';
        const recipientName = String(contact.name || 'there').trim() || 'there';
        const emailSubject = 'Thank you for contacting us!';
        const replyParagraphs = replyText
            .split(/\r?\n\s*\r?\n/)
            .map((p: string) => p.trim())
            .filter(Boolean);
        const formattedReplyHtml = (replyParagraphs.length > 0 ? replyParagraphs : [replyText])
            .map((p: string) => {
                const linesHtml = p
                    .split(/\r?\n/)
                    .map((line: string) => escapeHtml(line))
                    .join('<br/>');
                return `<p style="margin: 0 0 14px 0;">${linesHtml}</p>`;
            })
            .join('');
        const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #1e293b; max-width: 600px;">
  <p style="margin: 0 0 16px 0;">Dear ${escapeHtml(recipientName)},</p>
  ${formattedReplyHtml}
  <p style="margin: 20px 0 0 0; color: #334155;">- ${escapeHtml(siteName)}</p>
</div>
        `.trim();
        const emailText = `Dear ${recipientName},\n\n${replyText}\n\n- ${siteName}`;
        try {
            await sendEmail({
                to: contact.email,
                toName: contact.name || null,
                subject: emailSubject,
                html: emailHtml,
                text: emailText,
                purpose: 'contact_reply',
            });
        }
        catch (mailErr: any) {
            console.error('Failed to send contact reply email via mailer:', mailErr);
            return NextResponse.json({
                success: false,
                error: `Email delivery failed: ${mailErr.message || 'Check mailer credentials'}`
            }, { status: 502 });
        }
        const updateRes = await queryDb(`UPDATE contacts
       SET admin_notes = $1,
           status = 'closed',
           assigned_developer_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *, admin_notes AS reply`, [replyText, dev.id || null, id]);
        const updated = updateRes.rows[0];
        return NextResponse.json({
            success: true,
            message: 'Reply sent successfully and inquiry closed.',
            record: {
                ...updated,
                reply: replyText,
                replied_by_name: dev.name,
                replied_by_email: dev.email,
                replied_by_role: dev.role,
            },
        });
    }
    catch (error: any) {
        console.error('Contact reply error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
