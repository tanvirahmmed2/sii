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

    // 1. Fetch student basic info
    const studentRes = await queryDb(
      `SELECT s.id, s.website_id,
              COALESCE(s.registration_no, s.student_unique_id, i.data->>'registration_no', i.data->>'registration_number') AS registration_no,
              s.roll_no, s.student_unique_id, s.class_id, s.section_id, s.session_id,
              COALESCE(s.name, i.data->>'name', 'Student') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              COALESCE(c.name, i.data->>'class_name', 'General Enrollment') AS class_name,
              sec.name AS section_name,
              ses.name AS session_name,
              p.image_url AS photo_url
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id AND c.website_id = s.website_id
       LEFT JOIN website_sections sec ON sec.id = s.section_id AND sec.website_id = s.website_id
       LEFT JOIN website_sessions ses ON ses.id = s.session_id AND ses.website_id = s.website_id
       LEFT JOIN website_student_pictures p ON p.student_id = s.id AND p.is_primary = TRUE
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [studentId, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }

    const studentRow = studentRes.rows[0];
    const student = {
      ...studentRow,
      registration_number: studentRow.registration_no,
      roll: studentRow.roll_no,
    };

    // 2. Fetch Subjects Count
    let subjectsCount = 0;
    try {
      const subjectsCountRes = await queryDb(
        `SELECT COUNT(*)::int AS count 
         FROM website_class_subjects 
         WHERE website_id = $1 AND class_id = $2`,
        [website.id, student.class_id || 0]
      );
      subjectsCount = subjectsCountRes.rows[0]?.count || 0;
    } catch (e) {
      console.warn('Error fetching subjects count:', e.message);
    }

    // 3. Fetch Attendance Stats
    let totalDays = 0;
    let presentDays = 0;
    let attendanceRate = 100;
    try {
      const attRes = await queryDb(
        `SELECT 
           COUNT(*)::int AS total_days,
           COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END)::int AS present_days,
           COUNT(CASE WHEN status = 'absent' THEN 1 END)::int AS absent_days
         FROM website_student_attendances
         WHERE website_id = $1 AND student_id = $2`,
        [website.id, studentId]
      );
      totalDays = attRes.rows[0]?.total_days || 0;
      presentDays = attRes.rows[0]?.present_days || 0;
      attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
    } catch (e) {
      console.warn('Error fetching attendance stats:', e.message);
    }

    // 4. Fetch Unpaid Fees & Fines Count
    let unpaidFeesCount = 0;
    let unpaidFinesCount = 0;
    try {
      const feesRes = await queryDb(
        `SELECT 
           COUNT(CASE WHEN payment_status != 'paid' THEN 1 END)::int AS unpaid_fees,
           COALESCE(SUM(CASE WHEN payment_status != 'paid' AND fine_amount > 0 THEN 1 ELSE 0 END), 0)::int AS unpaid_fines
         FROM website_education_fee_payments
         WHERE website_id = $1 AND student_id = $2`,
        [website.id, studentId]
      );
      unpaidFeesCount = feesRes.rows[0]?.unpaid_fees || 0;
      unpaidFinesCount = feesRes.rows[0]?.unpaid_fines || 0;
    } catch (e) {
      console.warn('Error fetching fees stats:', e.message);
    }

    // 5. Fetch Clubs Count
    let clubsCount = 0;
    try {
      const clubsRes = await queryDb(
        `SELECT COUNT(*)::int AS count 
         FROM website_student_club_members 
         WHERE website_id = $1 AND student_id = $2 AND status = 'active'`,
        [website.id, studentId]
      );
      clubsCount = clubsRes.rows[0]?.count || 0;
    } catch (e) {
      console.warn('Error fetching clubs count:', e.message);
    }

    // 6. Fetch Upcoming Exams
    let upcomingExams = [];
    try {
      const upcomingExamsRes = await queryDb(
        `SELECT e.id, e.name, e.term, e.start_date, e.end_date, e.status
         FROM website_exams e
         WHERE e.website_id = $1 AND e.class_id = $2 AND e.is_published = TRUE AND e.start_date >= CURRENT_DATE - INTERVAL '1 day'
         ORDER BY e.start_date ASC
         LIMIT 5`,
        [website.id, student.class_id || 0]
      );
      upcomingExams = upcomingExamsRes.rows || [];
    } catch (e) {
      console.warn('Error fetching upcoming exams:', e.message);
    }

    // 7. Today's Class Routine
    let todayRoutine = [];
    try {
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = daysOfWeek[new Date().getDay()];

      const routineRes = await queryDb(
        `SELECT pcs.id,
                d.name AS day_name,
                d.name AS day_of_week,
                p.name AS period_name, p.start_time, p.end_time,
                sub.name AS subject_name, sub.code AS subject_code,
                t.name AS teacher_name,
                sec.name AS section_name,
                COALESCE(pcs.room_number, 'Room ' || p.id) AS room_number
         FROM website_period_class_subjects pcs
         JOIN website_periods p ON p.id = pcs.period_id
         JOIN website_days d ON d.id = p.day_id
         JOIN website_class_subjects cs ON cs.id = pcs.class_subject_id
         JOIN website_subjects sub ON sub.id = cs.subject_id
         LEFT JOIN website_sections sec ON sec.id = pcs.section_id
         LEFT JOIN website_teacher_class_periods tcp ON tcp.period_id = p.id AND tcp.class_id = cs.class_id
         LEFT JOIN website_teachers t ON t.id = tcp.teacher_id
         WHERE pcs.website_id = $1 AND cs.class_id = $2 AND LOWER(d.name) = LOWER($3)
         ORDER BY p.start_time ASC`,
        [website.id, student.class_id || 0, currentDay]
      );
      todayRoutine = routineRes.rows || [];
    } catch (e) {
      console.warn('Error fetching today routine:', e.message);
    }

    const stats = {
      subjectsCount,
      attendanceRate,
      presentAttendanceDays: presentDays,
      totalAttendanceDays: totalDays,
      unpaidFeesCount,
      unpaidFinesCount,
      clubsCount,
      upcomingExamsCount: upcomingExams.length
    };

    return NextResponse.json({
      success: true,
      stats,
      student,
      todayRoutine,
      upcomingExams,
      // Backwards-compatible payload
      payload: {
        stats,
        student,
        todayRoutine,
        upcomingExams
      }
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
