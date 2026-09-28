import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, getAdminUser } from '@/lib/auth';
import { sendEmail } from '@/lib/brevo';
import { recordActivityLog } from '@/lib/logger';
import crypto from 'crypto';

// GET all teachers
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        t.id, 
        t.name, 
        t.email, 
        t.number, 
        t.designation, 
        t.address, 
        t.is_active, 
        t.is_registered, 
        t.is_permanent, 
        t.image, 
        t.username,
        t.created_at,
        t.grade_id,
        tps.name AS grade_name
      FROM teachers t
      LEFT JOIN teacher_pay_scale tps ON t.grade_id = tps.id
      ORDER BY t.name ASC
    `);
    const res_data = { teachers: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Teachers retrieved successfully',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve teachers. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST register a new teacher (Admin pre-creates placeholder)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { name, email, number, designation, is_permanent, grade_id } = await request.json();

    if (!name || !email || !number || !designation) {
      return NextResponse.json({
        success: false,
        message: 'All fields (name, email, number, designation) are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Check if email already registered in teachers table
    const teacherCheck = await query('SELECT id FROM teachers WHERE email = $1', [email.trim()]);
    if (teacherCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A teacher with this email is already registered.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    // Check if email already in admins table
    const adminCheck = await query('SELECT id FROM admins WHERE email = $1', [email.trim()]);
    if (adminCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'This email is already in use by an administrative account.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    // Check if grade_id is valid if provided
    if (grade_id) {
      const gradeCheck = await query('SELECT id FROM teacher_pay_scale WHERE id = $1', [grade_id]);
      if (gradeCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Selected pay scale grade does not exist.',
          error: 'Bad Request',
          paylod: null
        }, { status: 400 });
      }
    }

    // Generate a secure verification token and 72-hour expiry
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const newTeacher = await query(
      `INSERT INTO teachers (name, email, number, designation, is_active, is_registered, is_permanent, grade_id, verification_token, verification_token_expires) 
       VALUES ($1, $2, $3, $4, FALSE, FALSE, $5, $6, $7, $8) 
       RETURNING id, name, email, number, designation, is_active, is_registered, is_permanent, grade_id`,
      [
        name.trim(), 
        email.trim().toLowerCase(), 
        number.trim(), 
        designation.trim(), 
        !!is_permanent,
        grade_id ? parseInt(grade_id, 10) : null,
        verificationToken,
        verificationExpires
      ]
    );

    const createdTeacher = newTeacher.rows[0];
    const sessionAdmin = await getAdminUser();

    // Record Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_TEACHER',
      entityType: 'teacher',
      entityId: createdTeacher.id,
      details: `Registered new teacher: ${createdTeacher.name} (${createdTeacher.email}, ${createdTeacher.designation})`
    });

    // Construct the verification URL (use NEXT_PUBLIC_BASE_URL if set, else fall back)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/access/teacher/verify?token=${verificationToken}`;

    // Send verification email via Brevo
    try {
      await sendEmail({
        to: email.trim().toLowerCase(),
        toName: name.trim(),
        subject: 'Complete Your Teacher Profile Setup',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Welcome to the School Portal</h1>
              <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">Your teacher profile has been created by the administration.</p>
            </div>
            <div style="padding: 32px;">
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">Hi <strong>${name.trim()}</strong>,</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                An administrator has pre-registered your teacher account. Click the button below to verify your identity and complete your profile setup. 
                This verification link is valid for <strong>72 hours</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                  Verify &amp; Set Up My Profile
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${verificationUrl}" style="color: #4f46e5; word-break: break-all;">${verificationUrl}</a>
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
      console.error('Failed to send teacher verification email (non-fatal):', emailErr.message);
    }

    const res_data = { 
      message: 'Teacher profile pre-created successfully. A verification link has been sent to the teacher\'s email.', 
      teacher: createdTeacher,
      verification_link_sent: true
    };

    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher placeholder:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create teacher placeholder. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
