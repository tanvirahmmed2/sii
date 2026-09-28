import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  hashPassword,
  comparePassword,
  generateToken,
  setAdminSessionCookie,
} from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, user: null, message: 'Not logged in.' }, { status: 401 });
    }

    const role = (user.role || '').toLowerCase();
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleName: user.role_name || user.role,
        permissions: user.permissions || [],
        isAdmin: (user.permissions || []).includes('developers'),
        isActive: user.is_active !== false,
        isVerified: user.is_verified === true,
        twoFactorEnabled: user.two_factor_enabled || false,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to update profile.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const data = body.data || body;

    const currentRes = await queryDb(
      `SELECT d.id, d.name, d.email, d.password, d.role_id, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name,
              d.is_active, d.is_verified, d.two_factor_enabled
       FROM developers d
       LEFT JOIN roles r ON d.role_id = r.id
       WHERE d.id = $1 LIMIT 1`,
      [authUser.id]
    );

    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Developer not found.' }, { status: 404 });
    }

    const currentDev = currentRes.rows[0];

    // 1. Name
    let newName = currentDev.name;
    if (data.name !== undefined) {
      newName = data.name.trim();
      if (!newName) {
        return NextResponse.json({ success: false, error: 'Full name cannot be empty.' }, { status: 400 });
      }
    }

    // 2. Email
    let newEmail = currentDev.email;
    let emailChanged = false;
    if (data.email !== undefined) {
      newEmail = data.email.trim().toLowerCase();
      if (!newEmail) {
        return NextResponse.json({ success: false, error: 'Email address cannot be empty.' }, { status: 400 });
      }
      if (!EMAIL_REGEX.test(newEmail)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
      }

      if (newEmail !== currentDev.email.toLowerCase()) {
        const check = await queryDb(
          'SELECT id FROM developers WHERE LOWER(email) = LOWER($1) AND id != $2 LIMIT 1',
          [newEmail, authUser.id]
        );
        if (check.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: 'This email address is already in use by another developer.' },
            { status: 409 }
          );
        }
        emailChanged = true;
      }
    }

    // 3. Two-factor
    let newTwoFactor = currentDev.two_factor_enabled;
    if (data.two_factor_enabled !== undefined) {
      newTwoFactor = Boolean(data.two_factor_enabled);
    }

    // 4. Password change
    let newPasswordHash = currentDev.password;
    if (data.newPassword && data.newPassword.trim()) {
      const currentPassword = data.currentPassword?.trim();
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to set a new password.' },
          { status: 400 }
        );
      }

      const isMatch = await comparePassword(currentPassword, currentDev.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect. Please try again.' },
          { status: 400 }
        );
      }

      if (data.newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      newPasswordHash = await hashPassword(data.newPassword.trim());
    }

    const updateRes = await queryDb(
      `UPDATE developers
       SET name = $1, email = $2, password = $3, two_factor_enabled = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, email, role_id, is_active, is_verified, two_factor_enabled, last_login_at, last_login_ip, created_at, updated_at`,
      [newName, newEmail, newPasswordHash, newTwoFactor, authUser.id]
    );

    const updated = {
      ...updateRes.rows[0],
      role: currentDev.role,
      role_name: currentDev.role_name,
    };
    const role = (updated.role || '').toLowerCase();

    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        roleName: updated.role_name || updated.role,
        permissions: authUser.permissions || [],
        isAdmin: (authUser.permissions || []).includes('developers'),
        isActive: updated.is_active !== false,
        isVerified: updated.is_verified === true,
        twoFactorEnabled: updated.two_factor_enabled || false,
      },
    });

    if (emailChanged) {
      try {
        const refreshedToken = generateToken(
          { id: updated.id, email: newEmail, role: updated.role },
          '7d'
        );
        await queryDb('UPDATE session SET token = $1 WHERE developer_id = $2 AND token = $3', [
          refreshedToken,
          updated.id,
          authUser.current_session_token,
        ]).catch(() => {});

        await setAdminSessionCookie(response, refreshedToken);
      } catch (cookieErr) {
        console.warn('Cookie refresh warning in /api/developer/me:', cookieErr);
      }
    }

    return response;
  } catch (error) {
    console.error('Error updating /api/developer/me:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  return PUT(request);
}

export async function POST(request) {
  return PUT(request);
}
