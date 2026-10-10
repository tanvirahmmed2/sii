import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyLibraryAccess } from 'src/lib/middleware/library_auth.js';

export async function GET(request, context) {
  try {
    const auth = await verifyLibraryAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const res = await queryDb(
      `SELECT
         (SELECT COUNT(*)::int FROM website_books WHERE website_id = $1) AS total_titles,
         (SELECT COALESCE(SUM(total_copies), 0)::int FROM website_books WHERE website_id = $1) AS total_inventory_copies,
         (SELECT COALESCE(SUM(available_copies), 0)::int FROM website_books WHERE website_id = $1) AS total_available_copies,
         (SELECT COUNT(*)::int FROM website_books WHERE website_id = $1 AND available_copies = 0) AS out_of_stock_titles,
         (SELECT COUNT(*)::int FROM website_book_category WHERE website_id = $1) AS total_categories,
         (SELECT COUNT(*)::int FROM website_book_writers WHERE website_id = $1) AS total_writers,
         (SELECT COUNT(*)::int FROM website_book_publishers WHERE website_id = $1) AS total_publishers,
         (SELECT COUNT(*)::int FROM website_book_shelves WHERE website_id = $1) AS total_shelves,
         (SELECT COALESCE(SUM(capacity), 0)::int FROM website_book_shelves WHERE website_id = $1) AS total_shelf_capacity,
         (SELECT COUNT(*)::int FROM website_book_student_issues WHERE website_id = $1 AND status = 'issued') AS active_student_loans,
         (SELECT COUNT(*)::int FROM website_book_student_issues WHERE website_id = $1 AND (status = 'overdue' OR (status = 'issued' AND due_date < CURRENT_DATE))) AS overdue_student_loans,
         (SELECT COUNT(*)::int FROM website_book_teacher_issues WHERE website_id = $1 AND status = 'issued') AS active_teacher_loans,
         (SELECT COUNT(*)::int FROM website_book_teacher_issues WHERE website_id = $1 AND (status = 'overdue' OR (status = 'issued' AND due_date < CURRENT_DATE))) AS overdue_teacher_loans,
         (SELECT COUNT(*)::int FROM website_book_student_returns WHERE website_id = $1) AS student_return_logs,
         (SELECT COUNT(*)::int FROM website_book_teacher_returns WHERE website_id = $1) AS teacher_return_logs,
         (SELECT COALESCE(SUM(fine_amount), 0)::numeric FROM website_book_student_returns WHERE website_id = $1) AS student_fines_collected,
         (SELECT COALESCE(SUM(fine_amount), 0)::numeric FROM website_book_teacher_returns WHERE website_id = $1) AS teacher_fines_collected
      `,
      [auth.website.id]
    );

    return NextResponse.json({
      success: true,
      stats: res.rows[0]
    });
  } catch (err) {
    console.error('Error fetching library stats:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
