import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function generateUniqueSlug(baseTitle, excludeId = null) {
  let baseSlug = slugify(baseTitle) || 'policy';
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const checkSql = excludeId 
      ? 'SELECT id FROM policies WHERE slug = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM policies WHERE slug = $1 LIMIT 1';
    const params = excludeId ? [slug, Number(excludeId)] : [slug];
    const existing = await queryDb(checkSql, params);
    if (existing.rows.length === 0) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// ============================================================================
// GET: Fetch policies (all or single by ID/slug)
// ============================================================================
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'policies');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (id) {
      const res = await queryDb(
        'SELECT *, is_active AS is_published FROM policies WHERE id = $1 LIMIT 1',
        [Number(id)]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Policy not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    if (slug) {
      const res = await queryDb(
        'SELECT *, is_active AS is_published FROM policies WHERE slug = $1 LIMIT 1',
        [slug]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Policy not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    const res = await queryDb(
      'SELECT *, is_active AS is_published FROM policies ORDER BY id ASC'
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, table: 'policies', records: res.rows });
  } catch (error) {
    console.error('Error fetching developer policies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a new policy
// ============================================================================
export async function POST(request) {
  try {
    const authCheck = await hasModulePermission(request, 'policies');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission policies required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const title = body.title?.trim();
    const description = body.description?.trim();
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : (body.is_published !== undefined ? Boolean(body.is_published) : true);

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Both title and description are required.' },
        { status: 400 }
      );
    }

    const slug = await generateUniqueSlug(title);

    const res = await queryDb(
      `INSERT INTO policies (title, slug, description, is_active) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *, is_active AS is_published`,
      [title, slug, description, isActive]
    );

    return NextResponse.json(
      { success: true, record: res.rows[0], message: 'Policy created successfully.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating policy:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT: Update an existing policy
// ============================================================================
export async function PUT(request) {
  try {
    const authCheck = await hasModulePermission(request, 'policies');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission policies required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const id = body.id || body.policyId;
    const title = body.title?.trim();
    const description = body.description?.trim();
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : (body.is_published !== undefined ? Boolean(body.is_published) : true);

    if (!id) {
      return NextResponse.json({ success: false, error: 'Policy ID is required for update.' }, { status: 400 });
    }

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Both title and description are required.' },
        { status: 400 }
      );
    }

    const slug = await generateUniqueSlug(title, Number(id));

    const res = await queryDb(
      `UPDATE policies 
       SET title = $1, slug = $2, description = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING *, is_active AS is_published`,
      [title, slug, description, isActive, Number(id)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Policy item not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: res.rows[0], message: 'Policy updated successfully.' });
  } catch (error) {
    console.error('Error updating policy:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PATCH: Toggle active/publish status or quick edit
// ============================================================================
export async function PATCH(request) {
  try {
    const authCheck = await hasModulePermission(request, 'policies');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission policies required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const id = body.id || body.policyId;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Policy ID is required.' }, { status: 400 });
    }

    if (body.is_published !== undefined || body.is_active !== undefined) {
      const activeState = body.is_active !== undefined ? Boolean(body.is_active) : Boolean(body.is_published);
      const res = await queryDb(
        `UPDATE policies SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *, is_active AS is_published`,
        [activeState, Number(id)]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Policy not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        record: res.rows[0],
        message: `Policy marked as ${activeState ? 'active' : 'inactive'}.`,
      });
    }

    return NextResponse.json({ success: false, error: 'No update parameters provided.' }, { status: 400 });
  } catch (error) {
    console.error('Error in policy PATCH:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete a policy
// ============================================================================
export async function DELETE(request) {
  try {
    const authCheck = await hasModulePermission(request, 'policies');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission policies required.' },
        { status: authCheck.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('policyId');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.policyId;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Policy ID is required for deletion.' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM policies WHERE id = $1 RETURNING id, title', [Number(id)]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Policy not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Policy "${res.rows[0].title}" deleted successfully.`,
      deletedId: res.rows[0].id,
    });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
