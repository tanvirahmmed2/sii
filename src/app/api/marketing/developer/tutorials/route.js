import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

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
        `SELECT id, title, description, youtube_link, is_published, created_at, updated_at
         FROM tutorials
         WHERE id = $1 LIMIT 1`,
        [Number(id)]
      ).catch(() => ({ rows: [] }));

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Tutorial not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, tutorial: res.rows[0], record: res.rows[0] });
    }

    const res = await queryDb(`
      SELECT id, title, description, youtube_link, is_published, created_at, updated_at
      FROM tutorials
      ORDER BY created_at DESC
    `).catch((err) => {
      console.warn('tutorials query error:', err.message);
      return { rows: [] };
    });

    const currentStaff = auth.user || auth.staff;
    const perms = Array.isArray(currentStaff?.permissions) ? currentStaff.permissions : [];
    const canManage = perms.includes('tutorials') || currentStaff?.role === 'admin' || currentStaff?.role === 'manager';

    return NextResponse.json({
      success: true,
      tutorials: res.rows || [],
      records: res.rows || [],
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
    const { title, description, youtube_link, is_published } = body;

    if (!title || !youtube_link) {
      return NextResponse.json(
        { success: false, error: 'Tutorial title and YouTube video link are required.' },
        { status: 400 }
      );
    }

    const isPublishedVal = is_published !== undefined ? Boolean(is_published) : true;

    const res = await queryDb(
      `INSERT INTO tutorials (title, description, youtube_link, is_published)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, youtube_link, is_published, created_at, updated_at`,
      [
        title.trim(),
        description ? description.trim() : null,
        youtube_link.trim(),
        isPublishedVal,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        tutorial: res.rows[0],
        record: res.rows[0],
        message: 'Tutorial created successfully.',
      },
      { status: 201 }
    );
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
    const { title, description, youtube_link, is_published } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Tutorial ID is required for update.' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT id, title, description, youtube_link, is_published FROM tutorials WHERE id = $1', [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tutorial not found.' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const newTitle = title !== undefined ? title.trim() : current.title;
    const newDescription = description !== undefined ? (description ? description.trim() : null) : current.description;
    const newYoutubeLink = youtube_link !== undefined ? youtube_link.trim() : current.youtube_link;
    const newIsPublished = is_published !== undefined ? Boolean(is_published) : current.is_published;

    const res = await queryDb(
      `UPDATE tutorials 
       SET title = $1, description = $2, youtube_link = $3, is_published = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING id, title, description, youtube_link, is_published, created_at, updated_at`,
      [newTitle, newDescription, newYoutubeLink, newIsPublished, current.id]
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
// PATCH: Quick inline toggle for publish status
// ============================================================================
export async function PATCH(request) {
  try {
    const auth = await hasModulePermission(request, 'tutorials');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Permission tutorials required.' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { id, is_published } = body;

    if (!id || is_published === undefined) {
      return NextResponse.json({ success: false, error: 'ID and is_published status are required.' }, { status: 400 });
    }

    const res = await queryDb(
      `UPDATE tutorials SET is_published = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, is_published`,
      [Boolean(is_published), Number(id)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tutorial not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: res.rows[0], message: 'Status updated.' });
  } catch (error) {
    console.error('Developer tutorial PATCH error:', error);
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
