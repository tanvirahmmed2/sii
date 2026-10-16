import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  resolveGatewayRouteForTask,
  initiatePaymentForPurpose
} from 'src/lib/database/paymentGateways.js';

/**
 * POST /api/[domain]/fees/checkout
 * Initiates payment checkout for a specific fee purpose/task.
 * Routes dynamically to the assigned gateway account for that task.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      purpose = 'education_fees',
      hostel_id,
      amount,
      currency,
      invoice_ref,
      student_id,
      payer = {},
      return_url
    } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'A valid payment amount greater than zero is required.' }, { status: 400 });
    }

    const finalCurrency = String(currency || website.currency || 'BDT').toUpperCase().trim();

    const result = await initiatePaymentForPurpose({
      websiteId: website.id,
      purpose,
      hostelId: hostel_id ? parseInt(hostel_id, 10) : null,
      amount: numAmount,
      currency: finalCurrency,
      invoiceRef: invoice_ref,
      studentId: student_id,
      payer,
      returnUrl: return_url
    });

    return NextResponse.json({
      success: true,
      message: `Payment initiated via assigned ${result.gateway.name} account [${result.gateway.account_name}].`,
      checkout_url: result.checkout_url,
      transaction_id: result.transaction_id,
      gateway_reference: result.gateway_reference,
      gateway: result.gateway,
      transaction: result.transaction
    });
  } catch (error) {
    console.error('Error in POST /fees/checkout:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/[domain]/fees/checkout?purpose=residential_fees&hostel_id=1
 * Returns the currently active gateway routing information for the given task.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const purpose = searchParams.get('purpose') || 'education_fees';
    const hostelId = searchParams.get('hostel_id') ? parseInt(searchParams.get('hostel_id'), 10) : null;

    const route = await resolveGatewayRouteForTask(website.id, purpose, { hostelId });
    if (!route) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: `No active payment gateway account is assigned for '${purpose}'.`
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      purpose,
      gateway: {
        code: route.gateway_code,
        name: route.gateway_name,
        account_name: route.account_name,
        account_number: route.account_number,
        environment: route.environment,
        currency: route.currency,
        logo_icon: route.logo_icon,
        source: route.source
      }
    });
  } catch (error) {
    console.error('Error in GET /fees/checkout:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
