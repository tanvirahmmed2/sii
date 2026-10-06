import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { getBaseUrl } from 'src/lib/database/secret';
import { generateToken } from 'src/lib/utils/random';

export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { staff_id } = await request.json();

    if (!staff_id) {
      return NextResponse.json({ success: false, error: 'Staff ID is required.' }, { status: 400 });
    }

    const staffRes = await query('SELECT id, name, email, role, is_registered FROM staffs WHERE id = $1', [parseInt(staff_id, 10)]);

    if (staffRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    const staff = staffRes.rows[0];

    if (staff.is_registered) {
      return NextResponse.json({ success: false, error: 'This staff account is already registered.' }, { status: 400 });
    }

    // Re-generate token
    const verificationToken = generateToken(12);
    const verificationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await query(`
      UPDATE staffs
      SET verification_token = $1, verification_token_expires = $2
      WHERE id = $3
    `, [verificationToken, verificationExpires, staff.id]);

    const baseUrl = getBaseUrl(request);
    const verificationUrl = `${baseUrl}/auth/access/staff/verify?token=${verificationToken}`;

    // Send email
    try {
      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: 'Complete Your Staff Profile Setup',
        html: buildStyledEmail({
          title: 'Welcome to the Staff Portal',
          subtitle: 'Staff Profile Verification Reminder',
          recipientName: staff.name,
          bodyParagraphs: [
            'An administrator has generated a new setup link for your staff account. Click the button below to verify your identity and complete your profile setup.',
          ],
          actionUrl: verificationUrl,
          actionText: 'Verify & Set Up Profile',
          footerNote: 'This verification link is valid for 72 hours. If you did not expect this email, please contact the administration.',
        })
      });
    } catch (emailErr) {
      console.error('Failed to send verification email (non-fatal):', emailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `A new verification link has been sent to ${staff.email}`
    }, { status: 200 });
  } catch (error) {
    console.error('Error resending verification:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to resend verification. Internal server error.'
    }, { status: 500 });
  }
}
