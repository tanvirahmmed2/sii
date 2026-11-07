import { NextResponse } from "next/server";
import pool from "@/lib/database/db";
import {
  createShurjoPaySession,
  createPayPalOrder,
  createPaddleCheckoutSession,
} from "@/lib/database/centralGateways";

export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      creatorId,
      websiteId,
      packageId,
      billingCycle = "monthly", 
      gatewayCode = "surjopay", 
      currency = "BDT",
    } = body;

    if (!creatorId || !packageId) {
      return NextResponse.json({ error: "creatorId and packageId are required" }, { status: 400 });
    }

    await client.query("BEGIN");

    const pkgRes = await client.query(`SELECT * FROM packages WHERE id = $1 AND is_active = TRUE`, [packageId]);
    if (pkgRes.rows.length === 0) throw new Error("Selected package not found or inactive.");
    const pkg = pkgRes.rows[0];

    const creatorRes = await client.query(`SELECT id, name, email, phone, address, city FROM creators WHERE id = $1`, [creatorId]);
    if (creatorRes.rows.length === 0) throw new Error("Creator account not found.");
    const creator = creatorRes.rows[0];

    const isBdt = currency.toUpperCase() === "BDT";
    const baseAmount =
      billingCycle === "yearly"
        ? Number(isBdt ? pkg.yearly_price_bdt : pkg.yearly_price_usd)
        : Number(isBdt ? pkg.monthly_price_bdt : pkg.monthly_price_usd);

    const discountAmount = Number(((baseAmount * Number(pkg.discount_percentage || 0)) / 100).toFixed(2));
    const totalAmount = Number((baseAmount - discountAmount).toFixed(2));

    const purchaseCode = `PUR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const periodDays = billingCycle === "yearly" ? 365 : 30;

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
      [creatorId, websiteId || null, packageId, purchaseCode, billingCycle, baseAmount, discountAmount, totalAmount, periodDays]
    );
    const purchaseId = purInsert.rows[0].id;

    const tempTxId = `TX1-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payInsert = await client.query(
      `INSERT INTO payments (
         purchase_id, creator_id, transaction_id, amount, currency,
         payment_method, payment_gateway, status, payer_email, payer_phone
       ) VALUES ($1, $2, $3, $4, $5, $6, $6, 'pending', $7, $8)
       RETURNING id`,
      [purchaseId, creatorId, tempTxId, totalAmount, currency.toUpperCase(), gatewayCode, creator.email, creator.phone]
    );
    const paymentRowId = payInsert.rows[0].id;

    const callbackBase = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/central-payment`;
    let session;

    if (gatewayCode === "surjopay") {
      session = await createShurjoPaySession({
        amount: totalAmount,
        currency: isBdt ? "BDT" : "USD",
        orderId: purchaseCode,
        customerName: creator.name,
        customerPhone: creator.phone,
        customerAddress: creator.address || "Bangladesh",
        customerCity: creator.city || "Dhaka",
        returnUrl: `${callbackBase}?gateway=surjopay&tier=TIER_1`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?status=cancelled`,
        meta: { tier: "TIER_1", websiteId: websiteId || 0, internalTxId: paymentRowId, purpose: "package_purchase" },
      });
    } else if (gatewayCode === "paypal") {
      session = await createPayPalOrder({
        amount: totalAmount,
        currency: isBdt ? "USD" : currency.toUpperCase(),
        orderId: purchaseCode,
        description: `${pkg.name} (${billingCycle}) SaaS Subscription`,
        returnUrl: `${callbackBase}?gateway=paypal&tier=TIER_1`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?status=cancelled`,
        meta: { tier: "TIER_1", websiteId: websiteId || 0, internalTxId: paymentRowId },
      });
    } else if (gatewayCode === "paddle" || gatewayCode === "stripe_connect") {
      session = await createPaddleCheckoutSession({
        amount: totalAmount,
        currency: isBdt ? "USD" : currency.toUpperCase(),
        orderId: purchaseCode,
        description: `${pkg.name} (${billingCycle}) SaaS Subscription`,
        customerEmail: creator.email,
        customerName: creator.name,
        returnUrl: `${callbackBase}?gateway=paddle&tier=TIER_1&order_id=${purchaseCode}&paymentId=${paymentRowId}`,
        meta: { tier: "TIER_1", websiteId: websiteId || 0, internalTxId: paymentRowId, purpose: "package_purchase" },
      });
    } else {
      throw new Error("Unsupported gateway. Choose surjopay, paypal, or paddle.");
    }

    await client.query(
      `UPDATE payments SET gateway_order_id = $1, gateway_response = $2 WHERE id = $3`,
      [session.gatewayOrderId, JSON.stringify(session.raw), paymentRowId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      purchaseId,
      paymentId: paymentRowId,
      gateway: gatewayCode,
      gatewayOrderId: session.gatewayOrderId,
      checkoutUrl: session.checkoutUrl,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}