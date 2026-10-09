import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { isAdmin } from 'src/lib/middleware/developer';
import { sendWebsiteEmail, buildStyledEmail } from 'src/lib/database/brevo.js';

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const devAdmin = await isAdmin();
    const staffSession = await getStaffSession(request);

    if (!staffSession && !devAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff access required.' }, { status: 401 });
    }

    const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
    if (!devAdmin && staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Cross-tenant access denied.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { test_email, brevo_api_key, brevo_sender_email, brevo_sender_name } = body;

    const targetEmail = String(test_email || staffSession?.staff?.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid recipient email address for the test.'
      }, { status: 400 });
    }

    // Build stylish test verification email
    const subject = `Test Email from ${brevo_sender_name || website.name || 'Campus Portal'}`;
    const htmlContent = buildStyledEmail({
      title: 'Brevo Mailer Configuration Verified',
      preheader: 'Your institution email gateway is active and connected.',
      contentHtml: `
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 12px;">
          Hello <strong>${staffSession?.staff?.name || 'Administrator'}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 12px;">
          This is an automated test message sent from <strong>${website.name || 'Your Educational Institution'}</strong> to confirm that your Brevo API credentials and sender email configurations are valid and operational.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; font-family: monospace; color: #0f172a;">
          <div><strong>Sender:</strong> ${brevo_sender_name || website.name} &lt;${brevo_sender_email || 'default'}&gt;</div>
          <div><strong>Recipient:</strong> ${targetEmail}</div>
          <div><strong>Portal:</strong> ${website.subdomain || website.custom_domain || website.name}</div>
          <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
        </div>
        <p style="font-size: 13px; color: #16a34a; font-weight: 500;">
          ✓ Delivery connection successfully established with Brevo SMTP API.
        </p>
      `,
      footerText: `Sent via ${website.name || 'Campus Administration'} Mailer Gateway.`
    });

    // If temporary preview keys were provided, send directly using fetch to test before saving
    let result;
    if (brevo_api_key && !brevo_api_key.includes('••••') && brevo_sender_email) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevo_api_key,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: brevo_sender_name || website.name || 'Campus Administration',
            email: brevo_sender_email,
          },
          to: [{ email: targetEmail, name: staffSession?.staff?.name || 'Test Recipient' }],
          subject,
          htmlContent,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to dispatch test email via Brevo API.');
      }
      result = data;
    } else {
      // Use saved website credentials
      result = await sendWebsiteEmail(website.id, {
        to: targetEmail,
        toName: staffSession?.staff?.name || 'Administrator',
        subject,
        html: htmlContent,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully sent to ${targetEmail}.`,
      messageId: result.messageId || null
    });
  } catch (error) {
    console.error('Error in POST /configure/mailer/test:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send test email. Please check your Brevo API key and authorized sender email.'
    }, { status: 400 });
  }
}
