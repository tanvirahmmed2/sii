import { NextResponse } from "next/server";
import pool from "@/lib/database/db";
import {
  verifyShurjoPayPayment,
  capturePayPalOrder,
  retrievePaddleTransaction,
  executePerStudentFeeDeduction,
} from "@/lib/database/centralGateways";

async function handleCallback(request) {
  const { searchParams } = new URL(request.url);
  const gateway = searchParams.get("gateway"); 
  const client = await pool.connect();

  try {
    let verified;

    if (gateway === "surjopay") {
      const spOrderId = searchParams.get("order_id");
      if (!spOrderId) throw new Error("Missing shurjoPay order_id");
      verified = await verifyShurjoPayPayment(spOrderId);
    } else if (gateway === "paypal") {
      const token = searchParams.get("token") || searchParams.get("order_id"); 
      if (!token) throw new Error("Missing PayPal order token");
      verified = await capturePayPalOrder(token);
    } else if (gateway === "paddle" || gateway === "stripe_connect") {
      const orderId = searchParams.get("order_id") || searchParams.get("transaction_id") || searchParams.get("session_id");
      if (!orderId) throw new Error("Missing Paddle transaction / order_id");
      verified = await retrievePaddleTransaction(orderId);
    } else {
      throw new Error("Invalid gateway callback");
    }

    if (!verified) {
      throw new Error("Payment verification failed");
    }
    if (!verified.meta) {
      verified.meta = {};
    }

    if (!verified.meta.internalTxId) {
      const fallbackId = searchParams.get("paymentId") || searchParams.get("internalTxId");
      if (fallbackId) {
        verified.meta.internalTxId = fallbackId;
      }
    }
    if (!verified.meta.tier && searchParams.get("tier")) {
      verified.meta.tier = searchParams.get("tier");
    }

    const tier = verified.meta?.tier || searchParams.get("tier") || "TIER_2";
    const internalTxId = Number(verified.meta?.internalTxId || 0);

    await client.query("BEGIN");

    await client.query(`SELECT pg_advisory_xact_lock($1)`, [internalTxId || 999999]);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

    if (tier === "TIER_1") {
      let payRes = await client.query(
        `SELECT p.*, pur.website_id, pur.package_id, pur.billing_cycle, pur.period_start, pur.period_end
         FROM payments p
         JOIN purchases pur ON pur.id = p.purchase_id
         WHERE p.id = $1 FOR UPDATE`,
        [internalTxId]
      );
      if (payRes.rows.length === 0 && (verified.gatewayOrderId || searchParams.get("order_id"))) {
        payRes = await client.query(
          `SELECT p.*, pur.website_id, pur.package_id, pur.billing_cycle, pur.period_start, pur.period_end
           FROM payments p
           JOIN purchases pur ON pur.id = p.purchase_id
           WHERE p.gateway_order_id = $1 OR pur.purchase_code = $2 FOR UPDATE`,
          [verified.gatewayOrderId, searchParams.get("order_id")]
        );
      }
      if (payRes.rows.length === 0) throw new Error("Tier 1 payment record not found.");
      const payRow = payRes.rows[0];

      if (payRow.status === "successful") {
        await client.query("COMMIT");
        return NextResponse.redirect(`${appUrl}/creator/${payRow.creator_id}/payments/${payRow.id}?status=already_paid`);
      }

      if (!verified.isSuccess) {
        await client.query(`UPDATE payments SET status = 'failed', gateway_response = $1 WHERE id = $2`, [JSON.stringify(verified.raw), payRow.id]);
        await client.query(`UPDATE purchases SET status = 'failed' WHERE id = $1`, [payRow.purchase_id]);
        await client.query("COMMIT");
        return NextResponse.redirect(`${appUrl}/creator/${payRow.creator_id}/payments/${payRow.id}?status=failed`);
      }

      const netAmt = Number(( Number(payRow.amount) - Number(verified.gatewayFee || 0) ).toFixed(2));
      await client.query(
        `UPDATE payments
         SET status = 'successful',
             gateway_fee = $1,
             net_amount = $2,
             gateway_response = $3,
             payment_date = NOW()
         WHERE id = $4`,
        [verified.gatewayFee || 0, netAmt, JSON.stringify(verified.raw), payRow.id]
      );

      await client.query(`UPDATE purchases SET status = 'completed' WHERE id = $1`, [payRow.purchase_id]);

      if (payRow.website_id) {
        await client.query(
          `INSERT INTO subscriptions (
             creator_id, website_id, package_id, purchase_id, status,
             billing_cycle, current_period_start, current_period_end,
             next_student_fee_deduction_at
           ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, NOW() + INTERVAL '30 days')
           ON CONFLICT (id) DO NOTHING`,
          [
            payRow.creator_id,
            payRow.website_id,
            payRow.package_id,
            payRow.purchase_id,
            payRow.billing_cycle,
            payRow.period_start,
            payRow.period_end,
          ]
        );

        await executePerStudentFeeDeduction(client, {
          websiteId: payRow.website_id,
          triggerReason: "subscription_renewal_deduction",
        });
      } else {
        await client.query(
          `INSERT INTO subscriptions (
             creator_id, package_id, purchase_id, status,
             billing_cycle, current_period_start, current_period_end
           ) VALUES ($1, $2, $3, 'active', $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            payRow.creator_id,
            payRow.package_id,
            payRow.purchase_id,
            payRow.billing_cycle,
            payRow.period_start,
            payRow.period_end,
          ]
        );
      }

      await client.query("COMMIT");
      return NextResponse.redirect(`${appUrl}/creator/${payRow.creator_id}/payments/${payRow.id}?status=success&purchase=${payRow.purchase_id}`);
    }

    const txRes = await client.query(
      `SELECT * FROM website_payment_transactions WHERE id = $1 FOR UPDATE`,
      [internalTxId]
    );
    if (txRes.rows.length === 0) throw new Error("Tenant payment transaction not found.");
    const tx = txRes.rows[0];

    if (tx.status === "successful") {
      await client.query("COMMIT");
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/receipt/${tx.id}`);
    }

    if (!verified.isSuccess) {
      await client.query(
        `UPDATE website_payment_transactions
         SET status = 'failed', split_status = 'failed', gateway_response = $1, error_message = 'Payment declined or cancelled'
         WHERE id = $2`,
        [JSON.stringify(verified.raw), tx.id]
      );
      await client.query("COMMIT");
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/receipt/${tx.id}?status=failed`);
    }

    const gatewayFee = Number(verified.gatewayFee || 0);
    const grossAmount = Number(tx.gross_amount || tx.amount);
    const platformCommission = Number(tx.platform_commission_amount || 0);
    const merchantNet = Number((grossAmount - gatewayFee - platformCommission).toFixed(2));

    const isNativeSplit = gateway === "paypal" && tx.split_status === "split_at_checkout";
    const splitStatus = isNativeSplit ? "split_at_checkout" : "credited_to_ledger";

    await client.query(
      `UPDATE website_payment_transactions
       SET status = 'successful',
           split_status = $1,
           fee_amount = $2,
           gateway_processing_fee = $2,
           net_amount = $3,
           merchant_net_amount = $3,
           gateway_response = $4,
           paid_at = NOW(),
           receipt_url = $5
       WHERE id = $6`,
      [
        splitStatus,
        gatewayFee,
        merchantNet,
        JSON.stringify(verified.raw),
        `/receipt/${tx.id}`,
        tx.id,
      ]
    );

    if (tx.gateway_account_id) {
      const accLock = await client.query(
        `SELECT available_balance FROM website_payment_gateway_accounts WHERE id = $1 FOR UPDATE`,
        [tx.gateway_account_id]
      );
      const currentBal = Number(accLock.rows[0]?.available_balance || 0);
      const afterGrossBal = Number((currentBal + (grossAmount - gatewayFee)).toFixed(2));
      const finalBal = Number((afterGrossBal - platformCommission).toFixed(2));

      await client.query(
        `UPDATE website_payment_gateway_accounts
         SET available_balance = $1,
             total_platform_fees_paid = total_platform_fees_paid + $2
         WHERE id = $3`,
        [finalBal, platformCommission, tx.gateway_account_id]
      );

      await client.query(
        `INSERT INTO website_merchant_payout_ledger (
           website_id, gateway_account_id, payment_transaction_id, entry_type, category,
           amount, balance_after, currency, description
         ) VALUES ($1, $2, $3, 'credit', 'student_fee_collection', $4, $5, $6, $7)`,
        [
          tx.website_id,
          tx.gateway_account_id,
          tx.id,
          Number((grossAmount - gatewayFee).toFixed(2)),
          afterGrossBal,
          tx.currency,
          `Fee collected for ${tx.purpose} (Ref: ${tx.invoice_ref})`,
        ]
      );

      if (platformCommission > 0) {
        const dedRes = await client.query(
          `INSERT INTO website_platform_fee_deductions (
             website_id, gateway_account_id, deduction_type, currency,
             total_deducted_amount, deduction_method, reference_tx_id, status, notes
           ) VALUES ($1, $2, 'per_transaction_split', $3, $4, 'merchant_ledger_debit', $5, 'completed', $6)
           RETURNING id`,
          [
            tx.website_id,
            tx.gateway_account_id,
            tx.currency,
            platformCommission,
            tx.transaction_id,
            `Real-time transaction fee split on ${tx.purpose} (${tx.invoice_ref})`,
          ]
        );

        await client.query(
          `INSERT INTO website_merchant_payout_ledger (
             website_id, gateway_account_id, payment_transaction_id, deduction_id, entry_type, category,
             amount, balance_after, currency, description
           ) VALUES ($1, $2, $3, $4, 'debit', 'platform_tx_commission', $5, $6, $7, $8)`,
          [
            tx.website_id,
            tx.gateway_account_id,
            tx.id,
            dedRes.rows[0].id,
            platformCommission,
            finalBal,
            tx.currency,
            `Platform per-transaction commission deducted at payment time`,
          ]
        );
      }
    }

    if (tx.invoice_ref) {
      if (tx.purpose === "admission_fees") {
        await client.query(
          `UPDATE website_admission_fee_payments SET status = 'paid' WHERE website_id = $1 AND invoice_no = $2`,
          [tx.website_id, tx.invoice_ref]
        );
      } else {
        await client.query(
          `UPDATE website_student_invoices
           SET paid_amount = paid_amount + $1,
               due_amount = GREATEST(0, due_amount - $1),
               status = CASE WHEN (due_amount - $1) <= 0 THEN 'paid' ELSE 'partially_paid' END
           WHERE website_id = $2 AND invoice_no = $3`,
          [grossAmount, tx.website_id, tx.invoice_ref]
        );
      }
    }

    if (tx.student_id) {
      const prevLed = await client.query(
        `SELECT balance_after FROM website_student_ledgers
         WHERE website_id = $1 AND student_id = $2
         ORDER BY id DESC LIMIT 1`,
        [tx.website_id, tx.student_id]
      );
      const prevBalance = Number(prevLed.rows[0]?.balance_after || 0);
      const nextBalance = Number((prevBalance - grossAmount).toFixed(2));

      await client.query(
        `INSERT INTO website_student_ledgers (
           website_id, student_id, entry_type, account_category,
           amount, balance_after, reference_id, description
         ) VALUES ($1, $2, 'credit', $3, $4, $5, $6, $7)`,
        [
          tx.website_id,
          tx.student_id,
          tx.purpose,
          grossAmount,
          nextBalance,
          tx.transaction_id,
          `Online payment via ${tx.gateway_code.toUpperCase()} (${tx.invoice_ref})`,
        ]
      );
    }

    await client.query("COMMIT");
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/receipt/${tx.id}?status=success`);
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request) {
  return handleCallback(request);
}

export async function POST(request) {
  return handleCallback(request);
}