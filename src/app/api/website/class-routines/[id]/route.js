import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// PUT update a class routine (Admin only)
export async function PUT(request, { params }) {
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

    const { id } = await params;
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
        message: 'Routine cannot be moved to a holiday/off day.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    // Check Section/Class Overlap (excluding this routine entry)
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
           AND (cr.section_id = $5 OR cr.section_id IS NULL)
           AND cr.id <> $6`,
        [parseInt(class_id, 10), day_id, start_time, end_time, parseInt(section_id, 10), id]
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
           AND cr.end_time = $4
           AND cr.id <> $5`,
        [parseInt(class_id, 10), day_id, start_time, end_time, id]
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

    // Check Teacher Overlap (excluding this routine entry) dynamically via class_subject_teachers mapping
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
           AND cr.end_time = $4
           AND cr.id <> $5`,
        [assignedTeacherId, day_id, start_time, end_time, id]
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

    const updatedRoutine = await query(
      `UPDATE class_routines
       SET class_id = $1, subject_id = $2, day_id = $3, start_time = $4, end_time = $5, section_id = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        parseInt(class_id, 10),
        parseInt(subject_id, 10),
        parseInt(day_id, 10),
        start_time.trim(),
        end_time.trim(),
        section_id ? parseInt(section_id, 10) : null,
        id
      ]
    );

    if (updatedRoutine.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Class routine entry not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Class routine entry updated successfully.',
      routine: updatedRoutine.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating class routine:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update class routine.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE a class routine (Admin only)
export async function DELETE(request, { params }) {
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

    const { id } = await params;

    const deleteResult = await query('DELETE FROM class_routines WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Class routine entry not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Class routine entry deleted successfully.',
      paylod: { id }
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting class routine:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete class routine.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
