import { NextResponse } from "next/server";
import pool from "@/lib/database/db";

export async function GET(request, { params }) {
  const { domain } = await params;
  const { searchParams } = new URL(request.url);
  const purpose = searchParams.get("purpose") || "all";
  const gateway = searchParams.get("gateway") || "all";
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";
  const limit = Math.min(200, Number(searchParams.get("limit") || 50));

  const client = await pool.connect();
  try {
    const webRes = await client.query(
      `SELECT id, name, currency FROM websites WHERE subdomain = $1 OR domain = $1 LIMIT 1`,
      [domain]
    );
    if (webRes.rows.length === 0) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }
    const website = webRes.rows[0];

    const summaryRes = await client.query(
      `SELECT
         COALESCE(SUM(gross_amount) FILTER (WHERE status = 'successful'), 0)::numeric(14,2) AS total_gross_collected,
         COALESCE(SUM(gateway_processing_fee) FILTER (WHERE status = 'successful'), 0)::numeric(14,2) AS total_gateway_fees,
         COALESCE(SUM(platform_commission_amount) FILTER (WHERE status = 'successful'), 0)::numeric(14,2) AS total_tx_commissions,
         COALESCE(SUM(merchant_net_amount) FILTER (WHERE status = 'successful'), 0)::numeric(14,2) AS total_merchant_net,
         COUNT(*) FILTER (WHERE status = 'successful')::int AS successful_tx_count,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_tx_count
       FROM website_payment_transactions
       WHERE website_id = $1`,
      [website.id]
    );

    const studentDedSum = await client.query(
      `SELECT COALESCE(SUM(total_deducted_amount) FILTER (WHERE deduction_type != 'per_transaction_split' AND status = 'completed'), 0)::numeric(14,2) AS total_student_headcount_deductions
       FROM website_platform_fee_deductions
       WHERE website_id = $1`,
      [website.id]
    );

    const accountsBal = await client.query(
      `SELECT id, account_name, gateway_code, account_number, currency, available_balance, total_platform_fees_paid
       FROM website_payment_gateway_accounts
       WHERE website_id = $1 AND is_active = TRUE
       ORDER BY is_default DESC, id ASC`,
      [website.id]
    );

    const conditions = ["t.website_id = $1"];
    const values = [website.id];
    let idx = 2;

    if (purpose !== "all") {
      conditions.push(`t.purpose = $${idx++}`);
      values.push(purpose);
    }
    if (gateway !== "all") {
      conditions.push(`t.gateway_code = $${idx++}`);
      values.push(gateway);
    }
    if (status !== "all") {
      conditions.push(`t.status = $${idx++}`);
      values.push(status);
    }
    if (search.trim() !== "") {
      conditions.push(`(t.transaction_id ILIKE $${idx} OR t.invoice_ref ILIKE $${idx} OR t.payer_name ILIKE $${idx} OR t.payer_phone ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    values.push(limit);
    const txRes = await client.query(
      `SELECT
         t.id, t.transaction_id, t.gateway_reference, t.gateway_code, t.purpose,
         t.invoice_ref, t.payer_name, t.payer_email, t.payer_phone,
         t.gross_amount, t.gateway_processing_fee, t.platform_commission_amount,
         t.merchant_net_amount, t.currency, t.charge_model_applied,
         t.status, t.split_status, t.paid_at, t.created_at, t.receipt_url,
         ga.account_name AS merchant_account_name, ga.account_number AS merchant_account_number
       FROM website_payment_transactions t
       LEFT JOIN website_payment_gateway_accounts ga ON ga.id = t.gateway_account_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY t.created_at DESC
       LIMIT $${idx}`,
      values
    );

    const deductionsRes = await client.query(
      `SELECT
         d.id, d.deduction_type, d.active_student_count, d.fee_per_student,
         d.currency, d.total_deducted_amount, d.deduction_method,
         d.reference_tx_id, d.status, d.notes, d.created_at,
         ga.account_name
       FROM website_platform_fee_deductions d
       LEFT JOIN website_payment_gateway_accounts ga ON ga.id = d.gateway_account_id
       WHERE d.website_id = $1
       ORDER BY d.created_at DESC
       LIMIT 50`,
      [website.id]
    );

    const ledgerRes = await client.query(
      `SELECT
         l.id, l.entry_type, l.category, l.amount, l.balance_after,
         l.currency, l.description, l.created_at,
         ga.account_name
       FROM website_merchant_payout_ledger l
       LEFT JOIN website_payment_gateway_accounts ga ON ga.id = l.gateway_account_id
       WHERE l.website_id = $1
       ORDER BY l.created_at DESC
       LIMIT 100`,
      [website.id]
    );

    return NextResponse.json({
      website,
      summary: {
        ...summaryRes.rows[0],
        total_student_headcount_deductions: studentDedSum.rows[0].total_student_headcount_deductions,
      },
      merchantAccounts: accountsBal.rows,
      transactions: txRes.rows,
      platformFeeDeductions: deductionsRes.rows,
      merchantLedger: ledgerRes.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}