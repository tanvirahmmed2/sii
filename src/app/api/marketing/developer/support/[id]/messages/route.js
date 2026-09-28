import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';
import { sendEmail } from '@/lib/db/mailer';
import { SITE_NAME } from '@/lib/db/secret';

// SEND MESSAGE FROM DEVELOPER / STAFF TO CREATOR
export async function POST(request, context) {
  try {
    const auth = await hasModulePermission(request, 'support');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Permission support required to send messages.' },
        { status: auth.status || 403 }
      );
    }

    const params = await context?.params;
    const id = params?.id;
    const body = await request.json();

    const { message, status, imageUrl } = body;
    const cleanMessage = message?.trim();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ticket identifier is required.' }, { status: 400 });
    }

    if (!cleanMessage) {
      return NextResponse.json({ success: false, error: 'Reply message cannot be empty.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(id);
    const ticketRes = await queryDb(`
      SELECT * FROM support 
      WHERE ${isNumeric ? 'id = $1 OR ticket_number = $1' : 'ticket_number = $1'}
      LIMIT 1
    `, [id]);

    if (ticketRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Support ticket not found.' }, { status: 404 });
    }

    const ticket = ticketRes.rows[0];
    const dev = auth.staff;

    // Insert staff message
    const msgRes = await queryDb(`
      INSERT INTO support_messages (support_id, sender_type, sender_id, sender_name, message)
      VALUES ($1, 'DEVELOPER', $2, $3, $4)
      RETURNING *
    `, [ticket.id, dev.id, dev.name, cleanMessage]);

    const newMsg = msgRes.rows[0];

    // Optional image attachment
    if (imageUrl) {
      await queryDb(`
        INSERT INTO support_images (support_id, message_id, image_url)
        VALUES ($1, $2, $3)
      `, [ticket.id, newMsg.id, imageUrl]).catch(() => {});
    }

    // Determine target status
    const targetStatus = status || (ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status);

    // Update ticket
    const updateRes = await queryDb(`
      UPDATE support
      SET updated_at = CURRENT_TIMESTAMP,
          status = $1,
          assigned_developer_id = COALESCE(assigned_developer_id, $2)
      WHERE id = $3
      RETURNING *
    `, [targetStatus, dev.id, ticket.id]);

    // Send email notification to creator (fire-and-forget / non-blocking)
    if (ticket.requester_email) {
      const emailSubject = `[${ticket.ticket_number}] Update on: ${ticket.subject}`;
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px 20px; background: #f8fafc; color: #0f172a;">
          <div style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6366f1; margin-bottom: 8px;">Support Ticket #${ticket.ticket_number}</div>
            <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a;">${ticket.subject}</h2>
            
            <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">Hello <strong>${ticket.requester_name || 'Creator'}</strong>,</p>

            <div style="background: #f1f5f9; border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-line;">
              ${cleanMessage}
            </div>

            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              Replied by: <strong>${dev.name}</strong> (${dev.role || 'Staff'})<br />
              Status: <span style="font-weight: 700; color: #059669;">${targetStatus}</span>
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
            © ${new Date().getFullYear()} ${SITE_NAME || 'PortfolioBuilder'}. You can reply directly in your creator dashboard tickets tab.
          </div>
        </div>
      `;

      sendEmail({
        to: ticket.requester_email,
        subject: emailSubject,
        html: emailHtml,
        text: `Hello ${ticket.requester_name},\n\nNew reply from ${dev.name} on ticket ${ticket.ticket_number} (${ticket.subject}):\n\n${cleanMessage}\n\nStatus: ${targetStatus}`,
      }).catch((err) => {
        console.warn('Notice sending ticket email notification:', err.message);
      });
    }

    return NextResponse.json({
      success: true,
      message: {
        ...newMsg,
        developer_name: dev.name,
        developer_role: dev.role,
      },
      ticket: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error in developer ticket message POST API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
