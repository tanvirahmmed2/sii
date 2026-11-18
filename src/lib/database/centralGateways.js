import pool from "./db.js";

export async function resolveTenantGatewayAccount(client, { websiteId, purpose, hostelId = null, preferredGateway = null }) {
  const routeRes = await client.query(
    `SELECT
       pa.purpose,
       pa.gateway_account_id,
       pa.fallback_gateway_account_id,
       ga.gateway_code,
       ga.account_name,
       ga.account_number,
       ga.currency AS account_currency,
       ga.payout_details,
       ga.credentials
     FROM website_payment_purpose_assignments pa
     JOIN website_payment_gateway_accounts ga ON ga.id = pa.gateway_account_id
     WHERE pa.website_id = $1
       AND pa.is_active = TRUE
       AND ga.is_active = TRUE
       AND pa.purpose IN ($2, 'all_fees')
       AND ($3::bigint IS NULL OR pa.hostel_id = $3 OR pa.hostel_id IS NULL)
     ORDER BY
       CASE WHEN pa.purpose = $2 THEN 1 ELSE 2 END,
       CASE WHEN pa.hostel_id = $3 THEN 1 ELSE 2 END
     LIMIT 1`,
    [websiteId, purpose, hostelId]
  );

  if (routeRes.rows.length > 0 && (!preferredGateway || routeRes.rows[0].gateway_code === preferredGateway)) {
    return routeRes.rows[0];
  }

  const fallbackRes = await client.query(
    `SELECT
       id AS gateway_account_id,
       gateway_code,
       account_name,
       account_number,
       currency AS account_currency,
       payout_details,
       credentials
     FROM website_payment_gateway_accounts
     WHERE website_id = $1
       AND is_active = TRUE
       AND ($2::varchar IS NULL OR gateway_code = $2)
     ORDER BY is_default DESC, id ASC
     LIMIT 1`,
    [websiteId, preferredGateway]
  );

  if (fallbackRes.rows.length === 0) {
    throw new Error("No active merchant payout account is configured for this institution.");
  }
  return fallbackRes.rows[0];
}

export async function calculatePlatformSplit(client, { websiteId, grossAmount, currency }) {
  const pkgRes = await client.query(
    `SELECT
       p.charge_model,
       p.per_tx_fee_type,
       p.per_tx_fee_value,
       p.per_student_fee_usd,
       p.per_student_fee_bdt
     FROM subscriptions s
     JOIN packages p ON p.id = s.package_id
     WHERE s.website_id = $1
       AND s.status IN ('active', 'trailing')
     ORDER BY s.current_period_end DESC
     LIMIT 1`,
    [websiteId]
  );

  const pkg = pkgRes.rows[0] || {
    charge_model: "per_transaction",
    per_tx_fee_type: "percentage",
    per_tx_fee_value: 2.5,
  };

  let platformCommission = 0;
  if (pkg.charge_model === "per_transaction" || pkg.charge_model === "hybrid") {
    if (pkg.per_tx_fee_type === "percentage") {
      platformCommission = Number(((Number(grossAmount) * Number(pkg.per_tx_fee_value)) / 100).toFixed(2));
    } else {
      platformCommission = Number(pkg.per_tx_fee_value);
    }
  }

  return {
    chargeModel: pkg.charge_model,
    platformCommission: Math.min(platformCommission, Number(grossAmount)),
  };
}

export async function executePerStudentFeeDeduction(client, { websiteId, triggerReason = "per_student_cycle" }) {
  const subRes = await client.query(
    `SELECT
       s.id AS subscription_id,
       s.website_id,
       s.current_period_start,
       s.current_period_end,
       w.currency AS website_currency,
       p.charge_model,
       p.per_student_fee_usd,
       p.per_student_fee_bdt,
       p.student_fee_cycle_days
     FROM subscriptions s
     JOIN websites w ON w.id = s.website_id
     JOIN packages p ON p.id = s.package_id
     WHERE s.website_id = $1
       AND s.status = 'active'
       AND p.charge_model IN ('per_student', 'hybrid')
     FOR UPDATE OF s`,
    [websiteId]
  );

  if (subRes.rows.length === 0) {
    return { deducted: false, reason: "Website is not on a per_student or hybrid package." };
  }

  const sub = subRes.rows[0];

  const countRes = await client.query(
    `SELECT COUNT(*)::int AS active_students
     FROM website_students
     WHERE website_id = $1 AND status = 'active'`,
    [websiteId]
  );
  const activeStudents = countRes.rows[0]?.active_students || 0;
  if (activeStudents === 0) {
    return { deducted: false, reason: "Zero active students." };
  }

  const accRes = await client.query(
    `SELECT id, gateway_code, currency, available_balance, payout_details
     FROM website_payment_gateway_accounts
     WHERE website_id = $1 AND is_active = TRUE
     ORDER BY is_default DESC, available_balance DESC
     LIMIT 1
     FOR UPDATE`,
    [websiteId]
  );

  const account = accRes.rows[0];
  const currency = account?.currency || sub.website_currency || "BDT";
  const ratePerStudent =
    currency.toUpperCase() === "BDT"
      ? Number(sub.per_student_fee_bdt)
      : Number(sub.per_student_fee_usd);
  const totalFee = Number((activeStudents * ratePerStudent).toFixed(2));

  let deductionMethod = "merchant_ledger_debit";
  let deductionStatus = "completed";
  let gatewayAccountId = account?.id || null;

  if (account) {
    const newBalance = Number((Number(account.available_balance) - totalFee).toFixed(2));
    await client.query(
      `UPDATE website_payment_gateway_accounts
       SET available_balance = $1,
           total_platform_fees_paid = total_platform_fees_paid + $2
       WHERE id = $3`,
      [newBalance, totalFee, account.id]
    );

    const dedInsert = await client.query(
      `INSERT INTO website_platform_fee_deductions (
         website_id, subscription_id, gateway_account_id, deduction_type,
         active_student_count, fee_per_student, currency, total_deducted_amount,
         deduction_method, status, billing_period_start, billing_period_end, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '30 days', NOW(), $11)
       RETURNING id`,
      [
        websiteId,
        sub.subscription_id,
        gatewayAccountId,
        triggerReason,
        activeStudents,
        ratePerStudent,
        currency,
        totalFee,
        deductionMethod,
        deductionStatus,
        `Auto-deducted for ${activeStudents} active students @ ${ratePerStudent} ${currency}/student`,
      ]
    );

    await client.query(
      `INSERT INTO website_merchant_payout_ledger (
         website_id, gateway_account_id, deduction_id, entry_type, category,
         amount, balance_after, currency, description
       ) VALUES ($1, $2, $3, 'debit', 'platform_student_headcount_fee', $4, $5, $6, $7)`,
      [
        websiteId,
        account.id,
        dedInsert.rows[0].id,
        totalFee,
        newBalance,
        currency,
        `Per-Student SaaS Fee Deduction (${activeStudents} students x ${ratePerStudent} ${currency})`,
      ]
    );
  } else {
    await client.query(
      `UPDATE subscriptions
       SET accumulated_student_fee_due = accumulated_student_fee_due + $1
       WHERE id = $2`,
      [totalFee, sub.subscription_id]
    );
  }

  await client.query(
    `UPDATE subscriptions
     SET last_student_fee_deduction_at = NOW(),
         next_student_fee_deduction_at = NOW() + ($1 || ' days')::interval
     WHERE id = $2`,
    [sub.student_fee_cycle_days || 30, sub.subscription_id]
  );

  return {
    deducted: true,
    websiteId,
    activeStudents,
    ratePerStudent,
    totalFee,
    currency,
  };
}
