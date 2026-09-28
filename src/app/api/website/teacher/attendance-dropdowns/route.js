import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated', error: 'Unauthorized', paylod: null },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid token', error: 'Unauthorized', paylod: null },
        { status: 401 }
      );
    }

    const teacherId = decoded.id;
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD (optional)

    if (!dateParam) {
      // ── FETCH ALL TEACHER ASSIGNMENTS & PERIODS (NO DATE SPECIFIED) ──
      const assignmentsRes = await query(
        `SELECT DISTINCT
           c.id   AS class_id,    c.name  AS class_name,
           sec.id AS section_id,  sec.name AS section_name,
           sub.id AS subject_id,  sub.name AS subject_name, sub.code AS subject_code
         FROM class_subject_teachers cst
         JOIN class_subjects cs  ON cst.class_subject_id = cs.id
         JOIN classes        c   ON cs.class_id  = c.id
         LEFT JOIN sections  sec ON cst.section_id = sec.id
         JOIN subjects       sub ON cs.subject_id  = sub.id
         WHERE cst.teacher_id = $1
         ORDER BY c.name ASC, sec.name ASC, sub.name ASC`,
        [teacherId]
      );

      const periodsRes = await query(
        `SELECT id, name, start_time, end_time FROM periods ORDER BY start_time ASC`
      );

      return NextResponse.json(
        {
          success: true,
          message: 'All teacher assignments and periods retrieved successfully.',
          paylod: {
            day: null,
            date: null,
            assignments: assignmentsRes.rows,
            periods: periodsRes.rows,
          }
        },
        { status: 200 }
      );
    }

    // Derive day name from date string safely
    const [year, month, day] = dateParam.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[localDate.getDay()];

    // ── 1. Fetch teacher's scheduled routines for this day of the week ──
    const routinesRes = await query(
      `SELECT DISTINCT
         c.id   AS class_id,    c.name  AS class_name,
         sec.id AS section_id,  sec.name AS section_name,
         sub.id AS subject_id,  sub.name AS subject_name, sub.code AS subject_code,
         cr.start_time,
         cr.end_time
       FROM class_routines cr
       JOIN classes         c   ON cr.class_id  = c.id
       LEFT JOIN sections   sec ON cr.section_id = sec.id
       JOIN subjects        sub ON cr.subject_id  = sub.id
       JOIN days            d   ON cr.day_id = d.id AND LOWER(d.name) = LOWER($2)
       JOIN class_subjects  cs  ON cs.class_id = cr.class_id AND cs.subject_id = cr.subject_id
       JOIN class_subject_teachers cst ON cst.class_subject_id = cs.id 
                                       AND (cst.section_id = cr.section_id OR cst.section_id IS NULL OR cr.section_id IS NULL)
       WHERE cst.teacher_id = $1
       ORDER BY cr.start_time ASC`,
      [teacherId, dayName]
    );

    const routines = routinesRes.rows;

    // ── 2. Auto-create periods from routines if they are missing in the periods table ──
    const routineTimePairs = [];
    const seen = new Set();
    for (const r of routines) {
      const startStr = String(r.start_time).slice(0, 5); // "09:00"
      const endStr   = String(r.end_time).slice(0, 5);   // "10:00"
      const key = `${startStr}|${endStr}`;
      if (!seen.has(key)) {
        seen.add(key);
        routineTimePairs.push({ start: startStr, end: endStr });
      }
    }

    for (const pair of routineTimePairs) {
      const existingPeriod = await query(
        `SELECT id FROM periods
         WHERE start_time = $1
            OR start_time = $2
            OR start_time LIKE $3
         LIMIT 1`,
        [pair.start, pair.start + ':00', pair.start + '%']
      );

      if (existingPeriod.rows.length === 0) {
        const countRes = await query(`SELECT COUNT(*) AS cnt FROM periods`);
        const periodNum = parseInt(countRes.rows[0].cnt, 10) + 1;

        await query(
          `INSERT INTO periods (name, start_time, end_time)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [`Period ${periodNum}`, pair.start, pair.end]
        );
      }
    }

    // ── 3. Fetch ONLY the periods that correspond to this teacher's routines on this day ──
    const periodsRes = await query(
      `SELECT DISTINCT p.id, p.name, p.start_time, p.end_time
       FROM periods p
       WHERE EXISTS (
         SELECT 1 FROM class_routines cr
         JOIN days d ON cr.day_id = d.id AND LOWER(d.name) = LOWER($2)
         JOIN class_subjects cs ON cs.class_id = cr.class_id AND cs.subject_id = cr.subject_id
         JOIN class_subject_teachers cst ON cst.class_subject_id = cs.id 
                                         AND (cst.section_id = cr.section_id OR cst.section_id IS NULL OR cr.section_id IS NULL)
         WHERE cst.teacher_id = $1
           AND (
                p.start_time = TO_CHAR(cr.start_time, 'HH24:MI')
             OR p.start_time = TO_CHAR(cr.start_time, 'HH:MI')
             OR p.start_time = LEFT(cr.start_time::text, 5)
             OR p.start_time LIKE LEFT(cr.start_time::text, 5) || '%'
           )
       )
       ORDER BY p.start_time ASC`,
      [teacherId, dayName]
    );

    return NextResponse.json(
      {
        success: true,
        message: `Data for ${dayName} retrieved successfully.`,
        paylod: {
          day: dayName,
          date: dateParam,
          assignments: routines,    // only scheduled classes/subjects for this day!
          periods: periodsRes.rows,  // only periods that are scheduled for this teacher today!
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching teacher attendance dropdowns:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: 'Internal Server Error', paylod: null },
      { status: 500 }
    );
  }
}
