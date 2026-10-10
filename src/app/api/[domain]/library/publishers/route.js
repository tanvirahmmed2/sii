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
      SELECT p.*,
             COUNT(b.id)::int AS books_count
      FROM website_book_publishers p
      LEFT JOIN website_books b ON b.publisher_id = p.id AND b.website_id = p.website_id
      WHERE p.website_id = $1
    `;
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (p.name ILIKE $${params.length} OR p.contact_person ILIKE $${params.length} OR p.email ILIKE $${params.length})`;
    }

    if (status === 'active') {
      queryText += ` AND p.is_active = TRUE`;
    } else if (status === 'inactive') {
      queryText += ` AND p.is_active = FALSE`;
    }

    queryText += ` GROUP BY p.id ORDER BY p.name ASC`;

    const result = await queryDb(queryText, params);
    return NextResponse.json({ success: true, publishers: result.rows });
  } catch (err) {
    console.error('Error fetching publishers:', err);
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
    const { name, contact_person, email, phone, address, is_active = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Publisher name is required.' }, { status: 400 });
    }

    const check = await queryDb(
      `SELECT id FROM website_book_publishers WHERE website_id = $1 AND LOWER(name) = LOWER($2)`,
      [auth.website.id, name.trim()]
    );
    if (check.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A publisher with this name already exists.' }, { status: 409 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_book_publishers (website_id, name, contact_person, email, phone, address, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        auth.website.id,
        name.trim(),
        contact_person ? contact_person.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        Boolean(is_active)
      ]
    );

    return NextResponse.json({ success: true, publisher: insertRes.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Error creating publisher:', err);
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
    const { id, name, contact_person, email, phone, address, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Publisher ID is required.' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Publisher name is required.' }, { status: 400 });
    }

    const dupCheck = await queryDb(
      `SELECT id FROM website_book_publishers WHERE website_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [auth.website.id, name.trim(), id]
    );
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Another publisher with this name already exists.' }, { status: 409 });
    }

    const updateRes = await queryDb(
      `UPDATE website_book_publishers
       SET name = $1, contact_person = $2, email = $3, phone = $4, address = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND website_id = $8
       RETURNING *`,
      [
        name.trim(),
        contact_person ? contact_person.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        Boolean(is_active),
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Publisher not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, publisher: updateRes.rows[0] });
  } catch (err) {
    console.error('Error updating publisher:', err);
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
      return NextResponse.json({ success: false, error: 'Publisher ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_book_publishers WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Publisher not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Publisher "${delRes.rows[0].name}" deleted successfully.` });
  } catch (err) {
    console.error('Error deleting publisher:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
