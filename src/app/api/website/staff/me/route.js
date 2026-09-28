import { NextResponse } from 'next/server';
import { getStaffUser, comparePassword, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionStaff = await getStaffUser();
    if (!sessionStaff) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const result = await query(
      `SELECT id, name, email, phone, role, address, is_active, is_registered, is_two_factor_enabled,
              image, image_id, date_of_birth, nationality, blood_group, gender, nid_number, bio,
              username, created_at, updated_at
       FROM staffs WHERE id = $1`,
      [sessionStaff.id]
    );
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: 'Staff not found.' }, { status: 404 });

    const expRes = await query(
      'SELECT * FROM staff_experiences WHERE staff_id = $1 ORDER BY start_date DESC',
      [sessionStaff.id]
    );

    const staff = { ...result.rows[0], experiences: expRes.rows };

    return NextResponse.json({ success: true, paylod: { staff } }, { status: 200 });
  } catch (error) {
    console.error('Error in staff /me GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const sessionStaff = await getStaffUser();
    if (!sessionStaff) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      name, phone, address,
      date_of_birth, nationality, blood_group, gender, nid_number, bio,
      is_two_factor_enabled, image, image_id,
      current_password, new_password
    } = body;

    const checkRes = await query('SELECT * FROM staffs WHERE id = $1 AND is_active = TRUE', [sessionStaff.id]);
    if (checkRes.rows.length === 0) return NextResponse.json({ success: false, error: 'Staff not found.' }, { status: 404 });
    const dbStaff = checkRes.rows[0];

    let hashedNewPassword = null;
    if (new_password) {
      if (!current_password) return NextResponse.json({ success: false, error: 'Current password is required.' }, { status: 400 });
      const isValid = await comparePassword(current_password, dbStaff.password_hash);
      if (!isValid) return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 400 });
      hashedNewPassword = await hashPassword(new_password);
    }

    const new2FA = is_two_factor_enabled !== undefined ? Boolean(is_two_factor_enabled) : Boolean(dbStaff.is_two_factor_enabled);

    const updateRes = await query(`
      UPDATE staffs
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          address = COALESCE($3, address),
          is_two_factor_enabled = $4,
          image = COALESCE($5, image),
          image_id = COALESCE($6, image_id),
          date_of_birth = COALESCE($7, date_of_birth),
          nationality = COALESCE($8, nationality),
          blood_group = COALESCE($9, blood_group),
          gender = COALESCE($10, gender),
          nid_number = COALESCE($11, nid_number),
          bio = COALESCE($12, bio),
          password_hash = COALESCE($13, password_hash),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING id, name, email, phone, role, address, is_active, is_registered, is_two_factor_enabled,
                image, image_id, date_of_birth, nationality, blood_group, gender,
                nid_number, bio, username, created_at, updated_at
    `, [name, phone, address, new2FA, image || null, image_id || null,
        date_of_birth || null, nationality || null, blood_group || null,
        gender || null, nid_number || null, bio || null,
        hashedNewPassword, sessionStaff.id]);

    return NextResponse.json({ success: true, message: 'Staff profile updated successfully.', paylod: { staff: updateRes.rows[0] } }, { status: 200 });
  } catch (error) {
    console.error('Error in staff /me PUT:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
