import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/developer';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET all exams
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: { exams: [] } }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT e.*, c.name AS class_name 
      FROM website_exams e
      LEFT JOIN website_classes c ON e.class_id = c.id AND c.website_id = $1
      WHERE e.website_id = $1
    `;
    const params = [website.id];

    if (status) {
      sql += ' AND e.status = $2';
      params.push(status);
    }

    sql += ' ORDER BY e.start_date DESC';

    const result = await query(sql, params);
    const res_data = { exams: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched exams',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve exams.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create a new exam with optional schedule routines (Admin only)
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { name, term, start_date, end_date, status, schedules, class_id, exam_fee } = await request.json();

    if (!name || !start_date || !end_date || !status || !class_id) {
      return NextResponse.json({
        success: false,
        message: 'Name, class, start date, end date, and status are required fields.',
        error: 'Validation Error',
        paylod: null
      }, { status: 400 });
    }

    // Insert into website_exams
    const newExamRes = await query(
      `INSERT INTO website_exams (website_id, name, term, start_date, end_date, status, class_id, exam_fee) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        website.id,
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

    // Create notice board announcement in website_notices
    try {
      await query(
        `INSERT INTO website_notices (website_id, title, link, is_pinned) 
         VALUES ($1, $2, '/student/exams', FALSE)`,
        [website.id, `New Exam Announced: ${name.trim()}`]
      );
    } catch (noticeErr) {
      console.error('Failed to auto-create notice for exam:', noticeErr);
    }

    // Generate student fee records for active students in class
    try {
      const feeAmount = exam_fee ? parseFloat(exam_fee) : 0.00;
      const initialStatus = feeAmount > 0 ? 'Unpaid' : 'Paid';

      const studentsRes = await query(
        `SELECT s.id 
         FROM website_students s
         JOIN website_student_information si ON s.id = si.student_id AND si.website_id = $1
         WHERE s.website_id = $1 AND si.class_id = $2 AND s.is_active = TRUE`,
        [website.id, parseInt(class_id, 10)]
      );

      for (const student of studentsRes.rows) {
        await query(
          `INSERT INTO website_student_fees (website_id, student_id, title, amount, paid_amount, due_date, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            website.id,
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

    // If schedule routines were provided, insert them bound to target class
    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
      const targetClassId = parseInt(class_id, 10);
      for (const item of schedules) {
        const { subject_id, exam_date, start_time, end_time, room_number, full_marks } = item;
        const schClassId = item.class_id ? parseInt(item.class_id, 10) : targetClassId;
        const fm = full_marks ? parseFloat(full_marks) : 100.00;
        if (schClassId && subject_id && exam_date && start_time && end_time) {
          await query(
            `INSERT INTO website_exam_schedules (website_id, exam_id, class_id, subject_id, exam_date, start_time, end_time, room_number, full_marks) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [website.id, exam.id, schClassId, subject_id, exam_date, start_time, end_time, room_number || null, fm]
          );
        }
      }
    }

    const res_data = { message: 'Exam routine created successfully.', exam };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating exam:', error);
    if (error.code === '23505') {
      return NextResponse.json({
        success: false,
        message: 'An exam with this name already exists for the selected class.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      message: 'Failed to create exam routine.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
