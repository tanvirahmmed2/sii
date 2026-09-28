import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminUser, comparePassword, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const sessionAdmin = await getAdminUser();
    if (!sessionAdmin) return NextResponse.json({ success: false, error: 'Unauthorized', paylod: null }, { status: 401 });

    const res = await query(
      `SELECT id, name, email, number, address, is_active, is_two_factor_enabled,
              image, image_id, date_of_birth, nationality, blood_group, gender,
              nid_number, bio, username, created_at, updated_at
       FROM admins WHERE id = $1`,
      [sessionAdmin.id]
    );
    if (res.rows.length === 0) return NextResponse.json({ success: false, error: 'Admin not found.', paylod: null }, { status: 404 });

    const expRes = await query(
      'SELECT * FROM admin_experiences WHERE admin_id = $1 ORDER BY start_date DESC',
      [sessionAdmin.id]
    );

    const admin = { ...res.rows[0], experiences: expRes.rows };

    return NextResponse.json({ success: true, message: 'Admin profile retrieved successfully.', paylod: { admin } }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', paylod: null }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const sessionAdmin = await getAdminUser();
    if (!sessionAdmin) return NextResponse.json({ success: false, error: 'Unauthorized', paylod: null }, { status: 401 });

    const body = await request.json();
    const {
      name, number, address,
      date_of_birth, nationality, blood_group, gender, nid_number, bio,
      is_two_factor_enabled, image, image_id,
      current_password, new_password
    } = body;

    const adminResult = await query('SELECT * FROM admins WHERE id = $1', [sessionAdmin.id]);
    if (adminResult.rows.length === 0) return NextResponse.json({ success: false, error: 'Admin not found.', paylod: null }, { status: 404 });
    const dbAdmin = adminResult.rows[0];

    let hashedNewPassword = null;
    if (new_password) {
      if (!current_password) return NextResponse.json({ success: false, error: 'Current password is required.', paylod: null }, { status: 400 });
      const isValid = await comparePassword(current_password, dbAdmin.password_hash);
      if (!isValid) return NextResponse.json({ success: false, error: 'Current password is incorrect.', paylod: null }, { status: 400 });
      hashedNewPassword = await hashPassword(new_password);
    }

    const new2FA = is_two_factor_enabled !== undefined ? Boolean(is_two_factor_enabled) : (dbAdmin.is_two_factor_enabled !== false);

    const updateResult = await query(`
      UPDATE admins
      SET name = COALESCE($1, name),
          number = COALESCE($2, number),
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
      RETURNING id, name, email, number, address, is_active, is_two_factor_enabled,
                image, image_id, date_of_birth, nationality, blood_group, gender,
                nid_number, bio, username, created_at, updated_at
    `, [name, number, address, new2FA, image || null, image_id || null,
        date_of_birth || null, nationality || null, blood_group || null,
        gender || null, nid_number || null, bio || null,
        hashedNewPassword, sessionAdmin.id]);

    return NextResponse.json({ success: true, message: 'Admin profile updated successfully.', paylod: { admin: updateResult.rows[0] } }, { status: 200 });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', paylod: null }, { status: 500 });
  }
}
