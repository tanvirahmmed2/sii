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

// ============================================================================
// GET: Fetch authenticated developer profile, stats, and audit logs
// ============================================================================
export async function GET(request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to view profile.' },
        { status: 401 }
      );
    }

    const devRes = await queryDb(
      `SELECT d.id, d.name, d.email, d.role_id, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name,
              d.is_active, d.is_verified, d.two_factor_enabled, d.last_login_at, d.last_login_ip, d.created_at, d.updated_at
       FROM developers d
       LEFT JOIN roles r ON d.role_id = r.id
       WHERE d.id = $1
       LIMIT 1`,
      [authUser.id]
    );

    if (devRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Developer account not found.' },
        { status: 404 }
      );
    }

    const developer = devRes.rows[0];

    // Count active sessions
    const sessionRes = await queryDb(
      `SELECT COUNT(*)::int AS active_count
       FROM session
       WHERE developer_id = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP`,
      [developer.id]
    ).catch(() => ({ rows: [{ active_count: 1 }] }));

    const activeSessions = sessionRes.rows[0]?.active_count || 1;

    // Fetch recent login history
    const loginRes = await queryDb(
      `SELECT id, status, ip_address, user_agent, failure_reason, created_at
       FROM login_activity
       WHERE developer_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [developer.id]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      developer: {
        ...developer,
        isAdmin: (developer.permissions || []).includes('developers'),
      },
      activeSessions,
      recentLogins: loginRes.rows,
    });
  } catch (error) {
    console.error('Error fetching developer profile:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT / PATCH: Update authenticated developer profile and credentials
// ============================================================================
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

    // Load current developer record including password hash
    const currentRes = await queryDb(
      `SELECT d.id, d.name, d.email, d.password, d.role_id, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name,
              d.is_active, d.is_verified, d.two_factor_enabled
       FROM developers d
       LEFT JOIN roles r ON d.role_id = r.id
       WHERE d.id = $1 LIMIT 1`,
      [authUser.id]
    );

    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Developer account not found.' }, { status: 404 });
    }

    const currentDev = currentRes.rows[0];

    // 1. Validate & sanitize Name
    let newName = currentDev.name;
    if (data.name !== undefined) {
      newName = data.name.trim();
      if (!newName) {
        return NextResponse.json({ success: false, error: 'Full name cannot be empty.' }, { status: 400 });
      }
    }

    // 2. Validate & sanitize Email
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
        const emailCheck = await queryDb(
          'SELECT id FROM developers WHERE LOWER(email) = LOWER($1) AND id != $2 LIMIT 1',
          [newEmail, authUser.id]
        );
        if (emailCheck.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: 'This email address is already registered to another account.' },
            { status: 409 }
          );
        }
        emailChanged = true;
      }
    }

    // 3. Two-Factor Authentication
    let newTwoFactor = currentDev.two_factor_enabled;
    if (data.two_factor_enabled !== undefined) {
      newTwoFactor = Boolean(data.two_factor_enabled);
    }

    // 4. Password Change
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

    // Execute database update
    const updateRes = await queryDb(
      `UPDATE developers
       SET name = $1,
           email = $2,
           password = $3,
           two_factor_enabled = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, email, role_id, is_active, is_verified, two_factor_enabled, last_login_at, last_login_ip, created_at, updated_at`,
      [newName, newEmail, newPasswordHash, newTwoFactor, authUser.id]
    );

    const updatedDev = {
      ...updateRes.rows[0],
      role: currentDev.role,
      role_name: currentDev.role_name,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Developer profile updated successfully.',
      developer: {
        ...updatedDev,
        permissions: authUser.permissions || [],
        isAdmin: (authUser.permissions || []).includes('developers'),
      },
      user: {
        id: updatedDev.id,
        name: updatedDev.name,
        email: updatedDev.email,
        role: updatedDev.role,
        roleName: updatedDev.role_name || updatedDev.role,
        permissions: authUser.permissions || [],
        isAdmin: (authUser.permissions || []).includes('developers'),
        isActive: updatedDev.is_active !== false,
        isVerified: updatedDev.is_verified === true,
      },
    });

    // If email changed, refresh JWT cookie token seamlessly
    if (emailChanged) {
      try {
        const refreshedToken = generateToken(
          { id: updatedDev.id, email: newEmail, role: updatedDev.role },
          '7d'
        );
        // Update session in DB
        await queryDb('UPDATE session SET token = $1 WHERE developer_id = $2 AND token = $3', [
          refreshedToken,
          updatedDev.id,
          authUser.current_session_token,
        ]).catch(() => {});

        await setAdminSessionCookie(response, refreshedToken);
      } catch (cookieErr) {
        console.warn('Could not refresh session cookie after email change:', cookieErr);
      }
    }

    return response;
  } catch (error) {
    console.error('Error updating developer profile:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  return PUT(request);
}

export async function POST(request) {
  return PUT(request);
}
