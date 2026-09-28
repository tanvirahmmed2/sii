import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

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
      const res = await queryDb('SELECT * FROM policies WHERE id = $1 LIMIT 1', [Number(id)]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Policy not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    if (slug) {
      const res = await queryDb('SELECT * FROM policies WHERE slug = $1 LIMIT 1', [slug]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Policy not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    const res = await queryDb('SELECT * FROM policies ORDER BY id ASC').catch(() => ({ rows: [] }));
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
    let slug = body.slug?.trim();
    const is_published = body.is_published !== undefined ? Boolean(body.is_published) : true;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Both title and description are required.' },
        { status: 400 }
      );
    }

    if (!slug) {
      slug = slugify(title);
    } else {
      slug = slugify(slug);
    }

    // Check duplicate slug
    const existing = await queryDb('SELECT id FROM policies WHERE slug = $1 LIMIT 1', [slug]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `A policy with slug "${slug}" already exists.` },
        { status: 400 }
      );
    }

    const res = await queryDb(
      `INSERT INTO policies (title, slug, description, is_published) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [title, slug, description, is_published]
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
    let slug = body.slug?.trim();
    const is_published = body.is_published !== undefined ? Boolean(body.is_published) : true;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Policy ID is required for update.' }, { status: 400 });
    }

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Both title and description are required.' },
        { status: 400 }
      );
    }

    if (!slug) {
      slug = slugify(title);
    } else {
      slug = slugify(slug);
    }

    // Check duplicate slug on other records
    const existing = await queryDb('SELECT id FROM policies WHERE slug = $1 AND id != $2 LIMIT 1', [slug, Number(id)]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Another policy with slug "${slug}" already exists.` },
        { status: 400 }
      );
    }

    const res = await queryDb(
      `UPDATE policies 
       SET title = $1, slug = $2, description = $3, is_published = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING *`,
      [title, slug, description, is_published, Number(id)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Policy record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      record: res.rows[0],
      message: 'Policy updated successfully.',
    });
  } catch (error) {
    console.error('Error updating policy:', error);
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
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Policy ID is required.' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM policies WHERE id = $1 RETURNING id', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Policy not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Policy deleted successfully.' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
