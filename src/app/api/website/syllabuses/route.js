import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET syllabuses
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const subjectId = searchParams.get('subject_id');

    let sql = `
      SELECT 
        sy.*, 
        c.name AS class_name, 
        c.code AS class_code,
        sub.name AS subject_name, 
        sub.code AS subject_code
      FROM syllabuses sy
      JOIN classes c ON sy.class_id = c.id
      JOIN subjects sub ON sy.subject_id = sub.id
    `;
    let params = [];
    let conditions = [];

    if (classId) {
      params.push(classId);
      conditions.push(`sy.class_id = $${params.length}`);
    }

    if (subjectId) {
      params.push(subjectId);
      conditions.push(`sy.subject_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.numeric_name ASC, sub.name ASC, sy.title ASC';

    const result = await query(sql, params);
    const res_data_1173 = { syllabuses: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_1173?.message || 'Successfully fecthed data',
        paylod: res_data_1173
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching syllabuses:', error);
    const res_err_1542 = { error: 'Failed to retrieve syllabuses. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1542?.error || res_err_1542?.message || 'An error occurred',
        error: res_err_1542?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST create a syllabus (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_2052 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2052?.error || res_err_2052?.message || 'An error occurred',
        error: res_err_2052?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { name, title, link, class_id, subject_id } = await request.json();

    if (!name || !title || !link || !class_id || !subject_id) {
      const res_err_2524 = { error: 'All fields (Name, Title, Document Link, Class, Subject) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2524?.error || res_err_2524?.message || 'An error occurred',
        error: res_err_2524?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Verify class exists
    const classCheck = await query('SELECT id FROM classes WHERE id = $1', [class_id]);
    if (classCheck.rows.length === 0) {
      const res_err_3051 = { error: 'Target class not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3051?.error || res_err_3051?.message || 'An error occurred',
        error: res_err_3051?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    // Verify subject exists
    const subjectCheck = await query('SELECT id FROM subjects WHERE id = $1', [subject_id]);
    if (subjectCheck.rows.length === 0) {
      const res_err_3541 = { error: 'Target subject not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3541?.error || res_err_3541?.message || 'An error occurred',
        error: res_err_3541?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const newSyllabus = await query(
      `INSERT INTO syllabuses (name, title, link, class_id, subject_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name.trim(), title.trim(), link.trim(), class_id, subject_id]
    );

    const res_data_2993 = { message: 'Syllabus created successfully.', syllabus: newSyllabus.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_2993?.message || 'Successfully fecthed data',
        paylod: res_data_2993
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating syllabus:', error);
    const res_err_4569 = { error: 'Failed to create syllabus. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4569?.error || res_err_4569?.message || 'An error occurred',
        error: res_err_4569?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
