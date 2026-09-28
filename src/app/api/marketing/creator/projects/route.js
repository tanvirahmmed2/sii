import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession } from '@/lib/middleware/creator';

/**
 * API Route: /api/creator/projects
 * List and create custom projects for creators.
 */
export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : sessionCreator?.id;
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Creator session required' }, { status: 401 });
    }

    if (sessionCreator && sessionCreator.id !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const res = await queryDb(`
      SELECT 
        p.*,
        d.name AS assigned_developer_name,
        d.email AS assigned_developer_email,
        (SELECT COUNT(*)::int FROM project_messages WHERE project_id = p.id) AS message_count,
        (
          SELECT message FROM project_messages 
          WHERE project_id = p.id 
          ORDER BY created_at DESC LIMIT 1
        ) AS latest_message,
        (
          SELECT created_at FROM project_messages 
          WHERE project_id = p.id 
          ORDER BY created_at DESC LIMIT 1
        ) AS latest_message_at
      FROM project p
      LEFT JOIN developers d ON p.assigned_developer_id = d.id
      WHERE p.creator_id = $1
      ORDER BY p.updated_at DESC, p.id DESC
    `, [creatorId]);

    const statsRes = await queryDb(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE working_status = 'PENDING_REVIEW')::int AS pending_review,
        COUNT(*) FILTER (WHERE working_status IN ('ACCEPTED', 'IN_PROGRESS', 'UNDER_REVIEW'))::int AS in_progress,
        COUNT(*) FILTER (WHERE working_status = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE payment_status = 'PAID')::int AS paid,
        COUNT(*) FILTER (WHERE payment_status IN ('UNPAID', 'PENDING_QUOTE', 'PARTIAL'))::int AS pending_payment
      FROM project 
      WHERE creator_id = $1
    `, [creatorId]);

    return NextResponse.json({
      success: true,
      records: res.rows,
      projects: res.rows,
      stats: statsRes.rows[0] || { total: 0, pending_review: 0, in_progress: 0, completed: 0, paid: 0, pending_payment: 0 },
    });
  } catch (error) {
    console.error('Creator Projects GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/creator/projects
 * Create a new custom project request.
 */
export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    const creatorId = Number(body.creatorId || sessionCreator?.id);

    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Creator session required' }, { status: 401 });
    }

    if (sessionCreator && sessionCreator.id !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const {
      title,
      description,
      category = 'CUSTOM_WEBSITE',
      estimatedBudget = 0,
      currency = 'USD',
      priority = 'MEDIUM',
      deadline = null,
      initialMessage = '',
      imageUrl = null,
      fileName = null,
    } = body;

    const cleanTitle = (title || '').trim();
    const cleanDesc = (description || '').trim();

    if (!cleanTitle || !cleanDesc) {
      return NextResponse.json({ success: false, error: 'Project title and description are required.' }, { status: 400 });
    }

    const projectNum = `PRJ-${Date.now().toString().slice(-6)}-${crypto.randomInt(100, 999)}`;
    const budgetCents = Math.round(Number(estimatedBudget) * 100) || 0;

    const projRes = await queryDb(`
      INSERT INTO project (
        project_number,
        creator_id,
        title,
        description,
        category,
        budget_in_cents,
        currency,
        payment_status,
        working_status,
        priority,
        deadline
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING_QUOTE', 'PENDING_REVIEW', $8, $9)
      RETURNING *
    `, [
      projectNum,
      creatorId,
      cleanTitle,
      cleanDesc,
      category,
      budgetCents,
      currency,
      priority,
      deadline ? new Date(deadline) : null,
    ]);

    const newProject = projRes.rows[0];

    // Fetch creator name for messages
    const cRes = await queryDb('SELECT name FROM creators WHERE id = $1', [creatorId]);
    const creatorName = cRes.rows[0]?.name || sessionCreator?.name || 'Creator';

    // Insert initial project discussion message
    const msgText = initialMessage?.trim() || cleanDesc;
    const msgRes = await queryDb(`
      INSERT INTO project_messages (project_id, sender_type, sender_id, sender_name, message)
      VALUES ($1, 'CREATOR', $2, $3, $4)
      RETURNING *
    `, [newProject.id, creatorId, creatorName, msgText]);

    const initialMsg = msgRes.rows[0];

    // If attachment was provided
    if (imageUrl) {
      await queryDb(`
        INSERT INTO project_images (project_id, message_id, image_url, file_name)
        VALUES ($1, $2, $3, $4)
      `, [newProject.id, initialMsg.id, imageUrl, fileName || null]).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      project: newProject,
      message: 'Custom project request submitted successfully! A developer will review and provide a quote.',
    });
  } catch (error) {
    console.error('Creator Projects POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
