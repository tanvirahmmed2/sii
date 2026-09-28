import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, comparePassword, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Not authenticated', paylod: null }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded?.id) return NextResponse.json({ success: false, error: 'Invalid token', paylod: null }, { status: 401 });

    const result = await query(`
      SELECT id, name, email, number, designation, address,
             is_active, is_registered, is_permanent, is_two_factor_enabled,
             image, image_id, date_of_birth, nationality, blood_group, gender,
             nid_number, bio, username, created_at, updated_at
      FROM teachers
      WHERE id = $1 AND is_active = TRUE AND is_registered = TRUE
    `, [decoded.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher not found', paylod: null }, { status: 404 });
    }

    // Fetch experiences
    const expRes = await query(
      'SELECT * FROM teacher_experiences WHERE teacher_id = $1 ORDER BY start_date DESC',
      [decoded.id]
    );

    const teacher = { ...result.rows[0], experiences: expRes.rows };

    return NextResponse.json({ success: true, message: 'Successfully fetched data', paylod: { teacher } }, { status: 200 });
  } catch (error) {
    console.error('Error in teacher/me GET:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', paylod: null }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Not authenticated', paylod: null }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded?.id) return NextResponse.json({ success: false, error: 'Invalid token', paylod: null }, { status: 401 });

    const body = await request.json();
    const {
      name, number, address,
      date_of_birth, nationality, blood_group, gender, nid_number, bio,
      is_two_factor_enabled, image, image_id,
      current_password, new_password
    } = body;

    const checkRes = await query('SELECT * FROM teachers WHERE id = $1 AND is_active = TRUE', [decoded.id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher not found', paylod: null }, { status: 404 });
    }
    const dbTeacher = checkRes.rows[0];

    let hashedNewPassword = null;
    if (new_password) {
      if (!current_password) return NextResponse.json({ success: false, error: 'Current password required.' }, { status: 400 });
      const valid = await comparePassword(current_password, dbTeacher.password_hash);
      if (!valid) return NextResponse.json({ success: false, error: 'Current password incorrect.' }, { status: 400 });
      hashedNewPassword = await hashPassword(new_password);
    }

    const new2FA = is_two_factor_enabled !== undefined ? Boolean(is_two_factor_enabled) : Boolean(dbTeacher.is_two_factor_enabled);

    const updateRes = await query(`
      UPDATE teachers
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
      RETURNING id, name, email, number, designation, address,
                is_active, is_registered, is_permanent, is_two_factor_enabled,
                image, image_id, date_of_birth, nationality, blood_group, gender,
                nid_number, bio, username, created_at, updated_at
    `, [name, number, address, new2FA, image, image_id,
        date_of_birth || null, nationality || null, blood_group || null,
        gender || null, nid_number || null, bio || null,
        hashedNewPassword, decoded.id]);

    return NextResponse.json({ success: true, message: 'Profile updated successfully.', paylod: { teacher: updateRes.rows[0] } }, { status: 200 });
  } catch (error) {
    console.error('Error in teacher/me PUT:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', paylod: null }, { status: 500 });
  }
}
