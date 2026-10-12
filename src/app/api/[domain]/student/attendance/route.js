import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    const studentId = session.id;

    // 1. Fetch attendance records
    const historyRes = await queryDb(
      `SELECT a.id, a.date, a.status, a.in_time, a.out_time, a.remark,
              c.name AS class_name,
              sec.name AS section_name
       FROM website_student_attendances a
       LEFT JOIN website_classes c ON c.id = a.class_id
       LEFT JOIN website_sections sec ON sec.id = a.section_id
       WHERE a.website_id = $1 AND a.student_id = $2
       ORDER BY a.date DESC
       LIMIT 100`,
      [website.id, studentId]
    );

    // 2. Fetch Summary Statistics
    const sumRes = await queryDb(
      `SELECT 
         COUNT(*)::int AS total,
         COUNT(CASE WHEN status = 'present' THEN 1 END)::int AS present,
         COUNT(CASE WHEN status = 'absent' THEN 1 END)::int AS absent,
         COUNT(CASE WHEN status = 'late' THEN 1 END)::int AS late,
         COUNT(CASE WHEN status = 'leave' THEN 1 END)::int AS leave
       FROM website_student_attendances
       WHERE website_id = $1 AND student_id = $2`,
      [website.id, studentId]
    );

    const rawSummary = sumRes.rows[0] || { total: 0, present: 0, absent: 0, late: 0, leave: 0 };
    const total = rawSummary.total || 0;
    const present = rawSummary.present || 0;
    const late = rawSummary.late || 0;
    const absent = rawSummary.absent || 0;
    const leave = rawSummary.leave || 0;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    const summary = {
      total,
      present,
      absent,
      late,
      leave,
      rate
    };

    return NextResponse.json({
      success: true,
      summary,
      history: historyRes.rows,
      // Backwards-compatible payload
      payload: {
        summary,
        history: historyRes.rows
      },
      paylod: {
        summary,
        history: historyRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
