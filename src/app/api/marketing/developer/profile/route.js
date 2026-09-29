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
      `SELECT d.id, d.name, d.email, d.phone, d.designation, d.bio, d.avatar_url,
              d.github_profile, d.linkedin_profile, d.role_id,
              COALESCE(dr.slug, 'developer') AS role, COALESCE(dr.name, 'Developer') AS role_name,
              d.is_active, d.last_login_at, d.created_at, d.updated_at
       FROM developers d
       LEFT JOIN developer_roles dr ON d.role_id = dr.id
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
       FROM developer_login_sessions
       WHERE developer_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP`,
      [developer.id]
    ).catch(() => ({ rows: [{ active_count: 1 }] }));

    const activeSessions = sessionRes.rows[0]?.active_count || 1;

    // Fetch recent login history
    const loginRes = await queryDb(
      `SELECT id, status, ip_address, user_agent, failure_reason, login_time, created_at
       FROM developer_login_activities
       WHERE developer_id = $1
       ORDER BY id DESC
       LIMIT 10`,
      [developer.id]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      developer: {
        ...developer,
        isVerified: true,
        permissions: authUser.permissions || [],
        isAdmin: Boolean(authUser.isAdmin),
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
      `SELECT d.id, d.name, d.email, d.phone, d.bio, d.avatar_url, d.github_profile, d.linkedin_profile, d.password, d.role_id,
              COALESCE(dr.slug, 'developer') AS role, COALESCE(dr.name, 'Developer') AS role_name,
              d.is_active
       FROM developers d
       LEFT JOIN developer_roles dr ON d.role_id = dr.id
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
    const newBio = data.bio !== undefined ? data.bio.trim() : currentDev.bio;
    const newGithub = data.github_profile !== undefined ? data.github_profile.trim() : currentDev.github_profile;
    const newLinkedin = data.linkedin_profile !== undefined ? data.linkedin_profile.trim() : currentDev.linkedin_profile;

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
           bio = $4,
           github_profile = $5,
           linkedin_profile = $6,
           password = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, name, email, phone, designation, bio, avatar_url, github_profile, linkedin_profile, role_id, is_active, last_login_at, created_at, updated_at`,
      [newName, newEmail, newPhone, newBio, newGithub, newLinkedin, newPasswordHash, authUser.id]
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
        isVerified: true,
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
        isVerified: true,
      },
    });

    // If email changed, refresh JWT cookie token seamlessly
    if (emailChanged) {
      try {
        const refreshedToken = generateToken(
          { id: updatedDev.id, email: newEmail, role: updatedDev.role, roleId: updatedDev.role_id },
          '7d'
        );
        await queryDb('UPDATE developer_login_sessions SET token = $1 WHERE developer_id = $2 AND is_active = TRUE', [
          refreshedToken,
          updatedDev.id,
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
