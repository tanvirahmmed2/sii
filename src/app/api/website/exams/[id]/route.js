import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { syncExamStatuses } from '@/lib/exams';

// GET details of a single exam including routines
export async function GET(request, { params }) {
  try {
    await syncExamStatuses();
    const { id } = await params;

    const examRes = await query(`
      SELECT e.*, c.name AS class_name 
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.id
      WHERE e.id = $1
    `, [id]);
    if (examRes.rows.length === 0) {
      const res_err_385 = { error: 'Exam not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_385?.error || res_err_385?.message || 'An error occurred',
        error: res_err_385?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const exam = examRes.rows[0];

    const schedulesRes = await query(
      `SELECT es.*, c.name as class_name, sub.name as subject_name 
       FROM exam_schedules es
       JOIN classes c ON es.class_id = c.id
       JOIN subjects sub ON es.subject_id = sub.id
       WHERE es.exam_id = $1
       ORDER BY es.exam_date ASC, es.start_time ASC`,
      [id]
    );

    const res_data_879 = { exam, schedules: schedulesRes.rows };
      return NextResponse.json({
        success: true,
        message: res_data_879?.message || 'Successfully fecthed data',
        paylod: res_data_879
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exam details:', error);
    const res_err_1483 = { error: 'Failed to retrieve exam details. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1483?.error || res_err_1483?.message || 'An error occurred',
        error: res_err_1483?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// PUT update an exam and its routines (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_2019 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2019?.error || res_err_2019?.message || 'An error occurred',
        error: res_err_2019?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { name, term, start_date, end_date, status, schedules, class_id, exam_fee } = await request.json();

    if (!name || !start_date || !end_date || !status || !class_id) {
      const res_err_2528 = { error: 'Name, class, start date, end date, and status are required fields.' };
      return NextResponse.json({
        success: false,
        message: res_err_2528?.error || res_err_2528?.message || 'An error occurred',
        error: res_err_2528?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Update exam table
    const updateExamRes = await query(
      `UPDATE exams 
       SET name = $1, term = $2, start_date = $3, end_date = $4, status = $5, class_id = $6, exam_fee = $7, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 
       RETURNING *`,
      [
        name.trim(),
        term ? term.trim() : null,
        start_date,
        end_date,
        status,
        parseInt(class_id, 10),
        exam_fee ? parseFloat(exam_fee) : 0.00,
        id
      ]
    );

    if (updateExamRes.rowCount === 0) {
      const res_err_3257 = { error: 'Exam not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3257?.error || res_err_3257?.message || 'An error occurred',
        error: res_err_3257?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const updatedExam = updateExamRes.rows[0];

    // If schedules array is provided, replace existing schedules bound to class_id
    if (schedules && Array.isArray(schedules)) {
      const targetClassId = parseInt(class_id, 10);
      // Clear old schedules
      await query('DELETE FROM exam_schedules WHERE exam_id = $1', [id]);

      // Insert new schedules
      for (const item of schedules) {
        const { subject_id, exam_date, start_time, end_time, room_number, full_marks } = item;
        const schClassId = item.class_id ? parseInt(item.class_id, 10) : targetClassId;
        const fm = full_marks ? parseFloat(full_marks) : 100.00;
        if (schClassId && subject_id && exam_date && start_time && end_time) {
          await query(
            `INSERT INTO exam_schedules (exam_id, class_id, subject_id, exam_date, start_time, end_time, room_number, full_marks) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, schClassId, subject_id, exam_date, start_time, end_time, room_number || null, fm]
          );
        }
      }
    }

    const res_data_3288 = {
      message: 'Exam routine updated successfully.',
      exam: updatedExam,
    };
      return NextResponse.json({
        success: true,
        message: res_data_3288?.message || 'Successfully fecthed data',
        paylod: res_data_3288
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating exam:', error);
    if (error.code === '23505') {
      const res_err_4901 = { error: 'An exam with this name already exists for the selected class.' };
      return NextResponse.json({
        success: false,
        message: res_err_4901?.error || res_err_4901?.message || 'An error occurred',
        error: res_err_4901?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }
    const res_err_5239 = { error: 'Failed to update exam routine. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5239?.error || res_err_5239?.message || 'An error occurred',
        error: res_err_5239?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE an exam and all schedules (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_5773 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_5773?.error || res_err_5773?.message || 'An error occurred',
        error: res_err_5773?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query('DELETE FROM exams WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      const res_err_6256 = { error: 'Exam not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_6256?.error || res_err_6256?.message || 'An error occurred',
        error: res_err_6256?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_4530 = {
      message: 'Exam and all its routines deleted successfully.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_4530?.message || 'Successfully fecthed data',
        paylod: res_data_4530
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting exam:', error);
    const res_err_7022 = { error: 'Failed to delete exam routine. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_7022?.error || res_err_7022?.message || 'An error occurred',
        error: res_err_7022?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
