import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, hashPassword } from '@/lib/auth';

// PUT update staff details (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, number, role, address, is_active, password, grade_id } = body;

    if (!name || !email || !number || !role || is_active === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Name, email, number, role, and is_active parameters are required.'
      }, { status: 400 });
    }

    if (!['cashier', 'registrar', 'staff'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role.' }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();

    // Check duplicate email
    const duplicateCheck = await query('SELECT id FROM staffs WHERE LOWER(email) = $1 AND id <> $2', [emailLower, parseInt(id, 10)]);
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'This email is already in use by another staff member.' }, { status: 400 });
    }

    let result;
    if (password) {
      const hashedPass = await hashPassword(password);
      result = await query(`
        UPDATE staffs 
        SET name = $1, email = $2, number = $3, role = $4, address = $5, is_active = $6, password_hash = $7, grade_id = $8, updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING id, name, email, number, role, is_active, is_registered, grade_id
      `, [
        name.trim(),
        emailLower,
        number.trim(),
        role,
        address ? address.trim() : null,
        is_active,
        hashedPass,
        grade_id ? parseInt(grade_id, 10) : null,
        parseInt(id, 10)
      ]);
    } else {
      result = await query(`
        UPDATE staffs 
        SET name = $1, email = $2, number = $3, role = $4, address = $5, is_active = $6, grade_id = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING id, name, email, number, role, is_active, is_registered, grade_id
      `, [
        name.trim(),
        emailLower,
        number.trim(),
        role,
        address ? address.trim() : null,
        is_active,
        grade_id ? parseInt(grade_id, 10) : null,
        parseInt(id, 10)
      ]);
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Staff account updated successfully.',
      paylod: { staff: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update staff details. Internal server error.'
    }, { status: 500 });
  }
}

// DELETE staff account (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { id } = await params;

    const result = await query('DELETE FROM staffs WHERE id = $1 RETURNING id', [parseInt(id, 10)]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Staff account deleted successfully.'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete staff account. Internal server error.'
    }, { status: 500 });
  }
}
