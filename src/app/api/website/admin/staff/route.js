import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, getAdminUser } from '@/lib/auth';
import { sendEmail } from '@/lib/brevo';
import { recordActivityLog } from '@/lib/logger';
import crypto from 'crypto';

// GET all staff
export async function GET() {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(`
      SELECT 
        id, name, email, number, role, address, 
        is_active, is_registered, grade_id, created_at 
      FROM staffs 
      ORDER BY name ASC
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Staff retrieved successfully',
      paylod: { staff: result.rows }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve staff. Internal server error.'
    }, { status: 500 });
  }
}

// POST pre-create a staff member (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { name, email, number, role, grade_id } = await request.json();

    if (!name || !email || !number || !role) {
      return NextResponse.json({
        success: false,
        error: 'Name, email, phone number, and role are required.'
      }, { status: 400 });
    }

    if (!['cashier', 'registrar', 'staff'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid role. Must be cashier, registrar, or staff.'
      }, { status: 400 });
    }

    // Check email uniqueness across tables
    const emailLower = email.trim().toLowerCase();

    const staffCheck = await query('SELECT id FROM staffs WHERE LOWER(email) = $1', [emailLower]);
    if (staffCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A staff member with this email is already registered.' }, { status: 400 });
    }

    const adminCheck = await query('SELECT id FROM admins WHERE LOWER(email) = $1', [emailLower]);
    if (adminCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'This email is already in use by an admin account.' }, { status: 400 });
    }

    const teacherCheck = await query('SELECT id FROM teachers WHERE LOWER(email) = $1', [emailLower]);
    if (teacherCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'This email is already in use by a teacher account.' }, { status: 400 });
    }

    // Generate token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const newStaff = await query(`
      INSERT INTO staffs (
        name, email, number, role, is_active, is_registered, 
        verification_token, verification_token_expires, grade_id
      ) VALUES ($1, $2, $3, $4, FALSE, FALSE, $5, $6, $7)
      RETURNING id, name, email, number, role, is_active, is_registered, grade_id
    `, [
      name.trim(),
      emailLower,
      number.trim(),
      role,
      verificationToken,
      verificationExpires,
      grade_id ? parseInt(grade_id, 10) : null
    ]);

    const createdStaff = newStaff.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_STAFF',
      entityType: 'staff',
      entityId: createdStaff.id,
      details: `Created staff member: ${createdStaff.name} (${createdStaff.email}, Role: ${createdStaff.role})`
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/access/staff/verify?token=${verificationToken}`;


    // Send verification email via Brevo
    try {
      await sendEmail({
        to: emailLower,
        toName: name.trim(),
        subject: 'Complete Your Staff Profile Setup',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 40px 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Welcome to the Staff Portal</h1>
              <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">Your staff profile has been created by the administration.</p>
            </div>
            <div style="padding: 32px;">
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">Hi <strong>${name.trim()}</strong>,</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                An administrator has pre-registered your staff account with the role: <strong>${role}</strong>. Click the button below to verify your identity and complete your profile setup. 
                This verification link is valid for <strong>72 hours</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                  Verify &amp; Set Up My Profile
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${verificationUrl}" style="color: #0284c7; word-break: break-all;">${verificationUrl}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;"/>
              <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                If you didn't expect this email, please ignore it or contact the school administration. This link will expire in 72 hours.
              </p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Failed to send staff verification email (non-fatal):', emailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Staff profile pre-created successfully. A verification link has been sent to the staff member\'s email.',
      paylod: { staff: newStaff.rows[0] }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff placeholder:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create staff placeholder. Internal server error.'
    }, { status: 500 });
  }
}
