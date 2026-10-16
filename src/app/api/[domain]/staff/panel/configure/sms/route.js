import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';
import { getCreatorSession } from 'src/lib/middleware/creator.js';
import { maskSmsApiKey, SUPPORTED_SMS_PROVIDERS } from 'src/lib/database/smsSender.js';

async function verifyStaffOrAdminAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  // 1. Staff session
  const staffSession = await getStaffSession(request);
  if (staffSession) {
    const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
    if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
      return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
    }
    return { website, user: staffSession, role: 'staff' };
  }

  // 2. Creator session
  const creatorSession = await getCreatorSession(request);
  if (creatorSession) {
    const creatorId = creatorSession?.id || creatorSession?.creator?.id;
    const isOwner = creatorId && website.creator_id && String(website.creator_id) === String(creatorId);
    const isAdmin = Boolean(creatorSession.is_admin || creatorSession.is_superadmin || creatorSession.creator?.is_admin);
    if (!isOwner && !isAdmin) {
      return { error: 'Forbidden: Tenant ownership mismatch.', status: 403 };
    }
    return { website, user: creatorSession, role: 'creator' };
  }

  return { error: 'Unauthorized: Staff or administrator access required.', status: 401 };
}

// GET: Fetch tenant's configured SMS gateway
export async function GET(request, context) {
  try {
    const auth = await verifyStaffOrAdminAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const res = await queryDb(
      `SELECT id, website_id, provider, sender_id, sender_type, api_key, client_id,
              endpoint_url, default_encoding, balance, is_active, created_at, updated_at
       FROM website_sms_gateways
       WHERE website_id = $1
       LIMIT 1`,
      [auth.website.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({
        success: true,
        configured: false,
        gateway: null,
        supported_providers: SUPPORTED_SMS_PROVIDERS,
        message: 'No SMS gateway configured for this institution.'
      });
    }

    const row = res.rows[0];
    return NextResponse.json({
      success: true,
      configured: Boolean(row.api_key && row.sender_id),
      supported_providers: SUPPORTED_SMS_PROVIDERS,
      gateway: {
        id: row.id,
        website_id: row.website_id,
        provider: row.provider || 'mimsms',
        sender_id: row.sender_id,
        sender_type: row.sender_type || 'masking',
        api_key: maskSmsApiKey(row.api_key),
        api_key_masked: maskSmsApiKey(row.api_key),
        has_api_key: Boolean(row.api_key),
        client_id: row.client_id || '',
        endpoint_url: row.endpoint_url || '',
        default_encoding: row.default_encoding || 'unicode',
        balance: parseFloat(row.balance || 0),
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    });
  } catch (error) {
    console.error('Error in GET /configure/sms:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST or PUT: Save/Upsert SMS gateway configuration
export async function POST(request, context) {
  return handleSaveSms(request, context);
}

export async function PUT(request, context) {
  return handleSaveSms(request, context);
}

async function handleSaveSms(request, context) {
  try {
    const auth = await verifyStaffOrAdminAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      provider = 'mimsms',
      sender_id,
      sender_type = 'masking',
      api_key,
      client_id = '',
      endpoint_url = '',
      default_encoding = 'unicode',
      is_active = true
    } = body;

    const trimmedSenderId = String(sender_id || '').trim();
    const rawApiKey = String(api_key || '').trim();
    const cleanProvider = String(provider || 'mimsms').toLowerCase().trim();

    if (!trimmedSenderId) {
      return NextResponse.json({ success: false, error: 'Sender ID / Masking label is required.' }, { status: 400 });
    }

    // Check existing record to avoid overwriting secret when masked
    const existing = await queryDb(
      `SELECT api_key, balance FROM website_sms_gateways WHERE website_id = $1 LIMIT 1`,
      [auth.website.id]
    );

    let finalKey = rawApiKey;
    const isMasked = rawApiKey.includes('••••');

    if (existing.rows.length > 0) {
      if (!rawApiKey || isMasked) {
        finalKey = existing.rows[0].api_key;
      }
    } else {
      if (!rawApiKey || isMasked) {
        return NextResponse.json({ success: false, error: 'API Key / Token is required to configure SMS gateway.' }, { status: 400 });
      }
    }

    // Default endpoint URL if left empty
    let finalEndpoint = endpoint_url ? endpoint_url.trim() : null;
    if (!finalEndpoint) {
      const provDef = SUPPORTED_SMS_PROVIDERS.find(p => p.code === cleanProvider);
      if (provDef) finalEndpoint = provDef.defaultEndpoint;
    }

    const cleanSenderType = ['masking', 'non-masking', 'voice'].includes(sender_type) ? sender_type : 'masking';
    const cleanEncoding = ['unicode', 'gsm'].includes(default_encoding) ? default_encoding : 'unicode';

    const upsertRes = await queryDb(`
      INSERT INTO website_sms_gateways (
        website_id, provider, sender_id, sender_type, api_key, client_id,
        endpoint_url, default_encoding, is_active, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, CURRENT_TIMESTAMP
      )
      ON CONFLICT (website_id) DO UPDATE
      SET provider = EXCLUDED.provider,
          sender_id = EXCLUDED.sender_id,
          sender_type = EXCLUDED.sender_type,
          api_key = EXCLUDED.api_key,
          client_id = EXCLUDED.client_id,
          endpoint_url = EXCLUDED.endpoint_url,
          default_encoding = EXCLUDED.default_encoding,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      auth.website.id,
      cleanProvider,
      trimmedSenderId,
      cleanSenderType,
      finalKey,
      client_id ? client_id.trim() : null,
      finalEndpoint,
      cleanEncoding,
      Boolean(is_active)
    ]);

    const row = upsertRes.rows[0];

    return NextResponse.json({
      success: true,
      message: 'SMS gateway configuration saved successfully.',
      gateway: {
        id: row.id,
        website_id: row.website_id,
        provider: row.provider,
        sender_id: row.sender_id,
        sender_type: row.sender_type,
        api_key: maskSmsApiKey(row.api_key),
        client_id: row.client_id,
        endpoint_url: row.endpoint_url,
        default_encoding: row.default_encoding,
        balance: parseFloat(row.balance || 0),
        is_active: Boolean(row.is_active),
        updated_at: row.updated_at
      }
    });
  } catch (error) {
    console.error('Error in POST /configure/sms:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Clear SMS gateway configuration
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffOrAdminAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    await queryDb(`DELETE FROM website_sms_gateways WHERE website_id = $1`, [auth.website.id]);

    return NextResponse.json({
      success: true,
      message: 'SMS gateway configuration cleared successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /configure/sms:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
