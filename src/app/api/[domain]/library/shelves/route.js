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
    const floor = searchParams.get('floor') || '';
    const section = searchParams.get('section') || '';
    const shelfId = searchParams.get('shelf_id');

    // If specific shelf details requested with its book inventory
    if (shelfId) {
      const shelfQuery = `
        SELECT
          s.*,
          COUNT(b.id)::int AS titles_count,
          COALESCE(SUM(b.total_copies), 0)::int AS total_books_count,
          COALESCE(SUM(b.available_copies), 0)::int AS available_books_count,
          (COALESCE(SUM(b.total_copies), 0) - COALESCE(SUM(b.available_copies), 0))::int AS borrowed_books_count,
          GREATEST(s.capacity - COALESCE(SUM(b.total_copies), 0), 0)::int AS remaining_capacity,
          CASE
            WHEN s.capacity > 0 THEN ROUND((COALESCE(SUM(b.total_copies), 0)::numeric / s.capacity::numeric) * 100, 1)
            ELSE 0
          END AS occupancy_percentage
        FROM website_book_shelves s
        LEFT JOIN website_books b ON (b.shelf_id = s.id OR (b.shelf_id IS NULL AND b.shelf_location = s.shelf_name)) AND b.website_id = s.website_id
        WHERE s.id = $1 AND s.website_id = $2
        GROUP BY s.id
      `;
      const shelfRes = await queryDb(shelfQuery, [shelfId, auth.website.id]);
      if (shelfRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Book shelf rack not found.' }, { status: 404 });
      }

      const shelf = shelfRes.rows[0];

      // Retrieve books placed on this shelf
      const booksQuery = `
        SELECT
          b.id,
          b.title,
          b.isbn,
          b.edition,
          b.call_number,
          b.total_copies,
          b.available_copies,
          b.is_available,
          b.price,
          c.name AS category_name,
          w.name AS writer_name,
          p.name AS publisher_name
        FROM website_books b
        LEFT JOIN website_book_category c ON c.id = b.category_id AND c.website_id = b.website_id
        LEFT JOIN website_book_writers w ON w.id = b.writer_id AND w.website_id = b.website_id
        LEFT JOIN website_book_publishers p ON p.id = b.publisher_id AND p.website_id = b.website_id
        WHERE b.website_id = $1 AND (b.shelf_id = $2 OR (b.shelf_id IS NULL AND b.shelf_location = $3))
        ORDER BY b.title ASC
      `;
      const booksRes = await queryDb(booksQuery, [auth.website.id, shelf.id, shelf.shelf_name]);

      return NextResponse.json({
        success: true,
        shelf,
        books: booksRes.rows,
      });
    }

    // List all shelves with aggregation
    let queryText = `
      SELECT
        s.*,
        COUNT(b.id)::int AS titles_count,
        COALESCE(SUM(b.total_copies), 0)::int AS total_books_count,
        COALESCE(SUM(b.available_copies), 0)::int AS available_books_count,
        (COALESCE(SUM(b.total_copies), 0) - COALESCE(SUM(b.available_copies), 0))::int AS borrowed_books_count,
        GREATEST(s.capacity - COALESCE(SUM(b.total_copies), 0), 0)::int AS remaining_capacity,
        CASE
          WHEN s.capacity > 0 THEN ROUND((COALESCE(SUM(b.total_copies), 0)::numeric / s.capacity::numeric) * 100, 1)
          ELSE 0
        END AS occupancy_percentage
      FROM website_book_shelves s
      LEFT JOIN website_books b ON (b.shelf_id = s.id OR (b.shelf_id IS NULL AND b.shelf_location = s.shelf_name)) AND b.website_id = s.website_id
      WHERE s.website_id = $1
    `;
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (s.shelf_name ILIKE $${params.length} OR s.shelf_code ILIKE $${params.length} OR s.floor ILIKE $${params.length} OR s.room ILIKE $${params.length} OR s.section ILIKE $${params.length})`;
    }

    if (status === 'active') {
      queryText += ` AND s.is_active = TRUE`;
    } else if (status === 'inactive') {
      queryText += ` AND s.is_active = FALSE`;
    }

    if (floor) {
      params.push(floor);
      queryText += ` AND s.floor = $${params.length}`;
    }

    if (section) {
      params.push(section);
      queryText += ` AND s.section = $${params.length}`;
    }

    queryText += ` GROUP BY s.id ORDER BY s.shelf_name ASC`;

    const result = await queryDb(queryText, params);

    // Compute macro summary metrics for KPI cards
    const summaryQuery = `
      SELECT
        COUNT(s.id)::int AS total_shelves,
        COALESCE(SUM(s.capacity), 0)::int AS total_capacity,
        (
          SELECT COALESCE(SUM(b.total_copies), 0)::int 
          FROM website_books b 
          WHERE b.website_id = $1 AND (b.shelf_id IS NOT NULL OR (b.shelf_location IS NOT NULL AND b.shelf_location != ''))
        ) AS total_books_on_shelves,
        (
          SELECT COALESCE(SUM(b.available_copies), 0)::int 
          FROM website_books b 
          WHERE b.website_id = $1 AND (b.shelf_id IS NOT NULL OR (b.shelf_location IS NOT NULL AND b.shelf_location != ''))
        ) AS total_available_on_shelves,
        (
          SELECT COUNT(DISTINCT s2.id)::int
          FROM website_book_shelves s2
          JOIN website_books b2 ON (b2.shelf_id = s2.id OR (b2.shelf_id IS NULL AND b2.shelf_location = s2.shelf_name)) AND b2.website_id = s2.website_id
          WHERE s2.website_id = $1
          GROUP BY s2.id, s2.capacity
          HAVING COALESCE(SUM(b2.total_copies), 0) >= s2.capacity
        ) AS full_shelves_count
      FROM website_book_shelves s
      WHERE s.website_id = $1
    `;
    const summaryRes = await queryDb(summaryQuery, [auth.website.id]);
    const metrics = summaryRes.rows[0] || {};

    return NextResponse.json({
      success: true,
      shelves: result.rows,
      metrics: {
        total_shelves: metrics.total_shelves || 0,
        total_capacity: metrics.total_capacity || 0,
        total_books_on_shelves: metrics.total_books_on_shelves || 0,
        total_available_on_shelves: metrics.total_available_on_shelves || 0,
        full_shelves_count: metrics.full_shelves_count || 0,
      }
    });
  } catch (err) {
    console.error('Error fetching book shelves:', err);
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
    const {
      shelf_name,
      shelf_code,
      floor,
      room,
      section,
      capacity = 50,
      description,
      is_active = true
    } = body;

    if (!shelf_name || !shelf_name.trim()) {
      return NextResponse.json({ success: false, error: 'Shelf name is required.' }, { status: 400 });
    }

    const check = await queryDb(
      `SELECT id FROM website_book_shelves WHERE website_id = $1 AND LOWER(shelf_name) = LOWER($2)`,
      [auth.website.id, shelf_name.trim()]
    );
    if (check.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A shelf rack with this name already exists.' }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO website_book_shelves (
        website_id,
        shelf_name,
        shelf_code,
        floor,
        room,
        section,
        capacity,
        description,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await queryDb(insertQuery, [
      auth.website.id,
      shelf_name.trim(),
      shelf_code ? shelf_code.trim() : null,
      floor ? floor.trim() : null,
      room ? room.trim() : null,
      section ? section.trim() : null,
      parseInt(capacity, 10) || 50,
      description ? description.trim() : null,
      Boolean(is_active)
    ]);

    return NextResponse.json({ success: true, shelf: result.rows[0] });
  } catch (err) {
    console.error('Error creating book shelf:', err);
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
    const {
      id,
      shelf_name,
      shelf_code,
      floor,
      room,
      section,
      capacity = 50,
      description,
      is_active = true
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Shelf ID is required for update.' }, { status: 400 });
    }

    if (!shelf_name || !shelf_name.trim()) {
      return NextResponse.json({ success: false, error: 'Shelf name is required.' }, { status: 400 });
    }

    // Check duplicate name on other shelf
    const check = await queryDb(
      `SELECT id FROM website_book_shelves WHERE website_id = $1 AND LOWER(shelf_name) = LOWER($2) AND id != $3`,
      [auth.website.id, shelf_name.trim(), id]
    );
    if (check.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Another shelf with this name already exists.' }, { status: 400 });
    }

    const updateQuery = `
      UPDATE website_book_shelves
      SET shelf_name = $1,
          shelf_code = $2,
          floor = $3,
          room = $4,
          section = $5,
          capacity = $6,
          description = $7,
          is_active = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND website_id = $10
      RETURNING *
    `;
    const result = await queryDb(updateQuery, [
      shelf_name.trim(),
      shelf_code ? shelf_code.trim() : null,
      floor ? floor.trim() : null,
      room ? room.trim() : null,
      section ? section.trim() : null,
      parseInt(capacity, 10) || 50,
      description ? description.trim() : null,
      Boolean(is_active),
      id,
      auth.website.id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Shelf not found or unauthorized.' }, { status: 404 });
    }

    // Sync books shelf_location text to the updated shelf_name
    await queryDb(
      `UPDATE website_books SET shelf_location = $1 WHERE website_id = $2 AND shelf_id = $3`,
      [shelf_name.trim(), auth.website.id, id]
    );

    return NextResponse.json({ success: true, shelf: result.rows[0] });
  } catch (err) {
    console.error('Error updating book shelf:', err);
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
      return NextResponse.json({ success: false, error: 'Shelf ID is required for deletion.' }, { status: 400 });
    }

    // Unlink books assigned to this shelf
    await queryDb(
      `UPDATE website_books SET shelf_id = NULL, shelf_location = NULL WHERE website_id = $1 AND shelf_id = $2`,
      [auth.website.id, id]
    );

    const result = await queryDb(
      `DELETE FROM website_book_shelves WHERE id = $1 AND website_id = $2 RETURNING id, shelf_name`,
      [id, auth.website.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Shelf not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Shelf "${result.rows[0].shelf_name}" deleted successfully. Any allocated books were safely unlinked.`
    });
  } catch (err) {
    console.error('Error deleting book shelf:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
