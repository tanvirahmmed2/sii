import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hashPassword, comparePassword } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: View logged-in developer's profile and account details
// ============================================================================
export async function GET(request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to view developer profile.' },
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

    // Fetch active session count
    const sessionRes = await queryDb(
      `SELECT COUNT(*)::int AS active_count
       FROM session
       WHERE developer_id = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP`,
      [developer.id]
    );
    const activeSessions = sessionRes.rows[0]?.active_count || 1;

    // Fetch recent login activities
    const loginRes = await queryDb(
      `SELECT id, status, ip_address, user_agent, failure_reason, created_at
       FROM login_activity
       WHERE developer_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [developer.id]
    );

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
// PUT: Update logged-in developer's information and credentials
// ============================================================================
export async function PUT(request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to update developer profile.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = body.data || body;

    // Load current developer record including current password hash
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

    // 1. Update Name
    const newName = data.name !== undefined ? data.name.trim() : currentDev.name;
    if (!newName) {
      return NextResponse.json({ success: false, error: 'Full name cannot be empty.' }, { status: 400 });
    }

    // 2. Update Email
    const newEmail = data.email !== undefined ? data.email.trim().toLowerCase() : currentDev.email;
    if (!newEmail) {
      return NextResponse.json({ success: false, error: 'Email address cannot be empty.' }, { status: 400 });
    }

    if (newEmail !== currentDev.email.toLowerCase()) {
      const emailCheck = await queryDb(
        'SELECT id FROM developers WHERE LOWER(email) = $1 AND id != $2 LIMIT 1',
        [newEmail, authUser.id]
      );
      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'This email address is already in use by another developer.' },
          { status: 400 }
        );
      }
    }

    // 3. Update Two-Factor Authentication Toggle
    const newTwoFactor = data.two_factor_enabled !== undefined
      ? Boolean(data.two_factor_enabled)
      : currentDev.two_factor_enabled;

    // 4. Update Password (if requested)
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

    // Execute update query
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
        permissions: authUser.permissions || [],
        isAdmin: (authUser.permissions || []).includes('developers'),
        isActive: updatedDev.is_active !== false,
        isVerified: updatedDev.is_verified === true,
      },
    });

    if (newEmail !== currentDev.email.toLowerCase()) {
      try {
        const { generateToken, setAdminSessionCookie } = await import('@/lib/middleware/developer');
        const refreshedToken = generateToken(
          { id: updatedDev.id, email: newEmail, role: updatedDev.role },
          '7d'
        );
        await queryDb('UPDATE session SET token = $1 WHERE developer_id = $2 AND token = $3', [
          refreshedToken,
          updatedDev.id,
          authUser.current_session_token,
        ]).catch(() => {});
        await setAdminSessionCookie(response, refreshedToken);
      } catch (cErr) {
        console.warn('Could not refresh session cookie in api/developer/route.js:', cErr);
      }
    }

    return response;
  } catch (error) {
    console.error('Error updating developer profile:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST is mapped to PUT for convenience with form submissions
export async function POST(request) {
  return PUT(request);
}
