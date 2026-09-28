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

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'updates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const res = await queryDb('SELECT * FROM updates WHERE slug = $1 OR id::text = $1 LIMIT 1', [cleanSlug]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found' }, { status: 404 });
    }

    const record = res.rows[0];
    return NextResponse.json({ success: true, record, update: record });
  } catch (error) {
    console.error('Developer update GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'updates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb('SELECT * FROM updates WHERE slug = $1 OR id::text = $1 LIMIT 1', [cleanSlug]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found' }, { status: 404 });
    }

    const current = existingRes.rows[0];
    const body = await request.json();
    const title = body.title?.trim() || current.title;
    const description = body.description?.trim() || current.description;
    let newSlug = current.slug;
    if (title && title !== current.title) {
      const baseSlug = formatSlug(title) || 'update';
      newSlug = baseSlug;
      const slugCheck = await queryDb('SELECT id FROM updates WHERE slug = $1 AND id != $2 LIMIT 1', [newSlug, current.id]);
      if (slugCheck.rows.length > 0) {
        newSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const res = await queryDb(
      `UPDATE updates SET title = $1, description = $2, slug = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [title, description, newSlug, current.id]
    );

    return NextResponse.json({
      success: true,
      record: res.rows[0],
      update: res.rows[0],
      message: 'Update updated successfully',
    });
  } catch (error) {
    console.error('Developer update PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'updates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const deleteRes = await queryDb(
      'DELETE FROM updates WHERE slug = $1 OR id::text = $1 RETURNING id, title',
      [cleanSlug]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Update "${deleteRes.rows[0].title}" deleted successfully`,
    });
  } catch (error) {
    console.error('Developer update DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
