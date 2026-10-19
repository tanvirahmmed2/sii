import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';
import { sendWebsiteEmail, getWebsiteBrevoConfig } from 'src/lib/database/websiteBrevo.js';
import { buildStyledEmail } from 'src/lib/database/brevo.js';
import { ensureContactsTables, checkStaffContactsPermission } from 'src/lib/database/contactsDb.js';

async function verifyContactsStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, allowed: false };
  }

  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff credentials required.', status: 401, allowed: false };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403, allowed: false };
  }

  await ensureContactsTables();

  const canView = checkStaffContactsPermission(staffSession, 'view');
  const canReply = checkStaffContactsPermission(staffSession, 'create') || checkStaffContactsPermission(staffSession, 'edit');

  if (action === 'view' && !canView) {
    return {
      error: 'Forbidden: You do not have permission to view contact inquiries.',
      status: 403,
      allowed: false,
    };
  }

  if (action === 'create' && !canReply) {
    return {
      error: 'Forbidden: You do not have permission to send replies to contact inquiries. Communications or Website module access is required.',
      status: 403,
      allowed: false,
    };
  }

  return { website, staffSession, allowed: true, canReply, canView };
}

// GET: Fetch replies history for a contact
export async function GET(request, context) {
  try {
    const auth = await verifyContactsStaffAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website, canReply } = auth;
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contact_id');

    if (!contactId) {
      return NextResponse.json({ success: false, message: 'Contact ID is required.' }, { status: 400 });
    }

    const repliesRes = await queryDb(
      `SELECT id, contact_id, staff_id, staff_name, reply_subject, reply_body, sender_email, mailer_type, delivery_status, error_message, created_at
       FROM website_contact_replies
       WHERE contact_id = $1 AND website_id = $2
       ORDER BY created_at ASC`,
      [contactId, website.id]
    );

    const brevoConfig = await getWebsiteBrevoConfig(website.id);

    return NextResponse.json({
      success: true,
      replies: repliesRes.rows,
      canReply,
      mailerConfig: {
        configured: Boolean(brevoConfig.configured),
        isCustomMailer: Boolean(brevoConfig.isCustom),
        senderEmail: brevoConfig.senderEmail,
        senderName: brevoConfig.senderName,
        isActive: Boolean(brevoConfig.isActive),
      },
    });
  } catch (error) {
    console.error('Error fetching contact replies:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch reply history.' }, { status: 500 });
  }
}

// POST: Send an email reply and persist it
export async function POST(request, context) {
  try {
    const auth = await verifyContactsStaffAccess(request, context, 'create');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website, staffSession } = auth;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const contactId = body.contact_id;
    const replySubject = body.subject?.trim();
    const replyBody = body.message?.trim();

    if (!contactId || !replyBody) {
      return NextResponse.json({ success: false, message: 'Contact ID and reply message body are required.' }, { status: 400 });
    }

    // Fetch original contact inquiry
    const contactRes = await queryDb(
      `SELECT id, name, email, subject, message FROM website_contacts WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [contactId, website.id]
    );
    if (contactRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Contact inquiry not found.' }, { status: 404 });
    }
    const contact = contactRes.rows[0];

    const finalSubject = replySubject || `Re: ${contact.subject || 'Your Inquiry'}`;

    // Determine staff info
    const staffId = staffSession?.staff?.id || staffSession?.staff_id || null;
    const staffName = staffSession?.staff?.name || staffSession?.user?.name || 'Staff Desk';

    // Mailer configuration resolution: website mailer or main mailer fallback
    const brevoConfig = await getWebsiteBrevoConfig(website.id);
    let effectiveMailerType = brevoConfig.isCustom ? 'website' : 'main';
    let effectiveSenderEmail = brevoConfig.senderEmail || 'mailer@sii.edu';

    // Format HTML email content
    const htmlEmail = buildStyledEmail({
      title: finalSubject,
      previewText: replyBody.slice(0, 100),
      bodyHtml: `
        <p style="font-size: 14px; color: #0f172a; line-height: 1.6; margin-bottom: 16px;">
          Dear ${contact.name},
        </p>
        <div style="font-size: 14px; color: #1e293b; line-height: 1.7; margin-bottom: 24px; white-space: pre-wrap;">${replyBody}</div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b;">
          <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">Original Inquiry Details:</p>
          <p style="margin: 0 0 4px 0;"><strong>Subject:</strong> ${contact.subject || 'General Inquiry'}</p>
          <blockquote style="margin: 6px 0 0 0; padding-left: 12px; border-left: 2px solid #cbd5e1; font-style: italic; color: #64748b;">
            ${contact.message}
          </blockquote>
        </div>
      `,
    });

    let deliveryStatus = 'SENT';
    let errorMessage = null;

    try {
      const sendResult = await sendWebsiteEmail(website.id, {
        to: contact.email,
        toName: contact.name,
        subject: finalSubject,
        html: htmlEmail,
        text: replyBody,
      });

      if (sendResult?.mailerType) {
        effectiveMailerType = sendResult.mailerType;
      }
      if (sendResult?.senderEmail) {
        effectiveSenderEmail = sendResult.senderEmail;
      }
    } catch (mailErr) {
      console.warn('[ContactReply] Email dispatch notice:', mailErr.message);
      deliveryStatus = 'FAILED';
      errorMessage = mailErr.message;
    }

    // Persist reply to website_contact_replies matching website_tables.psql schema
    const insertReplyRes = await queryDb(
      `INSERT INTO website_contact_replies (
        website_id, contact_id, staff_id, staff_name, reply_subject, reply_body, 
        sender_email, mailer_type, delivery_status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        website.id,
        contact.id,
        staffId,
        staffName,
        finalSubject,
        replyBody,
        effectiveSenderEmail,
        effectiveMailerType,
        deliveryStatus,
        errorMessage,
      ]
    );

    // Update contact status to 'replied'
    await queryDb(
      `UPDATE website_contacts SET status = 'replied', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND website_id = $2`,
      [contact.id, website.id]
    );

    return NextResponse.json({
      success: true,
      message: deliveryStatus === 'SENT'
        ? `Reply dispatched successfully to ${contact.email} via ${effectiveMailerType === 'website' ? 'Website Custom Mailer' : 'Platform Mailer'}.`
        : `Reply recorded in system, but email dispatch failed (${errorMessage}).`,
      reply: insertReplyRes.rows[0],
      deliveryStatus,
      mailerType: effectiveMailerType,
    });
  } catch (error) {
    console.error('Error replying to contact inquiry:', error);
    return NextResponse.json({ success: false, message: 'Failed to process contact reply.' }, { status: 500 });
  }
}
