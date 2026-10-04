import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { executeBkashPayment } from 'src/lib/database/bkash';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentID = searchParams.get('paymentID');
    const status = (searchParams.get('status') || '').toLowerCase();
    const paymentId = searchParams.get('paymentId');

    // If cancelled or failed by user at bKash hosted page
    if (status === 'cancel' || status === 'failure') {
      const redirectUrl = paymentId
        ? `/creator/dashboard?error=bKash+payment+was+${status}`
        : `/creator/checkout?error=bKash+payment+was+${status}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (!paymentID) {
      return NextResponse.json({ success: false, error: 'Missing bKash paymentID parameter' }, { status: 400 });
    }

    // Locate payment record by ID or transaction_id
    let payRecord = null;
    if (paymentId) {
      const res = await queryDb(
        `SELECT pay.*, p.billing_interval, p.monthly_price_bdt, p.yearly_price_bdt 
         FROM payment pay 
         LEFT JOIN packages p ON pay.package_id = p.id 
         WHERE pay.id = $1 LIMIT 1`,
        [Number(paymentId)]
      );
      payRecord = res.rows[0];
    }

    if (!payRecord) {
      const res = await queryDb(
        `SELECT pay.*, p.billing_interval, p.monthly_price_bdt, p.yearly_price_bdt 
         FROM payment pay 
         LEFT JOIN packages p ON pay.package_id = p.id 
         WHERE pay.transaction_id = $1 LIMIT 1`,
        [paymentID]
      );
      payRecord = res.rows[0];
    }

    if (!payRecord) {
      return NextResponse.json({ success: false, error: 'Corresponding payment record not found' }, { status: 404 });
    }

    // If already completed, redirect to invoice
    if (payRecord.status === 'COMPLETED') {
      return NextResponse.redirect(
        new URL(`/creator/${payRecord.creator_id}/payments/${payRecord.id}?status=already_paid`, request.url)
      );
    }

    const isYearly = String(payRecord.billing_interval || '').toUpperCase() === 'YEARLY';
    const packageBdtPrice = isYearly
      ? Number(payRecord.yearly_price_bdt || 3000)
      : Number(payRecord.monthly_price_bdt || 300);
    const amountInCents = Math.round(packageBdtPrice * 100);

    // Execute payment via bKash API
    const bkResult = await executeBkashPayment(paymentID, {
      expectedAmount: packageBdtPrice,
      invoiceNumber: `INV_${payRecord.id}`,
    });

    const finalTxnId = bkResult.trxID || `BK${Date.now().toString(36).toUpperCase()}`;

    // Provision active subscription
    const durationInterval = isYearly ? "INTERVAL '365 days'" : "INTERVAL '30 days'";
    const subRes = await queryDb(
      `INSERT INTO subscription (creator_id, package_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ${durationInterval})
       RETURNING *`,
      [payRecord.creator_id, payRecord.package_id]
    );
    const subscription = subRes.rows[0];

    // Mark payment completed
    await queryDb(
      `UPDATE payment 
       SET status = 'COMPLETED', 
           subscription_id = $1, 
           payment_method = 'BKASH', 
           amount_in_cents = $2, 
           currency = 'BDT', 
           transaction_id = $3, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [subscription.id, amountInCents, finalTxnId, payRecord.id]
    );

    // Mark purchase completed
    if (payRecord.purchase_id) {
      await queryDb(
        `UPDATE purchases SET status = 'COMPLETED', payment_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [payRecord.id, payRecord.purchase_id]
      );
    }

    // Clear creator's wishlist upon successful package purchase
    await queryDb('DELETE FROM wishlists WHERE creator_id = $1', [payRecord.creator_id]).catch(console.warn);

    // Log transaction record
    await queryDb(
      `INSERT INTO payment_transactions (payment_id, creator_id, purchase_id, transaction_id, gateway, amount_in_cents, currency, status, gateway_response, metadata)
       VALUES ($1, $2, $3, $4, 'BKASH', $5, 'BDT', 'SUCCESS', $6, $7)`,
      [
        payRecord.id,
        payRecord.creator_id,
        payRecord.purchase_id,
        finalTxnId,
        amountInCents,
        JSON.stringify(bkResult),
        JSON.stringify({ subscription_id: subscription.id, paid_at: new Date().toISOString() }),
      ]
    ).catch(console.warn);

    // Redirect to invoice page with success message
    return NextResponse.redirect(
      new URL(
        `/creator/${payRecord.creator_id}/payments/${payRecord.id}?status=paid&trxId=${encodeURIComponent(finalTxnId)}`,
        request.url
      )
    );
  } catch (error) {
    console.error('bKash callback error:', error);
    return NextResponse.redirect(
      new URL(`/creator/checkout?error=${encodeURIComponent(error.message || 'bKash callback execution failed')}`, request.url)
    );
  }
}
