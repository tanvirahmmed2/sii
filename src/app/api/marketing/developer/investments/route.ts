import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { recalculateCapTable, SHARE_NOMINAL_PRICE } from 'src/lib/equity/capTableEngine';
import { generateToken } from 'src/lib/utils/random';

const PERMISSIONS = ['investments', 'shareholders', 'cashflow', 'roles'];

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const shareholderId = searchParams.get('shareholder_id');

    let invQuery = `
      SELECT i.*,
             s.name AS shareholder_name,
             s.email AS shareholder_email,
             s.shareholder_code,
             sc.class_name,
             sc.class_code
      FROM investments i
      JOIN shareholders s ON i.shareholder_id = s.id
      LEFT JOIN share_classes sc ON i.share_class_id = sc.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (shareholderId && shareholderId !== 'ALL') {
      invQuery += ` AND i.shareholder_id = $${idx++}`;
      params.push(Number(shareholderId));
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      invQuery += ` AND TO_CHAR(i.investment_date, 'YYYY-MM') = $${idx++}`;
      params.push(month);
    }

    invQuery += ` ORDER BY i.investment_date DESC, i.id DESC LIMIT 200`;

    const [invRes, shRes, scRes, sharesRes, transfersRes, balRes] = await Promise.all([
      queryDb(invQuery, params),
      queryDb(`SELECT * FROM shareholders ORDER BY share_percentage DESC, id ASC`),
      queryDb(`SELECT * FROM share_classes ORDER BY id ASC`),
      queryDb(`
        SELECT sh.*,
               s.name AS shareholder_name,
               sc.class_name,
               sc.class_code
        FROM shares sh
        JOIN shareholders s ON sh.shareholder_id = s.id
        JOIN share_classes sc ON sh.share_class_id = sc.id
        ORDER BY sh.issue_date DESC, sh.id DESC
        LIMIT 200
      `),
      queryDb(`
        SELECT st.*,
               f.name AS from_shareholder_name,
               t.name AS to_shareholder_name,
               sc.class_code
        FROM share_transfers st
        JOIN shareholders f ON st.from_shareholder_id = f.id
        JOIN shareholders t ON st.to_shareholder_id = t.id
        JOIN share_classes sc ON st.share_class_id = sc.id
        ORDER BY st.transfer_date DESC, st.id DESC
        LIMIT 200
      `),
      queryDb(`SELECT * FROM platform_balances ORDER BY currency ASC`),
    ]);

    const investments = invRes.rows || [];
    const totalExternalCapital = investments
      .filter((inv: any) => !inv.is_dividend_reinvestment && inv.status !== 'cancelled')
      .reduce((acc: number, inv: any) => acc + Number(inv.investment_amount || 0), 0);
    const totalReinvestedDividends = investments
      .filter((inv: any) => inv.is_dividend_reinvestment && inv.status !== 'cancelled')
      .reduce((acc: number, inv: any) => acc + Number(inv.investment_amount || 0), 0);
    const totalCapTableInvested = (shRes.rows || []).reduce(
      (acc: number, s: any) => acc + Number(s.total_invested || 0),
      0
    );

    return NextResponse.json({
      success: true,
      investments,
      shareholders: shRes.rows || [],
      shareClasses: scRes.rows || [],
      shares: sharesRes.rows || [],
      transfers: transfersRes.rows || [],
      balances: balRes.rows || [],
      stats: {
        totalExternalCapital,
        totalReinvestedDividends,
        totalCapTableInvested,
        investmentCount: investments.length,
        shareholderCount: (shRes.rows || []).length,
      },
    });
  } catch (error: any) {
    console.error('Investments GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'create');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const devId = auth.developer?.id || auth.user?.id || null;
    const body = await request.json().catch(() => ({}));

    const shareholderId = Number(body.shareholder_id);
    const roundName = String(body.round_name || 'Capital Injection').trim();
    const amount = Number(body.investment_amount || 0);
    const currency = String(body.currency || 'BDT').toUpperCase();
    const investmentDate = body.investment_date || new Date().toISOString().split('T')[0];
    const paymentMethod = String(body.payment_method || 'bank_transfer').trim();
    const paymentReference = body.payment_reference ? String(body.payment_reference).trim() : null;
    const isDividendReinvestment = Boolean(body.is_dividend_reinvestment);
    const valuationPreMoney = Number(body.valuation_pre_money || 0);
    const valuationPostMoney = Number(body.valuation_post_money || 0);
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!shareholderId || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Shareholder and positive investment amount are required.' }, { status: 400 });
    }

    const shRes = await queryDb('SELECT * FROM shareholders WHERE id = $1 LIMIT 1', [shareholderId]);
    if (shRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Shareholder not found.' }, { status: 404 });
    }
    const shareholder = shRes.rows[0];

    let shareClassId = body.share_class_id ? Number(body.share_class_id) : null;
    if (!shareClassId) {
      const scRes = await queryDb("SELECT id FROM share_classes WHERE class_code = 'ORD-A' LIMIT 1");
      if (scRes.rows.length > 0) shareClassId = Number(scRes.rows[0].id);
    }

    const sharesAllocated = Math.max(1, Math.round(amount / SHARE_NOMINAL_PRICE));

    await queryDb('BEGIN');
    try {
      let cashflowId: number | null = null;

      if (!isDividendReinvestment) {
        const balRes = await queryDb('SELECT available_balance FROM platform_balances WHERE currency = $1 LIMIT 1', [currency]);
        const currentBal = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;
        const newBal = currentBal + amount;

        await queryDb(`
          INSERT INTO platform_balances (currency, total_revenue, available_balance, pending_balance, total_withdrawn)
          VALUES ($1, 0.00, $2, 0.00, 0.00)
          ON CONFLICT (currency) DO UPDATE 
          SET available_balance = platform_balances.available_balance + $3,
              updated_at = CURRENT_TIMESTAMP
        `, [currency, newBal, amount]);

        const cfRes = await queryDb(`
          INSERT INTO cashflows (
            title, category, flow_type, amount, currency, balance_after,
            reference_type, reference_id, developer_id, payment_method, metadata
          ) VALUES ($1, 'investment', 'inflow', $2, $3, $4, 'investment', $5, $6, $7, $8)
          RETURNING id
        `, [
          `Capital Investment: ${shareholder.name} (${roundName})`,
          amount,
          currency,
          newBal,
          shareholderId,
          devId,
          paymentMethod,
          JSON.stringify({ round_name: roundName, reference: paymentReference }),
        ]);

        cashflowId = Number(cfRes.rows[0].id);
      }

      const invRes = await queryDb(`
        INSERT INTO investments (
          round_name, shareholder_id, share_class_id, investment_amount, currency,
          valuation_pre_money, valuation_post_money, shares_allocated,
          investment_date, payment_method, payment_reference, cashflow_id,
          is_dividend_reinvestment, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'completed', $14)
        RETURNING *
      `, [
        roundName,
        shareholderId,
        shareClassId,
        amount,
        currency,
        valuationPreMoney,
        valuationPostMoney,
        sharesAllocated,
        investmentDate,
        paymentMethod,
        paymentReference,
        cashflowId,
        isDividendReinvestment,
        notes,
      ]);

      const investment = invRes.rows[0];

      if (shareClassId) {
        const certNumber = `CERT-${new Date().getFullYear()}-${generateToken(6).toUpperCase()}`;
        await queryDb(`
          INSERT INTO shares (
            certificate_number, shareholder_id, share_class_id, number_of_shares,
            issue_price_per_share, total_amount_paid, currency, issue_date, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'issued', $9)
        `, [
          certNumber,
          shareholderId,
          shareClassId,
          sharesAllocated,
          SHARE_NOMINAL_PRICE,
          amount,
          currency,
          investmentDate,
          `Issued under ${roundName}`,
        ]);
      }

      await queryDb(`
        UPDATE shareholders
        SET total_invested = COALESCE(total_invested, 0) + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [amount, shareholderId]);

      const capSummary = await recalculateCapTable();

      const updatedShRes = await queryDb('SELECT share_percentage FROM shareholders WHERE id = $1', [shareholderId]);
      const finalPct = Number(updatedShRes.rows[0]?.share_percentage || 0);
      await queryDb('UPDATE investments SET share_percentage = $1 WHERE id = $2', [finalPct, investment.id]);

      await queryDb('COMMIT');
      return NextResponse.json({
        success: true,
        message: `Investment of ${amount} ${currency} recorded for ${shareholder.name}. Cap table equity dynamically updated.`,
        investment: { ...investment, share_percentage: finalPct },
        capSummary,
      }, { status: 201 });
    } catch (err: any) {
      await queryDb('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    console.error('Investments POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
