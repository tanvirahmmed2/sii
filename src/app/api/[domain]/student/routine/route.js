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

    const studentId = session.id;

    // Fetch student's class
    const studentRes = await queryDb(
      `SELECT class_id, section_id FROM website_students WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [studentId, website.id]
    );

    if (studentRes.rows.length === 0 || !studentRes.rows[0].class_id) {
      return NextResponse.json({ success: true, routine: [], payload: { routine: [] }, paylod: { routine: [] } });
    }

    const classId = studentRes.rows[0].class_id;

    // Fetch routine
    const routineRes = await queryDb(
      `SELECT pcs.id,
              d.name AS day_of_week,
              d.name AS day_name,
              p.name AS period_name,
              p.start_time,
              p.end_time,
              s.name AS subject_name,
              s.code AS subject_code,
              t.name AS teacher_name,
              sec.name AS section_name,
              COALESCE(pcs.room_number, 'Campus Room ' || p.id) AS room_number
       FROM website_period_class_subjects pcs
       JOIN website_periods p ON p.id = pcs.period_id
       JOIN website_days d ON d.id = p.day_id
       JOIN website_class_subjects cs ON cs.id = pcs.class_subject_id
       JOIN website_subjects s ON s.id = cs.subject_id
       LEFT JOIN website_sections sec ON sec.id = pcs.section_id
       LEFT JOIN website_teacher_class_periods tcp ON tcp.period_id = p.id AND tcp.class_id = cs.class_id
       LEFT JOIN website_teachers t ON t.id = tcp.teacher_id
       WHERE pcs.website_id = $1 AND cs.class_id = $2
       ORDER BY d.id ASC, p.start_time ASC`,
      [website.id, classId]
    );

    const routine = routineRes.rows;

    return NextResponse.json({
      success: true,
      routine,
      payload: { routine },
      paylod: { routine }
    });
  } catch (error) {
    console.error('Error fetching student routine:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
