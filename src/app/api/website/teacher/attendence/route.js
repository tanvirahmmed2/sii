import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

// ─── POST: Save attendance records ────────────────────────────────────────────
export async function POST(request) {
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
    const { class_id, section_id, subject_id, period_id, date, records } = await request.json();

    if (!class_id || !subject_id || !period_id || !date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        {
          success: false,
          message: 'class_id, subject_id, period_id, date, and records array are required.',
          error: 'Bad Request',
          paylod: null
        },
        { status: 400 }
      );
    }

    // Verify teacher is assigned to this class+subject
    const authCheck = await query(
      `SELECT 1 FROM class_subject_teachers cst
       JOIN class_subjects cs ON cst.class_subject_id = cs.id
       WHERE cst.teacher_id = $1
         AND cs.class_id = $2
         AND cs.subject_id = $3
         ${section_id ? 'AND (cst.section_id = $4 OR cst.section_id IS NULL)' : ''}
       LIMIT 1`,
      section_id ? [teacherId, class_id, subject_id, section_id] : [teacherId, class_id, subject_id]
    );

    if (authCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authorized to record attendance for this class/subject.',
          error: 'Forbidden',
          paylod: null
        },
        { status: 403 }
      );
    }

    let saved = 0;
    const errors = [];

    const normalizeStatus = (rawStatus) => {
      if (!rawStatus) return 'Present';
      const s = String(rawStatus).trim().toUpperCase();
      if (s === 'P' || s === 'PRESENT' || s === '1') return 'Present';
      if (s === 'A' || s === 'ABSENT' || s === '0') return 'Absent';
      if (s === 'L' || s === 'LATE') return 'Late';
      if (s === 'V' || s === 'LEAVE' || s === 'ON LEAVE') return 'On Leave';
      return 'Present';
    };

    for (const rec of records) {
      const { student_id, status: rawStatus, remarks } = rec;
      if (!student_id || !rawStatus) continue;

      const status = normalizeStatus(rawStatus);

      try {
        await query(
          `INSERT INTO student_attendances (student_id, class_id, subject_id, period_id, date, status, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (student_id, date, subject_id, period_id)
           DO UPDATE SET
             status = EXCLUDED.status,
             remarks = EXCLUDED.remarks,
             updated_at = CURRENT_TIMESTAMP`,
          [student_id, class_id, subject_id, period_id, date, status, remarks || null]
        );
        saved++;
      } catch (err) {
        console.error(`Failed to save attendance for student_id ${student_id}:`, err);
        errors.push(`Failed to save record for student_id ${student_id}.`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Attendance saved for ${saved} student(s).`,
        paylod: { saved, total: records.length, errors }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving teacher attendance records:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while saving attendance.',
        error: 'Internal Server Error',
        paylod: null
      },
      { status: 500 }
    );
  }
}

// ─── GET: Two modes ────────────────────────────────────────────────────────────
// ?mode=sheet  → attendance sheet for a specific class/subject/period/date (for marking)
// ?mode=records (default) → saved records across teacher's classes with filters
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
    const mode = searchParams.get('mode') || 'records';

    // ── MODE: sheet ─────────────────────────────────────────────────────────
    if (mode === 'sheet') {
      const classId   = searchParams.get('class_id');
      const sectionId = searchParams.get('section_id');
      const subjectId = searchParams.get('subject_id');
      const periodId  = searchParams.get('period_id');
      const date      = searchParams.get('date');

      if (!classId || !subjectId || !periodId || !date) {
        return NextResponse.json(
          {
            success: false,
            message: 'class_id, subject_id, period_id, and date are required for sheet mode.',
            error: 'Bad Request',
            paylod: null
          },
          { status: 400 }
        );
      }

      // Verify teacher assignment
      const authCheck = await query(
        `SELECT 1 FROM class_subject_teachers cst
         JOIN class_subjects cs ON cst.class_subject_id = cs.id
         WHERE cst.teacher_id = $1
           AND cs.class_id = $2
           AND cs.subject_id = $3
           ${sectionId ? 'AND (cst.section_id = $4 OR cst.section_id IS NULL)' : ''}
         LIMIT 1`,
        sectionId ? [teacherId, classId, subjectId, sectionId] : [teacherId, classId, subjectId]
      );

      if (authCheck.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'You are not authorized to view attendance for this class/subject.',
            error: 'Forbidden',
            paylod: null
          },
          { status: 403 }
        );
      }

      const sqlSheet = `
        SELECT
          s.id AS student_id,
          s.name AS student_name,
          s.registration_number,
          COALESCE(sa.status, 'Present') AS status,
          sa.remarks,
          sa.id AS attendance_id
        FROM students s
        LEFT JOIN student_attendances sa ON s.id = sa.student_id
          AND sa.date = $2
          AND sa.subject_id = $3
          AND sa.period_id = $4
        WHERE s.class_id = $1
          ${sectionId ? 'AND s.section_id = $5' : ''}
          AND s.is_registered = TRUE
        ORDER BY s.registration_number ASC
      `;

      const sheetParams = sectionId
        ? [classId, date, subjectId, periodId, sectionId]
        : [classId, date, subjectId, periodId];

      const sheetResult = await query(sqlSheet, sheetParams);

      return NextResponse.json(
        {
          success: true,
          message: 'Attendance sheet loaded successfully.',
          paylod: { attendanceSheet: sheetResult.rows }
        },
        { status: 200 }
      );
    }

    // ── MODE: records (default) ─────────────────────────────────────────────
    // Returns saved attendance records for teacher's classes with optional filters
    const filterDate    = searchParams.get('date');
    const filterClassId = searchParams.get('class_id');
    const filterSubjectId = searchParams.get('subject_id');
    const filterPeriodId  = searchParams.get('period_id');

    // Build WHERE clauses
    const conditions = [
      `EXISTS (
        SELECT 1 FROM class_subject_teachers cst
        JOIN class_subjects cs ON cst.class_subject_id = cs.id
        WHERE cst.teacher_id = $1
          AND cs.class_id = sa.class_id
          AND cs.subject_id = sa.subject_id
          AND (cst.section_id = s.section_id OR cst.section_id IS NULL OR s.section_id IS NULL)
      )`
    ];
    const params = [teacherId];
    let paramIdx = 2;

    if (filterDate) {
      conditions.push(`sa.date = $${paramIdx++}`);
      params.push(filterDate);
    }
    if (filterClassId) {
      conditions.push(`c.id = $${paramIdx++}`);
      params.push(filterClassId);
    }
    if (filterSubjectId) {
      conditions.push(`sub.id = $${paramIdx++}`);
      params.push(filterSubjectId);
    }
    if (filterPeriodId) {
      conditions.push(`p.id = $${paramIdx++}`);
      params.push(filterPeriodId);
    }

    const whereClause = conditions.join(' AND ');

    const recordsRes = await query(
      `SELECT
         sa.id,
         sa.date,
         sa.status,
         sa.remarks,
         sa.created_at,
         s.id  AS student_id,
         s.name AS student_name,
         s.registration_number,
         c.id AS class_id, c.name AS class_name,
         sec.id AS section_id, sec.name AS section_name,
         sub.id AS subject_id, sub.name AS subject_name,
         p.id AS period_id, p.name AS period_name,
         p.start_time AS period_start_time, p.end_time AS period_end_time
       FROM student_attendances sa
       JOIN students s   ON sa.student_id = s.id
       JOIN classes  c   ON sa.class_id   = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       JOIN subjects sub ON sa.subject_id = sub.id
       JOIN periods  p   ON sa.period_id  = p.id
       WHERE ${whereClause}
       ORDER BY sa.date DESC, p.start_time ASC, s.registration_number ASC
       LIMIT 200`,
      params
    );

    // Group by date → class → period for a nicer response
    return NextResponse.json(
      {
        success: true,
        message: 'Attendance records retrieved.',
        paylod: { records: recordsRes.rows, total: recordsRes.rows.length }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching teacher attendance:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while fetching attendance.',
        error: 'Internal Server Error',
        paylod: null
      },
      { status: 500 }
    );
  }
}
