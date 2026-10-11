import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);

  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 10) return '••••••••';
  return key.slice(0, 8) + '••••••••••••••••' + key.slice(-4);
}

// GET: Fetch Brevo mailer configuration
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const result = await queryDb(
      `SELECT id, website_id, brevo_api_key, brevo_sender_email, brevo_sender_name, is_active, created_at, updated_at
       FROM website_brevo_mailer
       WHERE website_id = $1
       LIMIT 1`,
      [auth.website.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        mailer: null,
        configured: false,
        message: 'No custom Brevo mailer configured for this website.'
      });
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      configured: true,
      mailer: {
        id: row.id,
        website_id: row.website_id,
        brevo_api_key: maskApiKey(row.brevo_api_key),
        brevo_api_key_masked: maskApiKey(row.brevo_api_key),
        has_api_key: Boolean(row.brevo_api_key),
        brevo_sender_email: row.brevo_sender_email || '',
        brevo_sender_name: row.brevo_sender_name || '',
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    });
  } catch (error) {
    console.error('Error in GET /configure/mailer:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST or PUT: Save/Upsert Brevo mailer configuration
export async function POST(request, context) {
  return handleSaveMailer(request, context);
}

export async function PUT(request, context) {
  return handleSaveMailer(request, context);
}

async function handleSaveMailer(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { brevo_api_key, brevo_sender_email, brevo_sender_name, is_active } = body;

    const trimmedEmail = String(brevo_sender_email || '').trim();
    const trimmedName = String(brevo_sender_name || '').trim();
    const rawKey = String(brevo_api_key || '').trim();

    if (!trimmedEmail) {
      return NextResponse.json({ success: false, error: 'BREVO_SENDER_EMAIL is required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address for BREVO_SENDER_EMAIL.' }, { status: 400 });
    }

    if (!trimmedName) {
      return NextResponse.json({ success: false, error: 'BREVO_SENDER_NAME is required.' }, { status: 400 });
    }

    // Check if an existing row exists to preserve masked API key
    const existing = await queryDb(
      `SELECT brevo_api_key FROM website_brevo_mailer WHERE website_id = $1 LIMIT 1`,
      [auth.website.id]
    );

    let finalKey = rawKey;
    const isMasked = rawKey.includes('••••');

    if (existing.rows.length > 0) {
      if (!rawKey || isMasked) {
        finalKey = existing.rows[0].brevo_api_key;
      }
    } else {
      if (!rawKey || isMasked) {
        return NextResponse.json({ success: false, error: 'BREVO_API_KEY is required to configure Brevo mailer.' }, { status: 400 });
      }
    }

    const upsertRes = await queryDb(
      `INSERT INTO website_brevo_mailer (
         website_id, brevo_api_key, brevo_sender_email, brevo_sender_name, is_active, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (website_id) DO UPDATE SET
         brevo_api_key = EXCLUDED.brevo_api_key,
         brevo_sender_email = EXCLUDED.brevo_sender_email,
         brevo_sender_name = EXCLUDED.brevo_sender_name,
         is_active = EXCLUDED.is_active,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        auth.website.id,
        finalKey,
        trimmedEmail,
        trimmedName,
        is_active !== undefined ? Boolean(is_active) : true
      ]
    );

    const row = upsertRes.rows[0];
    return NextResponse.json({
      success: true,
      message: 'Brevo Mailer configuration saved successfully.',
      mailer: {
        id: row.id,
        website_id: row.website_id,
        brevo_api_key: maskApiKey(row.brevo_api_key),
        brevo_sender_email: row.brevo_sender_email,
        brevo_sender_name: row.brevo_sender_name,
        is_active: Boolean(row.is_active),
        updated_at: row.updated_at
      }
    });
  } catch (error) {
    console.error('Error in save /configure/mailer:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Clear Brevo mailer configuration
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    await queryDb(`DELETE FROM website_brevo_mailer WHERE website_id = $1`, [auth.website.id]);

    return NextResponse.json({
      success: true,
      message: 'Brevo Mailer configuration cleared successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /configure/mailer:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
