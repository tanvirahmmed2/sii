import { NextResponse } from 'next/server';
import { getStaffSession } from 'src/lib/middleware/staff';
import { comparePassword, hashPassword } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const sessionData = await getStaffSession(request);
    if (!sessionData || !sessionData.staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { staff, permissions, allowedModules } = sessionData;

    // Fetch experiences from website_staff_experiences
    const expRes = await queryDb(
      `SELECT * FROM website_staff_experiences 
       WHERE staff_id = $1 AND website_id = $2 
       ORDER BY start_date DESC`,
      [staff.id, staff.websiteId]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json(
      {
        success: true,
        paylod: {
          staff: {
            ...staff,
            experiences: expRes.rows,
            permissions,
            allowedModules,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in staff /me GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const sessionData = await getStaffSession(request);
    if (!sessionData || !sessionData.staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { staff } = sessionData;
    const body = await request.json();
    const {
      name,
      number,
      phone,
      address,
      date_of_birth,
      nationality,
      blood_group,
      gender,
      nid_number,
      bio,
      is_two_factor_enabled,
      image,
      image_id,
      current_password,
      new_password,
    } = body;

    const staffRes = await queryDb(
      `SELECT * FROM website_staffs WHERE id = $1 AND website_id = $2 AND is_active = TRUE`,
      [staff.id, staff.websiteId]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff account not found.' }, { status: 404 });
    }

    const dbStaff = staffRes.rows[0];

    let hashedPassword = null;
    if (new_password) {
      if (!current_password) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to set a new password.' },
          { status: 400 }
        );
      }
      const isValid = await comparePassword(current_password, dbStaff.password);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect.' },
          { status: 400 }
        );
      }
      if (new_password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters.' },
          { status: 400 }
        );
      }
      hashedPassword = await hashPassword(new_password);
    }

    const new2FA =
      is_two_factor_enabled !== undefined
        ? Boolean(is_two_factor_enabled)
        : Boolean(dbStaff.is_two_factor_enabled);

    const updateRes = await queryDb(
      `UPDATE website_staffs
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
           password = COALESCE($13, password),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING id, website_id, name, email, number, address, is_active, is_registered,
                 is_two_factor_enabled, image, image_id, date_of_birth, nationality,
                 blood_group, gender, nid_number, bio, username, created_at, updated_at`,
      [
        name || null,
        number || phone || null,
        address || null,
        new2FA,
        image || null,
        image_id || null,
        date_of_birth || null,
        nationality || null,
        blood_group || null,
        gender || null,
        nid_number || null,
        bio || null,
        hashedPassword,
        staff.id,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Staff profile updated successfully.',
        paylod: { staff: updateRes.rows[0] },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in staff /me PUT:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
