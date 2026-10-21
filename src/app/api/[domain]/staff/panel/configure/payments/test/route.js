import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import {
  verifyStaffPaymentAccess,
  mergeCredentials,
  testGatewayAccountConnection
} from 'src/lib/database/paymentGateways.js';

/**
 * POST /api/[domain]/staff/panel/configure/payments/test
 * Tests connectivity or validates configuration of a gateway account
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context, null, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { id, gateway_code, environment, credentials, currency } = body;

    let targetGatewayCode = gateway_code;
    let targetEnv = environment || 'sandbox';
    let targetCreds = credentials;
    let targetCurrency = currency || auth.website.currency || 'BDT';

    // If an existing account ID is passed, retrieve stored credentials and merge
    if (id) {
      const accRes = await queryDb(`
        SELECT gateway_code, environment, credentials, account_name, currency
        FROM website_payment_gateway_accounts
        WHERE id = $1 AND website_id = $2
      `, [id, auth.website.id]);

      if (accRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Payment gateway account not found.' }, { status: 404 });
      }

      const acc = accRes.rows[0];
      targetGatewayCode = acc.gateway_code;
      targetEnv = environment || acc.environment;
      targetCreds = credentials ? mergeCredentials(acc.credentials, credentials) : acc.credentials;
      targetCurrency = currency || acc.currency || auth.website.currency || 'BDT';
    }

    if (!targetGatewayCode) {
      return NextResponse.json({ success: false, error: 'gateway_code is required for testing.' }, { status: 400 });
    }

    const result = await testGatewayAccountConnection({
      gateway_code: targetGatewayCode,
      environment: targetEnv,
      credentials: targetCreds,
      currency: targetCurrency,
      website_currency: auth.website.currency || 'BDT'
    });

    return NextResponse.json({
      success: result.success,
      gateway: targetGatewayCode,
      environment: targetEnv,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error in POST /payments/test:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
