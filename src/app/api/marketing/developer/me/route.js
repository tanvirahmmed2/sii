import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  hashPassword,
  comparePassword,
  generateToken,
  setAdminSessionCookie,
} from '@/lib/middleware/developer';
import { query } from '@/lib/database/db';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, user: null, message: 'Not logged in.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        designation: user.designation || 'Software Engineer',
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || '',
        githubProfile: user.githubProfile || '',
        linkedinProfile: user.linkedinProfile || '',
        role: user.role,
        roleName: user.roleName || user.role,
        permissions: user.permissions || [],
        isAdmin: Boolean(user.isAdmin),
        isActive: user.isActive !== false,
        isVerified: true,
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

    const currentRes = await query(
      `SELECT d.id, d.name, d.email, d.phone, d.designation, d.bio, d.avatar_url,
              d.github_profile, d.linkedin_profile, d.password, d.role_id,
              COALESCE(dr.slug, 'developer') AS role, COALESCE(dr.name, 'Developer') AS role_name,
              d.is_active
       FROM developers d
       LEFT JOIN developer_roles dr ON d.role_id = dr.id
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
        const check = await query(
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

    // 3. Profile fields
    const newPhone = data.phone !== undefined ? data.phone.trim() : currentDev.phone;
    const newBio = data.bio !== undefined ? data.bio.trim() : currentDev.bio;
    const newGithub = data.github_profile !== undefined ? data.github_profile.trim() : currentDev.github_profile;
    const newLinkedin = data.linkedin_profile !== undefined ? data.linkedin_profile.trim() : currentDev.linkedin_profile;

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

    const updateRes = await query(
      `UPDATE developers
       SET name = $1, email = $2, phone = $3, bio = $4, github_profile = $5, linkedin_profile = $6, password = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, name, email, phone, designation, bio, avatar_url, github_profile, linkedin_profile, role_id, is_active, last_login_at, created_at, updated_at`,
      [newName, newEmail, newPhone, newBio, newGithub, newLinkedin, newPasswordHash, authUser.id]
    );

    const updated = {
      ...updateRes.rows[0],
      role: currentDev.role,
      role_name: currentDev.role_name,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone || '',
        designation: updated.designation || 'Software Engineer',
        avatarUrl: updated.avatar_url || null,
        bio: updated.bio || '',
        githubProfile: updated.github_profile || '',
        linkedinProfile: updated.linkedin_profile || '',
        role: updated.role,
        roleName: updated.role_name || updated.role,
        permissions: authUser.permissions || [],
        isAdmin: Boolean(authUser.isAdmin),
        isActive: updated.is_active !== false,
        isVerified: true,
      },
    });

    if (emailChanged) {
      try {
        const refreshedToken = generateToken(
          { id: updated.id, email: newEmail, role: updated.role, roleId: updated.role_id },
          '7d'
        );
        await query(
          'UPDATE developer_login_sessions SET token = $1 WHERE developer_id = $2 AND is_active = TRUE',
          [refreshedToken, updated.id]
        ).catch(() => {});

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
