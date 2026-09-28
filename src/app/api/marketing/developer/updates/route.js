import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';
import slugify from 'slugify';

function formatSlug(text) {
  return slugify(text || '', {
    lower: true,
    strict: true,
    trim: true,
  });
}

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
      const res = await queryDb('SELECT * FROM updates WHERE id = $1 LIMIT 1', [Number(id)]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Update not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    if (slug) {
      const res = await queryDb('SELECT * FROM updates WHERE slug = $1 LIMIT 1', [slug]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Update not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    const res = await queryDb('SELECT * FROM updates ORDER BY created_at DESC').catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, table: 'updates', records: res.rows });
  } catch (error) {
    console.error('Error fetching updates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE UPDATE
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
    const title = body.title?.trim() || 'Untitled Update';
    const description = body.description?.trim() || 'Update details coming soon...';
    const baseSlug = formatSlug(title) || 'update';
    let slug = baseSlug;

    // Check slug uniqueness
    const existingSlug = await queryDb('SELECT id FROM updates WHERE slug = $1 LIMIT 1', [slug]);
    if (existingSlug.rows.length > 0) {
      slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const res = await queryDb(
      `INSERT INTO updates (title, description, slug) VALUES ($1, $2, $3) RETURNING *`,
      [title, description, slug]
    );

    return NextResponse.json(
      { success: true, record: res.rows[0], message: 'Update published successfully.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating update:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// UPDATE RECORD
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
    const title = body.title?.trim();
    const description = body.description?.trim();
    const existingRes = await queryDb('SELECT * FROM updates WHERE id = $1', [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update record not found.' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const newTitle = title || current.title;
    const newDescription = description !== undefined ? description : current.description;
    let newSlug = current.slug;
    if (title && title !== current.title) {
      const baseSlug = formatSlug(title) || 'update';
      newSlug = baseSlug;
      const existingSlug = await queryDb('SELECT id FROM updates WHERE slug = $1 AND id != $2 LIMIT 1', [newSlug, current.id]);
      if (existingSlug.rows.length > 0) {
        newSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const res = await queryDb(
      `UPDATE updates SET title = $1, description = $2, slug = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [newTitle, newDescription, newSlug, current.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: res.rows[0], message: 'Update saved successfully.' });
  } catch (error) {
    console.error('Error updating update:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE RECORD
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

    const res = await queryDb('DELETE FROM updates WHERE id = $1 RETURNING id', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Update deleted successfully.' });
  } catch (error) {
    console.error('Error deleting update:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
