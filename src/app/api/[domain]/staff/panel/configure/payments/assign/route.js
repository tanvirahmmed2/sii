import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import {
  verifyStaffPaymentAccess,
  FEE_PURPOSES
} from 'src/lib/database/paymentGateways.js';

/**
 * GET /api/[domain]/staff/panel/configure/payments/assign
 * Returns all fee task assignments for this tenant.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context, null, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const assignmentsRes = await queryDb(`
      SELECT pa.id, pa.website_id, pa.purpose, pa.hostel_id, pa.title, pa.description,
             pa.gateway_account_id, pa.fallback_gateway_account_id,
             pa.is_active, pa.allow_student_portal, pa.allow_public_checkout,
             pa.created_at, pa.updated_at,
             h.name AS hostel_name, h.type AS hostel_type,
             ga.account_name, ga.gateway_code, ga.environment, ga.currency, ga.is_active AS account_is_active,
             fga.account_name AS fallback_account_name, fga.gateway_code AS fallback_gateway_code,
             fga.environment AS fallback_environment
      FROM website_payment_purpose_assignments pa
      LEFT JOIN website_hostels h ON h.id = pa.hostel_id
      LEFT JOIN website_payment_gateway_accounts ga ON ga.id = pa.gateway_account_id
      LEFT JOIN website_payment_gateway_accounts fga ON fga.id = pa.fallback_gateway_account_id
      WHERE pa.website_id = $1
      ORDER BY pa.purpose ASC, pa.hostel_id ASC NULLS FIRST, pa.id ASC
    `, [auth.website.id]);

    const hostelsRes = await queryDb(`
      SELECT id, name, type, status, capacity, monthly_fee
      FROM website_hostels
      WHERE website_id = $1
      ORDER BY name ASC
    `, [auth.website.id]);

    const currenciesRes = await queryDb(`
      SELECT id, code, name, symbol, is_base_currency, is_active
      FROM website_currencies
      WHERE website_id = $1 AND is_active = TRUE
      ORDER BY is_base_currency DESC, code ASC
    `, [auth.website.id]);

    return NextResponse.json({
      success: true,
      website_currency: auth.website.currency || 'BDT',
      currencies: currenciesRes.rows,
      fee_purposes: FEE_PURPOSES,
      hostels: hostelsRes.rows,
      assignments: assignmentsRes.rows
    });
  } catch (error) {
    console.error('Error in GET /payments/assign:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST or PUT /api/[domain]/staff/panel/configure/payments/assign
 * Assigns or updates the gateway account routing for a task/purpose (including specific residential hall routing).
 */
export async function POST(request, context) {
  return handleAssignRoute(request, context);
}

export async function PUT(request, context) {
  return handleAssignRoute(request, context);
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context, null, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Assignment ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(`
      DELETE FROM website_payment_purpose_assignments
      WHERE id = $1 AND website_id = $2
      RETURNING id, purpose, title
    `, [id, auth.website.id]);

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Routing assignment not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Routing assignment for '${deleteRes.rows[0].title}' removed.`
    });
  } catch (error) {
    console.error('Error in DELETE /payments/assign:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleAssignRoute(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context, null, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      purpose,
      hostel_id = null,
      title,
      description,
      gateway_account_id,
      fallback_gateway_account_id = null,
      is_active = true,
      allow_student_portal = true,
      allow_public_checkout = true
    } = body;

    if (!purpose) {
      return NextResponse.json({ success: false, error: 'Fee task/purpose is required.' }, { status: 400 });
    }

    if (!gateway_account_id) {
      return NextResponse.json({ success: false, error: 'Primary gateway account selection is required.' }, { status: 400 });
    }

    // If hostel_id is provided, verify it belongs to this website
    let hostelName = null;
    let finalHostelId = null;
    if (purpose === 'residential_fees' && hostel_id) {
      const hostelCheck = await queryDb(`
        SELECT id, name FROM website_hostels
        WHERE id = $1 AND website_id = $2
      `, [hostel_id, auth.website.id]);

      if (hostelCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Specified residential hall was not found.' }, { status: 404 });
      }
      finalHostelId = hostelCheck.rows[0].id;
      hostelName = hostelCheck.rows[0].name;
    }

    // Verify gateway_account_id belongs to this website and check currency compatibility
    const accCheck = await queryDb(`
      SELECT a.id, a.account_name, a.gateway_code, a.environment, a.currency, a.is_active,
             g.name AS gateway_name, g.supported_currencies
      FROM website_payment_gateway_accounts a
      JOIN website_payment_gateways g ON g.code = a.gateway_code
      WHERE a.id = $1 AND a.website_id = $2
    `, [gateway_account_id, auth.website.id]);

    if (accCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected primary gateway account was not found.' }, { status: 404 });
    }

    const primaryAcc = accCheck.rows[0];
    const websiteCurrency = String(auth.website.currency || 'BDT').toUpperCase().trim();
    const accCurrency = String(primaryAcc.currency || 'BDT').toUpperCase().trim();
    const supportedCurrencies = Array.isArray(primaryAcc.supported_currencies) ? primaryAcc.supported_currencies : ['BDT'];

    // Find default title if not provided
    const purposeMeta = FEE_PURPOSES.find(p => p.code === purpose);
    let defaultTitle = purposeMeta ? purposeMeta.label : purpose;
    if (hostelName) {
      defaultTitle = `${defaultTitle} (${hostelName})`;
    }
    const finalTitle = title ? title.trim() : defaultTitle;

    // Validate gateway currency compatibility with portal currency
    if (!supportedCurrencies.includes(websiteCurrency)) {
      return NextResponse.json({
        success: false,
        error: `Cannot route '${finalTitle}' to '${primaryAcc.account_name}': Provider '${primaryAcc.gateway_name}' is incompatible with your portal base currency (${websiteCurrency}). Supported: ${supportedCurrencies.join(', ')}.`
      }, { status: 400 });
    }

    if (accCurrency !== websiteCurrency && !supportedCurrencies.includes(websiteCurrency)) {
      return NextResponse.json({
        success: false,
        error: `Account '${primaryAcc.account_name}' currency (${accCurrency}) does not match portal currency (${websiteCurrency}).`
      }, { status: 400 });
    }

    // If fallback account is specified, verify it too
    if (fallback_gateway_account_id) {
      const fbCheck = await queryDb(`
        SELECT a.id, a.account_name, a.currency, g.supported_currencies
        FROM website_payment_gateway_accounts a
        JOIN website_payment_gateways g ON g.code = a.gateway_code
        WHERE a.id = $1 AND a.website_id = $2
      `, [fallback_gateway_account_id, auth.website.id]);

      if (fbCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Selected fallback gateway account was not found.' }, { status: 404 });
      }

      const fbCurrencies = Array.isArray(fbCheck.rows[0].supported_currencies) ? fbCheck.rows[0].supported_currencies : ['BDT'];
      if (!fbCurrencies.includes(websiteCurrency)) {
        return NextResponse.json({
          success: false,
          error: `Fallback account '${fbCheck.rows[0].account_name}' is incompatible with your portal base currency (${websiteCurrency}).`
        }, { status: 400 });
      }
    }

    const finalDesc = description !== undefined ? (description ? description.trim() : null) : (purposeMeta ? purposeMeta.description : null);
    const staffId = auth.user?.id || null;

    // Upsert the purpose routing assignment (matching composite index on website_id, purpose, COALESCE(hostel_id, 0))
    const upsertRes = await queryDb(`
      INSERT INTO website_payment_purpose_assignments (
        website_id, purpose, hostel_id, title, description,
        gateway_account_id, fallback_gateway_account_id,
        is_active, allow_student_portal, allow_public_checkout,
        assigned_by_staff_id, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9, $10,
        $11, CURRENT_TIMESTAMP
      )
      ON CONFLICT (website_id, purpose, (COALESCE(hostel_id, 0))) DO UPDATE
      SET title = EXCLUDED.title,
          description = EXCLUDED.description,
          gateway_account_id = EXCLUDED.gateway_account_id,
          fallback_gateway_account_id = EXCLUDED.fallback_gateway_account_id,
          is_active = EXCLUDED.is_active,
          allow_student_portal = EXCLUDED.allow_student_portal,
          allow_public_checkout = EXCLUDED.allow_public_checkout,
          assigned_by_staff_id = EXCLUDED.assigned_by_staff_id,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      auth.website.id,
      purpose,
      finalHostelId,
      finalTitle,
      finalDesc,
      gateway_account_id,
      fallback_gateway_account_id || null,
      Boolean(is_active),
      Boolean(allow_student_portal),
      Boolean(allow_public_checkout),
      staffId
    ]);

    return NextResponse.json({
      success: true,
      message: `Task '${finalTitle}' successfully routed to gateway account '${accCheck.rows[0].account_name}'.`,
      assignment: upsertRes.rows[0]
    });
  } catch (error) {
    console.error('Error in POST /payments/assign:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
