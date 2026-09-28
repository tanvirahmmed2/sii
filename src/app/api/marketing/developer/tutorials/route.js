import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: List all tutorials or fetch by ID
// ============================================================================
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'tutorials');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const res = await queryDb(
        `SELECT t.*, d.name AS creator_name, d.email AS creator_email
         FROM tutorials t
         LEFT JOIN developers d ON t.created_by_developer_id = d.id
         WHERE t.id = $1 LIMIT 1`,
        [Number(id)]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Tutorial not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, tutorial: res.rows[0], record: res.rows[0] });
    }

    const res = await queryDb(`
      SELECT 
        t.*,
        d.name AS creator_name,
        d.email AS creator_email,
        COALESCE(dr.slug, 'developer') AS creator_role
      FROM tutorials t
      LEFT JOIN developers d ON t.created_by_developer_id = d.id
      LEFT JOIN roles dr ON d.role_id = dr.id
      ORDER BY t.created_at DESC
    `);

    const perms = Array.isArray(auth.staff.permissions) ? auth.staff.permissions : [];
    const canManage = perms.includes('tutorials');

    return NextResponse.json({
      success: true,
      tutorials: res.rows,
      canManage,
    });
  } catch (error) {
    console.error('Developer tutorials GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create tutorial
// ============================================================================
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'tutorials');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Permission tutorials required to create tutorials.' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { title, description, youtube_link } = body;

    if (!title || !youtube_link) {
      return NextResponse.json(
        { success: false, error: 'Tutorial title and YouTube link are required.' },
        { status: 400 }
      );
    }

    const res = await queryDb(
      `INSERT INTO tutorials (title, description, youtube_link, created_by_developer_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title.trim(), description ? description.trim() : null, youtube_link.trim(), auth.staff.id]
    );

    return NextResponse.json({
      success: true,
      tutorial: res.rows[0],
      record: res.rows[0],
      message: 'Tutorial created successfully.',
    }, { status: 201 });
  } catch (error) {
    console.error('Developer tutorial POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT: Update tutorial
// ============================================================================
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'tutorials');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Permission tutorials required to edit tutorials.' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const id = body.id || body.tutorialId;
    const { title, description, youtube_link } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Tutorial ID is required for update.' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT * FROM tutorials WHERE id = $1', [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tutorial not found.' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const newTitle = title !== undefined ? title.trim() : current.title;
    const newDescription = description !== undefined ? (description ? description.trim() : null) : current.description;
    const newYoutubeLink = youtube_link !== undefined ? youtube_link.trim() : current.youtube_link;

    const res = await queryDb(
      `UPDATE tutorials SET title = $1, description = $2, youtube_link = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [newTitle, newDescription, newYoutubeLink, current.id]
    );

    return NextResponse.json({
      success: true,
      tutorial: res.rows[0],
      record: res.rows[0],
      message: 'Tutorial updated successfully.',
    });
  } catch (error) {
    console.error('Developer tutorial PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete tutorial
// ============================================================================
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'tutorials');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Permission tutorials required to delete tutorials.' },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.tutorialId;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Tutorial ID is required.' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM tutorials WHERE id = $1 RETURNING id', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tutorial not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Tutorial deleted successfully.' });
  } catch (error) {
    console.error('Developer tutorial DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
