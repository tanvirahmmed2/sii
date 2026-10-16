import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';
import { getCreatorSession } from 'src/lib/middleware/creator.js';
import { executeSmsDispatch, normalizePhoneNumber, SUPPORTED_SMS_PROVIDERS } from 'src/lib/database/smsSender.js';

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const staffSession = await getStaffSession(request);
    const creatorSession = await getCreatorSession(request);

    if (!staffSession && !creatorSession) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff or administrator access required.' }, { status: 401 });
    }

    const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
    if (staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Cross-tenant access denied.' }, { status: 403 });
    }

    if (!staffSession && creatorSession) {
      const creatorId = creatorSession?.id || creatorSession?.creator?.id;
      const isOwner = creatorId && website.creator_id && String(website.creator_id) === String(creatorId);
      const isAdmin = Boolean(creatorSession?.is_admin || creatorSession?.is_superadmin || creatorSession?.creator?.is_admin);
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ success: false, error: 'Forbidden: Tenant ownership mismatch.' }, { status: 403 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const {
      test_number,
      message,
      provider = 'mimsms',
      api_key,
      client_id,
      sender_id,
      sender_type = 'masking',
      endpoint_url
    } = body;

    const cleanTo = normalizePhoneNumber(test_number);
    if (!cleanTo || cleanTo.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid recipient mobile number (e.g. 01712345678).'
      }, { status: 400 });
    }

    // Determine credentials: from payload preview or from database
    let finalApiKey = api_key;
    let finalSenderId = sender_id;
    let finalClientId = client_id;
    let finalProvider = provider;
    let finalEndpoint = endpoint_url;
    let finalSenderType = sender_type;

    if (!finalApiKey || finalApiKey.includes('••••')) {
      const savedRes = await queryDb(
        `SELECT provider, sender_id, sender_type, api_key, client_id, endpoint_url
         FROM website_sms_gateways
         WHERE website_id = $1 LIMIT 1`,
        [website.id]
      );

      if (savedRes.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No SMS credentials found. Please input your API Key and Sender ID.'
        }, { status: 400 });
      }

      const saved = savedRes.rows[0];
      finalApiKey = saved.api_key;
      finalSenderId = finalSenderId || saved.sender_id;
      finalClientId = finalClientId !== undefined ? finalClientId : saved.client_id;
      finalProvider = finalProvider || saved.provider;
      finalEndpoint = finalEndpoint || saved.endpoint_url;
      finalSenderType = finalSenderType || saved.sender_type;
    }

    if (!finalEndpoint) {
      const provDef = SUPPORTED_SMS_PROVIDERS.find(p => p.code === finalProvider);
      if (provDef) finalEndpoint = provDef.defaultEndpoint;
    }

    const testCopy = message && message.trim()
      ? message.trim()
      : `[${finalSenderId || website.name || 'CAMPUS'}] SMS test alert: Gateway configuration is synchronized and operational.`;

    const dispatchResult = await executeSmsDispatch({
      provider: finalProvider,
      apiKey: finalApiKey,
      clientId: finalClientId,
      senderId: finalSenderId || 'CAMPUS',
      senderType: finalSenderType,
      endpointUrl: finalEndpoint,
      to: cleanTo,
      message: testCopy
    });

    return NextResponse.json({
      success: true,
      message: `Test SMS successfully dispatched to ${cleanTo}.`,
      dispatch: dispatchResult
    });
  } catch (error) {
    console.error('Error in POST /configure/sms/test:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to dispatch test SMS. Please check provider credentials.'
    }, { status: 400 });
  }
}
