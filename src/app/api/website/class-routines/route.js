import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// GET class routines
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const teacherId = searchParams.get('teacher_id');

    let sql = `
      SELECT 
        cr.id,
        cr.class_id,
        cr.subject_id,
        cr.day_id,
        TO_CHAR(cr.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(cr.end_time, 'HH24:MI') AS end_time,
        (TO_CHAR(cr.start_time, 'HH12:MI AM') || ' - ' || TO_CHAR(cr.end_time, 'HH12:MI AM')) AS times,
        cr.section_id,
        cr.created_at,
        cr.updated_at,
        c.name AS class_name, 
        c.code AS class_code,
        s.name AS section_name, 
        s.room_number AS room_number,
        sub.name AS subject_name, 
        sub.code AS subject_code,
        d.name AS day_of_week,
        d.status AS day_status,
        t.name AS teacher_name
      FROM class_routines cr
      JOIN classes c ON cr.class_id = c.id
      JOIN subjects sub ON cr.subject_id = sub.id
      JOIN days d ON cr.day_id = d.id
      LEFT JOIN sections s ON cr.section_id = s.id
      LEFT JOIN class_subjects cs ON cs.class_id = cr.class_id AND cs.subject_id = cr.subject_id
      LEFT JOIN class_subject_teachers cst ON cst.class_subject_id = cs.id AND (cst.section_id = cr.section_id OR cst.section_id IS NULL OR cr.section_id IS NULL)
      LEFT JOIN teachers t ON cst.teacher_id = t.id
    `;
    let params = [];
    let conditions = [];

    if (classId) {
      params.push(classId);
      conditions.push(`cr.class_id = $${params.length}`);
    }

    if (sectionId) {
      params.push(sectionId);
      // For a specific section query, we should also return class-wide routines (where section_id IS NULL)
      conditions.push(`(cr.section_id = $${params.length} OR cr.section_id IS NULL)`);
    }

    if (teacherId) {
      params.push(teacherId);
      conditions.push(`cst.teacher_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY cr.day_id ASC, cr.start_time ASC';

    const result = await query(sql, params);
    const res_data = { routines: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched routine schedules',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class routines:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve class routines.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create class routine (Admin only)
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { class_id, subject_id, day_id, start_time, end_time, section_id } = await request.json();

    if (!class_id || !subject_id || !day_id || !start_time || !end_time) {
      return NextResponse.json({
        success: false,
        message: 'Class, Subject, Day, Start Time, and Finish Time are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Verify Day exists and is not off
    const dayCheck = await query('SELECT * FROM days WHERE id = $1', [day_id]);
    if (dayCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Selected day not found.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }
    if (dayCheck.rows[0].status === 'off') {
      return NextResponse.json({
        success: false,
        message: 'Routine cannot be created on a holiday/off day.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    // Check Section/Class Overlap (Same Times, Same Day)
    let sectionOverlap;
    if (section_id) {
      // Section-specific class: conflicts with the same section OR a class-wide class
      sectionOverlap = await query(
        `SELECT cr.id, sub.name as subject_name, s.name as section_name
         FROM class_routines cr
         JOIN subjects sub ON cr.subject_id = sub.id
         LEFT JOIN sections s ON cr.section_id = s.id
         WHERE cr.class_id = $1 
           AND cr.day_id = $2 
           AND cr.start_time = $3
           AND cr.end_time = $4
           AND (cr.section_id = $5 OR cr.section_id IS NULL)`,
        [parseInt(class_id, 10), day_id, start_time, end_time, parseInt(section_id, 10)]
      );
    } else {
      // Class-wide class: conflicts with ANY routine entry for this class at this time
      sectionOverlap = await query(
        `SELECT cr.id, sub.name as subject_name, s.name as section_name
         FROM class_routines cr
         JOIN subjects sub ON cr.subject_id = sub.id
         LEFT JOIN sections s ON cr.section_id = s.id
         WHERE cr.class_id = $1 
           AND cr.day_id = $2 
           AND cr.start_time = $3
           AND cr.end_time = $4`,
        [parseInt(class_id, 10), day_id, start_time, end_time]
      );
    }

    if (sectionOverlap.rows.length > 0) {
      const existing = sectionOverlap.rows[0];
      const targetLabel = existing.section_name ? `Section ${existing.section_name}` : 'All Sections';
      return NextResponse.json({
        success: false,
        message: `Overlap detected. The class already has routine "${existing.subject_name}" scheduled for ${targetLabel} on this day at this time.`,
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    // Check Teacher Overlap dynamically via class_subject_teachers mapping
    const csCheck = await query('SELECT id FROM class_subjects WHERE class_id = $1 AND subject_id = $2', [class_id, subject_id]);
    const classSubjectId = csCheck.rows.length > 0 ? csCheck.rows[0].id : null;
    
    let assignedTeacherId = null;
    if (classSubjectId) {
      const teacherRes = await query(
        `SELECT teacher_id FROM class_subject_teachers 
         WHERE class_subject_id = $1 AND (section_id = $2 OR section_id IS NULL)`,
        [classSubjectId, section_id ? parseInt(section_id, 10) : null]
      );
      assignedTeacherId = teacherRes.rows.length > 0 ? teacherRes.rows[0].teacher_id : null;
    }

    if (assignedTeacherId) {
      const teacherOverlap = await query(
        `SELECT cr.id, c.name as class_name, s.name as section_name
         FROM class_routines cr
         JOIN classes c ON cr.class_id = c.id
         LEFT JOIN sections s ON cr.section_id = s.id
         JOIN class_subjects cs ON cs.class_id = cr.class_id AND cs.subject_id = cr.subject_id
         JOIN class_subject_teachers cst ON cst.class_subject_id = cs.id AND (cst.section_id = cr.section_id OR cr.section_id IS NULL OR cst.section_id IS NULL)
         WHERE cst.teacher_id = $1 
           AND cr.day_id = $2 
           AND cr.start_time = $3
           AND cr.end_time = $4`,
        [assignedTeacherId, day_id, start_time, end_time]
      );

      if (teacherOverlap.rows.length > 0) {
        const existing = teacherOverlap.rows[0];
        const targetLabel = existing.section_name ? `Section ${existing.section_name}` : 'All Sections';
        return NextResponse.json({
          success: false,
          message: `Teacher overlap detected. This teacher is already teaching Class ${existing.class_name} (${targetLabel}) during this period on this day.`,
          error: 'Conflict',
          paylod: null
        }, { status: 400 });
      }
    }

    const newRoutine = await query(
      `INSERT INTO class_routines (class_id, subject_id, day_id, start_time, end_time, section_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        parseInt(class_id, 10),
        parseInt(subject_id, 10),
        parseInt(day_id, 10),
        start_time.trim(),
        end_time.trim(),
        section_id ? parseInt(section_id, 10) : null
      ]
    );

    const res_data = { message: 'Class routine entry created successfully.', routine: newRoutine.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating class routine:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create class routine.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
