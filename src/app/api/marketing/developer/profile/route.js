import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  hashPassword,
  comparePassword,
  generateToken,
  setDeveloperSessionCookie,
} from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// GET: Fetch authenticated developer complete profile, stats, sessions & audit
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
      `SELECT d.id, d.name, d.email, d.phone, d.designation, d.bio, d.avatar_url, d.avatar_id,
              d.github_profile, d.linkedin_profile,
              'developer' AS role, COALESCE(d.designation, 'Developer') AS role_name,
              d.is_active, d.email_verified, d.last_login_at, d.created_at, d.updated_at
       FROM developers d
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

    // Fetch active login sessions with current session identification
    const currentToken = authUser.token || '';
    const sessionRes = await queryDb(
      `SELECT id, ip_address, user_agent, expires_at, last_active_at, created_at,
              CASE WHEN token = $2 THEN true ELSE false END AS is_current
       FROM developer_login_sessions
       WHERE developer_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY CASE WHEN token = $2 THEN 0 ELSE 1 END, last_active_at DESC`,
      [developer.id, currentToken]
    ).catch(() => ({ rows: [] }));

    const activeSessions = sessionRes.rows.length || 1;

    // Fetch recent login history
    const loginRes = await queryDb(
      `SELECT id, status, ip_address, user_agent, failure_reason, login_time, created_at
       FROM developer_login_activities
       WHERE developer_id = $1
       ORDER BY id DESC
       LIMIT 15`,
      [developer.id]
    ).catch(() => ({ rows: [] }));

    // Fetch granular permissions with module details directly from module_permissions
    let rolePermissions = [];
    const permRes = await queryDb(
      `SELECT m.name AS module_name, m.slug AS module_slug, mp.can_view, mp.can_create, mp.can_edit, mp.can_delete
       FROM module_permissions mp
       JOIN modules m ON mp.module_id = m.id
       WHERE mp.developer_id = $1 AND m.is_active = TRUE
       ORDER BY m.name ASC`,
      [developer.id]
    ).catch(() => ({ rows: [] }));
    rolePermissions = permRes.rows || [];

    // Fetch operational stats (assigned tickets, ticket replies)
    const statsRes = await queryDb(
      `SELECT 
        (SELECT COUNT(*)::int FROM support_tickets WHERE assigned_developer_id = $1) AS assigned_tickets,
        (SELECT COUNT(*)::int FROM ticket_replies WHERE developer_id = $1) AS ticket_replies_count
      `,
      [developer.id]
    ).catch(() => ({ rows: [{ assigned_tickets: 0, ticket_replies_count: 0 }] }));

    const stats = statsRes.rows[0] || { assigned_tickets: 0, ticket_replies_count: 0 };

    return NextResponse.json({
      success: true,
      developer: {
        ...developer,
        is_verified: Boolean(developer.email_verified),
        isVerified: Boolean(developer.email_verified),
        permissions: authUser.permissions || [],
        rolePermissions,
        isAdmin: Boolean(authUser.isAdmin),
        stats,
      },
      activeSessions,
      sessionsList: sessionRes.rows,
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
      `SELECT d.id, d.name, d.email, d.phone, d.designation, d.bio, d.avatar_url, d.avatar_id,
              d.github_profile, d.linkedin_profile, d.password,
              'developer' AS role, COALESCE(d.designation, 'Developer') AS role_name,
              d.is_active, d.email_verified
       FROM developers d
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

    // 3. Profile details
    const newPhone = data.phone !== undefined ? data.phone.trim() : currentDev.phone;
    const newDesignation = data.designation !== undefined ? data.designation.trim() : currentDev.designation;
    const newBio = data.bio !== undefined ? data.bio.trim() : currentDev.bio;
    const newGithub = data.github_profile !== undefined ? data.github_profile.trim() : currentDev.github_profile;
    const newLinkedin = data.linkedin_profile !== undefined ? data.linkedin_profile.trim() : currentDev.linkedin_profile;
    const newAvatarUrl = data.avatar_url !== undefined ? data.avatar_url.trim() : currentDev.avatar_url;

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
           phone = $3,
           designation = $4,
           bio = $5,
           github_profile = $6,
           linkedin_profile = $7,
           avatar_url = $8,
           password = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING id, name, email, phone, designation, bio, avatar_url, avatar_id, github_profile, linkedin_profile, is_active, email_verified, last_login_at, created_at, updated_at`,
      [newName, newEmail, newPhone, newDesignation, newBio, newGithub, newLinkedin, newAvatarUrl, newPasswordHash, authUser.id]
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
        is_verified: Boolean(updatedDev.email_verified),
        isVerified: Boolean(updatedDev.email_verified),
        permissions: authUser.permissions || [],
        isAdmin: Boolean(authUser.isAdmin),
      },
      user: {
        id: updatedDev.id,
        name: updatedDev.name,
        email: updatedDev.email,
        phone: updatedDev.phone,
        designation: updatedDev.designation,
        avatarUrl: updatedDev.avatar_url,
        bio: updatedDev.bio,
        githubProfile: updatedDev.github_profile,
        linkedinProfile: updatedDev.linkedin_profile,
        role: updatedDev.role,
        roleName: updatedDev.role_name,
        permissions: authUser.permissions || [],
        isAdmin: Boolean(authUser.isAdmin),
        isActive: updatedDev.is_active !== false,
        isVerified: Boolean(updatedDev.email_verified),
      },
    });

    // If email changed, refresh JWT cookie token seamlessly
    if (emailChanged) {
      try {
        const refreshedToken = generateToken(
          { id: updatedDev.id, email: newEmail, designation: updatedDev.designation },
          '7d'
        );
        await queryDb('UPDATE developer_login_sessions SET token = $1 WHERE developer_id = $2 AND is_active = TRUE', [
          refreshedToken,
          updatedDev.id,
        ]).catch(() => {});

        await setDeveloperSessionCookie(response, refreshedToken);
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

// ============================================================================
// DELETE: Revoke other sessions or a specific session
// ============================================================================
export async function DELETE(request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const revokeOthers = searchParams.get('revokeOthers') === 'true';

    if (revokeOthers) {
      const currentToken = authUser.token || '';
      await queryDb(
        `UPDATE developer_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE developer_id = $1 AND token != $2`,
        [authUser.id, currentToken]
      );
      return NextResponse.json({ success: true, message: 'All other active sessions revoked successfully.' });
    }

    if (sessionId) {
      await queryDb(
        `UPDATE developer_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE developer_id = $1 AND id = $2`,
        [authUser.id, sessionId]
      );
      return NextResponse.json({ success: true, message: 'Session revoked successfully.' });
    }

    return NextResponse.json({ success: false, error: 'Session ID or action required.' }, { status: 400 });
  } catch (error) {
    console.error('Error revoking session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  return PUT(request);
}

export async function POST(request) {
  return PUT(request);
}
