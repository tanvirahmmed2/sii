import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';
import { sendEmail } from '@/lib/db/mailer';
import { SITE_NAME } from '@/lib/db/secret';

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'contacts');
    if (!auth.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: auth.message || 'Access denied: Permission contacts required to reply.' 
        },
        { status: auth.status || 403 }
      );
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

    // Retrieve contact record
    const contactRes = await queryDb('SELECT * FROM contacts WHERE id = $1 LIMIT 1', [id]);
    if (contactRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Contact inquiry not found.' }, { status: 404 });
    }

    const contact = contactRes.rows[0];
    const dev = auth.staff;

    // Send email using mailer
    const emailSubject = `Re: ${contact.subject || 'Your Inquiry'} - ${SITE_NAME || 'PortfolioBuilder'}`;
    const formattedReplyHtml = replyText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #334155; font-size: 15px;">${p}</p>`)
      .join('');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #f8fafc; color: #0f172a;">
        <div style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px;">
            <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6366f1; background: #eef2ff; padding: 4px 10px; border-radius: 9999px; margin-bottom: 10px;">Official Response</span>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">${SITE_NAME || 'PortfolioBuilder'} Support Team</h2>
          </div>

          <!-- Greeting -->
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">Hello <strong>${contact.name || 'there'}</strong>,</p>

          <!-- Reply Body -->
          <div style="margin-bottom: 28px;">
            ${formattedReplyHtml}
          </div>

          <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b;">
            Best regards,<br />
            <strong style="color: #0f172a;">${dev.name || 'Support Team'}</strong><br />
            <span style="font-size: 12px; color: #94a3b8; text-transform: capitalize;">${dev.role || 'Support'} Team • ${SITE_NAME || 'PortfolioBuilder'}</span>
          </p>

          <!-- Original Message Box -->
          <div style="background: #f8fafc; border-left: 4px solid #cbd5e1; border-radius: 6px; padding: 14px 16px; margin-top: 24px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Your Original Inquiry:</div>
            <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 6px;">"${contact.subject}"</div>
            <div style="font-size: 13px; color: #475569; line-height: 1.5; white-space: pre-line;">${contact.message}</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
          This message was sent to ${contact.email} regarding your contact submission.<br />
          © ${new Date().getFullYear()} ${SITE_NAME || 'PortfolioBuilder'}. All rights reserved.
        </div>
      </div>
    `;

    try {
      await sendEmail({
        to: contact.email,
        subject: emailSubject,
        html: emailHtml,
        text: `Hello ${contact.name},\n\n${replyText}\n\nBest regards,\n${dev.name} (${dev.role})\n${SITE_NAME}\n\n--- Your Original Message ---\n${contact.message}`,
      });
    } catch (mailErr) {
      console.error('Failed to send contact reply email via mailer:', mailErr);
      return NextResponse.json(
        { 
          success: false, 
          error: `Email delivery failed: ${mailErr.message || 'Check mailer credentials'}` 
        }, 
        { status: 502 }
      );
    }

    // Update contact record in DB
    const updateRes = await queryDb(
      `UPDATE contacts
       SET reply = $1,
           status = 'REPLIED',
           replied_by_developer_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [replyText, dev.id, id]
    );

    const updated = updateRes.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully and inquiry marked as replied.',
      record: {
        ...updated,
        replied_by_name: dev.name,
        replied_by_email: dev.email,
        replied_by_role: dev.role,
      },
    });
  } catch (error) {
    console.error('Contact reply error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
