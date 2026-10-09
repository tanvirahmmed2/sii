import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { isAdmin } from 'src/lib/middleware/developer';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const devAdmin = await isAdmin();
  const staffSession = await getStaffSession(request);

  if (!staffSession && !devAdmin) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
  if (!devAdmin && staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession, devAdmin };
}

function maskSecret(val) {
  if (!val) return '';
  if (val.length <= 8) return '••••••••';
  return val.slice(0, 6) + '••••••••••••••••' + val.slice(-4);
}

// GET: Fetch Meta configuration for website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const result = await queryDb(
      `SELECT id, website_id, meta_webhook_verify_token, meta_app_secret, meta_app_id,
              meta_page_access_token, whatsapp_phone_number_id, is_active, created_at, updated_at
       FROM website_meta
       WHERE website_id = $1
       LIMIT 1`,
      [auth.website.id]
    );

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const webhookCallbackUrl = `${protocol}://${host}/api/marketing/meta/webhook`;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        configured: false,
        meta: null,
        webhookCallbackUrl,
        message: 'No custom Meta environment keys configured yet.'
      });
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      configured: true,
      webhookCallbackUrl,
      meta: {
        id: row.id,
        website_id: row.website_id,
        meta_webhook_verify_token: row.meta_webhook_verify_token || '',
        meta_app_secret: maskSecret(row.meta_app_secret),
        meta_app_secret_masked: maskSecret(row.meta_app_secret),
        has_app_secret: Boolean(row.meta_app_secret),
        meta_app_id: row.meta_app_id || '',
        meta_page_access_token: maskSecret(row.meta_page_access_token),
        meta_page_access_token_masked: maskSecret(row.meta_page_access_token),
        has_page_token: Boolean(row.meta_page_access_token),
        whatsapp_phone_number_id: row.whatsapp_phone_number_id || '',
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    });
  } catch (error) {
    console.error('Error in GET /configure/meta:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST or PUT: Save/Upsert Meta configuration
export async function POST(request, context) {
  return handleSaveMeta(request, context);
}

export async function PUT(request, context) {
  return handleSaveMeta(request, context);
}

async function handleSaveMeta(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const {
      meta_webhook_verify_token,
      meta_app_secret,
      meta_app_id,
      meta_page_access_token,
      whatsapp_phone_number_id,
      is_active
    } = body;

    // Load existing record to preserve masked secrets if passed back unchanged
    const existing = await queryDb(
      `SELECT meta_app_secret, meta_page_access_token FROM website_meta WHERE website_id = $1 LIMIT 1`,
      [auth.website.id]
    );

    let finalAppSecret = meta_app_secret !== undefined ? String(meta_app_secret).trim() : null;
    let finalPageToken = meta_page_access_token !== undefined ? String(meta_page_access_token).trim() : null;

    if (existing.rows.length > 0) {
      const prev = existing.rows[0];
      if (!finalAppSecret || finalAppSecret.includes('••••')) {
        finalAppSecret = prev.meta_app_secret;
      }
      if (!finalPageToken || finalPageToken.includes('••••')) {
        finalPageToken = prev.meta_page_access_token;
      }
    }

    const upsertRes = await queryDb(
      `INSERT INTO website_meta (
         website_id,
         meta_webhook_verify_token,
         meta_app_secret,
         meta_app_id,
         meta_page_access_token,
         whatsapp_phone_number_id,
         is_active,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (website_id) DO UPDATE SET
         meta_webhook_verify_token = EXCLUDED.meta_webhook_verify_token,
         meta_app_secret = EXCLUDED.meta_app_secret,
         meta_app_id = EXCLUDED.meta_app_id,
         meta_page_access_token = EXCLUDED.meta_page_access_token,
         whatsapp_phone_number_id = EXCLUDED.whatsapp_phone_number_id,
         is_active = EXCLUDED.is_active,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        auth.website.id,
        meta_webhook_verify_token ? String(meta_webhook_verify_token).trim() : null,
        finalAppSecret,
        meta_app_id ? String(meta_app_id).trim() : null,
        finalPageToken,
        whatsapp_phone_number_id ? String(whatsapp_phone_number_id).trim() : null,
        is_active !== undefined ? Boolean(is_active) : true
      ]
    );

    const row = upsertRes.rows[0];
    return NextResponse.json({
      success: true,
      message: 'Meta environment configuration saved successfully.',
      meta: {
        id: row.id,
        website_id: row.website_id,
        meta_webhook_verify_token: row.meta_webhook_verify_token || '',
        meta_app_secret: maskSecret(row.meta_app_secret),
        meta_app_id: row.meta_app_id || '',
        meta_page_access_token: maskSecret(row.meta_page_access_token),
        whatsapp_phone_number_id: row.whatsapp_phone_number_id || '',
        is_active: Boolean(row.is_active),
        updated_at: row.updated_at
      }
    });
  } catch (error) {
    console.error('Error in save /configure/meta:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Clear Meta configuration
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    await queryDb(`DELETE FROM website_meta WHERE website_id = $1`, [auth.website.id]);

    return NextResponse.json({
      success: true,
      message: 'Meta configuration cleared successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /configure/meta:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
