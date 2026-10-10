import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession, isGeneralStaff } from 'src/lib/middleware/staff.js';
import { isAdmin } from 'src/lib/middleware/developer.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';

function buildOfficerVerificationUrl(website, token, request) {
  const reqHost = request?.headers?.get?.('x-forwarded-host') || request?.headers?.get?.('host') || '';
  const baseHost = (reqHost ? reqHost.split(',')[0].trim() : '') || 'localhost:3000';
  const protocol = request?.headers?.get?.('x-forwarded-proto') || (baseHost.includes('localhost') ? 'http' : 'https');

  const rawCustom = (website?.custom_domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (rawCustom) {
    const customProto = rawCustom.includes('localhost') ? 'http' : 'https';
    return `${customProto}://${rawCustom}/auth/access/officer/verify?token=${encodeURIComponent(token)}`;
  }

  const rawSub = (website?.subdomain || website?.slug || '').trim().toLowerCase();
  const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;

  if (baseHost.includes('localhost')) {
    const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';
    return `${protocol}://${cleanSub}.localhost${port}/auth/access/officer/verify?token=${encodeURIComponent(token)}`;
  }

  const cleanHostNoPort = baseHost.split(':')[0];
  const parts = cleanHostNoPort.split('.');
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : cleanHostNoPort;
  const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';

  return `${protocol}://${cleanSub}.${baseDomain}${port}/auth/access/officer/verify?token=${encodeURIComponent(token)}`;
}

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const devAdmin = await isAdmin();
    const staffSession = await getStaffSession(request);

    if (!staffSession && !devAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff credentials required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { officerId } = body;

    if (!officerId) {
      return NextResponse.json({ success: false, error: 'officerId is required.' }, { status: 400 });
    }

    const officerRes = await queryDb(
      `SELECT id, name, email, department, designation, is_registered, is_active
       FROM website_officers
       WHERE website_id = $1 AND id = $2
       LIMIT 1`,
      [website.id, officerId]
    );

    if (officerRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Officer not found.' }, { status: 404 });
    }

    const officer = officerRes.rows[0];

    if (officer.is_registered) {
      return NextResponse.json(
        { success: false, error: 'Officer account has already completed setup and is registered.' },
        { status: 400 }
      );
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    await queryDb(
      `UPDATE website_officers
       SET verification_token = $1, verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '7 days'
       WHERE website_id = $2 AND id = $3`,
      [verificationToken, website.id, officer.id]
    );

    const verificationUrl = buildOfficerVerificationUrl(website, verificationToken, request);

    const emailHtml = buildStyledEmail({
      title: 'Officer Account Verification Reminder',
      subtitle: `${website.name} — Administrative Portal`,
      recipientName: officer.name,
      bodyParagraphs: [
        `This is a reminder to complete your officer account verification (${officer.designation || 'Officer'} - ${officer.department || 'General'}) for ${website.name}.`,
        'Please verify your identity and establish your login password using the secure link below.',
        'This invitation link is valid for 7 days.',
      ],
      actionUrl: verificationUrl,
      actionText: 'Verify Officer Account & Set Password →',
      footerNote: 'If you did not request this email, please contact campus administration.',
    });

    await sendEmail({
      to: officer.email,
      toName: officer.name,
      subject: `${website.name} - Complete Your Officer Account Setup`,
      html: emailHtml,
      websiteId: website.id,
    });

    return NextResponse.json({
      success: true,
      message: 'A fresh verification invitation has been sent to the officer’s email.',
      verificationUrl,
    });
  } catch (error) {
    console.error('Error resending officer invite:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to resend invitation.' }, { status: 500 });
  }
}
