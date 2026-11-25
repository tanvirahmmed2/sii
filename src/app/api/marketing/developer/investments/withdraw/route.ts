import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { recalculateCapTable, SHARE_NOMINAL_PRICE } from 'src/lib/equity/capTableEngine';
import { generateToken } from 'src/lib/utils/random';

const PERMISSIONS = ['investments', 'shareholders', 'withdraws'];

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'create');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const devId = auth.developer?.id || auth.user?.id || null;
    const body = await request.json().catch(() => ({}));

    const shareholderId = Number(body.shareholder_id);
    const amount = Number(body.amount || 0);
    const currency = String(body.currency || 'BDT').toUpperCase();
    const method = String(body.method || 'bank_transfer').trim();
    const transactionRef = body.transaction_reference ? String(body.transaction_reference).trim() : `CAPRET-${Date.now()}`;
    const notes = body.notes ? String(body.notes).trim() : 'Capital return withdrawal & equity adjustment';

    if (!shareholderId || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Shareholder ID and positive withdrawal amount are required.' }, { status: 400 });
    }

    const shRes = await queryDb('SELECT * FROM shareholders WHERE id = $1 LIMIT 1', [shareholderId]);
    if (shRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Shareholder not found.' }, { status: 404 });
    }

    const shareholder = shRes.rows[0];
    const currentInvested = Number(shareholder.total_invested || 0);

    if (amount > currentInvested) {
      return NextResponse.json({
        success: false,
        error: `Withdrawal amount (${amount}) exceeds shareholder invested capital (${currentInvested}).`,
      }, { status: 400 });
    }

    const sharesReduced = Math.max(1, Math.round(amount / SHARE_NOMINAL_PRICE));

    await queryDb('BEGIN');
    try {
      const balRes = await queryDb('SELECT available_balance FROM platform_balances WHERE currency = $1 LIMIT 1', [currency]);
      const currentBal = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;
      const newBal = currentBal - amount;

      await queryDb(`
        INSERT INTO platform_balances (currency, total_revenue, available_balance, pending_balance, total_withdrawn)
        VALUES ($1, 0.00, $2, 0.00, $3)
        ON CONFLICT (currency) DO UPDATE 
        SET available_balance = platform_balances.available_balance - $3,
            total_withdrawn = platform_balances.total_withdrawn + $3,
            updated_at = CURRENT_TIMESTAMP
      `, [currency, newBal, amount]);

      const withdrawRes = await queryDb(`
        INSERT INTO withdraws (
          requested_by_id, shareholder_id, withdraw_type, amount, currency,
          net_amount, method, account_details, status, processed_by_developer_id,
          transaction_reference, notes
        ) VALUES ($1, $2, 'capital_return', $3, $4, $3, $5, $6, 'processed', $1, $7, $8)
        RETURNING *
      `, [
        devId,
        shareholderId,
        amount,
        currency,
        method,
        JSON.stringify(shareholder.account_details || {}),
        transactionRef,
        notes,
      ]);

      await queryDb(`
        INSERT INTO cashflows (
          title, category, flow_type, amount, currency, balance_after,
          reference_type, reference_id, developer_id, payment_method, metadata
        ) VALUES ($1, 'capital_return', 'outflow', $2, $3, $4, 'withdraw', $5, $6, $7, $8)
      `, [
        `Capital Withdrawal: ${shareholder.name}`,
        amount,
        currency,
        newBal,
        withdrawRes.rows[0].id,
        devId,
        method,
        JSON.stringify({ shareholder_id: shareholderId, transaction_reference: transactionRef, notes }),
      ]);

      await queryDb(`
        UPDATE shareholders
        SET total_invested = GREATEST(0, COALESCE(total_invested, 0) - $1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [amount, shareholderId]);

      const scRes = await queryDb("SELECT id FROM share_classes WHERE class_code = 'ORD-A' LIMIT 1");
      if (scRes.rows.length > 0) {
        const transferNum = `BUYBACK-${new Date().getFullYear()}-${generateToken(5).toUpperCase()}`;
        const pctReduced = currentInvested > 0 ? Number(((amount / currentInvested) * Number(shareholder.share_percentage || 0)).toFixed(3)) : 0;
        await queryDb(`
          INSERT INTO share_transfers (
            transfer_number, from_shareholder_id, to_shareholder_id, share_class_id,
            shares_transferred, percentage_transferred, transfer_price_per_share,
            total_transfer_value, currency, transfer_type, approved_by_developer_id,
            status, notes
          ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, 'company_buyback', $9, 'completed', $10)
        `, [
          transferNum,
          shareholderId,
          scRes.rows[0].id,
          sharesReduced,
          pctReduced,
          SHARE_NOMINAL_PRICE,
          amount,
          currency,
          devId,
          notes,
        ]);
      }

      const capSummary = await recalculateCapTable();

      await queryDb('COMMIT');
      return NextResponse.json({
        success: true,
        message: `Capital withdrawal of ${amount} ${currency} processed for ${shareholder.name}. Equity shares adjusted accordingly.`,
        withdrawal: withdrawRes.rows[0],
        capSummary,
      });
    } catch (err: any) {
      await queryDb('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    console.error('Investment withdraw POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
