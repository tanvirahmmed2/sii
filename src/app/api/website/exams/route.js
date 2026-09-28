import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { syncExamStatuses } from '@/lib/exams';

// GET all exams
export async function GET(request) {
  try {
    await syncExamStatuses();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'current', 'upcoming', 'previous'

    let sql = `
      SELECT e.*, c.name AS class_name 
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.id
    `;
    const params = [];

    if (status) {
      sql += ' WHERE e.status = $1';
      params.push(status);
    }

    sql += ' ORDER BY e.start_date DESC';

    const result = await query(sql, params);
    const res_data_602 = { exams: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_602?.message || 'Successfully fecthed data',
        paylod: res_data_602
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exams:', error);
    const res_err_955 = { error: 'Failed to retrieve exams. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_955?.error || res_err_955?.message || 'An error occurred',
        error: res_err_955?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST create a new exam with optional schedule routines (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1488 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1488?.error || res_err_1488?.message || 'An error occurred',
        error: res_err_1488?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { name, term, start_date, end_date, status, schedules, class_id, exam_fee } = await request.json();

    if (!name || !start_date || !end_date || !status || !class_id) {
      const res_err_1964 = { error: 'Name, class, start date, end date, and status are required fields.' };
      return NextResponse.json({
        success: false,
        message: res_err_1964?.error || res_err_1964?.message || 'An error occurred',
        error: res_err_1964?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Insert exam
    const newExamRes = await query(
      `INSERT INTO exams (name, term, start_date, end_date, status, class_id, exam_fee) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        name.trim(),
        term ? term.trim() : null,
        start_date,
        end_date,
        status,
        parseInt(class_id, 10),
        exam_fee ? parseFloat(exam_fee) : 0.00
      ]
    );

    const exam = newExamRes.rows[0];

    // Create notice board announcement linking to student exams routine page
    try {
      await query(
        `INSERT INTO notices (title, link, is_pinned) 
         VALUES ($1, '/student/exams', FALSE)`,
        [`New Exam Announced: ${name.trim()}`]
      );
    } catch (noticeErr) {
      console.error('Failed to auto-create notice for exam:', noticeErr);
    }

    // Generate student fee records for active students in class
    try {
      const feeAmount = exam_fee ? parseFloat(exam_fee) : 0.00;
      const initialStatus = feeAmount > 0 ? 'Unpaid' : 'Paid';

      const studentsRes = await query(
        'SELECT id FROM students WHERE class_id = $1 AND is_active = TRUE',
        [parseInt(class_id, 10)]
      );

      for (const student of studentsRes.rows) {
        await query(
          `INSERT INTO student_fees (student_id, title, amount, paid_amount, due_date, status) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            student.id,
            `Exam Fee: ${name.trim()}`,
            feeAmount,
            initialStatus === 'Paid' ? feeAmount : 0.00,
            start_date,
            initialStatus
          ]
        );
      }
    } catch (feeErr) {
      console.error('Failed to auto-generate student fees for exam:', feeErr);
    }

    // If schedule routines were provided, insert them bound to the target class
    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
      const targetClassId = parseInt(class_id, 10);
      for (const item of schedules) {
        const { subject_id, exam_date, start_time, end_time, room_number, full_marks } = item;
        const schClassId = item.class_id ? parseInt(item.class_id, 10) : targetClassId;
        const fm = full_marks ? parseFloat(full_marks) : 100.00;
        if (schClassId && subject_id && exam_date && start_time && end_time) {
          await query(
            `INSERT INTO exam_schedules (exam_id, class_id, subject_id, exam_date, start_time, end_time, room_number, full_marks) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [exam.id, schClassId, subject_id, exam_date, start_time, end_time, room_number || null, fm]
          );
        }
      }
    }

    const res_data_2643 = { message: 'Exam routine created successfully.', exam };
      return NextResponse.json({
        success: true,
        message: res_data_2643?.message || 'Successfully fecthed data',
        paylod: res_data_2643
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating exam:', error);
    if (error.code === '23505') {
      const res_err_3762 = { error: 'An exam with this name already exists for the selected class.' };
      return NextResponse.json({
        success: false,
        message: res_err_3762?.error || res_err_3762?.message || 'An error occurred',
        error: res_err_3762?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }
    const res_err_4100 = { error: 'Failed to create exam routine. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4100?.error || res_err_4100?.message || 'An error occurred',
        error: res_err_4100?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
