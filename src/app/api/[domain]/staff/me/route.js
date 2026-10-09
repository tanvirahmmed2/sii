import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import {
  getStaffSession,
  comparePassword,
  hashPassword,
} from 'src/lib/middleware/staff';

// GET: Fetch currently authenticated staff member's complete profile
export async function GET(request) {
  try {
    const sessionData = await getStaffSession(request);
    if (!sessionData || !sessionData.staff) {
      return NextResponse.json(
        { success: false, staff: null, message: 'Staff authentication required.' },
        { status: 401 }
      );
    }

    const { staff, permissions, allowedModules } = sessionData;

    // Fetch pay grade details
    let payGrade = null;
    if (staff.gradeId) {
      const gradeRes = await queryDb(
        `SELECT id, name, basic_salary, allowance
         FROM website_staff_pay_scale
         WHERE id = $1 LIMIT 1`,
        [staff.gradeId]
      );
      if (gradeRes.rows.length > 0) {
        payGrade = gradeRes.rows[0];
      }
    }

    // Fetch work experiences
    const expRes = await queryDb(
      `SELECT id, title, organization, start_date, end_date, is_current, description
       FROM website_staff_experiences
       WHERE staff_id = $1 AND website_id = $2
       ORDER BY is_current DESC, start_date DESC`,
      [staff.id, staff.websiteId]
    );

    // Fetch active session stats
    const sessionsRes = await queryDb(
      `SELECT id, ip_address, user_agent, last_active_at, created_at,
              (id = $1) AS is_current_session
       FROM staff_sessions
       WHERE staff_id = $2 AND website_id = $3 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY last_active_at DESC
       LIMIT 10`,
      [sessionData.session.id, staff.id, staff.websiteId]
    );

    const fullStaffData = {
      ...staff,
      payGrade,
      experiences: expRes.rows || [],
      activeSessions: sessionsRes.rows || [],
    };

    return NextResponse.json({
      success: true,
      staff: fullStaffData,
      permissions,
      allowedModules,
      payload: {
        staff: fullStaffData,
        permissions,
        allowedModules,
      },
      paylod: {
        staff: fullStaffData,
        permissions,
        allowedModules,
      },
    });
  } catch (error) {
    console.error('Error fetching staff profile in /api/staff/me:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error fetching staff profile.' },
      { status: 500 }
    );
  }
}

// PUT: Update staff self information (personal info, credentials, 2FA, experiences)
export async function PUT(request) {
  try {
    const sessionData = await getStaffSession(request);
    if (!sessionData || !sessionData.staff) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Staff session expired or invalid.' },
        { status: 401 }
      );
    }

    const { staff } = sessionData;
    const body = await request.json().catch(() => ({}));
    const data = body.data || body;

    // 1. Fetch current staff row
    const currentRes = await queryDb(
      `SELECT ws.* FROM website_staffs ws WHERE ws.id = $1 LIMIT 1`,
      [staff.id]
    );

    if (currentRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Staff account not found.' },
        { status: 404 }
      );
    }

    const current = currentRes.rows[0];

    // Name
    let newName = current.name;
    if (data.name !== undefined) {
      newName = String(data.name).trim();
      if (!newName) {
        return NextResponse.json(
          { success: false, error: 'Staff name cannot be empty.' },
          { status: 400 }
        );
      }
    }

    // Number / Phone
    let newNumber = current.number;
    if (data.number !== undefined || data.phone !== undefined) {
      const candidate = (data.number !== undefined ? data.number : data.phone) || '';
      newNumber = String(candidate).trim();
    }

    // Username check
    let newUsername = current.username;
    if (data.username !== undefined) {
      newUsername = String(data.username).trim() || null;
      if (newUsername && newUsername !== current.username) {
        const uCheck = await queryDb(
          `SELECT id FROM website_staffs WHERE website_id = $1 AND LOWER(username) = LOWER($2) AND id != $3 LIMIT 1`,
          [staff.websiteId, newUsername, staff.id]
        );
        if (uCheck.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: 'This username is already taken by another staff member.' },
            { status: 409 }
          );
        }
      }
    }

    // Password change verification
    let newPasswordHash = current.password;
    if (data.newPassword && String(data.newPassword).trim()) {
      const curPass = String(data.currentPassword || '').trim();
      if (!curPass) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to update your password.' },
          { status: 400 }
        );
      }

      const match = await comparePassword(curPass, current.password);
      if (!match) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect.' },
          { status: 400 }
        );
      }

      if (String(data.newPassword).trim().length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters in length.' },
          { status: 400 }
        );
      }

      newPasswordHash = await hashPassword(String(data.newPassword).trim());
    }

    // Other optional fields
    const newAddress = data.address !== undefined ? String(data.address).trim() : current.address;
    const newBio = data.bio !== undefined ? String(data.bio).trim() : current.bio;
    const newDob = data.date_of_birth !== undefined || data.dateOfBirth !== undefined 
      ? (data.date_of_birth || data.dateOfBirth || null) 
      : current.date_of_birth;
    const newGender = data.gender !== undefined ? String(data.gender).trim() : current.gender;
    const newBlood = data.blood_group !== undefined || data.bloodGroup !== undefined
      ? String(data.blood_group || data.bloodGroup || '').trim()
      : current.blood_group;
    const newNationality = data.nationality !== undefined ? String(data.nationality).trim() : current.nationality;
    const newNid = data.nid_number !== undefined || data.nidNumber !== undefined
      ? String(data.nid_number || data.nidNumber || '').trim()
      : current.nid_number;
    const new2FA = data.is_two_factor_enabled !== undefined || data.isTwoFactorEnabled !== undefined
      ? Boolean(data.is_two_factor_enabled ?? data.isTwoFactorEnabled)
      : current.is_two_factor_enabled;
    const newImage = data.image !== undefined ? String(data.image).trim() : current.image;

    // Execute update
    const updateRes = await queryDb(
      `UPDATE website_staffs
       SET name = $1,
           number = $2,
           address = $3,
           bio = $4,
           date_of_birth = $5,
           gender = $6,
           blood_group = $7,
           nationality = $8,
           nid_number = $9,
           username = $10,
           password = $11,
           is_two_factor_enabled = $12,
           image = $13,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING id, website_id, name, email, number, address, bio,
                 date_of_birth, gender, blood_group, nationality, nid_number,
                 username, is_active, is_registered, is_two_factor_enabled, image, grade_id, updated_at`,
      [
        newName,
        newNumber,
        newAddress,
        newBio,
        newDob || null,
        newGender || null,
        newBlood || null,
        newNationality || null,
        newNid || null,
        newUsername || null,
        newPasswordHash,
        new2FA,
        newImage || null,
        staff.id,
      ]
    );

    // Sync work experiences if provided
    if (Array.isArray(data.experiences)) {
      // Clear and re-insert experiences or sync
      await queryDb(
        `DELETE FROM website_staff_experiences WHERE staff_id = $1 AND website_id = $2`,
        [staff.id, staff.websiteId]
      );

      for (const exp of data.experiences) {
        if (exp.title && exp.organization) {
          await queryDb(
            `INSERT INTO website_staff_experiences (
               website_id, staff_id, title, organization, start_date, end_date, is_current, description
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              staff.websiteId,
              staff.id,
              String(exp.title).trim(),
              String(exp.organization).trim(),
              exp.start_date || exp.startDate || null,
              exp.is_current || exp.isCurrent ? null : (exp.end_date || exp.endDate || null),
              Boolean(exp.is_current || exp.isCurrent),
              exp.description ? String(exp.description).trim() : null,
            ]
          );
        }
      }
    }

    const updatedStaffRow = updateRes.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Staff profile updated successfully.',
      staff: {
        ...staff,
        ...updatedStaffRow,
        phone: updatedStaffRow.number,
        isTwoFactorEnabled: Boolean(updatedStaffRow.is_two_factor_enabled),
      },
    });
  } catch (error) {
    console.error('Error updating staff profile in /api/staff/me:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error updating profile.' },
      { status: 500 }
    );
  }
}
