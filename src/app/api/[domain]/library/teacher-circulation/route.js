import { NextResponse } from 'next/server';
import { pool, queryDb } from 'src/lib/database/db.js';
import { verifyLibraryAccess } from 'src/lib/middleware/library_auth.js';

export async function GET(request, context) {
  try {
    const auth = await verifyLibraryAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all'; // 'all', 'issued', 'returned', 'overdue'
    const teacherId = searchParams.get('teacher_id');
    const bookId = searchParams.get('book_id');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let queryText = `
      SELECT i.*,
             b.title AS book_title,
             b.isbn AS book_isbn,
             b.call_number AS book_call_number,
             b.shelf_location AS book_shelf,
             t.name AS teacher_name,
             t.email AS teacher_email,
             t.number AS teacher_phone,
             ret.id AS return_id,
             ret.return_date AS actual_return_date,
             ret.fine_amount,
             ret.fine_status,
             ret.condition_note,
             ret.received_by_name,
             ret.received_by_type,
             CASE
               WHEN i.status = 'issued' AND i.due_date < CURRENT_DATE THEN 'overdue'
               ELSE i.status
             END AS computed_status,
             CASE
               WHEN i.status = 'issued' AND i.due_date < CURRENT_DATE THEN (CURRENT_DATE - i.due_date)::int
               ELSE 0
             END AS days_overdue
      FROM website_book_teacher_issues i
      JOIN website_books b ON b.id = i.book_id AND b.website_id = i.website_id
      JOIN website_teachers t ON t.id = i.teacher_id AND t.website_id = i.website_id
      LEFT JOIN website_book_teacher_returns ret ON ret.issue_id = i.id AND ret.website_id = i.website_id
      WHERE i.website_id = $1
    `;
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (b.title ILIKE $${params.length} OR b.isbn ILIKE $${params.length} OR t.name ILIKE $${params.length} OR t.email ILIKE $${params.length} OR t.number ILIKE $${params.length})`;
    }

    if (teacherId) {
      params.push(teacherId);
      queryText += ` AND i.teacher_id = $${params.length}`;
    }

    if (bookId) {
      params.push(bookId);
      queryText += ` AND i.book_id = $${params.length}`;
    }

    if (status === 'issued') {
      queryText += ` AND i.status = 'issued' AND i.due_date >= CURRENT_DATE`;
    } else if (status === 'overdue') {
      queryText += ` AND (i.status = 'overdue' OR (i.status = 'issued' AND i.due_date < CURRENT_DATE))`;
    } else if (status === 'returned') {
      queryText += ` AND i.status = 'returned'`;
    }

    queryText += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryDb(queryText, params);

    // Circulation KPI counts
    const countsRes = await queryDb(
      `SELECT
         COUNT(i.id)::int AS total_issues,
         COALESCE(SUM(CASE WHEN i.status = 'issued' AND i.due_date >= CURRENT_DATE THEN 1 ELSE 0 END), 0)::int AS active_issues,
         COALESCE(SUM(CASE WHEN (i.status = 'overdue' OR (i.status = 'issued' AND i.due_date < CURRENT_DATE)) THEN 1 ELSE 0 END), 0)::int AS overdue_issues,
         COALESCE(SUM(CASE WHEN i.status = 'returned' THEN 1 ELSE 0 END), 0)::int AS returned_count
       FROM website_book_teacher_issues i
       WHERE i.website_id = $1`,
      [auth.website.id]
    );

    return NextResponse.json({
      success: true,
      issues: result.rows,
      metrics: countsRes.rows[0]
    });
  } catch (err) {
    console.error('Error fetching teacher circulation:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const action = body.action || 'issue';

    const requiredPerm = action === 'issue' ? 'create' : 'edit';
    const auth = await verifyLibraryAccess(request, context, requiredPerm);
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    await client.query('BEGIN');

    if (action === 'issue') {
      const { book_id, teacher_id, due_date, remarks } = body;

      if (!book_id || !teacher_id || !due_date) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          error: 'Book ID, Teacher ID, and Due Date are required to issue a book.'
        }, { status: 400 });
      }

      // 1. Lock and inspect book row
      const bookRes = await client.query(
        `SELECT id, title, total_copies, available_copies, is_available
         FROM website_books
         WHERE id = $1 AND website_id = $2
         FOR UPDATE`,
        [book_id, auth.website.id]
      );

      if (bookRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Book not found.' }, { status: 404 });
      }

      const book = bookRes.rows[0];
      if (book.available_copies <= 0 || !book.is_available) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          error: `Book "${book.title}" is currently out of stock or unavailable for circulation.`
        }, { status: 400 });
      }

      // 2. Validate Teacher
      const teaRes = await client.query(
        `SELECT id, name, email FROM website_teachers WHERE id = $1 AND website_id = $2`,
        [teacher_id, auth.website.id]
      );

      if (teaRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Teacher record not found.' }, { status: 404 });
      }

      // 3. Create issue record
      const issueRes = await client.query(
        `INSERT INTO website_book_teacher_issues (
           website_id, book_id, teacher_id,
           issued_by_type, issued_by_id, issued_by_name,
           issue_date, due_date, status, remarks
         )
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, 'issued', $8)
         RETURNING *`,
        [
          auth.website.id,
          book_id,
          teacher_id,
          auth.actor.type,
          auth.actor.id,
          auth.actor.name,
          due_date,
          remarks ? remarks.trim() : null
        ]
      );

      // 4. Reduce stock of available books; if available becomes 0, set is_available = FALSE
      const newAvail = book.available_copies - 1;
      const newIsAvailable = newAvail > 0 ? book.is_available : false;

      await client.query(
        `UPDATE website_books
         SET available_copies = $1,
             is_available = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [newAvail, newIsAvailable, book_id]
      );

      await client.query('COMMIT');
      return NextResponse.json({
        success: true,
        issue: issueRes.rows[0],
        updated_stock: { available_copies: newAvail, is_available: newIsAvailable }
      }, { status: 201 });
    }

    if (action === 'return') {
      const { issue_id, fine_amount = 0, fine_status = 'none', condition_note } = body;

      if (!issue_id) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Issue ID is required for return.' }, { status: 400 });
      }

      // 1. Lock and inspect issue row
      const issueRes = await client.query(
        `SELECT * FROM website_book_teacher_issues
         WHERE id = $1 AND website_id = $2
         FOR UPDATE`,
        [issue_id, auth.website.id]
      );

      if (issueRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Issue record not found.' }, { status: 404 });
      }

      const issue = issueRes.rows[0];
      if (issue.status === 'returned') {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'This book has already been marked as returned.' }, { status: 400 });
      }

      // 2. Lock book row
      const bookRes = await client.query(
        `SELECT id, total_copies, available_copies, is_available
         FROM website_books
         WHERE id = $1 AND website_id = $2
         FOR UPDATE`,
        [issue.book_id, auth.website.id]
      );

      if (bookRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Referenced book not found.' }, { status: 404 });
      }
      const book = bookRes.rows[0];

      // 3. Create return audit record
      const returnRes = await client.query(
        `INSERT INTO website_book_teacher_returns (
           website_id, issue_id, book_id, teacher_id,
           received_by_type, received_by_id, received_by_name,
           return_date, fine_amount, fine_status, condition_note
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9, $10)
         RETURNING *`,
        [
          auth.website.id,
          issue.id,
          issue.book_id,
          issue.teacher_id,
          auth.actor.type,
          auth.actor.id,
          auth.actor.name,
          parseFloat(fine_amount) || 0.00,
          fine_status || 'none',
          condition_note ? condition_note.trim() : null
        ]
      );

      // 4. Update issue record
      await client.query(
        `UPDATE website_book_teacher_issues
         SET status = 'returned',
             return_date = CURRENT_DATE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [issue.id]
      );

      // 5. Increase available stock and restore availability
      const restoredAvail = Math.min(book.total_copies, book.available_copies + 1);

      await client.query(
        `UPDATE website_books
         SET available_copies = $1,
             is_available = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [restoredAvail, book.id]
      );

      await client.query('COMMIT');
      return NextResponse.json({
        success: true,
        return_record: returnRes.rows[0],
        updated_stock: { available_copies: restoredAvail, is_available: true }
      });
    }

    await client.query('ROLLBACK');
    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing teacher circulation:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request, context) {
  const client = await pool.connect();
  try {
    const auth = await verifyLibraryAccess(request, context, 'delete');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Issue ID is required.' }, { status: 400 });
    }

    await client.query('BEGIN');

    const issueRes = await client.query(
      `SELECT * FROM website_book_teacher_issues WHERE id = $1 AND website_id = $2 FOR UPDATE`,
      [id, auth.website.id]
    );

    if (issueRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Issue record not found.' }, { status: 404 });
    }

    const issue = issueRes.rows[0];

    // If deleting an unreturned loan, restore the book copy to stock
    if (issue.status === 'issued' || issue.status === 'overdue') {
      await client.query(
        `UPDATE website_books
         SET available_copies = LEAST(total_copies, available_copies + 1),
             is_available = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND website_id = $2`,
        [issue.book_id, auth.website.id]
      );
    }

    await client.query(
      `DELETE FROM website_book_teacher_issues WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Teacher issue record deleted successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting teacher issue record:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
