import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import slugify from 'slugify';

function formatSlug(text) {
  return slugify(text || '', {
    lower: true,
    strict: true,
    trim: true,
  });
}

async function generateUniqueSlug(baseTitle, excludeId = null) {
  let baseSlug = formatSlug(baseTitle) || 'update';
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const checkSql = excludeId
      ? 'SELECT id FROM updates WHERE slug = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM updates WHERE slug = $1 LIMIT 1';
    const params = excludeId ? [slug, Number(excludeId)] : [slug];
    const existing = await queryDb(checkSql, params);
    if (existing.rows.length === 0) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// ============================================================================
// GET: Fetch product updates (all, or single by ID/slug)
// ============================================================================
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'updates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (id) {
      const res = await queryDb(
        `SELECT id, version, title, slug, description, changelog, release_date, is_published, created_at, updated_at 
         FROM updates WHERE id = $1 LIMIT 1`,
        [Number(id)]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Update not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0], update: res.rows[0] });
    }

    if (slug) {
      const res = await queryDb(
        `SELECT id, version, title, slug, description, changelog, release_date, is_published, created_at, updated_at 
         FROM updates WHERE slug = $1 LIMIT 1`,
        [slug.trim()]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Update not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0], update: res.rows[0] });
    }

    const res = await queryDb(
      `SELECT id, version, title, slug, description, changelog, release_date, is_published, created_at, updated_at 
       FROM updates 
       ORDER BY COALESCE(release_date, created_at::date) DESC, created_at DESC`
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, table: 'updates', records: res.rows, updates: res.rows });
  } catch (error) {
    console.error('Error fetching developer updates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a new product update
// ============================================================================
export async function POST(request) {
  try {
    const authCheck = await hasModulePermission(request, 'updates');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission updates required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const version = body.version?.trim();
    const title = body.title?.trim();
    const description = body.description?.trim() || null;
    const changelog = body.changelog?.trim() || null;
    const releaseDate = body.release_date ? body.release_date : new Date().toISOString().split('T')[0];
    const isPublished = body.is_published !== undefined ? Boolean(body.is_published) : true;

    if (!version || !title) {
      return NextResponse.json(
        { success: false, error: 'Both version (e.g. v1.0.0) and title are required.' },
        { status: 400 }
      );
    }

    const slug = await generateUniqueSlug(title);

    const res = await queryDb(
      `INSERT INTO updates (version, title, slug, description, changelog, release_date, is_published) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, version, title, slug, description, changelog, release_date, is_published, created_at, updated_at`,
      [version, title, slug, description, changelog, releaseDate, isPublished]
    );

    return NextResponse.json(
      { success: true, record: res.rows[0], update: res.rows[0], message: 'Update published successfully.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating update:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT: Update an existing product update
// ============================================================================
export async function PUT(request) {
  try {
    const authCheck = await hasModulePermission(request, 'updates');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission updates required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const id = body.id || body.updateId;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Update ID is required.' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT * FROM updates WHERE id = $1', [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update record not found.' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const version = body.version?.trim() || current.version || 'v1.0.0';
    const title = body.title?.trim() || current.title;
    const description = body.description !== undefined ? body.description?.trim() : current.description;
    const changelog = body.changelog !== undefined ? body.changelog?.trim() : current.changelog;
    const releaseDate = body.release_date !== undefined ? body.release_date : current.release_date;
    const isPublished = body.is_published !== undefined ? Boolean(body.is_published) : current.is_published;

    let slug = current.slug;
    if (title && title !== current.title) {
      slug = await generateUniqueSlug(title, current.id);
    }

    const res = await queryDb(
      `UPDATE updates 
       SET version = $1, title = $2, slug = $3, description = $4, changelog = $5, release_date = $6, is_published = $7, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 
       RETURNING id, version, title, slug, description, changelog, release_date, is_published, created_at, updated_at`,
      [version, title, slug, description, changelog, releaseDate, isPublished, current.id]
    );

    return NextResponse.json({
      success: true,
      record: res.rows[0],
      update: res.rows[0],
      message: 'Update saved successfully.',
    });
  } catch (error) {
    console.error('Error updating update:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PATCH: Quick status toggle (is_published)
// ============================================================================
export async function PATCH(request) {
  try {
    const authCheck = await hasModulePermission(request, 'updates');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission updates required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const id = body.id || body.updateId;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Update ID is required.' }, { status: 400 });
    }

    if (body.is_published !== undefined) {
      const activeState = Boolean(body.is_published);
      const res = await queryDb(
        `UPDATE updates SET is_published = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [activeState, Number(id)]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Update not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        record: res.rows[0],
        message: `Update marked as ${activeState ? 'Published' : 'Draft'}.`,
      });
    }

    return NextResponse.json({ success: false, error: 'No update parameters provided.' }, { status: 400 });
  } catch (error) {
    console.error('Error in update PATCH:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete an update
// ============================================================================
export async function DELETE(request) {
  try {
    const authCheck = await hasModulePermission(request, 'updates');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission updates required.' },
        { status: authCheck.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.updateId;
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Update ID is required.' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM updates WHERE id = $1 RETURNING id, title, version', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Update "${res.rows[0].version} - ${res.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting update:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
