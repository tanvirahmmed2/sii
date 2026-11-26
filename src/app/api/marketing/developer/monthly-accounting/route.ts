import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

const PERMISSIONS = ['monthly-accounting', 'cashflow', 'shareholders', 'investments', 'expenses'];

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const defaultMonth = new Date().toISOString().slice(0, 7);
    const monthParam = searchParams.get('month') || defaultMonth;
    const targetMonth = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : defaultMonth;

    const [
      salesMonthsRes,
      investmentsMonthsRes,
      expensesMonthsRes,
      dividendsMonthsRes,
      monthSalesRes,
      monthInvestmentsRes,
      monthExpensesRes,
      monthDividendsRes,
      shareholdersRes,
      balancesRes,
    ] = await Promise.all([
      queryDb(`
        SELECT TO_CHAR(COALESCE(payment_date, created_at), 'YYYY-MM') AS month_key,
               COALESCE(SUM(amount), 0)::numeric(15,2) AS total_sales,
               COUNT(*)::int AS sales_count
        FROM payments
        WHERE LOWER(status) IN ('successful', 'completed', 'paid')
        GROUP BY month_key
      `),
      queryDb(`
        SELECT TO_CHAR(investment_date, 'YYYY-MM') AS month_key,
               COALESCE(SUM(CASE WHEN is_dividend_reinvestment = false THEN investment_amount ELSE 0 END), 0)::numeric(15,2) AS external_investments,
               COALESCE(SUM(CASE WHEN is_dividend_reinvestment = true THEN investment_amount ELSE 0 END), 0)::numeric(15,2) AS reinvested_dividends,
               COUNT(*)::int AS investments_count
        FROM investments
        WHERE status != 'cancelled'
        GROUP BY month_key
      `),
      queryDb(`
        SELECT TO_CHAR(et.transaction_date, 'YYYY-MM') AS month_key,
               COALESCE(SUM(et.amount), 0)::numeric(15,2) AS total_expenses,
               COALESCE(SUM(CASE WHEN e.category = 'salary' THEN et.amount ELSE 0 END), 0)::numeric(15,2) AS salary_expenses,
               COALESCE(SUM(CASE WHEN e.category != 'salary' THEN et.amount ELSE 0 END), 0)::numeric(15,2) AS custom_expenses,
               COUNT(*)::int AS expenses_count
        FROM expense_transactions et
        JOIN expenses e ON et.expense_id = e.id
        GROUP BY month_key
      `),
      queryDb(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month_key,
               COALESCE(SUM(amount), 0)::numeric(15,2) AS dividends_paid
        FROM withdraws
        WHERE withdraw_type = 'dividend' AND status = 'processed'
        GROUP BY month_key
      `),
      queryDb(`
        SELECT pay.id, pay.transaction_id, pay.amount, pay.currency, pay.payment_method, pay.status,
               COALESCE(pay.payment_date, pay.created_at) AS created_at,
               COALESCE(pay.payment_date, pay.created_at) AS settled_at,
               c.name AS creator_name, c.email AS creator_email,
               pkg.name AS package_name
        FROM payments pay
        LEFT JOIN creators c ON pay.creator_id = c.id
        LEFT JOIN packages pkg ON pay.package_id = pkg.id
        WHERE LOWER(pay.status) IN ('successful', 'completed', 'paid')
          AND TO_CHAR(COALESCE(pay.payment_date, pay.created_at), 'YYYY-MM') = $1
        ORDER BY settled_at DESC
      `, [targetMonth]),
      queryDb(`
        SELECT i.*, COALESCE(i.investment_amount, 0) AS amount, s.name AS shareholder_name, s.shareholder_code
        FROM investments i
        JOIN shareholders s ON i.shareholder_id = s.id
        WHERE i.status != 'cancelled'
          AND TO_CHAR(i.investment_date, 'YYYY-MM') = $1
        ORDER BY i.investment_date DESC, i.id DESC
      `, [targetMonth]),
      queryDb(`
        SELECT et.*, e.title AS title, e.title AS expense_title, e.expense_code, e.category AS category, e.category AS expense_category, e.status AS status, e.payee_name
        FROM expense_transactions et
        JOIN expenses e ON et.expense_id = e.id
        WHERE TO_CHAR(et.transaction_date, 'YYYY-MM') = $1
        ORDER BY et.transaction_date DESC, et.id DESC
      `, [targetMonth]),
      queryDb(`
        SELECT w.*, s.name AS shareholder_name, s.share_percentage
        FROM withdraws w
        LEFT JOIN shareholders s ON w.shareholder_id = s.id
        WHERE w.withdraw_type = 'dividend'
          AND w.status = 'processed'
          AND TO_CHAR(w.created_at, 'YYYY-MM') = $1
        ORDER BY w.created_at DESC
      `, [targetMonth]),
      queryDb(`SELECT * FROM shareholders WHERE is_active = true ORDER BY share_percentage DESC, id ASC`),
      queryDb(`SELECT * FROM platform_balances ORDER BY currency ASC`),
    ]);

    const monthMap: Record<string, any> = {};
    const ensureMonth = (mk: string) => {
      if (!monthMap[mk]) {
        monthMap[mk] = {
          month: mk,
          total_sales: 0,
          sales_count: 0,
          external_investments: 0,
          reinvested_dividends: 0,
          investments_count: 0,
          total_expenses: 0,
          salary_expenses: 0,
          custom_expenses: 0,
          expenses_count: 0,
          dividends_paid: 0,
          net_operating_profit: 0,
        };
      }
      return monthMap[mk];
    };

    ensureMonth(targetMonth);

    (salesMonthsRes.rows || []).forEach((r: any) => {
      const m = ensureMonth(r.month_key);
      m.total_sales = Number(r.total_sales || 0);
      m.sales_count = Number(r.sales_count || 0);
    });

    (investmentsMonthsRes.rows || []).forEach((r: any) => {
      const m = ensureMonth(r.month_key);
      m.external_investments = Number(r.external_investments || 0);
      m.reinvested_dividends = Number(r.reinvested_dividends || 0);
      m.investments_count = Number(r.investments_count || 0);
    });

    (expensesMonthsRes.rows || []).forEach((r: any) => {
      const m = ensureMonth(r.month_key);
      m.total_expenses = Number(r.total_expenses || 0);
      m.salary_expenses = Number(r.salary_expenses || 0);
      m.custom_expenses = Number(r.custom_expenses || 0);
      m.expenses_count = Number(r.expenses_count || 0);
    });

    (dividendsMonthsRes.rows || []).forEach((r: any) => {
      const m = ensureMonth(r.month_key);
      m.dividends_paid = Number(r.dividends_paid || 0);
    });

    const monthlySummaries = Object.values(monthMap)
      .map((m: any) => ({
        ...m,
        net_operating_profit: Number((m.total_sales - m.total_expenses).toFixed(2)),
      }))
      .sort((a: any, b: any) => b.month.localeCompare(a.month));

    const currentMonthSummary = monthMap[targetMonth];
    const netProfit = Math.max(0, Number((currentMonthSummary.total_sales - currentMonthSummary.total_expenses).toFixed(2)));
    const totalDistributedMonth = currentMonthSummary.dividends_paid + currentMonthSummary.reinvested_dividends;
    const distributableRemaining = Math.max(0, Number((netProfit - totalDistributedMonth).toFixed(2)));

    const shareholderProfitAllocations = (shareholdersRes.rows || []).map((s: any) => {
      const sharePct = Number(s.share_percentage || 0);
      const totalShareOfProfit = Number(((netProfit * sharePct) / 100).toFixed(2));
      const paidThisMonth = (monthDividendsRes.rows || [])
        .filter((d: any) => Number(d.shareholder_id) === Number(s.id))
        .reduce((acc: number, d: any) => acc + Number(d.amount || 0), 0);
      const reinvestedThisMonth = (monthInvestmentsRes.rows || [])
        .filter((i: any) => Number(i.shareholder_id) === Number(s.id) && i.is_dividend_reinvestment)
        .reduce((acc: number, i: any) => acc + Number(i.investment_amount || 0), 0);
      const settledThisMonth = paidThisMonth + reinvestedThisMonth;
      const remainingEntitlement = Math.max(0, Number((totalShareOfProfit - settledThisMonth).toFixed(2)));

      return {
        ...s,
        shareholder_id: s.id,
        invested_amount: Number(s.total_invested ?? s.invested_amount ?? 0),
        allocated_profit: totalShareOfProfit,
        paid_or_reinvested: settledThisMonth,
        remaining_allocation: remainingEntitlement,
        share_of_month_profit: totalShareOfProfit,
        paid_this_month: paidThisMonth,
        reinvested_this_month: reinvestedThisMonth,
        settled_this_month: settledThisMonth,
        remaining_entitlement: remainingEntitlement,
      };
    });

    return NextResponse.json({
      success: true,
      selectedMonth: targetMonth,
      currentMonthSummary: {
        ...currentMonthSummary,
        net_operating_profit: Number((currentMonthSummary.total_sales - currentMonthSummary.total_expenses).toFixed(2)),
        distributable_remaining: distributableRemaining,
      },
      monthlySummaries,
      shareholderProfitAllocations,
      details: {
        sales: monthSalesRes.rows || [],
        investments: monthInvestmentsRes.rows || [],
        expenses: monthExpensesRes.rows || [],
        dividends: monthDividendsRes.rows || [],
      },
      balances: balancesRes.rows || [],
    });
  } catch (error: any) {
    console.error('Monthly accounting GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
