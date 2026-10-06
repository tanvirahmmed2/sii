import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { SITE_NAME } from 'src/lib/database/secret';

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
    const dev = auth.user || auth.staff || {};

    // Send email using mailer
    const emailSubject = `Re: ${contact.subject || 'Your Inquiry'} - ${SITE_NAME || 'Platform'}`;
    const formattedReplyHtml = replyText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #334155; font-size: 15px;">${p}</p>`)
      .join('');

    const emailHtml = buildStyledEmail({
      title: `${SITE_NAME || 'Support'} Team Response`,
      subtitle: `In response to: ${contact.subject}`,
      recipientName: contact.name || 'there',
      bodyParagraphs: [
        replyText,
      ],
      extraHtml: `
        <div style="margin-top: 18px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
          <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">Original Inquiry:</div>
          <div style="font-size: 12px; color: #334155; line-height: 1.5; white-space: pre-line;">${contact.message}</div>
        </div>
      `,
      footerNote: `Replied by ${dev.name || 'Support'} (${dev.role || 'Developer'}). If you have further questions, feel free to reply to this message.`,
    });

    try {
      await sendEmail({
        to: contact.email,
        subject: emailSubject,
        html: emailHtml,
        text: `Hello ${contact.name},\n\n${replyText}\n\nBest regards,\n${dev.name || 'Support'} (${dev.role || 'Developer'})\n${SITE_NAME || 'Platform'}\n\n--- Your Original Message ---\n${contact.message}`,
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
       SET admin_notes = $1,
           status = 'replied',
           assigned_developer_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *, admin_notes AS reply`,
      [replyText, dev.id || null, id]
    );

    const updated = updateRes.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully and inquiry marked as replied.',
      record: {
        ...updated,
        reply: replyText,
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
