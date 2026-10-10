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
    const categoryId = searchParams.get('category_id');
    const writerId = searchParams.get('writer_id');
    const publisherId = searchParams.get('publisher_id');
    const shelfId = searchParams.get('shelf_id');
    const availability = searchParams.get('availability'); // 'available' | 'out_of_stock' | 'unavailable' | 'all'
    const shelf = searchParams.get('shelf');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let queryText = `
      SELECT b.*,
             COALESCE(b.shelf_id, sh.id) AS shelf_id,
             COALESCE(sh.shelf_name, b.shelf_location) AS shelf_name,
             sh.shelf_code,
             sh.floor AS shelf_floor,
             sh.room AS shelf_room,
             sh.section AS shelf_section,
             c.name AS category_name,
             c.code AS category_code,
             w.name AS writer_name,
             p.name AS publisher_name,
             COALESCE(stu.active_student_issues, 0)::int AS active_student_issues,
             COALESCE(tea.active_teacher_issues, 0)::int AS active_teacher_issues,
             (COALESCE(stu.active_student_issues, 0) + COALESCE(tea.active_teacher_issues, 0))::int AS total_active_issues
      FROM website_books b
      LEFT JOIN website_book_category c ON c.id = b.category_id AND c.website_id = b.website_id
      LEFT JOIN website_book_writers w ON w.id = b.writer_id AND w.website_id = b.website_id
      LEFT JOIN website_book_publishers p ON p.id = b.publisher_id AND p.website_id = b.website_id
      LEFT JOIN website_book_shelves sh ON (sh.id = b.shelf_id OR (b.shelf_id IS NULL AND b.shelf_location = sh.shelf_name)) AND sh.website_id = b.website_id
      LEFT JOIN (
        SELECT book_id, COUNT(*)::int AS active_student_issues
        FROM website_book_student_issues
        WHERE website_id = $1 AND status IN ('issued', 'overdue')
        GROUP BY book_id
      ) stu ON stu.book_id = b.id
      LEFT JOIN (
        SELECT book_id, COUNT(*)::int AS active_teacher_issues
        FROM website_book_teacher_issues
        WHERE website_id = $1 AND status IN ('issued', 'overdue')
        GROUP BY book_id
      ) tea ON tea.book_id = b.id
      WHERE b.website_id = $1
    `;
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (b.title ILIKE $${params.length} OR b.isbn ILIKE $${params.length} OR b.call_number ILIKE $${params.length} OR w.name ILIKE $${params.length} OR b.shelf_location ILIKE $${params.length} OR sh.shelf_name ILIKE $${params.length})`;
    }

    if (categoryId) {
      params.push(categoryId);
      queryText += ` AND b.category_id = $${params.length}`;
    }

    if (writerId) {
      params.push(writerId);
      queryText += ` AND b.writer_id = $${params.length}`;
    }

    if (publisherId) {
      params.push(publisherId);
      queryText += ` AND b.publisher_id = $${params.length}`;
    }

    if (shelfId) {
      params.push(shelfId);
      queryText += ` AND (b.shelf_id = $${params.length} OR sh.id = $${params.length})`;
    }

    if (shelf) {
      params.push(`%${shelf}%`);
      queryText += ` AND (b.shelf_location ILIKE $${params.length} OR sh.shelf_name ILIKE $${params.length})`;
    }

    if (availability === 'available') {
      queryText += ` AND b.is_available = TRUE AND b.available_copies > 0`;
    } else if (availability === 'out_of_stock') {
      queryText += ` AND (b.available_copies = 0 OR b.is_available = FALSE)`;
    } else if (availability === 'disabled') {
      queryText += ` AND b.is_available = FALSE`;
    }

    queryText += ` ORDER BY b.title ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryDb(queryText, params);

    // KPI Counters
    const kpiRes = await queryDb(
      `SELECT
         COUNT(id)::int AS total_titles,
         COALESCE(SUM(total_copies), 0)::int AS sum_total_copies,
         COALESCE(SUM(available_copies), 0)::int AS sum_available_copies,
         COALESCE(SUM(CASE WHEN is_available = TRUE AND available_copies > 0 THEN 1 ELSE 0 END), 0)::int AS active_available_titles
       FROM website_books
       WHERE website_id = $1`,
      [auth.website.id]
    );

    return NextResponse.json({
      success: true,
      books: result.rows,
      metrics: kpiRes.rows[0]
    });
  } catch (err) {
    console.error('Error fetching books:', err);
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
      title,
      isbn,
      edition,
      category_id,
      writer_id,
      publisher_id,
      shelf_id,
      call_number,
      shelf_location,
      price = 0,
      total_copies = 1,
      available_copies,
      is_available = true,
      description,
      cover_image_url
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Book title is required.' }, { status: 400 });
    }

    const total = parseInt(total_copies, 10);
    if (isNaN(total) || total < 0) {
      return NextResponse.json({ success: false, error: 'Total copies must be a non-negative integer.' }, { status: 400 });
    }

    const avail = available_copies !== undefined && available_copies !== null
      ? parseInt(available_copies, 10)
      : total;

    if (isNaN(avail) || avail < 0) {
      return NextResponse.json({ success: false, error: 'Available copies must be a non-negative integer.' }, { status: 400 });
    }

    if (avail > total) {
      return NextResponse.json({ success: false, error: 'Available copies cannot exceed total copies.' }, { status: 400 });
    }

    const computedAvailability = avail > 0 ? Boolean(is_available) : false;

    let targetShelfId = shelf_id ? parseInt(shelf_id, 10) : null;
    let targetShelfLoc = shelf_location ? shelf_location.trim() : null;
    if (targetShelfId) {
      const shRes = await queryDb('SELECT shelf_name FROM website_book_shelves WHERE id = $1 AND website_id = $2', [targetShelfId, auth.website.id]);
      if (shRes.rows[0]) targetShelfLoc = shRes.rows[0].shelf_name;
    } else if (targetShelfLoc) {
      const shRes = await queryDb('SELECT id FROM website_book_shelves WHERE LOWER(shelf_name) = LOWER($1) AND website_id = $2', [targetShelfLoc, auth.website.id]);
      if (shRes.rows[0]) targetShelfId = shRes.rows[0].id;
    }

    const insertRes = await queryDb(
      `INSERT INTO website_books (
         website_id, category_id, writer_id, publisher_id, shelf_id,
         title, isbn, edition, call_number, shelf_location,
         price, total_copies, available_copies, is_available,
         description, cover_image_url
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        auth.website.id,
        category_id ? parseInt(category_id, 10) : null,
        writer_id ? parseInt(writer_id, 10) : null,
        publisher_id ? parseInt(publisher_id, 10) : null,
        targetShelfId,
        title.trim(),
        isbn ? isbn.trim() : null,
        edition ? edition.trim() : null,
        call_number ? call_number.trim() : null,
        targetShelfLoc,
        parseFloat(price) || 0.00,
        total,
        avail,
        computedAvailability,
        description ? description.trim() : null,
        cover_image_url ? cover_image_url.trim() : null
      ]
    );

    return NextResponse.json({ success: true, book: insertRes.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Error creating book:', err);
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
      title,
      isbn,
      edition,
      category_id,
      writer_id,
      publisher_id,
      shelf_id,
      call_number,
      shelf_location,
      price,
      total_copies,
      available_copies,
      is_available,
      description,
      cover_image_url
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Book ID is required.' }, { status: 400 });
    }

    // Fetch existing book
    const existing = await queryDb(
      `SELECT * FROM website_books WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Book not found.' }, { status: 404 });
    }
    const current = existing.rows[0];

    const finalTitle = title !== undefined ? title.trim() : current.title;
    if (!finalTitle) {
      return NextResponse.json({ success: false, error: 'Book title cannot be empty.' }, { status: 400 });
    }

    const finalTotal = total_copies !== undefined ? parseInt(total_copies, 10) : current.total_copies;
    if (isNaN(finalTotal) || finalTotal < 0) {
      return NextResponse.json({ success: false, error: 'Total copies must be a non-negative integer.' }, { status: 400 });
    }

    let finalAvail = available_copies !== undefined ? parseInt(available_copies, 10) : current.available_copies;
    if (isNaN(finalAvail) || finalAvail < 0) {
      return NextResponse.json({ success: false, error: 'Available copies must be a non-negative integer.' }, { status: 400 });
    }

    if (finalAvail > finalTotal) {
      return NextResponse.json({ success: false, error: 'Available copies cannot exceed total copies.' }, { status: 400 });
    }

    let finalIsAvailable = is_available !== undefined ? Boolean(is_available) : current.is_available;
    if (finalAvail === 0) {
      finalIsAvailable = false;
    }

    let targetShelfId = shelf_id !== undefined ? (shelf_id ? parseInt(shelf_id, 10) : null) : current.shelf_id;
    let targetShelfLoc = shelf_location !== undefined ? (shelf_location ? shelf_location.trim() : null) : current.shelf_location;
    if (shelf_id !== undefined && targetShelfId) {
      const shRes = await queryDb('SELECT shelf_name FROM website_book_shelves WHERE id = $1 AND website_id = $2', [targetShelfId, auth.website.id]);
      if (shRes.rows[0]) targetShelfLoc = shRes.rows[0].shelf_name;
    } else if (shelf_location !== undefined && targetShelfLoc && !targetShelfId) {
      const shRes = await queryDb('SELECT id FROM website_book_shelves WHERE LOWER(shelf_name) = LOWER($1) AND website_id = $2', [targetShelfLoc, auth.website.id]);
      if (shRes.rows[0]) targetShelfId = shRes.rows[0].id;
    }

    const updateRes = await queryDb(
      `UPDATE website_books
       SET title = $1,
           isbn = $2,
           edition = $3,
           category_id = $4,
           writer_id = $5,
           publisher_id = $6,
           call_number = $7,
           shelf_location = $8,
           price = $9,
           total_copies = $10,
           available_copies = $11,
           is_available = $12,
           description = $13,
           cover_image_url = $14,
           shelf_id = $15,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $16 AND website_id = $17
       RETURNING *`,
      [
        finalTitle,
        isbn !== undefined ? (isbn ? isbn.trim() : null) : current.isbn,
        edition !== undefined ? (edition ? edition.trim() : null) : current.edition,
        category_id !== undefined ? (category_id ? parseInt(category_id, 10) : null) : current.category_id,
        writer_id !== undefined ? (writer_id ? parseInt(writer_id, 10) : null) : current.writer_id,
        publisher_id !== undefined ? (publisher_id ? parseInt(publisher_id, 10) : null) : current.publisher_id,
        call_number !== undefined ? (call_number ? call_number.trim() : null) : current.call_number,
        targetShelfLoc,
        price !== undefined ? parseFloat(price) || 0.00 : current.price,
        finalTotal,
        finalAvail,
        finalIsAvailable,
        description !== undefined ? (description ? description.trim() : null) : current.description,
        cover_image_url !== undefined ? (cover_image_url ? cover_image_url.trim() : null) : current.cover_image_url,
        targetShelfId,
        id,
        auth.website.id
      ]
    );

    return NextResponse.json({ success: true, book: updateRes.rows[0] });
  } catch (err) {
    console.error('Error updating book:', err);
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
      return NextResponse.json({ success: false, error: 'Book ID is required.' }, { status: 400 });
    }

    // Check if there are active loans
    const loanCheck = await queryDb(
      `SELECT
         (SELECT COUNT(*) FROM website_book_student_issues WHERE book_id = $1 AND website_id = $2 AND status IN ('issued', 'overdue'))::int AS stu_active,
         (SELECT COUNT(*) FROM website_book_teacher_issues WHERE book_id = $1 AND website_id = $2 AND status IN ('issued', 'overdue'))::int AS tea_active`,
      [id, auth.website.id]
    );

    const activeTotal = (loanCheck.rows[0]?.stu_active || 0) + (loanCheck.rows[0]?.tea_active || 0);
    if (activeTotal > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete book while ${activeTotal} active loan(s) exist. Mark them returned first.`
      }, { status: 409 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_books WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Book not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Book "${delRes.rows[0].title}" removed successfully.` });
  } catch (err) {
    console.error('Error deleting book:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
