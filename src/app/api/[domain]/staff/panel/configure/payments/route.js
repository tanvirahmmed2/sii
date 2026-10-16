import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import {
  verifyStaffPaymentAccess,
  maskAccountCredentials,
  mergeCredentials,
  FEE_PURPOSES
} from 'src/lib/database/paymentGateways.js';

/**
 * GET /api/[domain]/staff/panel/configure/payments
 * Fetches configured gateway accounts, available gateway providers, active routing assignments, and metrics.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const websiteId = auth.website.id;

    // 1. Fetch all supported gateway definitions
    const gatewaysRes = await queryDb(`
      SELECT id, code, name, category, description, logo_icon, website_url,
             supported_currencies, credential_schema, is_active
      FROM website_payment_gateways
      WHERE is_active = TRUE
      ORDER BY id ASC
    `);

    // 2. Fetch tenant's configured gateway accounts
    const accountsRes = await queryDb(`
      SELECT a.id, a.website_id, a.gateway_code, a.account_name, a.account_number,
             a.environment, a.currency, a.credentials, a.is_active, a.is_default,
             a.notes, a.created_at, a.updated_at,
             g.name AS gateway_name, g.category AS gateway_category, g.logo_icon,
             g.credential_schema
      FROM website_payment_gateway_accounts a
      JOIN website_payment_gateways g ON g.code = a.gateway_code
      WHERE a.website_id = $1
      ORDER BY a.created_at DESC
    `, [websiteId]);

    // Map and mask account credentials
    const accounts = accountsRes.rows.map(acc => {
      const maskedCreds = maskAccountCredentials(acc.credentials, acc.credential_schema);
      return {
        id: acc.id,
        website_id: acc.website_id,
        gateway_code: acc.gateway_code,
        gateway_name: acc.gateway_name,
        gateway_category: acc.gateway_category,
        logo_icon: acc.logo_icon,
        account_name: acc.account_name,
        account_number: acc.account_number,
        environment: acc.environment,
        currency: acc.currency,
        is_active: Boolean(acc.is_active),
        is_default: Boolean(acc.is_default),
        notes: acc.notes,
        credentials: maskedCreds,
        created_at: acc.created_at,
        updated_at: acc.updated_at
      };
    });

    // 3. Fetch task/fee routing assignments (including any hall-specific routes)
    const assignmentsRes = await queryDb(`
      SELECT pa.id, pa.website_id, pa.purpose, pa.hostel_id, pa.title, pa.description,
             pa.gateway_account_id, pa.fallback_gateway_account_id,
             pa.is_active, pa.allow_student_portal, pa.allow_public_checkout,
             pa.created_at, pa.updated_at,
             h.name AS hostel_name, h.type AS hostel_type,
             ga.account_name, ga.gateway_code, ga.environment,
             fga.account_name AS fallback_account_name, fga.gateway_code AS fallback_gateway_code,
             fga.environment AS fallback_environment
      FROM website_payment_purpose_assignments pa
      LEFT JOIN website_hostels h ON h.id = pa.hostel_id
      LEFT JOIN website_payment_gateway_accounts ga ON ga.id = pa.gateway_account_id
      LEFT JOIN website_payment_gateway_accounts fga ON fga.id = pa.fallback_gateway_account_id
      WHERE pa.website_id = $1
      ORDER BY pa.purpose ASC, pa.hostel_id ASC NULLS FIRST, pa.id ASC
    `, [websiteId]);

    // 4. Fetch residential halls/hostels for per-hall fee routing options
    const hostelsRes = await queryDb(`
      SELECT id, name, type, status, capacity, monthly_fee
      FROM website_hostels
      WHERE website_id = $1
      ORDER BY name ASC
    `, [websiteId]);

    // Compute metrics
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(a => a.is_active).length;
    const sandboxAccounts = accounts.filter(a => a.environment === 'sandbox').length;
    const liveAccounts = accounts.filter(a => a.environment === 'live').length;
    const assignedRoutes = assignmentsRes.rows.filter(r => r.is_active).length;

    // Fetch recent 10 transactions
    const txRes = await queryDb(`
      SELECT id, gateway_code, purpose, invoice_ref, payer_name, amount, currency,
             environment, transaction_id, status, created_at
      FROM website_payment_transactions
      WHERE website_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [websiteId]);

    return NextResponse.json({
      success: true,
      website_currency: auth.website.currency || 'BDT',
      website: {
        id: auth.website.id,
        name: auth.website.name,
        currency: auth.website.currency || 'BDT'
      },
      gateways: gatewaysRes.rows,
      accounts,
      assignments: assignmentsRes.rows,
      hostels: hostelsRes.rows,
      fee_purposes: FEE_PURPOSES,
      metrics: {
        totalAccounts,
        activeAccounts,
        sandboxAccounts,
        liveAccounts,
        assignedRoutes,
        totalRoutes: FEE_PURPOSES.length
      },
      recentTransactions: txRes.rows
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/configure/payments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/staff/panel/configure/payments
 * Creates a new gateway account for the tenant.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      gateway_code,
      account_name,
      account_number,
      environment = 'sandbox',
      currency = 'BDT',
      credentials = {},
      is_active = true,
      is_default = false,
      notes = ''
    } = body;

    if (!gateway_code) {
      return NextResponse.json({ success: false, error: 'Gateway selection (gateway_code) is required.' }, { status: 400 });
    }

    if (!account_name || !account_name.trim()) {
      return NextResponse.json({ success: false, error: 'Account Nickname/Label is required.' }, { status: 400 });
    }

    // Verify gateway exists in catalog
    const gwCheck = await queryDb(`SELECT code, name, credential_schema, supported_currencies FROM website_payment_gateways WHERE code = $1 AND is_active = TRUE`, [gateway_code]);
    if (gwCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: `Invalid or unsupported gateway code: ${gateway_code}` }, { status: 400 });
    }

    const gateway = gwCheck.rows[0];
    const websiteCurrency = String(auth.website.currency || 'BDT').toUpperCase().trim();
    const cleanCurrency = String(currency || websiteCurrency).toUpperCase().trim();
    const supportedCurrencies = Array.isArray(gateway.supported_currencies) ? gateway.supported_currencies : ['BDT'];

    // 1. Verify currency is supported by the gateway provider
    if (!supportedCurrencies.includes(cleanCurrency)) {
      return NextResponse.json({
        success: false,
        error: `Gateway '${gateway.name}' does not support currency '${cleanCurrency}'. Supported currencies: ${supportedCurrencies.join(', ')}.`
      }, { status: 400 });
    }

    // 2. Verify gateway compatibility with the website base currency
    if (!supportedCurrencies.includes(websiteCurrency)) {
      return NextResponse.json({
        success: false,
        error: `Gateway '${gateway.name}' is incompatible with your portal base currency (${websiteCurrency}). This gateway only supports: ${supportedCurrencies.join(', ')}.`
      }, { status: 400 });
    }

    const cleanEnv = environment === 'live' ? 'live' : 'sandbox';

    // If marked default, unset existing default
    if (is_default) {
      await queryDb(`UPDATE website_payment_gateway_accounts SET is_default = FALSE WHERE website_id = $1`, [auth.website.id]);
    }

    const staffId = auth.user?.id || null;

    const insertRes = await queryDb(`
      INSERT INTO website_payment_gateway_accounts (
        website_id, gateway_code, account_name, account_number, environment,
        currency, credentials, is_active, is_default, notes, created_by_staff_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7::jsonb, $8, $9, $10, $11
      ) RETURNING *
    `, [
      auth.website.id,
      gateway_code,
      account_name.trim(),
      account_number ? account_number.trim() : null,
      cleanEnv,
      cleanCurrency,
      JSON.stringify(credentials),
      Boolean(is_active),
      Boolean(is_default),
      notes ? notes.trim() : null,
      staffId
    ]);

    const created = insertRes.rows[0];
    const maskedCreds = maskAccountCredentials(created.credentials, gwCheck.rows[0].credential_schema);

    return NextResponse.json({
      success: true,
      message: `Payment gateway account '${account_name}' created successfully with currency ${cleanCurrency}.`,
      account: {
        ...created,
        credentials: maskedCreds
      }
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/configure/payments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/[domain]/staff/panel/configure/payments
 * Updates an existing gateway account.
 */
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      account_name,
      account_number,
      environment,
      currency,
      credentials,
      is_active,
      is_default,
      notes
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Account ID is required.' }, { status: 400 });
    }

    // Verify ownership
    const checkRes = await queryDb(`
      SELECT a.*, g.name AS gateway_name, g.credential_schema, g.supported_currencies
      FROM website_payment_gateway_accounts a
      JOIN website_payment_gateways g ON g.code = a.gateway_code
      WHERE a.id = $1 AND a.website_id = $2
    `, [id, auth.website.id]);

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Payment gateway account not found.' }, { status: 404 });
    }

    const existing = checkRes.rows[0];
    const websiteCurrency = String(auth.website.currency || 'BDT').toUpperCase().trim();
    const newCurrency = currency !== undefined ? String(currency).toUpperCase().trim() : String(existing.currency || 'BDT').toUpperCase().trim();
    const supportedCurrencies = Array.isArray(existing.supported_currencies)
      ? existing.supported_currencies.map(c => String(c).toUpperCase().trim())
      : ['BDT'];

    if (currency !== undefined) {
      if (!supportedCurrencies.includes(newCurrency)) {
        return NextResponse.json({
          success: false,
          error: `Gateway '${existing.gateway_name}' does not support currency '${newCurrency}'. Supported currencies: ${supportedCurrencies.join(', ')}.`
        }, { status: 400 });
      }

      if (!supportedCurrencies.includes(websiteCurrency)) {
        return NextResponse.json({
          success: false,
          error: `Gateway '${existing.gateway_name}' is incompatible with your portal base currency (${websiteCurrency}). Supported: ${supportedCurrencies.join(', ')}.`
        }, { status: 400 });
      }
    }

    // Merge credentials carefully so masked values don't overwrite secrets
    const mergedCreds = credentials ? mergeCredentials(existing.credentials, credentials) : existing.credentials;

    const newName = account_name !== undefined ? account_name.trim() : existing.account_name;
    const newNumber = account_number !== undefined ? (account_number ? account_number.trim() : null) : existing.account_number;
    const newEnv = environment !== undefined ? (environment === 'live' ? 'live' : 'sandbox') : existing.environment;
    const newActive = is_active !== undefined ? Boolean(is_active) : existing.is_active;
    const newDefault = is_default !== undefined ? Boolean(is_default) : existing.is_default;
    const newNotes = notes !== undefined ? (notes ? notes.trim() : null) : existing.notes;

    if (newDefault && !existing.is_default) {
      await queryDb(`UPDATE website_payment_gateway_accounts SET is_default = FALSE WHERE website_id = $1`, [auth.website.id]);
    }

    const updateRes = await queryDb(`
      UPDATE website_payment_gateway_accounts
      SET account_name = $1,
          account_number = $2,
          environment = $3,
          currency = $4,
          credentials = $5::jsonb,
          is_active = $6,
          is_default = $7,
          notes = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND website_id = $10
      RETURNING *
    `, [
      newName,
      newNumber,
      newEnv,
      newCurrency,
      JSON.stringify(mergedCreds),
      newActive,
      newDefault,
      newNotes,
      id,
      auth.website.id
    ]);

    const updated = updateRes.rows[0];
    const maskedCreds = maskAccountCredentials(updated.credentials, existing.credential_schema);

    return NextResponse.json({
      success: true,
      message: `Account '${updated.account_name}' updated successfully.`,
      account: {
        ...updated,
        credentials: maskedCreds
      }
    });
  } catch (error) {
    console.error('Error in PUT /staff/panel/configure/payments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/[domain]/staff/panel/configure/payments
 * Deletes a gateway account.
 */
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Account ID parameter is required.' }, { status: 400 });
    }

    // Check account existence
    const checkRes = await queryDb(`
      SELECT id, account_name FROM website_payment_gateway_accounts
      WHERE id = $1 AND website_id = $2
    `, [id, auth.website.id]);

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Payment gateway account not found.' }, { status: 404 });
    }

    const account = checkRes.rows[0];

    // Remove any route assignments referencing this account
    await queryDb(`
      DELETE FROM website_payment_purpose_assignments
      WHERE website_id = $1 AND gateway_account_id = $2
    `, [auth.website.id, id]);

    // Delete the account
    await queryDb(`
      DELETE FROM website_payment_gateway_accounts
      WHERE id = $1 AND website_id = $2
    `, [id, auth.website.id]);

    return NextResponse.json({
      success: true,
      message: `Account '${account.account_name}' and its routing assignments have been deleted.`
    });
  } catch (error) {
    console.error('Error in DELETE /staff/panel/configure/payments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
