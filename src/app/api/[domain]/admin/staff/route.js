import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin, getAdminUser } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { getBaseUrl } from 'src/lib/database/secret';
import { recordActivityLog } from 'src/lib/database/logger';
import { generateToken } from 'src/lib/utils/random';

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
    const verificationToken = generateToken(12);
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

    const baseUrl = getBaseUrl(request);
    const verificationUrl = `${baseUrl}/auth/access/staff/verify?token=${verificationToken}`;


    // Send verification email via Brevo
    try {
      await sendEmail({
        to: emailLower,
        toName: name.trim(),
        subject: 'Complete Your Staff Profile Setup',
        html: buildStyledEmail({
          title: 'Welcome to the Staff Portal',
          subtitle: 'Staff Profile Setup & Verification',
          recipientName: name.trim(),
          bodyParagraphs: [
            `An administrator has registered your staff account with the role: ${role}.`,
            'Click the button below to verify your identity and complete your profile setup.',
          ],
          actionUrl: verificationUrl,
          actionText: 'Verify & Set Up Profile',
          footerNote: 'This verification link is valid for 72 hours. If you did not expect this email, please contact the administration.',
        })
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
