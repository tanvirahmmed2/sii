import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession } from '@/lib/middleware/creator';

/**
 * GET /api/creator/projects/[projectId]
 * Single custom project view with discussion thread and attachments.
 */
export async function GET(request, context) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const params = await context?.params;
    const projectId = params?.projectId;

    if (!sessionCreator) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Creator session required' }, { status: 401 });
    }

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project identifier is required.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(projectId);
    const projRes = await queryDb(`
      SELECT 
        p.*,
        c.name AS creator_name,
        c.email AS creator_email,
        d.name AS assigned_developer_name,
        d.email AS assigned_developer_email,
        COALESCE(dr.name, 'Developer') AS assigned_developer_role
      FROM project p
      LEFT JOIN creators c ON p.creator_id = c.id
      LEFT JOIN developers d ON p.assigned_developer_id = d.id
      LEFT JOIN roles dr ON d.role_id = dr.id
      WHERE (${isNumeric ? 'p.id = $1 OR p.project_number = $1' : 'p.project_number = $1'})
        AND p.creator_id = $2
      LIMIT 1
    `, [projectId, sessionCreator.id]);

    if (projRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Custom project not found.' }, { status: 404 });
    }

    const project = projRes.rows[0];

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

    // Fetch attachments
    const imagesRes = await queryDb(`
      SELECT * FROM project_images WHERE project_id = $1 ORDER BY created_at ASC
    `, [project.id]).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      project,
      messages: messagesRes.rows,
      images: imagesRes.rows,
    });
  } catch (error) {
    console.error('Error fetching creator project thread:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/creator/projects/[projectId]
 * Post a new message or question in the project thread.
 */
export async function POST(request, context) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const params = await context?.params;
    const projectId = params?.projectId;
    const body = await request.json();

    if (!sessionCreator) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Creator session required' }, { status: 401 });
    }

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project identifier is required.' }, { status: 400 });
    }

    const cleanMessage = (body.message || '').trim();
    const { imageUrl, fileName } = body;

    if (!cleanMessage && !imageUrl) {
      return NextResponse.json({ success: false, error: 'Message cannot be empty.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(projectId);
    const projRes = await queryDb(`
      SELECT * FROM project 
      WHERE (${isNumeric ? 'id = $1 OR project_number = $1' : 'project_number = $1'})
        AND creator_id = $2
      LIMIT 1
    `, [projectId, sessionCreator.id]);

    if (projRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Custom project not found.' }, { status: 404 });
    }

    const project = projRes.rows[0];

    const msgRes = await queryDb(`
      INSERT INTO project_messages (project_id, sender_type, sender_id, sender_name, message)
      VALUES ($1, 'CREATOR', $2, $3, $4)
      RETURNING *
    `, [project.id, sessionCreator.id, sessionCreator.name || 'Creator', cleanMessage || 'Shared an attachment']);

    const newMsg = msgRes.rows[0];

    if (imageUrl) {
      await queryDb(`
        INSERT INTO project_images (project_id, message_id, image_url, file_name)
        VALUES ($1, $2, $3, $4)
      `, [project.id, newMsg.id, imageUrl, fileName || null]).catch(() => {});
    }

    await queryDb(`
      UPDATE project 
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [project.id]);

    return NextResponse.json({
      success: true,
      message: newMsg,
    });
  } catch (error) {
    console.error('Error posting to creator project thread:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
