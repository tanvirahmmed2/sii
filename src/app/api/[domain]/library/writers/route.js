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
      SELECT w.*,
             COUNT(b.id)::int AS books_count
      FROM website_book_writers w
      LEFT JOIN website_books b ON b.writer_id = w.id AND b.website_id = w.website_id
      WHERE w.website_id = $1
    `;
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (w.name ILIKE $${params.length} OR w.country ILIKE $${params.length} OR w.email ILIKE $${params.length})`;
    }

    if (status === 'active') {
      queryText += ` AND w.is_active = TRUE`;
    } else if (status === 'inactive') {
      queryText += ` AND w.is_active = FALSE`;
    }

    queryText += ` GROUP BY w.id ORDER BY w.name ASC`;

    const result = await queryDb(queryText, params);
    return NextResponse.json({ success: true, writers: result.rows });
  } catch (err) {
    console.error('Error fetching writers:', err);
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
    const { name, email, phone, bio, country, is_active = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Writer name is required.' }, { status: 400 });
    }

    const check = await queryDb(
      `SELECT id FROM website_book_writers WHERE website_id = $1 AND LOWER(name) = LOWER($2)`,
      [auth.website.id, name.trim()]
    );
    if (check.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A writer with this name already exists.' }, { status: 409 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_book_writers (website_id, name, email, phone, bio, country, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        auth.website.id,
        name.trim(),
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        bio ? bio.trim() : null,
        country ? country.trim() : null,
        Boolean(is_active)
      ]
    );

    return NextResponse.json({ success: true, writer: insertRes.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Error creating writer:', err);
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
    const { id, name, email, phone, bio, country, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Writer ID is required.' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Writer name is required.' }, { status: 400 });
    }

    const dupCheck = await queryDb(
      `SELECT id FROM website_book_writers WHERE website_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [auth.website.id, name.trim(), id]
    );
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Another writer with this name already exists.' }, { status: 409 });
    }

    const updateRes = await queryDb(
      `UPDATE website_book_writers
       SET name = $1, email = $2, phone = $3, bio = $4, country = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND website_id = $8
       RETURNING *`,
      [
        name.trim(),
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        bio ? bio.trim() : null,
        country ? country.trim() : null,
        Boolean(is_active),
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Writer not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, writer: updateRes.rows[0] });
  } catch (err) {
    console.error('Error updating writer:', err);
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
      return NextResponse.json({ success: false, error: 'Writer ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_book_writers WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Writer not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Writer "${delRes.rows[0].name}" deleted successfully.` });
  } catch (err) {
    console.error('Error deleting writer:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
