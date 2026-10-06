import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { SITE_NAME } from 'src/lib/database/secret';
import { uploadImage } from 'src/lib/database/cloudinary';

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

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ticket identifier is required.' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let cleanMessage, status, imageFile, imageUrl, fileName, mimeType, fileSize;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      cleanMessage = formData.get('message')?.trim() || '';
      status = formData.get('status');
      imageFile = formData.get('image');
      imageUrl = formData.get('imageUrl') || null;
      if (imageFile && typeof imageFile === 'object') {
        fileName = imageFile.name;
        mimeType = imageFile.type;
        fileSize = imageFile.size;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      cleanMessage = body.message?.trim() || '';
      status = body.status;
      imageUrl = body.imageUrl || body.image_url || null;
      imageFile = body.image || body.imageBase64 || null;
      fileName = body.fileName || null;
      mimeType = body.mimeType || null;
      fileSize = body.fileSize || null;
    }

    if (!cleanMessage && !imageFile && !imageUrl) {
      return NextResponse.json({ success: false, error: 'Reply message or image attachment is required.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(id);
    const ticketRes = await queryDb(`
      SELECT s.*, c.name AS requester_name, c.email AS requester_email 
      FROM supports s
      LEFT JOIN creators c ON s.creator_id = c.id
      WHERE ${isNumeric ? '(s.id = $1::bigint OR s.ticket_number = $1::text)' : 's.ticket_number = $1'}
      LIMIT 1
    `, [id]);

    if (ticketRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Support ticket not found.' }, { status: 404 });
    }

    const ticket = ticketRes.rows[0];
    const dev = auth.staff;

    let imageId = null;
    if (imageFile && typeof imageFile === 'object' && imageFile.size > 0) {
      const uploadRes = await uploadImage(imageFile, 'support_tickets');
      imageUrl = uploadRes.secure_url;
      imageId = uploadRes.publicId;
    } else if (typeof imageFile === 'string' && imageFile.startsWith('data:image')) {
      const uploadRes = await uploadImage(imageFile, 'support_tickets');
      imageUrl = uploadRes.secure_url;
      imageId = uploadRes.publicId;
    }

    // Insert staff message
    const msgRes = await queryDb(`
      INSERT INTO support_messages (support_id, sender_type, sender_id, message)
      VALUES ($1, 'developer', $2, $3)
      RETURNING *
    `, [ticket.id, dev.id, cleanMessage || '']);

    const newMsg = msgRes.rows[0];

    // Optional image attachment saved to support_images
    let attachedImages = [];
    if (imageUrl) {
      const imgRes = await queryDb(`
        INSERT INTO support_images (message_id, image_url, image_id, file_name, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        newMsg.id,
        imageUrl,
        imageId || null,
        fileName || null,
        fileSize || null,
        mimeType || null,
      ]).catch((err) => {
        console.error('Error inserting support image:', err);
        return { rows: [] };
      });
      attachedImages = imgRes.rows || [];
    }

    // Determine target status
    const targetStatus = status ? status.toLowerCase() : (ticket.status === 'open' ? 'in_progress' : ticket.status);

    // Update ticket
    const updateRes = await queryDb(`
      UPDATE supports
      SET updated_at = CURRENT_TIMESTAMP,
          last_message_at = CURRENT_TIMESTAMP,
          status = $1,
          assigned_developer_id = COALESCE(assigned_developer_id, $2)
      WHERE id = $3
      RETURNING *
    `, [targetStatus, dev.id, ticket.id]);

    // Send email notification to creator (fire-and-forget / non-blocking)
    if (ticket.requester_email) {
      const emailSubject = `[${ticket.ticket_number}] Update on: ${ticket.subject}`;
      const emailHtml = buildStyledEmail({
        title: `Support Ticket #${ticket.ticket_number}`,
        subtitle: ticket.subject,
        recipientName: ticket.requester_name || 'Creator',
        bodyParagraphs: [
          `New reply from ${dev.name} (${dev.role || 'Staff'}):`,
          cleanMessage,
        ],
        footerNote: `Status: ${targetStatus}. You can reply directly in your creator dashboard tickets tab.`,
      });

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
        sender_name: dev.name,
        developer_name: dev.name,
        developer_role: dev.role,
        images: attachedImages,
      },
      ticket: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error in developer ticket message POST API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
