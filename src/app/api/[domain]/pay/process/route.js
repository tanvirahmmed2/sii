import { NextResponse } from "next/server";
import pool from "@/lib/database/db";
import {
  resolveTenantGatewayAccount,
  calculatePlatformSplit,
} from "@/lib/database/centralGateways";

export async function POST(request, { params }) {
  const { domain } = await params;
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      purpose = "education_fees", 
      invoiceRef,                 
      studentId = null,
      hostelId = null,
      amount,
      payerName,
      payerEmail,
      payerPhone,
      preferredGateway = null,    
    } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required." }, { status: 400 });
    }

    const grossAmount = Number(Number(amount).toFixed(2));

    await client.query("BEGIN");

    const webRes = await client.query(
      `SELECT id, name, currency, creator_id FROM websites WHERE domain = $1 LIMIT 1`,
      [domain]
    );
    if (webRes.rows.length === 0) {
      throw new Error("Target educational institution not found.");
    }
    const website = webRes.rows[0];

    const routeAccount = await resolveTenantGatewayAccount(client, {
      websiteId: website.id,
      purpose,
      hostelId,
      preferredGateway,
    });

    const gatewayCode = routeAccount.gateway_code;
    const feeCurrency = routeAccount.account_currency || website.currency || "BDT";
    const payoutDetails = routeAccount.payout_details || {};

    const splitInfo = await calculatePlatformSplit(client, {
      websiteId: website.id,
      grossAmount,
      currency: feeCurrency,
    });

    const platformCommission = splitInfo.platformCommission;
    const estimatedNet = Number((grossAmount - platformCommission).toFixed(2));
    const internalOrderRef = `TX2-${website.id}-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;

    const txInsert = await client.query(
      `INSERT INTO website_payment_transactions (
         website_id,
         gateway_account_id,
         invoice_ref,
         student_id,
         purpose,
         gateway_code,
         payer_name,
         payer_email,
         payer_phone,
         gross_amount,
         platform_commission_amount,
         merchant_net_amount,
         currency,
         payout_currency,
         split_model,
         status,
         split_status
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending', 'pending_checkout'
       ) RETURNING id`,
      [
        website.id,
        routeAccount.gateway_account_id,
        invoiceRef || internalOrderRef,
        studentId,
        purpose,
        gatewayCode,
        payerName,
        payerEmail || null,
        payerPhone || null,
        grossAmount,
        platformCommission,
        estimatedNet,
        feeCurrency,
        feeCurrency,
        splitInfo.chargeModel,
      ]
    );
    const txRowId = txInsert.rows[0].id;

    const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${domain}/pay?tx=${txRowId}&status=simulated_ready`;

    await client.query(
      `UPDATE website_payment_transactions
       SET transaction_id = $1, gateway_reference = $2
       WHERE id = $3`,
      [internalOrderRef, `GW-REF-${txRowId}`, txRowId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      transactionRecordId: txRowId,
      gateway: gatewayCode,
      currency: feeCurrency,
      grossAmount,
      platformCommission,
      merchantNetAmount: estimatedNet,
      checkoutUrl,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
