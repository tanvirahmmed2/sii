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
    const type = searchParams.get('type') || 'students'; // 'students' | 'teachers' | 'books'
    const q = (searchParams.get('q') || '').trim();
    const inStockOnly = searchParams.get('in_stock_only') === 'true';

    if (type === 'students') {
      let queryText = `
        SELECT s.id,
               s.registration_no,
               s.roll_no,
               COALESCE(si.name, 'Student #' || s.registration_no) AS name,
               si.number AS phone,
               c.name AS class_name,
               sec.name AS section_name
        FROM website_students s
        LEFT JOIN website_student_info si ON si.student_id = s.id AND si.website_id = s.website_id
        LEFT JOIN website_classes c ON c.id = s.class_id AND c.website_id = s.website_id
        LEFT JOIN website_sections sec ON sec.id = s.section_id AND sec.website_id = s.website_id
        WHERE s.website_id = $1
      `;
      const params = [auth.website.id];

      if (q) {
        params.push(`%${q}%`);
        queryText += ` AND (s.registration_no ILIKE $${params.length} OR s.roll_no ILIKE $${params.length} OR si.name ILIKE $${params.length} OR si.number ILIKE $${params.length})`;
      }

      queryText += ` ORDER BY s.registration_no ASC LIMIT 30`;
      const result = await queryDb(queryText, params);
      return NextResponse.json({ success: true, targets: result.rows });
    }

    if (type === 'teachers') {
      let queryText = `
        SELECT t.id,
               t.name,
               t.email,
               t.number AS phone
        FROM website_teachers t
        WHERE t.website_id = $1 AND t.is_active = TRUE
      `;
      const params = [auth.website.id];

      if (q) {
        params.push(`%${q}%`);
        queryText += ` AND (t.name ILIKE $${params.length} OR t.email ILIKE $${params.length} OR t.number ILIKE $${params.length})`;
      }

      queryText += ` ORDER BY t.name ASC LIMIT 30`;
      const result = await queryDb(queryText, params);
      return NextResponse.json({ success: true, targets: result.rows });
    }

    if (type === 'books') {
      let queryText = `
        SELECT b.id,
               b.title,
               b.isbn,
               b.call_number,
               b.shelf_location,
               b.total_copies,
               b.available_copies,
               b.is_available,
               c.name AS category_name,
               w.name AS writer_name
        FROM website_books b
        LEFT JOIN website_book_category c ON c.id = b.category_id AND c.website_id = b.website_id
        LEFT JOIN website_book_writers w ON w.id = b.writer_id AND w.website_id = b.website_id
        WHERE b.website_id = $1
      `;
      const params = [auth.website.id];

      if (inStockOnly) {
        queryText += ` AND b.is_available = TRUE AND b.available_copies > 0`;
      }

      if (q) {
        params.push(`%${q}%`);
        queryText += ` AND (b.title ILIKE $${params.length} OR b.isbn ILIKE $${params.length} OR b.call_number ILIKE $${params.length} OR w.name ILIKE $${params.length})`;
      }

      queryText += ` ORDER BY b.title ASC LIMIT 40`;
      const result = await queryDb(queryText, params);
      return NextResponse.json({ success: true, targets: result.rows });
    }

    if (type === 'shelves') {
      let queryText = `
        SELECT s.id,
               s.shelf_name,
               s.shelf_code,
               s.floor,
               s.room,
               s.section,
               s.capacity,
               COUNT(b.id)::int AS titles_count,
               COALESCE(SUM(b.total_copies), 0)::int AS total_books_count,
               COALESCE(SUM(b.available_copies), 0)::int AS available_books_count
        FROM website_book_shelves s
        LEFT JOIN website_books b ON (b.shelf_id = s.id OR (b.shelf_id IS NULL AND b.shelf_location = s.shelf_name)) AND b.website_id = s.website_id
        WHERE s.website_id = $1 AND s.is_active = TRUE
      `;
      const params = [auth.website.id];

      if (q) {
        params.push(`%${q}%`);
        queryText += ` AND (s.shelf_name ILIKE $${params.length} OR s.shelf_code ILIKE $${params.length} OR s.room ILIKE $${params.length} OR s.floor ILIKE $${params.length})`;
      }

      queryText += ` GROUP BY s.id ORDER BY s.shelf_name ASC LIMIT 40`;
      const result = await queryDb(queryText, params);
      return NextResponse.json({ success: true, targets: result.rows });
    }

    return NextResponse.json({ success: false, error: 'Invalid search target type.' }, { status: 400 });
  } catch (err) {
    console.error('Error searching library targets:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
