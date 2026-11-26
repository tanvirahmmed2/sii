'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FiCalendar as CalendarRange,
  FiSearch as Search,
  FiRefreshCw as RefreshCw,
  FiCheckCircle as CheckCircle2,
  FiXCircle as XCircle,
  FiTrendingUp as TrendingUp,
  FiTrendingDown as TrendingDown,
  FiPieChart as PieChart,
  FiSend as Send,
  FiX as X,
  FiArrowUpRight as ArrowUpRight,
  FiDollarSign as Coins
} from 'react-icons/fi';

interface MonthSummary {
  month: string;
  total_sales: number;
  sales_count: number;
  total_expenses: number;
  salary_expenses: number;
  custom_expenses: number;
  external_investments: number;
  reinvested_dividends: number;
  net_operating_profit: number;
  distributable_remaining: number;
  dividends_paid: number;
}

interface ShareholderAllocation {
  id?: number;
  shareholder_id?: number;
  name: string;
  email: string | null;
  share_percentage: number;
  invested_amount?: number;
  total_invested?: number;
  allocated_profit?: number;
  share_of_month_profit?: number;
  paid_or_reinvested?: number;
  settled_this_month?: number;
  remaining_allocation?: number;
  remaining_entitlement?: number;
}

interface AccountingSale {
  id: number;
  package_name?: string;
  creator_email?: string;
  amount: number | string;
  currency: string;
  payment_method?: string;
  status: string;
  created_at: string;
}

interface AccountingInvestment {
  id: number;
  shareholder_name?: string;
  amount: number | string;
  currency: string;
  investment_type?: string;
  created_at: string;
}

interface AccountingExpense {
  id: number;
  title: string;
  category: string;
  amount: number | string;
  currency: string;
  status: string;
  expense_date?: string;
  created_at?: string;
}

interface AccountingDividend {
  id: number;
  shareholder_name?: string;
  period?: string;
  amount: number | string;
  currency: string;
  action: string;
  method?: string;
  created_at: string;
}

const FINANCE_TABS = [
  { label: 'Shareholders', href: '/developer/shareholders' },
  { label: 'Investments', href: '/developer/investments' },
  { label: 'Expenses', href: '/developer/expenses' },
  { label: 'Accounting', href: '/developer/monthly-accounting' },
  { label: 'Withdrawals', href: '/developer/withdraws' },
  { label: 'Cashflow', href: '/developer/cashflow' }
];

export default function MonthlyAccountingPage() {
  const currentMonthDefault = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthDefault);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthSummary[]>([]);
  const [allocations, setAllocations] = useState<ShareholderAllocation[]>([]);
  const [sales, setSales] = useState<AccountingSale[]>([]);
  const [investments, setInvestments] = useState<AccountingInvestment[]>([]);
  const [expenses, setExpenses] = useState<AccountingExpense[]>([]);
  const [dividends, setDividends] = useState<AccountingDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'allocations' | 'history' | 'sales' | 'expenses' | 'investments' | 'dividends'
  >('allocations');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [distributingShareholder, setDistributingShareholder] =
    useState<ShareholderAllocation | null>(null);
  const [distributeAmount, setDistributeAmount] = useState('');
  const [distributeAction, setDistributeAction] = useState<'payout' | 'reinvest'>('payout');
  const [distributeMethod, setDistributeMethod] = useState('bank_transfer');
  const [distributeNotes, setDistributeNotes] = useState('');
  const [submittingDistribute, setSubmittingDistribute] = useState(false);

  const fetchAccounting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/marketing/developer/monthly-accounting?month=${encodeURIComponent(selectedMonth)}`
      );
      const data = await res.json();
      if (data.success) {
        setSummary(data.currentMonthSummary || null);
        setMonthlyHistory(data.monthlySummaries || []);
        setAllocations(data.shareholderProfitAllocations || []);
        setSales(data.details?.sales || []);
        setInvestments(data.details?.investments || []);
        setExpenses(data.details?.expenses || []);
        setDividends(data.details?.dividends || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load monthly accounting.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error fetching monthly accounting.' });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchAccounting();
  }, [fetchAccounting]);

  const openDistributePanel = (alloc: ShareholderAllocation) => {
    setDistributingShareholder(alloc);
    const rem = alloc.remaining_allocation ?? alloc.remaining_entitlement ?? 0;
    setDistributeAmount(String(Math.max(0, Math.round(Number(rem)))));
    setDistributeAction('payout');
    setDistributeMethod('bank_transfer');
    setDistributeNotes('');
  };

  const handleDistributeProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributingShareholder) return;
    setMessage(null);
    const parsedAmount = Number(distributeAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setMessage({ type: 'error', text: 'Distribution amount must be positive.' });
      return;
    }

    setSubmittingDistribute(true);
    try {
      const res = await fetch('/api/marketing/developer/dividends/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareholder_id: distributingShareholder.shareholder_id ?? distributingShareholder.id,
          period: selectedMonth,
          amount: parsedAmount,
          action: distributeAction,
          currency: 'BDT',
          method: distributeAction === 'reinvest' ? 'equity_reinvestment' : distributeMethod,
          notes: distributeNotes.trim() || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text:
            distributeAction === 'reinvest'
              ? 'Profit reinvested into shareholder equity and shares recalculated.'
              : 'Profit payout recorded successfully.'
        });
        setDistributingShareholder(null);
        fetchAccounting();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to distribute profit.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error processing profit distribution.' });
    } finally {
      setSubmittingDistribute(false);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredAllocations = allocations.filter(
    (a) =>
      !q ||
      a.name.toLowerCase().includes(q) ||
      (a.email && a.email.toLowerCase().includes(q))
  );
  const filteredHistory = monthlyHistory.filter((h) => !q || h.month.toLowerCase().includes(q));
  const filteredSales = sales.filter(
    (s) =>
      !q ||
      (s.package_name && s.package_name.toLowerCase().includes(q)) ||
      (s.creator_email && s.creator_email.toLowerCase().includes(q)) ||
      String(s.status || '').toLowerCase().includes(q)
  );
  const filteredExpenses = expenses.filter(
    (ex: any) =>
      !q ||
      String(ex.title || ex.expense_title || '').toLowerCase().includes(q) ||
      String(ex.category || ex.expense_category || '').toLowerCase().includes(q) ||
      String(ex.status || '').toLowerCase().includes(q)
  );
  const filteredInvestments = investments.filter(
    (inv) =>
      !q ||
      (inv.shareholder_name && inv.shareholder_name.toLowerCase().includes(q)) ||
      (inv.investment_type && inv.investment_type.toLowerCase().includes(q))
  );
  const filteredDividends = dividends.filter(
    (div: any) =>
      !q ||
      (div.shareholder_name && div.shareholder_name.toLowerCase().includes(q)) ||
      String(div.action || div.withdraw_type || '').toLowerCase().includes(q)
  );

  return (
    <div className="w-full space-y-4 text-xs text-slate-800 dark:text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
              Monthly Financial Statements & Profit Allocation
            </h1>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
              Track monthly sales, salaries, custom expenses, investments, and shareholder profit sharing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="accountingMonthPicker"
              className="text-[11px] font-medium text-slate-500 uppercase tracking-wider"
            >
              Month
            </label>
            <input
              id="accountingMonthPicker"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={fetchAccounting}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        {FINANCE_TABS.map((tab) => {
          const isActive = tab.href === '/developer/monthly-accounting';
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {message && (
        <div
          className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded border text-xs font-normal ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Package Sales</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-medium text-emerald-700 dark:text-emerald-400">
            BDT {Number(summary?.total_sales || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            {summary?.sales_count || 0} completed orders
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Total Expenses</span>
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-lg font-medium text-red-700 dark:text-red-400">
            BDT {Number(summary?.total_expenses || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Salary: {Number(summary?.salary_expenses || 0).toLocaleString()} | Custom:{' '}
            {Number(summary?.custom_expenses || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">External Investments</span>
            <Coins className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            BDT {Number(summary?.external_investments || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Reinvested: BDT {Number(summary?.reinvested_dividends || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Net Operating Profit</span>
            <PieChart className="w-3.5 h-3.5" />
          </div>
          <div
            className={`text-lg font-medium ${
              Number(summary?.net_operating_profit || 0) >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            BDT {Number(summary?.net_operating_profit || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Sales minus operating expenses
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Distributable Remaining</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            BDT {Number(summary?.distributable_remaining || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Distributed: BDT {Number(summary?.dividends_paid || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {distributingShareholder && (
        <form
          onSubmit={handleDistributeProfit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Distribute Profit for {distributingShareholder.name} ({selectedMonth})
              </h2>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                Equity Share: {Number(distributingShareholder.share_percentage).toFixed(2)}% | Remaining Pool: BDT{' '}
                {Number(distributingShareholder.remaining_allocation ?? distributingShareholder.remaining_entitlement ?? 0).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDistributingShareholder(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Distribution Mode
              </label>
              <select
                value={distributeAction}
                onChange={(e) => setDistributeAction(e.target.value as 'payout' | 'reinvest')}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                <option value="payout">Cash Payout (Outflow)</option>
                <option value="reinvest">Reinvest into Equity (Adjust Shares)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Amount (BDT)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={distributeAmount}
                onChange={(e) => setDistributeAmount(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            {distributeAction === 'payout' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Payout Method
                </label>
                <select
                  value={distributeMethod}
                  onChange={(e) => setDistributeMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            )}

            <div className={distributeAction === 'reinvest' ? 'sm:col-span-2' : ''}>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Notes
              </label>
              <input
                type="text"
                value={distributeNotes}
                onChange={(e) => setDistributeNotes(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDistributingShareholder(null)}
              className="px-3.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingDistribute}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {submittingDistribute
                ? 'Processing...'
                : distributeAction === 'reinvest'
                ? 'Reinvest into Capital'
                : 'Confirm Payout'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="w-full lg:max-w-md">
            <label
              htmlFor="accountingSearch"
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Search Financial Records
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="accountingSearch"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'allocations', label: `Profit Share (${filteredAllocations.length})` },
                { id: 'history', label: `Monthly History (${filteredHistory.length})` },
                { id: 'sales', label: `Sales (${filteredSales.length})` },
                { id: 'expenses', label: `Expenses (${filteredExpenses.length})` },
                { id: 'investments', label: `Investments (${filteredInvestments.length})` },
                { id: 'dividends', label: `Distributions (${filteredDividends.length})` }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-2">
          {activeTab === 'allocations' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Shareholder</th>
                  <th className="py-2.5 px-3 text-right">Share %</th>
                  <th className="py-2.5 px-3 text-right">Capital Invested</th>
                  <th className="py-2.5 px-3 text-right">Allocated Profit</th>
                  <th className="py-2.5 px-3 text-right">Paid / Reinvested</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-normal">
                      Calculating profit allocations...
                    </td>
                  </tr>
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-normal">
                      No shareholder allocations found.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((alloc, idx) => (
                    <tr
                      key={`alloc-${alloc.shareholder_id ?? alloc.id ?? idx}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {alloc.name}
                        </div>
                        <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                          {alloc.email || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white">
                        {Number(alloc.share_percentage || 0).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-normal text-slate-600 dark:text-slate-300">
                        BDT {Number(alloc.invested_amount ?? alloc.total_invested ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                        BDT {Number(alloc.allocated_profit ?? alloc.share_of_month_profit ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-normal text-slate-600 dark:text-slate-300">
                        BDT {Number(alloc.paid_or_reinvested ?? alloc.settled_this_month ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white">
                        BDT {Number(alloc.remaining_allocation ?? alloc.remaining_entitlement ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDistributePanel(alloc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          Distribute
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'history' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-right">Sales</th>
                  <th className="py-2.5 px-3 text-right">Expenses</th>
                  <th className="py-2.5 px-3 text-right">Investments</th>
                  <th className="py-2.5 px-3 text-right">Net Profit</th>
                  <th className="py-2.5 px-3 text-right">Dividends Paid</th>
                  <th className="py-2.5 px-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-normal">
                      No monthly summaries available.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((m, idx) => (
                    <tr
                      key={`hist-${m.month ?? idx}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {m.month}
                      </td>
                      <td className="py-2.5 px-3 text-right font-normal text-emerald-700 dark:text-emerald-400">
                        BDT {Number(m.total_sales || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-normal text-red-700 dark:text-red-400">
                        BDT {Number(m.total_expenses || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-normal text-slate-600 dark:text-slate-300">
                        BDT {Number(m.external_investments || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white">
                        BDT {Number(m.net_operating_profit || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-normal text-slate-600 dark:text-slate-300">
                        BDT {Number(m.dividends_paid || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedMonth(m.month)}
                          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'sales' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Package</th>
                  <th className="py-2.5 px-3">Creator</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-normal">
                      No package sales recorded for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s: any, idx) => (
                    <tr
                      key={`sale-${s.id ?? idx}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-400">
                        {new Date(s.created_at || s.settled_at || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {s.package_name || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-300">
                        {s.creator_email || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-300 uppercase">
                        {s.payment_method || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                        {s.currency || 'BDT'} {Number(s.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium capitalize">
                          {s.status || 'completed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'expenses' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-normal">
                      No expenses recorded for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((ex: any, idx) => (
                    <tr
                      key={`exp-${ex.id ?? idx}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-400">
                        {ex.expense_date || ex.transaction_date || ex.created_at
                          ? new Date(ex.expense_date || ex.transaction_date || ex.created_at || '').toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {ex.title || ex.expense_title || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-300 capitalize">
                        {ex.category || ex.expense_category || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-red-700 dark:text-red-400">
                        {ex.currency || 'BDT'} {Number(ex.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-normal capitalize">
                          {ex.status || 'recorded'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'investments' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Shareholder</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredInvestments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 font-normal">
                      No capital investments recorded for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  filteredInvestments.map((inv: any, idx) => (
                    <tr
                      key={`inv-${inv.id ?? idx}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-400">
                        {new Date(inv.investment_date || inv.created_at || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {inv.shareholder_name || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-300 capitalize">
                        {(inv.investment_type || 'capital_injection').replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                        {inv.currency || 'BDT'} {Number(inv.amount ?? inv.investment_amount ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'dividends' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Shareholder</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredDividends.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-normal">
                      No profit distributions recorded for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  filteredDividends.map((div: any, idx) => (
                    <tr
                      key={`div-${div.id ?? idx}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-400">
                        {new Date(div.created_at || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {div.shareholder_name || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-medium capitalize">
                          {div.action || div.withdraw_type || 'dividend'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-300 capitalize">
                        {(div.method || '-').replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white">
                        {div.currency || 'BDT'} {Number(div.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
