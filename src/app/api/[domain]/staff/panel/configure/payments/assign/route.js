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
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const assignmentsRes = await queryDb(`
      SELECT pa.id, pa.website_id, pa.purpose, pa.title, pa.description,
             pa.gateway_account_id, pa.fallback_gateway_account_id,
             pa.is_active, pa.allow_student_portal, pa.allow_public_checkout,
             pa.created_at, pa.updated_at,
             ga.account_name, ga.gateway_code, ga.environment, ga.currency, ga.is_active AS account_is_active,
             fga.account_name AS fallback_account_name, fga.gateway_code AS fallback_gateway_code,
             fga.environment AS fallback_environment
      FROM website_payment_purpose_assignments pa
      LEFT JOIN website_payment_gateway_accounts ga ON ga.id = pa.gateway_account_id
      LEFT JOIN website_payment_gateway_accounts fga ON fga.id = pa.fallback_gateway_account_id
      WHERE pa.website_id = $1
      ORDER BY pa.id ASC
    `, [auth.website.id]);

    return NextResponse.json({
      success: true,
      fee_purposes: FEE_PURPOSES,
      assignments: assignmentsRes.rows
    });
  } catch (error) {
    console.error('Error in GET /payments/assign:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST or PUT /api/[domain]/staff/panel/configure/payments/assign
 * Assigns or updates the gateway account routing for a task/purpose.
 * E.g., assign Account A to residential_fees, Account B to education_fees, Account C to exam_fees.
 */
export async function POST(request, context) {
  return handleAssignRoute(request, context);
}

export async function PUT(request, context) {
  return handleAssignRoute(request, context);
}

async function handleAssignRoute(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      purpose,
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

    // Verify gateway_account_id belongs to this website
    const accCheck = await queryDb(`
      SELECT id, account_name, gateway_code, environment, is_active
      FROM website_payment_gateway_accounts
      WHERE id = $1 AND website_id = $2
    `, [gateway_account_id, auth.website.id]);

    if (accCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected primary gateway account was not found.' }, { status: 404 });
    }

    // If fallback account is specified, verify it too
    if (fallback_gateway_account_id) {
      const fbCheck = await queryDb(`
        SELECT id FROM website_payment_gateway_accounts
        WHERE id = $1 AND website_id = $2
      `, [fallback_gateway_account_id, auth.website.id]);

      if (fbCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Selected fallback gateway account was not found.' }, { status: 404 });
      }
    }

    // Find default title if not provided
    const purposeMeta = FEE_PURPOSES.find(p => p.code === purpose);
    const finalTitle = title ? title.trim() : (purposeMeta ? purposeMeta.label : purpose);
    const finalDesc = description !== undefined ? (description ? description.trim() : null) : (purposeMeta ? purposeMeta.description : null);
    const staffId = auth.user?.id || null;

    // Upsert the purpose routing assignment
    const upsertRes = await queryDb(`
      INSERT INTO website_payment_purpose_assignments (
        website_id, purpose, title, description,
        gateway_account_id, fallback_gateway_account_id,
        is_active, allow_student_portal, allow_public_checkout,
        assigned_by_staff_id, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8, $9,
        $10, CURRENT_TIMESTAMP
      )
      ON CONFLICT (website_id, purpose) DO UPDATE
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
