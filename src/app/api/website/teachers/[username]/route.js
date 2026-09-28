import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, hashPassword } from '@/lib/auth';

// GET a specific teacher (Public by username slug OR numeric id)
export async function GET(request, { params }) {
  try {
    const { username } = await params;
    const isNumeric = /^\d+$/.test(username);

    const result = await query(`
      SELECT 
        t.id, t.name, t.email, t.number, t.designation, t.address, t.image, t.is_permanent,
        t.date_of_birth, t.nationality, t.blood_group, t.gender, t.bio, t.username,
        t.grade_id, tps.name AS grade_name, tps.basic_salary, tps.allowance
      FROM teachers t
      LEFT JOIN teacher_pay_scale tps ON t.grade_id = tps.id
      WHERE (${isNumeric ? 't.id = $1' : 't.username = $1'}) AND t.is_active = TRUE
    `, [username]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher not found.', paylod: null }, { status: 404 });
    }

    const teacher = result.rows[0];

    // Fetch qualifications
    const qualRes = await query(
      'SELECT id, degree, institution, passing_year, result FROM teacher_qualifications WHERE teacher_id = $1 ORDER BY passing_year DESC',
      [teacher.id]
    );

    // Fetch experiences
    const expRes = await query(
      'SELECT * FROM teacher_experiences WHERE teacher_id = $1 ORDER BY start_date DESC NULLS LAST',
      [teacher.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched teacher details',
      paylod: { teacher: { ...teacher, qualifications: qualRes.rows, experiences: expRes.rows } }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', paylod: null }, { status: 500 });
  }
}

// PUT update a teacher (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { username } = await params;
    const isNumeric = /^\d+$/.test(username);
    const { name, email, number, designation, address, is_active, is_permanent, password, grade_id } = await request.json();

    if (!name || !email || !number || !designation || is_active === undefined || is_permanent === undefined) {
      return NextResponse.json({
        success: false,
        message: 'Name, email, phone number, designation, is_active, and is_permanent parameters are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Check email uniqueness (excluding current teacher)
    const duplicateCheck = await query(
      `SELECT id FROM teachers WHERE email = $1 AND (${isNumeric ? 'id <> $2' : 'username <> $2'})`,
      [email.trim(), username]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'This email is already in use by another teacher.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    // Validate grade_id if provided
    if (grade_id) {
      const gradeCheck = await query('SELECT id FROM teacher_pay_scale WHERE id = $1', [grade_id]);
      if (gradeCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Selected pay scale grade does not exist.',
          error: 'Bad Request',
          paylod: null
        }, { status: 400 });
      }
    }

    let updatedTeacher;

    if (password) {
      const passwordHash = await hashPassword(password);
      updatedTeacher = await query(
        `UPDATE teachers 
         SET name = $1, email = $2, number = $3, designation = $4, address = $5, is_active = $6, is_permanent = $7, password_hash = $8, grade_id = $9, updated_at = CURRENT_TIMESTAMP 
         WHERE ${isNumeric ? 'id = $10' : 'username = $10'} 
         RETURNING id, name, email, number, designation, address, is_active, is_registered, is_permanent, grade_id`,
        [
          name.trim(), 
          email.trim().toLowerCase(), 
          number.trim(), 
          designation.trim(), 
          address ? address.trim() : null, 
          is_active, 
          !!is_permanent, 
          passwordHash, 
          grade_id ? parseInt(grade_id, 10) : null,
          username
        ]
      );
    } else {
      updatedTeacher = await query(
        `UPDATE teachers 
         SET name = $1, email = $2, number = $3, designation = $4, address = $5, is_active = $6, is_permanent = $7, grade_id = $8, updated_at = CURRENT_TIMESTAMP 
         WHERE ${isNumeric ? 'id = $9' : 'username = $9'} 
         RETURNING id, name, email, number, designation, address, is_active, is_registered, is_permanent, grade_id`,
        [
          name.trim(), 
          email.trim().toLowerCase(), 
          number.trim(), 
          designation.trim(), 
          address ? address.trim() : null, 
          is_active, 
          !!is_permanent, 
          grade_id ? parseInt(grade_id, 10) : null,
          username
        ]
      );
    }

    if (updatedTeacher.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Teacher record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Teacher details updated successfully.',
      paylod: { teacher: updatedTeacher.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update teacher. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE a teacher (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { username } = await params;
    const isNumeric = /^\d+$/.test(username);

    const deleteResult = await query(
      `DELETE FROM teachers WHERE ${isNumeric ? 'id = $1' : 'username = $1'} RETURNING id`,
      [username]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Teacher not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Teacher account deleted successfully.',
      paylod: { message: 'Teacher account deleted successfully.' }
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete teacher. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
