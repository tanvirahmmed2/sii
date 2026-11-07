import { NextResponse } from "next/server";
import pool from "@/lib/database/db";
import {
  resolveTenantGatewayAccount,
  calculatePlatformSplit,
  createShurjoPaySession,
  createPayPalOrder,
  createPaddleCheckoutSession,
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

    await client.query("BEGIN");

    const webRes = await client.query(
      `SELECT id, name, subdomain, domain, currency FROM websites WHERE subdomain = $1 OR domain = $1 LIMIT 1`,
      [domain]
    );
    if (webRes.rows.length === 0) throw new Error("Institution website not found.");
    const website = webRes.rows[0];
    const feeCurrency = (website.currency || "BDT").toUpperCase();

    const routeAccount = await resolveTenantGatewayAccount(client, {
      websiteId: website.id,
      purpose,
      hostelId,
      preferredGateway,
    });

    const gatewayCode = routeAccount.gateway_code; 
    const payoutDetails = routeAccount.payout_details || {};

    const splitInfo = await calculatePlatformSplit(client, {
      websiteId: website.id,
      grossAmount: Number(amount),
      currency: feeCurrency,
    });

    const grossAmount = Number(Number(amount).toFixed(2));
    const platformCommission = splitInfo.platformCommission;
    const estimatedNet = Number((grossAmount - platformCommission).toFixed(2));

    const internalOrderRef = `WSTX-${website.id}-${Date.now()}`;
    const txInsert = await client.query(
      `INSERT INTO website_payment_transactions (
         website_id, gateway_account_id, gateway_code, purpose, invoice_ref,
         student_id, payer_name, payer_email, payer_phone,
         amount, gross_amount, platform_commission_amount, merchant_net_amount,
         currency, settled_currency, charge_model_applied, status, split_status
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9,
         $10, $10, $11, $12,
         $13, $14, $15, 'initiated', 'pending'
       ) RETURNING id`,
      [
        website.id,
        routeAccount.gateway_account_id,
        gatewayCode,
        purpose,
        invoiceRef || internalOrderRef,
        studentId,
        payerName || "Student/Applicant",
        payerEmail || null,
        payerPhone || null,
        grossAmount,
        platformCommission,
        estimatedNet,
        feeCurrency,
        gatewayCode === "surjopay" ? "BDT" : feeCurrency,
        splitInfo.chargeModel,
      ]
    );
    const txRowId = txInsert.rows[0].id;

    const callbackBase = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/central-payment`;
    let session;

    if (gatewayCode === "surjopay") {
      session = await createShurjoPaySession({
        amount: grossAmount,
        currency: feeCurrency === "BDT" ? "BDT" : "USD",
        orderId: internalOrderRef,
        customerName: payerName,
        customerPhone: payerPhone,
        returnUrl: `${callbackBase}?gateway=surjopay&tier=TIER_2`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${domain}/pay?status=cancelled`,
        meta: {
          tier: "TIER_2",
          websiteId: website.id,
          internalTxId: txRowId,
          purpose,
          gatewayAccountId: routeAccount.gateway_account_id,
        },
      });
    } else if (gatewayCode === "paypal") {
      session = await createPayPalOrder({
        amount: grossAmount,
        currency: feeCurrency === "BDT" ? "USD" : feeCurrency,
        orderId: internalOrderRef,
        description: `${website.name} - ${purpose.replace("_", " ")} (${invoiceRef || internalOrderRef})`,
        returnUrl: `${callbackBase}?gateway=paypal&tier=TIER_2`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${domain}/pay?status=cancelled`,
        payeeEmail: payoutDetails.paypal_email || null,
        payeeMerchantId: payoutDetails.paypal_merchant_id || null,
        platformCommission,
        meta: {
          tier: "TIER_2",
          websiteId: website.id,
          internalTxId: txRowId,
          purpose,
        },
      });
    } else if (gatewayCode === "paddle" || gatewayCode === "stripe_connect") {
      session = await createPaddleCheckoutSession({
        amount: grossAmount,
        currency: feeCurrency === "BDT" ? "USD" : feeCurrency,
        orderId: internalOrderRef,
        description: `${website.name} - ${purpose.replace("_", " ")} (${invoiceRef || internalOrderRef})`,
        customerEmail: payerEmail,
        customerName: payerName,
        returnUrl: `${callbackBase}?gateway=paddle&tier=TIER_2&order_id=${internalOrderRef}&internalTxId=${txRowId}`,
        meta: {
          tier: "TIER_2",
          websiteId: website.id,
          internalTxId: txRowId,
          purpose,
        },
      });
    }

    await client.query(
      `UPDATE website_payment_transactions
       SET transaction_id = $1, gateway_reference = $2
       WHERE id = $3`,
      [internalOrderRef, session.gatewayOrderId, txRowId]
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
      checkoutUrl: session.checkoutUrl,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error.message }, { status: 400 });
  } finally {
    client.release();
  }
}