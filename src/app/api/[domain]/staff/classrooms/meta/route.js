import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db.js';
import { verifyStaffClassroomAccess } from 'src/lib/middleware/classroom_auth.js';

export async function GET(request, context) {
  try {
    const auth = await verifyStaffClassroomAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const [classesRes, sessionsRes] = await Promise.all([
      query(
        `SELECT id, name AS class_name, numeric_name, code
         FROM website_classes
         WHERE website_id = $1
         ORDER BY numeric_name ASC, name ASC`,
        [auth.website.id]
      ),
      query(
        `SELECT id, name AS session_name, is_current
         FROM website_sessions
         WHERE website_id = $1
         ORDER BY is_current DESC, name DESC`,
        [auth.website.id]
      )
    ]);

    return NextResponse.json({
      success: true,
      classes: classesRes.rows,
      sessions: sessionsRes.rows
    });
  } catch (error) {
    console.error('Error in staff classroom meta:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
