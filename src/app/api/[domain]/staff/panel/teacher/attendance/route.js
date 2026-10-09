import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth.js';

// GET: Fetch teacher attendance roster for a date or specific teacher
export async function GET(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const teacherId = searchParams.get('teacher_id');
    const month = searchParams.get('month'); // e.g. '2026-10'

    // If teacher_id and month are provided, fetch monthly history for this teacher
    if (teacherId && month) {
      const res = await queryDb(
        `SELECT wta.id, wta.date, wta.status, wta.in_time, wta.out_time, wta.remark,
                wt.name AS teacher_name, wd.title AS designation_title
         FROM website_teacher_attendance wta
         JOIN website_teachers wt ON wt.id = wta.teacher_id
         LEFT JOIN website_designations wd ON wd.id = wt.designation_id
         WHERE wta.website_id = $1 AND wta.teacher_id = $2 AND TO_CHAR(wta.date, 'YYYY-MM') = $3
         ORDER BY wta.date ASC`,
        [website.id, teacherId, month]
      );
      return NextResponse.json({ success: true, attendance: res.rows });
    }

    // Daily roster: Return all active teachers with their attendance record for this date
    const res = await queryDb(
      `SELECT wt.id AS teacher_id, wt.name AS teacher_name, wt.email AS teacher_email,
              wt.number AS teacher_number, wt.photo_url,
              wd.title AS designation_title,
              COALESCE(wta.status, 'unmarked') AS status,
              wta.in_time, wta.out_time, wta.remark, wta.id AS attendance_id,
              $2::date AS date
       FROM website_teachers wt
       LEFT JOIN website_designations wd ON wd.id = wt.designation_id
       LEFT JOIN website_teacher_attendance wta ON wta.teacher_id = wt.id AND wta.date = $2::date AND wta.website_id = $1
       WHERE wt.website_id = $1 AND wt.is_active = TRUE
       ORDER BY wd.display_order ASC NULLS LAST, wt.name ASC`,
      [website.id, date]
    );

    // Summary counts
    const present = res.rows.filter((r) => r.status === 'present').length;
    const absent = res.rows.filter((r) => r.status === 'absent').length;
    const late = res.rows.filter((r) => r.status === 'late').length;
    const leave = res.rows.filter((r) => r.status === 'leave').length;
    const unmarked = res.rows.filter((r) => r.status === 'unmarked').length;

    return NextResponse.json({
      success: true,
      date,
      teachers: res.rows,
      summary: {
        total: res.rows.length,
        present,
        absent,
        late,
        leave,
        unmarked,
      },
    });
  } catch (error) {
    console.error('Error fetching teacher attendance:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch attendance.' }, { status: 500 });
  }
}

// POST: Take / update attendance (single or batch)
export async function POST(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const records = Array.isArray(body.records) ? body.records : [body];

    if (records.length === 0 || !records[0]?.teacher_id) {
      return NextResponse.json({ success: false, error: 'No valid attendance records provided.' }, { status: 400 });
    }

    const saved = [];
    for (const rec of records) {
      const {
        teacher_id,
        date = new Date().toISOString().split('T')[0],
        status = 'present',
        in_time = null,
        out_time = null,
        remark = null,
      } = rec;

      if (!teacher_id) continue;

      const validStatus = ['present', 'absent', 'late', 'half_day', 'leave'].includes(status) ? status : 'present';

      const res = await queryDb(
        `INSERT INTO website_teacher_attendance (website_id, teacher_id, date, status, in_time, out_time, remark)
         VALUES ($1, $2, $3::date, $4, $5, $6, $7)
         ON CONFLICT (website_id, teacher_id, date)
         DO UPDATE SET
           status = EXCLUDED.status,
           in_time = COALESCE(EXCLUDED.in_time, website_teacher_attendance.in_time),
           out_time = COALESCE(EXCLUDED.out_time, website_teacher_attendance.out_time),
           remark = COALESCE(EXCLUDED.remark, website_teacher_attendance.remark),
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [website.id, teacher_id, date, validStatus, in_time || null, out_time || null, remark?.trim() || null]
      );
      saved.push(res.rows[0]);
    }

    return NextResponse.json({
      success: true,
      saved_count: saved.length,
      records: saved,
      message: `Successfully saved ${saved.length} attendance record(s).`,
    });
  } catch (error) {
    console.error('Error saving teacher attendance:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save attendance.' }, { status: 500 });
  }
}
