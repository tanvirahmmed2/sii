import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { sendEmail, EmailAttachment } from 'src/lib/database/mailer';

const MAX_ATTACHMENTS = 5;
const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDescriptionHtml(description: string): string {
  const paragraphs = description
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const blocks = paragraphs.length > 0 ? paragraphs : [description];
  const inner = blocks
    .map((p) => {
      const lines = p
        .split(/\r?\n/)
        .map((line) => escapeHtml(line))
        .join('<br/>');
      return `<p style="margin: 0 0 14px 0;">${lines}</p>`;
    })
    .join('');
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #1e293b; max-width: 600px;">
  ${inner}
</div>
  `.trim();
}

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, ['custom-email', 'emails'], 'view');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Access denied' },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const downloadAttachment = searchParams.get('downloadAttachment');
    const emailId = searchParams.get('emailId');
    const indexStr = searchParams.get('index');

    if (downloadAttachment && emailId !== null && indexStr !== null) {
      const rowRes = await queryDb(
        `SELECT attachments FROM custom_emails WHERE id = $1 LIMIT 1`,
        [Number(emailId)]
      );
      if (rowRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Email record not found.' }, { status: 404 });
      }
      const list = Array.isArray(rowRes.rows[0].attachments) ? rowRes.rows[0].attachments : [];
      const item = list[Number(indexStr)];
      if (!item || !item.content) {
        return NextResponse.json({ success: false, error: 'Attachment not found.' }, { status: 404 });
      }
      const buffer = Buffer.from(String(item.content), 'base64');
      const safeName = String(item.name || 'attachment').replace(/["\r\n]/g, '_');
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': item.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${safeName}"`,
          'Content-Length': String(buffer.length),
        },
      });
    }

    const res = await queryDb(
      `SELECT id, to_email, subject, description, attachments, status, provider, message_id, failure_reason, created_at
       FROM custom_emails
       ORDER BY id DESC
       LIMIT 100`
    );

    const emails = (res.rows || []).map((row: any) => {
      const rawAtt = Array.isArray(row.attachments) ? row.attachments : [];
      return {
        id: row.id,
        to_email: row.to_email,
        subject: row.subject,
        description: row.description,
        status: row.status,
        provider: row.provider,
        message_id: row.message_id,
        failure_reason: row.failure_reason,
        created_at: row.created_at,
        attachments: rawAtt.map((att: any, idx: number) => ({
          index: idx,
          name: att?.name || `attachment-${idx + 1}`,
          type: att?.type || 'application/octet-stream',
          size: Number(att?.size || 0),
          hasContent: Boolean(att?.content),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      emails,
      canCreate: Boolean(auth.canCreate || auth.isOwner),
      canDelete: Boolean(auth.canDelete || auth.isOwner),
    });
  } catch (error: any) {
    console.error('Custom email GET error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load custom emails.' },
      { status: 500 }
    );
  }
}

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, ['custom-email', 'emails'], 'create');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Access denied: permission required to send custom emails.' },
        { status: auth.status || 403 }
      );
    }

    const contentType = String(request.headers?.get?.('content-type') || '').toLowerCase();
    let toRaw = '';
    let subject = '';
    let description = '';
    const storedAttachments: Array<{ name: string; type: string; size: number; content: string }> = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      toRaw = String(form.get('to') || '').trim();
      subject = String(form.get('subject') || '').trim();
      description = String(form.get('description') || '').trim();

      const files = [
        ...form.getAll('attachments'),
        ...form.getAll('attachment'),
      ].filter((f: any) => f && typeof f === 'object' && typeof f.arrayBuffer === 'function' && f.size > 0);

      if (files.length > MAX_ATTACHMENTS) {
        return NextResponse.json(
          { success: false, error: `Maximum ${MAX_ATTACHMENTS} attachments allowed per email.` },
          { status: 400 }
        );
      }

      let totalBytes = 0;
      for (const file of files as File[]) {
        totalBytes += Number(file.size || 0);
        if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
          return NextResponse.json(
            { success: false, error: 'Total attachment size cannot exceed 10 MB.' },
            { status: 400 }
          );
        }
        const arrayBuf = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        storedAttachments.push({
          name: String(file.name || 'attachment').slice(0, 255),
          type: String(file.type || 'application/octet-stream'),
          size: Number(file.size || 0),
          content: base64,
        });
      }
    } else {
      const body = await request.json().catch(() => ({}));
      toRaw = String(body.to || body.to_email || '').trim();
      subject = String(body.subject || '').trim();
      description = String(body.description || body.message || '').trim();
      const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];
      let totalBytes = 0;
      for (const item of rawAttachments.slice(0, MAX_ATTACHMENTS)) {
        if (!item?.name || !item?.content) continue;
        const rawContent = String(item.content).replace(/^data:[^;]+;base64,/, '');
        const approxSize = Number(item.size || Buffer.byteLength(rawContent, 'base64'));
        totalBytes += approxSize;
        if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
          return NextResponse.json(
            { success: false, error: 'Total attachment size cannot exceed 10 MB.' },
            { status: 400 }
          );
        }
        storedAttachments.push({
          name: String(item.name).slice(0, 255),
          type: String(item.type || 'application/octet-stream'),
          size: approxSize,
          content: rawContent,
        });
      }
    }

    const recipients = Array.from(
      new Set(
        toRaw
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'Recipient email (To) is required.' }, { status: 400 });
    }
    const invalidEmail = recipients.find((email) => !EMAIL_REGEX.test(email));
    if (invalidEmail) {
      return NextResponse.json({ success: false, error: `Invalid recipient email: ${invalidEmail}` }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, error: 'Subject is required.' }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ success: false, error: 'Description is required.' }, { status: 400 });
    }

    const emailHtml = formatDescriptionHtml(description);
    const mailerAttachments: EmailAttachment[] = storedAttachments.map((att) => ({
      name: att.name,
      content: att.content,
      type: att.type,
      size: att.size,
    }));

    const insertedRecords: any[] = [];
    const failedRecipients: string[] = [];

    for (const recipientEmail of recipients) {
      let sendStatus = 'Sent';
      let messageId: string | null = null;
      let failureReason: string | null = null;

      try {
        const result = await sendEmail({
          to: recipientEmail,
          subject,
          html: emailHtml,
          text: description,
          attachments: mailerAttachments,
          recipientType: 'custom',
          purpose: 'custom_email',
        });
        sendStatus = result?.simulated ? 'Simulated' : 'Sent';
        messageId = result?.id ? String(result.id) : null;
      } catch (err: any) {
        sendStatus = 'Failed';
        failureReason = err?.message || 'Brevo delivery failed.';
        failedRecipients.push(`${recipientEmail}: ${failureReason}`);
      }

      const saveRes = await queryDb(
        `INSERT INTO custom_emails (
           to_email, subject, description, attachments, status, provider, message_id, failure_reason
         ) VALUES ($1, $2, $3, $4::jsonb, $5, 'brevo', $6, $7)
         RETURNING id, to_email, subject, description, status, provider, message_id, failure_reason, created_at`,
        [
          recipientEmail,
          subject,
          description,
          JSON.stringify(storedAttachments),
          sendStatus,
          messageId,
          failureReason,
        ]
      );

      if (saveRes.rows[0]) {
        insertedRecords.push({
          ...saveRes.rows[0],
          attachments: storedAttachments.map((att, idx) => ({
            index: idx,
            name: att.name,
            type: att.type,
            size: att.size,
            hasContent: true,
          })),
        });
      }
    }

    if (failedRecipients.length === recipients.length) {
      return NextResponse.json(
        {
          success: false,
          error: failedRecipients[0] || 'Email delivery failed via Brevo.',
          records: insertedRecords,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        failedRecipients.length > 0
          ? `Sent to ${recipients.length - failedRecipients.length} of ${recipients.length} recipients (${failedRecipients.join('; ')}).`
          : `Email sent successfully via Brevo and saved to database.`,
      records: insertedRecords,
    });
  } catch (error: any) {
    console.error('Custom email POST error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send custom email.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: any) {
  try {
    const auth = await hasModulePermission(request, ['custom-email', 'emails'], 'delete');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Access denied: permission required to delete custom email logs.' },
        { status: auth.status || 403 }
      );
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID is required.' }, { status: 400 });
    }
    const delRes = await queryDb('DELETE FROM custom_emails WHERE id = $1 RETURNING id', [Number(id)]);
    if (delRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Record not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Custom email record deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
