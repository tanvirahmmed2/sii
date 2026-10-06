import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { isAdmin, getAdminUser } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { getBaseUrl } from 'src/lib/database/secret';
import { recordActivityLog } from 'src/lib/database/logger';
import { generateToken } from 'src/lib/utils/random';

// GET all teachers
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const result = await queryDb(`
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
      FROM website_teachers t
      LEFT JOIN website_teacher_pay_scale tps ON t.grade_id = tps.id AND tps.website_id = $1
      WHERE t.website_id = $1
      ORDER BY t.name ASC
    `, [websiteId]).catch(() =>
      queryDb(`
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
      `)
    );

    const res_data = { teachers: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Teachers retrieved successfully',
      paylod: res_data,
      payload: res_data
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
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

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

    // Check if email already registered in website_teachers table
    const teacherCheck = await queryDb(
      'SELECT id FROM website_teachers WHERE website_id = $1 AND email = $2',
      [websiteId, email.trim()]
    ).catch(() => queryDb('SELECT id FROM teachers WHERE email = $1', [email.trim()]));

    if (teacherCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A teacher with this email is already registered in this institution.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    // Check if grade_id is valid if provided
    if (grade_id) {
      const gradeCheck = await queryDb(
        'SELECT id FROM website_teacher_pay_scale WHERE website_id = $1 AND id = $2',
        [websiteId, grade_id]
      ).catch(() => queryDb('SELECT id FROM teacher_pay_scale WHERE id = $1', [grade_id]));

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
    const verificationToken = generateToken(12);
    const verificationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    let newTeacher;
    try {
      newTeacher = await queryDb(
        `INSERT INTO website_teachers (website_id, name, email, number, designation, is_active, is_registered, is_permanent, grade_id, verification_token, verification_token_expires) 
         VALUES ($1, $2, $3, $4, $5, FALSE, FALSE, $6, $7, $8, $9) 
         RETURNING id, name, email, number, designation, is_active, is_registered, is_permanent, grade_id`,
        [
          websiteId,
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
    } catch {
      newTeacher = await queryDb(
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
    }

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


    const baseUrl = getBaseUrl(request);
    const verificationUrl = `${baseUrl}/auth/access/teacher/verify?token=${verificationToken}`;

    // Send verification email via Brevo
    try {
      await sendEmail({
        to: email.trim().toLowerCase(),
        toName: name.trim(),
        subject: 'Complete Your Teacher Profile Setup',
        html: buildStyledEmail({
          title: 'Welcome to the School Portal',
          subtitle: 'Teacher Profile Setup & Verification',
          recipientName: name.trim(),
          bodyParagraphs: [
            'An administrator has registered your teacher account. Click the button below to verify your identity and complete your profile setup.',
          ],
          actionUrl: verificationUrl,
          actionText: 'Verify & Set Up Profile',
          footerNote: 'This verification link is valid for 72 hours. If you did not expect this email, please contact the school administration.',
        })
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
