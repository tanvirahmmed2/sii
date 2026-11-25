import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { recalculateCapTable, SHARE_NOMINAL_PRICE } from 'src/lib/equity/capTableEngine';
import { generateToken } from 'src/lib/utils/random';

const PERMISSIONS = ['monthly-accounting', 'shareholders', 'investments', 'withdraws'];

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'create');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const devId = auth.developer?.id || auth.user?.id || null;
    const body = await request.json().catch(() => ({}));

    const shareholderId = Number(body.shareholder_id);
    const period = String(body.period || new Date().toISOString().slice(0, 7)).trim();
    const amount = Number(body.amount || 0);
    const action = String(body.action || 'payout').toLowerCase();
    const currency = String(body.currency || 'BDT').toUpperCase();
    const method = String(body.method || 'bank_transfer').trim();
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!shareholderId || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Shareholder ID and positive profit amount are required.' }, { status: 400 });
    }

    if (action !== 'payout' && action !== 'reinvest') {
      return NextResponse.json({ success: false, error: 'Action must be payout or reinvest.' }, { status: 400 });
    }

    const shRes = await queryDb('SELECT * FROM shareholders WHERE id = $1 LIMIT 1', [shareholderId]);
    if (shRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Shareholder not found.' }, { status: 404 });
    }
    const shareholder = shRes.rows[0];

    await queryDb('BEGIN');
    try {
      await queryDb(`
        INSERT INTO dividend_declarations (
          declaration_title, financial_period, total_declared_amount,
          currency, declared_by_developer_id, status, notes
        ) VALUES ($1, $2, $3, $4, $5, 'completed', $6)
      `, [
        `Profit Distribution for ${shareholder.name} (${period})`,
        period,
        amount,
        currency,
        devId,
        notes || `${action === 'reinvest' ? 'Reinvested into equity' : 'Cash payout'}`,
      ]);

      if (action === 'payout') {
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

        const txRef = `DIV-${period.replace('-', '')}-${generateToken(5).toUpperCase()}`;
        const withdrawRes = await queryDb(`
          INSERT INTO withdraws (
            requested_by_id, shareholder_id, withdraw_type, amount, currency,
            net_amount, method, account_details, status, processed_by_developer_id,
            transaction_reference, notes
          ) VALUES ($1, $2, 'dividend', $3, $4, $3, $5, $6, 'processed', $1, $7, $8)
          RETURNING *
        `, [
          devId,
          shareholderId,
          amount,
          currency,
          method,
          JSON.stringify(shareholder.account_details || {}),
          txRef,
          notes || `Profit distribution payout for ${period}`,
        ]);

        await queryDb(`
          INSERT INTO cashflows (
            title, category, flow_type, amount, currency, balance_after,
            reference_type, reference_id, developer_id, payment_method, metadata
          ) VALUES ($1, 'dividend_payout', 'outflow', $2, $3, $4, 'withdraw', $5, $6, $7, $8)
        `, [
          `Dividend Payout: ${shareholder.name} (${period})`,
          amount,
          currency,
          newBal,
          withdrawRes.rows[0].id,
          devId,
          method,
          JSON.stringify({ shareholder_id: shareholderId, period, reference: txRef }),
        ]);

        await queryDb(`
          UPDATE shareholders
          SET total_withdrawn = COALESCE(total_withdrawn, 0) + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [amount, shareholderId]);

        await queryDb('COMMIT');
        return NextResponse.json({
          success: true,
          message: `Dividend payout of ${amount} ${currency} disbursed to ${shareholder.name}.`,
          withdrawal: withdrawRes.rows[0],
        });
      } else {
        const scRes = await queryDb("SELECT id FROM share_classes WHERE class_code = 'ORD-A' LIMIT 1");
        const shareClassId = scRes.rows.length > 0 ? Number(scRes.rows[0].id) : null;
        const sharesAllocated = Math.max(1, Math.round(amount / SHARE_NOMINAL_PRICE));
        const roundName = `Dividend Reinvestment (${period})`;
        const refCode = `REINV-${period.replace('-', '')}-${generateToken(5).toUpperCase()}`;

        const invRes = await queryDb(`
          INSERT INTO investments (
            round_name, shareholder_id, share_class_id, investment_amount, currency,
            shares_allocated, investment_date, payment_method, payment_reference,
            is_dividend_reinvestment, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'dividend_reinvestment', $7, true, 'completed', $8)
          RETURNING *
        `, [
          roundName,
          shareholderId,
          shareClassId,
          amount,
          currency,
          sharesAllocated,
          refCode,
          notes || `Reinvested monthly profit from ${period}`,
        ]);

        if (shareClassId) {
          const certNum = `CERT-REINV-${new Date().getFullYear()}-${generateToken(5).toUpperCase()}`;
          await queryDb(`
            INSERT INTO shares (
              certificate_number, shareholder_id, share_class_id, number_of_shares,
              issue_price_per_share, total_amount_paid, currency, issue_date, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'issued', $8)
          `, [
            certNum,
            shareholderId,
            shareClassId,
            sharesAllocated,
            SHARE_NOMINAL_PRICE,
            amount,
            currency,
            roundName,
          ]);
        }

        await queryDb(`
          UPDATE shareholders
          SET total_invested = COALESCE(total_invested, 0) + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [amount, shareholderId]);

        const capSummary = await recalculateCapTable();

        const updatedSh = await queryDb('SELECT share_percentage FROM shareholders WHERE id = $1', [shareholderId]);
        const newPct = Number(updatedSh.rows[0]?.share_percentage || 0);
        await queryDb('UPDATE investments SET share_percentage = $1 WHERE id = $2', [newPct, invRes.rows[0].id]);

        await queryDb('COMMIT');
        return NextResponse.json({
          success: true,
          message: `Profit of ${amount} ${currency} reinvested into equity for ${shareholder.name}. New share equity: ${newPct}%.`,
          investment: { ...invRes.rows[0], share_percentage: newPct },
          capSummary,
        });
      }
    } catch (err: any) {
      await queryDb('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    console.error('Dividend distribute POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
