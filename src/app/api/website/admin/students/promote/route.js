import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// Helper for class+0+studentnumber format (e.g. 7001, 7002, 7013 for Class 7)
function generateClassRoll(classNameOrNumeric, seqNumber) {
  const match = String(classNameOrNumeric || '').match(/\d+/);
  const classNum = match ? match[0] : '1';
  const seqStr = String(seqNumber).padStart(2, '0');
  return parseInt(`${classNum}0${seqStr}`, 10);
}

export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Forbidden',
        paylod: null
      }, { status: 403 });
    }

    const body = await request.json();
    const { source_class_id, target_class_id, exam_id, sort_by = 'gpa', student_ids = 'all', include_failed = false, admission_fee = 0 } = body;
    const numAdmissionFee = Math.max(0, parseFloat(admission_fee) || 0);

    if (!source_class_id || !target_class_id || !exam_id) {
      return NextResponse.json({
        success: false,
        message: 'source_class_id, target_class_id, and exam_id are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Fetch target class info
    const targetClassRes = await query('SELECT id, name, numeric_name FROM classes WHERE id = $1', [target_class_id]);
    if (targetClassRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Target academic class not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }
    const targetClassObj = targetClassRes.rows[0];

    // Fetch students of source class along with their exam result
    let studentQuery = `
      SELECT s.id, s.name, s.registration_number, s.roll, s.class_id,
             COALESCE(r.gpa, 0.00) AS gpa,
             COALESCE(r.total_marks, 0.00) AS total_marks,
             COALESCE(r.grade, 'F') AS grade,
             COALESCE(r.status, 'Fail') AS status
      FROM students s
      LEFT JOIN results r ON r.student_id = s.id AND r.exam_id = $2
      WHERE s.class_id = $1 AND s.is_active = TRUE
    `;

    const queryParams = [source_class_id, exam_id];

    if (Array.isArray(student_ids) && student_ids.length > 0 && student_ids !== 'all') {
      studentQuery += ` AND s.id = ANY($3::int[])`;
      queryParams.push(student_ids);
    }

    const studentsRes = await query(studentQuery, queryParams);
    let candidates = studentsRes.rows;

    if (candidates.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No eligible candidates found for promotion in the selected class.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    // If include_failed is false, filter out F grade / Fail students
    if (!include_failed) {
      candidates = candidates.filter(st => st.status === 'Pass' && st.grade !== 'F');
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No passing students found for promotion. Enable "Include Failed Students" to promote failing students.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Sort candidates according to selected merit basis
    if (sort_by === 'total') {
      candidates.sort((a, b) => b.total_marks - a.total_marks || b.gpa - a.gpa);
    } else {
      // Default sort by GPA
      candidates.sort((a, b) => b.gpa - a.gpa || b.total_marks - a.total_marks);
    }

    // Batch update candidates to target class with new merit roll numbers
    const updatedStudents = [];
    for (let i = 0; i < candidates.length; i++) {
      const st = candidates[i];
      const newRoll = generateClassRoll(targetClassObj.numeric_name || targetClassObj.name, i + 1);

      await query(
        `UPDATE students 
         SET class_id = $1, roll = $2, is_active = FALSE, is_registered = FALSE, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [target_class_id, newRoll, st.id]
      );

      // Create Re-Admission Fee invoice for cashier collection
      const feeTitle = `Re-Admission Fee: ${targetClassObj.name}`;
      await query(
        `INSERT INTO student_fees (student_id, title, amount, due_date, status, paid_amount)
         VALUES ($1, $2, $3, CURRENT_DATE, 'unpaid', 0.00)`,
        [st.id, feeTitle, numAdmissionFee]
      );

      updatedStudents.push({
        id: st.id,
        name: st.name,
        registration_number: st.registration_number,
        previous_roll: st.roll,
        new_roll: newRoll,
        gpa: st.gpa,
        total_marks: st.total_marks,
        grade: st.grade,
        status: st.status
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully promoted ${updatedStudents.length} student(s) to ${targetClassObj.name}.`,
      paylod: {
        targetClass: targetClassObj,
        promotedCount: updatedStudents.length,
        students: updatedStudents
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error promoting students:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during student promotion.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
