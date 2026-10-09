import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';

// GET: Fetch student attendance records by date, month, or class/section
export async function GET(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get('session_id');
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const date = searchParams.get('date'); // YYYY-MM-DD
    const month = searchParams.get('month'); // YYYY-MM
    const year = searchParams.get('year'); // YYYY

    const conditions = ['s.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (sessionId) {
      conditions.push(`s.session_id = $${pIdx++}`);
      values.push(sessionId);
    }
    if (classId) {
      conditions.push(`s.class_id = $${pIdx++}`);
      values.push(classId);
    }
    if (sectionId) {
      conditions.push(`s.section_id = $${pIdx++}`);
      values.push(sectionId);
    }

    const whereStudents = conditions.join(' AND ');

    // If specific date is requested: return roster with attendance on that date
    if (date) {
      const attDate = date.trim();
      const rosterQuery = `
        SELECT s.id AS student_id, s.registration_no, s.roll_no, s.name,
               s.class_id, s.section_id, s.session_id,
               c.name AS class_name, sec.name AS section_name, ses.name AS session_name,
               a.id AS attendance_id,
               COALESCE(a.status, 'present') AS status,
               a.in_time, a.out_time, a.remark, a.date AS attendance_date
        FROM website_students s
        LEFT JOIN website_classes c ON s.class_id = c.id
        LEFT JOIN website_sections sec ON s.section_id = sec.id
        LEFT JOIN website_sessions ses ON s.session_id = ses.id
        LEFT JOIN website_student_attendances a ON a.student_id = s.id AND a.date = $${pIdx++}
        WHERE ${whereStudents} AND s.is_active = TRUE
        ORDER BY s.roll_no ASC NULLS LAST, s.id ASC
      `;

      const rosterRes = await queryDb(rosterQuery, [...values, attDate]);

      return NextResponse.json({
        success: true,
        payload: {
          date: attDate,
          attendance: rosterRes.rows,
        },
      });
    }

    // If month/year summary is requested
    const attConditions = ['a.website_id = $1'];
    const attValues = [website.id];
    let aIdx = 2;

    if (classId) {
      attConditions.push(`a.class_id = $${aIdx++}`);
      attValues.push(classId);
    }
    if (sectionId) {
      attConditions.push(`a.section_id = $${aIdx++}`);
      attValues.push(sectionId);
    }
    if (month) {
      attConditions.push(`TO_CHAR(a.date, 'YYYY-MM') = $${aIdx++}`);
      attValues.push(month);
    } else if (year) {
      attConditions.push(`TO_CHAR(a.date, 'YYYY') = $${aIdx++}`);
      attValues.push(year);
    }

    const summaryQuery = `
      SELECT a.date, a.status, COUNT(*)::int AS count
      FROM website_student_attendances a
      WHERE ${attConditions.join(' AND ')}
      GROUP BY a.date, a.status
      ORDER BY a.date DESC
    `;

    const summaryRes = await queryDb(summaryQuery, attValues);

    let studentSummaries = [];
    if (year) {
      try {
        const stuSummaryQuery = `
          SELECT a.student_id,
                 COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_count,
                 COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent_count,
                 COUNT(*) FILTER (WHERE a.status = 'late')::int AS late_count,
                 COUNT(*) FILTER (WHERE a.status = 'leave')::int AS leave_count,
                 COUNT(*)::int AS total_days
          FROM website_student_attendances a
          WHERE ${attConditions.join(' AND ')}
          GROUP BY a.student_id
        `;
        const stuRes = await queryDb(stuSummaryQuery, attValues);
        studentSummaries = stuRes.rows;
      } catch (err) {
        console.error('Error fetching student yearly summaries:', err);
      }
    }

    return NextResponse.json({
      success: true,
      payload: {
        summary: summaryRes.rows,
        student_summaries: studentSummaries,
      },
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch attendance.' }, { status: 500 });
  }
}

// POST: Save or update batch attendance for students
export async function POST(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { date, records, class_id, section_id, session_id } = body;

    if (!date) {
      return NextResponse.json({ success: false, error: 'Attendance date is required.' }, { status: 400 });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: 'Attendance records are required.' }, { status: 400 });
    }

    // Ensure student attendances table exists
    try {
      await queryDb(`
        CREATE TABLE IF NOT EXISTS website_student_attendances (
            id BIGSERIAL PRIMARY KEY,
            website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
            student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
            class_id BIGINT REFERENCES website_classes(id) ON DELETE SET NULL,
            section_id BIGINT REFERENCES website_sections(id) ON DELETE SET NULL,
            session_id BIGINT REFERENCES website_sessions(id) ON DELETE SET NULL,
            date DATE NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'present',
            in_time TIME,
            out_time TIME,
            remark TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, date)
        );
      `);
    } catch {
      // Ignore if table exists
    }

    // Upsert each record
    let savedCount = 0;
    for (const rec of records) {
      if (!rec.student_id) continue;
      await queryDb(
        `INSERT INTO website_student_attendances (
            website_id, student_id, class_id, section_id, session_id,
            date, status, remark, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id, date)
         DO UPDATE SET
            status = EXCLUDED.status,
            remark = EXCLUDED.remark,
            class_id = COALESCE(EXCLUDED.class_id, website_student_attendances.class_id),
            section_id = COALESCE(EXCLUDED.section_id, website_student_attendances.section_id),
            session_id = COALESCE(EXCLUDED.session_id, website_student_attendances.session_id),
            updated_at = CURRENT_TIMESTAMP`,
        [
          website.id,
          rec.student_id,
          class_id || null,
          section_id || null,
          session_id || null,
          date,
          rec.status || 'present',
          rec.remark || null,
        ]
      );
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Attendance saved successfully for ${savedCount} student(s) on ${date}.`,
    });
  } catch (error) {
    console.error('Error saving student attendance:', error);
    return NextResponse.json({ success: false, error: 'Failed to record attendance.' }, { status: 500 });
  }
}
