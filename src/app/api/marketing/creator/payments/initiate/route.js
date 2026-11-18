import { NextResponse } from "next/server";
import pool from "@/lib/database/db";
import { initiateEpsPayment } from "@/lib/eps/gateway";

export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      creatorId,
      websiteId,
      packageId,
      billingCycle = "monthly",
      gatewayCode = "eps",
      subMethod = "bkash",
      currency,
    } = body;

    if (!creatorId || !packageId) {
      return NextResponse.json({ error: "creatorId and packageId are required" }, { status: 400 });
    }

    await client.query("BEGIN");

    const pkgRes = await client.query(
      `SELECT * FROM packages WHERE id = $1 AND is_active = TRUE`,
      [packageId]
    );
    if (pkgRes.rows.length === 0) {
      throw new Error("Selected package not found or inactive.");
    }
    const pkg = pkgRes.rows[0];

    const creatorRes = await client.query(
      `SELECT id, name, email, phone, address, city FROM creators WHERE id = $1`,
      [creatorId]
    );
    if (creatorRes.rows.length === 0) {
      throw new Error("Creator account not found.");
    }
    const creator = creatorRes.rows[0];

    const isYearly = String(billingCycle).toLowerCase() === "yearly";
    const cleanGateway = String(gatewayCode || "eps").toLowerCase();

    let finalCurrency = String(currency || "").toUpperCase();
    if (!finalCurrency) {
      if (cleanGateway.includes("usd") || cleanGateway.includes("global")) {
        finalCurrency = "USD";
      } else {
        finalCurrency = "BDT";
      }
    }

    const isBdt = finalCurrency === "BDT";
    const baseAmount = isYearly
      ? Number(isBdt ? (pkg.yearly_price_bdt || 0) : (pkg.yearly_price_usd || pkg.yearly_price || 0))
      : Number(isBdt ? (pkg.monthly_price_bdt || 0) : (pkg.monthly_price_usd || pkg.monthly_price || 0));

    const discountAmount = 0.0;
    const totalAmount = Number(baseAmount.toFixed(2));
    const purchaseCode = `PUR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const periodDays = isYearly ? 365 : 30;

    const purInsert = await client.query(
      `INSERT INTO purchases (
         creator_id, website_id, package_id, purchase_code, billing_cycle,
         base_amount, discount_amount, tax_amount, total_amount, status,
         period_start, period_end
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, 0.00, $8, 'pending',
         NOW(), NOW() + ($9 || ' days')::interval
       ) RETURNING id`,
      [
        creatorId,
        websiteId || null,
        packageId,
        purchaseCode,
        isYearly ? "yearly" : "monthly",
        baseAmount,
        discountAmount,
        totalAmount,
        periodDays,
      ]
    );
    const purchaseId = purInsert.rows[0].id;

    const tempTxId = `TX1-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payInsert = await client.query(
      `INSERT INTO payments (
         purchase_id, creator_id, transaction_id, amount, currency,
         payment_method, payment_gateway, status, payer_email, payer_phone
       ) VALUES ($1, $2, $3, $4, $5, $6, 'eps', 'pending', $7, $8)
       RETURNING id`,
      [
        purchaseId,
        creatorId,
        tempTxId,
        totalAmount,
        finalCurrency,
        cleanGateway,
        creator.email,
        creator.phone,
      ]
    );
    const paymentRowId = payInsert.rows[0].id;

    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const origin = request.headers.get("origin") || `${proto}://${host}`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, "");
    const cancelUrl = `${appUrl}/creator/${creatorId}/payments?status=cancelled`;

    const session = await initiateEpsPayment({
      paymentId: paymentRowId,
      purchaseId,
      creatorId,
      amount: totalAmount,
      currency: finalCurrency,
      paymentMethod: cleanGateway,
      subMethod,
      customerName: creator.name,
      customerEmail: creator.email,
      customerPhone: creator.phone,
      description: `${pkg.name} (${billingCycle}) SaaS Subscription`,
      redirectUrl: `${appUrl}/api/webhooks/eps-ipn?paymentId=${paymentRowId}&creatorId=${creatorId}`,
      cancelUrl,
    });

    if (session?.gatewayOrderId) {
      await client.query(
        `UPDATE payments SET gateway_order_id = $1, gateway_response = $2 WHERE id = $3`,
        [session.gatewayOrderId, JSON.stringify(session.raw || session), paymentRowId]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      purchaseId,
      paymentId: paymentRowId,
      creatorId,
      gateway: "eps",
      gatewayOrderId: session?.gatewayOrderId || "",
      checkoutUrl: session?.redirectUrl || session?.checkoutUrl || "",
      amount: totalAmount,
      currency: finalCurrency,
      mode: session?.mode || "sandbox",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
