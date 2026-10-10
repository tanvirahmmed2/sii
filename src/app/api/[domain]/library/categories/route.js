import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyLibraryAccess } from 'src/lib/middleware/library_auth.js';

export async function GET(request, context) {
  try {
    const auth = await verifyLibraryAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    let queryText = `
      SELECT c.*,
             COUNT(b.id)::int AS books_count
      FROM website_book_category c
      LEFT JOIN website_books b ON b.category_id = c.id AND b.website_id = c.website_id
      WHERE c.website_id = $1
    `;
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (c.name ILIKE $${params.length} OR c.code ILIKE $${params.length})`;
    }

    if (status === 'active') {
      queryText += ` AND c.is_active = TRUE`;
    } else if (status === 'inactive') {
      queryText += ` AND c.is_active = FALSE`;
    }

    queryText += ` GROUP BY c.id ORDER BY c.name ASC`;

    const result = await queryDb(queryText, params);
    return NextResponse.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('Error fetching book categories:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const auth = await verifyLibraryAccess(request, context, 'create');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { name, code, description, is_active = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required.' }, { status: 400 });
    }

    const check = await queryDb(
      `SELECT id FROM website_book_category WHERE website_id = $1 AND LOWER(name) = LOWER($2)`,
      [auth.website.id, name.trim()]
    );
    if (check.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A category with this name already exists.' }, { status: 409 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_book_category (website_id, name, code, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [auth.website.id, name.trim(), code ? code.trim() : null, description ? description.trim() : null, Boolean(is_active)]
    );

    return NextResponse.json({ success: true, category: insertRes.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Error creating book category:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const auth = await verifyLibraryAccess(request, context, 'edit');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, name, code, description, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required.' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required.' }, { status: 400 });
    }

    const dupCheck = await queryDb(
      `SELECT id FROM website_book_category WHERE website_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [auth.website.id, name.trim(), id]
    );
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Another category with this name already exists.' }, { status: 409 });
    }

    const updateRes = await queryDb(
      `UPDATE website_book_category
       SET name = $1, code = $2, description = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6
       RETURNING *`,
      [name.trim(), code ? code.trim() : null, description ? description.trim() : null, Boolean(is_active), id, auth.website.id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, category: updateRes.rows[0] });
  } catch (err) {
    console.error('Error updating book category:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyLibraryAccess(request, context, 'delete');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_book_category WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Category "${delRes.rows[0].name}" deleted successfully.` });
  } catch (err) {
    console.error('Error deleting book category:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
