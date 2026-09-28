import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission, getAuthenticatedUser } from '@/lib/middleware/developer';

/**
 * GET /api/developer/projects/[id]
 * Fetch single project, message history, images, and available developers.
 */
export async function GET(request, context) {
  try {
    const auth = await hasModulePermission(request, 'projects');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project identifier is required.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(id);
    const projectRes = await queryDb(`
      SELECT 
        p.*,
        c.name AS creator_name,
        c.email AS creator_email,
        c.phone AS creator_phone,
        d.name AS assigned_developer_name,
        d.email AS assigned_developer_email,
        COALESCE(dr.name, 'Developer') AS assigned_developer_role
      FROM project p
      LEFT JOIN creators c ON p.creator_id = c.id
      LEFT JOIN developers d ON p.assigned_developer_id = d.id
      LEFT JOIN roles dr ON d.role_id = dr.id
      WHERE ${isNumeric ? 'p.id = $1 OR p.project_number = $1' : 'p.project_number = $1'}
      LIMIT 1
    `, [id]);

    if (projectRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
    }

    const project = projectRes.rows[0];

    // Fetch conversation thread messages
    const messagesRes = await queryDb(`
      SELECT 
        m.id,
        m.project_id,
        m.sender_type,
        m.sender_id,
        m.sender_name,
        m.message,
        m.created_at,
        d.name AS developer_name,
        COALESCE(dr.slug, 'developer') AS developer_role
      FROM project_messages m
      LEFT JOIN developers d ON (m.sender_type IN ('ADMIN', 'DEVELOPER') AND m.sender_id = d.id)
      LEFT JOIN roles dr ON d.role_id = dr.id
      WHERE m.project_id = $1
      ORDER BY m.created_at ASC
    `, [project.id]);

    // Fetch image attachments
    const imagesRes = await queryDb(`
      SELECT * FROM project_images WHERE project_id = $1 ORDER BY created_at ASC
    `, [project.id]).catch(() => ({ rows: [] }));

    // Fetch list of developers for assignment dropdown
    const devListRes = await queryDb(`
      SELECT d.id, d.name, d.email, r.name AS role_name
      FROM developers d
      LEFT JOIN roles r ON d.role_id = r.id
      WHERE d.is_active = TRUE
      ORDER BY d.name ASC
    `).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      project,
      messages: messagesRes.rows,
      images: imagesRes.rows,
      developers: devListRes.rows,
    });
  } catch (error) {
    console.error('Error in developer project GET API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/developer/projects/[id]
 * Handler for sending replies, updating status, changing payment quote, assigning developer.
 */
export async function POST(request, context) {
  try {
    const auth = await hasModulePermission(request, 'projects');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const params = await context?.params;
    const id = params?.id;
    const body = await request.json();
    const { action } = body;

    const isNumeric = /^\d+$/.test(id);
    const projectRes = await queryDb(`
      SELECT * FROM project 
      WHERE ${isNumeric ? 'id = $1 OR project_number = $1' : 'project_number = $1'}
      LIMIT 1
    `, [id]);

    if (projectRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
    }

    const project = projectRes.rows[0];
    const devUser = await getAuthenticatedUser(request);
    const developerId = devUser?.id || null;
    const developerName = devUser?.name || 'Platform Developer';

    // 1. Send Message to Project Thread
    if (action === 'send_message' || !action) {
      const cleanMessage = (body.message || '').trim();
      const { imageUrl, fileName } = body;

      if (!cleanMessage && !imageUrl) {
        return NextResponse.json({ success: false, error: 'Message cannot be empty.' }, { status: 400 });
      }

      const msgRes = await queryDb(`
        INSERT INTO project_messages (project_id, sender_type, sender_id, sender_name, message)
        VALUES ($1, 'DEVELOPER', $2, $3, $4)
        RETURNING *
      `, [project.id, developerId, developerName, cleanMessage || 'Shared an attachment']);

      const newMsg = msgRes.rows[0];

      if (imageUrl) {
        await queryDb(`
          INSERT INTO project_images (project_id, message_id, image_url, file_name)
          VALUES ($1, $2, $3, $4)
        `, [project.id, newMsg.id, imageUrl, fileName || null]).catch(() => {});
      }

      await queryDb(`UPDATE project SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [project.id]);

      return NextResponse.json({
        success: true,
        message: newMsg,
      });
    }

    // 2. Update Working Progress Status
    if (action === 'update_working_status') {
      const { workingStatus } = body;
      const validStatuses = ['PENDING_REVIEW', 'ACCEPTED', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
      if (!workingStatus || !validStatuses.includes(workingStatus)) {
        return NextResponse.json({ success: false, error: 'Invalid working status value.' }, { status: 400 });
      }

      const updated = await queryDb(`
        UPDATE project 
        SET working_status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
        RETURNING *
      `, [workingStatus, project.id]);

      // System notification message in thread
      await queryDb(`
        INSERT INTO project_messages (project_id, sender_type, sender_id, sender_name, message)
        VALUES ($1, 'SYSTEM', $2, 'System Update', $3)
      `, [project.id, developerId, `Working status updated to ${workingStatus.replace(/_/g, ' ')}.`]);

      return NextResponse.json({ success: true, project: updated.rows[0], message: 'Working status updated.' });
    }

    // 3. Update Payment & Quotation
    if (action === 'update_payment') {
      const budgetInCents = body.budgetInCents !== undefined ? Number(body.budgetInCents) : project.budget_in_cents;
      const paidAmountInCents = body.paidAmountInCents !== undefined ? Number(body.paidAmountInCents) : project.paid_amount_in_cents;
      const paymentStatus = body.paymentStatus || project.payment_status;
      const currency = body.currency || project.currency || 'USD';

      const updated = await queryDb(`
        UPDATE project 
        SET budget_in_cents = $1,
            paid_amount_in_cents = $2,
            payment_status = $3,
            currency = $4,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $5
        RETURNING *
      `, [budgetInCents, paidAmountInCents, paymentStatus, currency, project.id]);

      const formattedBudget = (budgetInCents / 100).toFixed(2);
      await queryDb(`
        INSERT INTO project_messages (project_id, sender_type, sender_id, sender_name, message)
        VALUES ($1, 'SYSTEM', $2, 'System Update', $3)
      `, [project.id, developerId, `Project quote & payment updated: $${formattedBudget} ${currency} (Status: ${paymentStatus}).`]);

      return NextResponse.json({ success: true, project: updated.rows[0], message: 'Payment details updated.' });
    }

    // 4. Assign Developer
    if (action === 'assign_developer') {
      const assignedDeveloperId = body.assignedDeveloperId ? Number(body.assignedDeveloperId) : null;

      const updated = await queryDb(`
        UPDATE project 
        SET assigned_developer_id = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
        RETURNING *
      `, [assignedDeveloperId, project.id]);

      let devName = 'Unassigned';
      if (assignedDeveloperId) {
        const dRes = await queryDb('SELECT name FROM developers WHERE id = $1', [assignedDeveloperId]);
        devName = dRes.rows[0]?.name || 'Developer';
      }

      await queryDb(`
        INSERT INTO project_messages (project_id, sender_type, sender_id, sender_name, message)
        VALUES ($1, 'SYSTEM', $2, 'System Update', $3)
      `, [project.id, developerId, `Assigned developer updated to: ${devName}.`]);

      return NextResponse.json({ success: true, project: updated.rows[0], message: `Project assigned to ${devName}.` });
    }

    // 5. Update Deliverable URL / Notes
    if (action === 'update_deliverable') {
      const { deliverableUrl, notes, deadline } = body;
      const updated = await queryDb(`
        UPDATE project 
        SET deliverable_url = COALESCE($1, deliverable_url),
            notes = COALESCE($2, notes),
            deadline = COALESCE($3, deadline),
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4
        RETURNING *
      `, [deliverableUrl, notes, deadline, project.id]);

      return NextResponse.json({ success: true, project: updated.rows[0], message: 'Project details saved.' });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Error in developer project POST API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/developer/projects/[id]
 */
export async function DELETE(request, context) {
  try {
    const auth = await hasModulePermission(request, 'projects');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const params = await context?.params;
    const id = params?.id;

    const isNumeric = /^\d+$/.test(id);
    const res = await queryDb(`
      DELETE FROM project 
      WHERE ${isNumeric ? 'id = $1 OR project_number = $1' : 'project_number = $1'}
      RETURNING id, project_number, title
    `, [id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Project ${res.rows[0].project_number} deleted.` });
  } catch (error) {
    console.error('Error deleting developer project:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
