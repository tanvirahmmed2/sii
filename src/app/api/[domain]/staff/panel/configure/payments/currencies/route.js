import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import {
  verifyStaffPaymentAccess,
  ensureWebsiteCurrencies
} from 'src/lib/database/paymentGateways.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[domain]/staff/panel/configure/payments/currencies
 * Returns the list of institutional currencies configured for the tenant.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context, null, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const websiteBaseCurrency = String(auth.website.currency || 'BDT').toUpperCase().trim();
    const currencies = await ensureWebsiteCurrencies(auth.website.id, websiteBaseCurrency);

    return NextResponse.json({
      success: true,
      website_currency: websiteBaseCurrency,
      currencies
    });
  } catch (error) {
    console.error('Error in GET /payments/currencies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/staff/panel/configure/payments/currencies
 * Adds or updates an institutional currency for the tenant.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context, null, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      code,
      name,
      symbol = '$',
      exchange_rate = 1.0,
      is_base_currency = false,
      is_active = true
    } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ success: false, error: 'Currency code is required (e.g. USD, BDT, EUR).' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name ? name.trim() : cleanCode;
    const cleanSymbol = symbol ? symbol.trim() : cleanCode;
    const numRate = parseFloat(exchange_rate) || 1.0;
    const isBase = Boolean(is_base_currency);
    const isActive = is_active !== false;

    // If marked as base currency, unset previous base currencies and update website base currency
    if (isBase) {
      await queryDb(`UPDATE website_currencies SET is_base_currency = FALSE WHERE website_id = $1`, [auth.website.id]);
      await queryDb(`UPDATE websites SET currency = $1 WHERE id = $2`, [cleanCode, auth.website.id]);
    }

    const upsertRes = await queryDb(`
      INSERT INTO website_currencies (
        website_id, code, name, symbol, exchange_rate, is_base_currency, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (website_id, code) DO UPDATE
      SET name = EXCLUDED.name,
          symbol = EXCLUDED.symbol,
          exchange_rate = EXCLUDED.exchange_rate,
          is_base_currency = EXCLUDED.is_base_currency,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      auth.website.id,
      cleanCode,
      cleanName,
      cleanSymbol,
      isBase ? 1.0 : numRate,
      isBase,
      isActive
    ]);

    const updatedCurrencies = await ensureWebsiteCurrencies(auth.website.id, isBase ? cleanCode : (auth.website.currency || 'BDT'));

    return NextResponse.json({
      success: true,
      message: `Currency '${cleanCode}' saved successfully.`,
      currency: upsertRes.rows[0],
      currencies: updatedCurrencies
    });
  } catch (error) {
    console.error('Error in POST /payments/currencies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/[domain]/staff/panel/configure/payments/currencies
 * Updates currency properties (active toggle, exchange rate, base currency status).
 */
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context, null, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { id, exchange_rate, is_active, is_base_currency } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Currency ID is required.' }, { status: 400 });
    }

    const curCheck = await queryDb(
      `SELECT * FROM website_currencies WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    if (curCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Currency record not found.' }, { status: 404 });
    }

    const cur = curCheck.rows[0];

    if (is_base_currency) {
      await queryDb(`UPDATE website_currencies SET is_base_currency = FALSE WHERE website_id = $1`, [auth.website.id]);
      await queryDb(`UPDATE websites SET currency = $1 WHERE id = $2`, [cur.code, auth.website.id]);
    }

    const newRate = exchange_rate !== undefined ? parseFloat(exchange_rate) || 1.0 : cur.exchange_rate;
    const newActive = is_active !== undefined ? Boolean(is_active) : cur.is_active;
    const newBase = is_base_currency !== undefined ? Boolean(is_base_currency) : cur.is_base_currency;

    const updateRes = await queryDb(`
      UPDATE website_currencies
      SET exchange_rate = $1,
          is_active = $2,
          is_base_currency = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND website_id = $5
      RETURNING *
    `, [newBase ? 1.0 : newRate, newActive, newBase, id, auth.website.id]);

    const updatedCurrencies = await ensureWebsiteCurrencies(auth.website.id, auth.website.currency || 'BDT');

    return NextResponse.json({
      success: true,
      message: `Currency '${cur.code}' updated successfully.`,
      currency: updateRes.rows[0],
      currencies: updatedCurrencies
    });
  } catch (error) {
    console.error('Error in PUT /payments/currencies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/[domain]/staff/panel/configure/payments/currencies
 * Removes a non-base institutional currency.
 */
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context, null, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Currency ID is required.' }, { status: 400 });
    }

    const curCheck = await queryDb(
      `SELECT * FROM website_currencies WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    if (curCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Currency record not found.' }, { status: 404 });
    }

    const cur = curCheck.rows[0];
    if (cur.is_base_currency) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete the primary base currency '${cur.code}'. Change the base currency first.`
      }, { status: 400 });
    }

    // Check if any gateway accounts use this currency
    const accUsage = await queryDb(
      `SELECT COUNT(*) FROM website_payment_gateway_accounts WHERE website_id = $1 AND currency = $2`,
      [auth.website.id, cur.code]
    );
    if (parseInt(accUsage.rows[0].count, 10) > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete '${cur.code}': ${accUsage.rows[0].count} gateway account(s) are currently configured with this currency. Reassign or delete those accounts first.`
      }, { status: 400 });
    }

    await queryDb(`DELETE FROM website_currencies WHERE id = $1 AND website_id = $2`, [id, auth.website.id]);
    const updatedCurrencies = await ensureWebsiteCurrencies(auth.website.id, auth.website.currency || 'BDT');

    return NextResponse.json({
      success: true,
      message: `Currency '${cur.code}' deleted successfully.`,
      currencies: updatedCurrencies
    });
  } catch (error) {
    console.error('Error in DELETE /payments/currencies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
