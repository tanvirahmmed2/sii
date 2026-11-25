'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiCalendar,
  BiRefresh,
  BiCheckCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiX,
  BiTrendingUp,
  BiTrendingDown,
  BiDollarCircle,
  BiSearch,
  BiAward,
  BiMoneyWithdraw,
  BiReceipt,
  BiPieChartAlt2,
  BiCertification,
} from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function MonthlyAccountingPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [currentMonthSummary, setCurrentMonthSummary] = useState<any>({});
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [details, setDetails] = useState<any>({ sales: [], investments: [], expenses: [], dividends: [] });
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'distribution' | 'history' | 'breakdown'>('distribution');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [distModalTarget, setDistModalTarget] = useState<any>(null);
  const [distAction, setDistAction] = useState<'payout' | 'reinvest'>('payout');
  const [distAmount, setDistAmount] = useState<string>('');
  const [distMethod, setDistMethod] = useState<string>('bank_transfer');
  const [distNotes, setDistNotes] = useState<string>('');
  const [distributing, setDistributing] = useState<boolean>(false);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/marketing/developer/monthly-accounting?month=${encodeURIComponent(selectedMonth)}`);
      const data = await res.json();
      if (data.success) {
        setCurrentMonthSummary(data.currentMonthSummary || {});
        setMonthlySummaries(data.monthlySummaries || []);
        setAllocations(data.shareholderProfitAllocations || []);
        setDetails(data.details || { sales: [], investments: [], expenses: [], dividends: [] });
        setBalances(data.balances || []);
      } else {
        setErrorMessage(data.error || 'Failed to load monthly accounting data.');
      }
    } catch {
      setErrorMessage('Network error loading monthly accounting.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth]);

  const openDistributeModal = (shareholder: any, initialAction: 'payout' | 'reinvest') => {
    setDistModalTarget(shareholder);
    setDistAction(initialAction);
    const defaultAmt = shareholder.remaining_entitlement > 0 ? shareholder.remaining_entitlement : '';
    setDistAmount(String(defaultAmt));
    setDistMethod(shareholder.payout_method || 'bank_transfer');
    setDistNotes(
      initialAction === 'reinvest'
        ? `Profit reinvestment for ${selectedMonth} into company shares`
        : `Monthly profit dividend payout for ${selectedMonth}`
    );
  };

  const handleConfirmDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distModalTarget || !distAmount || Number(distAmount) <= 0) {
      setErrorMessage('Please enter a positive profit distribution amount.');
      return;
    }

    setDistributing(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/developer/dividends/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareholder_id: distModalTarget.id,
          period: selectedMonth,
          amount: Number(distAmount),
          action: distAction,
          currency: 'BDT',
          method: distMethod,
          notes: distNotes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message || 'Profit distribution executed.');
        setDistModalTarget(null);
        fetchMonthlyData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to distribute profit.');
      }
    } catch {
      setErrorMessage('Network error processing profit distribution.');
    } finally {
      setDistributing(false);
    }
  };

  const filteredAllocations = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return allocations;
    return allocations.filter((s) => {
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.role_title || '').toLowerCase().includes(q)
      );
    });
  }, [allocations, searchTerm]);

  const filteredHistory = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return monthlySummaries;
    return monthlySummaries.filter((m) => (m.month || '').toLowerCase().includes(q));
  }, [monthlySummaries, searchTerm]);

  const bdtBal = balances.find((b) => b.currency === 'BDT');

  return (
    <div className="w-full space-y-6 text-xs text-slate-800 dark:text-slate-200">
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BiCheckCircle className="text-base" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BiInfoCircle className="text-base" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Monthly Financial Accounting &amp; Profit Sharing
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
              {selectedMonth} Statement
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Segregated monthly tracking of package sales, investments, expenses, net operating profit, and dividend payouts or equity reinvestments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <BiCalendar className="text-base text-secondary" />
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={fetchMonthlyData}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <BiRefresh className="text-base" />
            <span>Refresh</span>
          </button>

          <Link
            href="/developer/expenses"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5"
          >
            <BiReceipt className="text-base" />
            <span>Expenses</span>
          </Link>

          <Link
            href="/developer/investments"
            className="px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5"
          >
            <BiAward className="text-base" />
            <span>Investments</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Monthly Sales ({selectedMonth})</span>
            <BiTrendingUp className="text-base text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            ৳{Number(currentMonthSummary.total_sales || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Paid Orders:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{currentMonthSummary.sales_count || 0}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Monthly Expenses</span>
            <BiTrendingDown className="text-base text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            ৳{Number(currentMonthSummary.total_expenses || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Salaries: ৳{Number(currentMonthSummary.salary_expenses || 0).toLocaleString()}</span>
            <span>Other: ৳{Number(currentMonthSummary.custom_expenses || 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Monthly Investments</span>
            <BiPieChartAlt2 className="text-base text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            ৳{Number(currentMonthSummary.external_investments || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Reinvested Profit:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ৳{Number(currentMonthSummary.reinvested_dividends || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Net Operating Profit</span>
            <BiDollarCircle className="text-base text-secondary" />
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${
            Number(currentMonthSummary.net_operating_profit || 0) >= 0
              ? 'text-slate-900 dark:text-white'
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            ৳{Number(currentMonthSummary.net_operating_profit || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Undistributed Pool:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              ৳{Number(currentMonthSummary.distributable_remaining || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Platform Cash Balance</span>
            <BiDollarCircle className="text-base text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            ৳{Number(bdtBal?.available_balance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Paid Dividends ({selectedMonth}):</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ৳{Number(currentMonthSummary.dividends_paid || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('distribution')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'distribution'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Profit Distribution &amp; Reinvestment ({allocations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All-Months Segregated Ledger ({monthlySummaries.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('breakdown')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'breakdown'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {selectedMonth} Transaction Breakdown
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-full md:w-80">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Search Financial Records
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
              />
              <BiSearch className="absolute left-3 top-2.5 text-base text-slate-400 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <BiX className="text-base" />
                </button>
              )}
            </div>
          </div>

          <div className="text-slate-400 font-medium">
            Active Fiscal Month: <strong className="text-slate-700 dark:text-slate-200">{selectedMonth}</strong>
          </div>
        </div>

        {loading ? (
          <LoadingScreen fullScreen={false} label="Computing monthly accounting statements..." />
        ) : activeTab === 'distribution' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Shareholder</th>
                  <th className="py-3 px-3 text-right">Equity %</th>
                  <th className="py-3 px-3 text-right">Invested Capital</th>
                  <th className="py-3 px-3 text-right">Month Profit Share</th>
                  <th className="py-3 px-3 text-right">Paid Cash ({selectedMonth})</th>
                  <th className="py-3 px-3 text-right">Reinvested ({selectedMonth})</th>
                  <th className="py-3 px-3 text-right">Remaining Profit</th>
                  <th className="py-3 px-3 text-right">Distribution Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredAllocations.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-400">{s.role_title}</div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-secondary">
                      {Number(s.share_percentage || 0).toFixed(3)}%
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      ৳{Number(s.total_invested || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳{Number(s.share_of_month_profit || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                      ৳{Number(s.paid_this_month || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                      ৳{Number(s.reinvested_this_month || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ৳{Number(s.remaining_entitlement || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDistributeModal(s, 'payout')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                        >
                          <BiMoneyWithdraw className="text-xs" />
                          <span>Payout Cash</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openDistributeModal(s, 'reinvest')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                        >
                          <BiCertification className="text-xs" />
                          <span>Reinvest Equity</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'history' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Calendar Month</th>
                  <th className="py-3 px-3 text-right">Total Sales</th>
                  <th className="py-3 px-3 text-right">Capital Invested</th>
                  <th className="py-3 px-3 text-right">Reinvested Profits</th>
                  <th className="py-3 px-3 text-right">Total Expenses</th>
                  <th className="py-3 px-3 text-right">Net Operating Profit</th>
                  <th className="py-3 px-3 text-right">Dividends Paid</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredHistory.map((m) => (
                  <tr key={m.month} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${m.month === selectedMonth ? 'bg-secondary/5' : ''}`}>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {m.month}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{Number(m.total_sales || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                      ৳{Number(m.external_investments || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      ৳{Number(m.reinvested_dividends || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      ৳{Number(m.total_expenses || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      ৳{Number(m.net_operating_profit || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                      ৳{Number(m.dividends_paid || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonth(m.month);
                          setActiveTab('breakdown');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Sales Revenue ({selectedMonth}) &middot; {details.sales.length} Settled Invoices
              </h3>
              {details.sales.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-xs">No package sales recorded in {selectedMonth}.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Creator / Plan</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {details.sales.map((s: any) => (
                        <tr key={s.id}>
                          <td className="py-2 px-3 font-mono text-slate-500">{new Date(s.settled_at).toLocaleDateString()}</td>
                          <td className="py-2 px-3 font-semibold">{s.creator_name || 'Creator'} &middot; {s.package_name || 'Package'}</td>
                          <td className="py-2 px-3 uppercase text-[10px] font-bold">{s.payment_method}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">+৳{Number(s.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Operating Expenses ({selectedMonth}) &middot; {details.expenses.length} Transactions
              </h3>
              {details.expenses.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-xs">No expense transactions recorded in {selectedMonth}.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Expense Title &amp; Category</th>
                        <th className="py-2.5 px-3">Payee</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {details.expenses.map((ex: any) => (
                        <tr key={ex.id}>
                          <td className="py-2 px-3 font-mono text-slate-500">{new Date(ex.transaction_date).toLocaleDateString()}</td>
                          <td className="py-2 px-3 font-semibold">{ex.expense_title} ({ex.expense_category})</td>
                          <td className="py-2 px-3">{ex.payee_name}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">-৳{Number(ex.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Investments &amp; Equity Additions ({selectedMonth}) &middot; {details.investments.length} Entries
              </h3>
              {details.investments.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-xs">No capital investments recorded in {selectedMonth}.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Shareholder &amp; Round</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {details.investments.map((inv: any) => (
                        <tr key={inv.id}>
                          <td className="py-2 px-3 font-mono text-slate-500">{new Date(inv.investment_date).toLocaleDateString()}</td>
                          <td className="py-2 px-3 font-semibold">{inv.shareholder_name} &middot; {inv.round_name}</td>
                          <td className="py-2 px-3 uppercase text-[10px] font-bold">
                            {inv.is_dividend_reinvestment ? 'Dividend Reinvestment' : inv.payment_method}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-600">+৳{Number(inv.investment_amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {distModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Profit Distribution for {distModalTarget.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Fiscal Month: {selectedMonth} &middot; Equity Share: {distModalTarget.share_percentage}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDistModalTarget(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleConfirmDistribution} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Distribution Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDistAction('payout');
                      setDistNotes(`Monthly profit dividend payout for ${selectedMonth}`);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      distAction === 'payout'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Disburse Cash Payout
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDistAction('reinvest');
                      setDistNotes(`Profit reinvestment for ${selectedMonth} into company shares`);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      distAction === 'reinvest'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Reinvest into Equity
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Month Profit Entitlement:</span>
                  <span className="font-mono font-bold">৳{Number(distModalTarget.share_of_month_profit || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Settled ({selectedMonth}):</span>
                  <span className="font-mono">৳{Number(distModalTarget.settled_this_month || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Remaining Available:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ৳{Number(distModalTarget.remaining_entitlement || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Distribution Amount (BDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={distAmount}
                  onChange={(e) => setDistAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-bold text-base"
                />
              </div>

              {distAction === 'payout' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Payout Channel
                  </label>
                  <select
                    value={distMethod}
                    onChange={(e) => setDistMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={distNotes}
                  onChange={(e) => setDistNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDistModalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={distributing}
                  className={`px-5 py-2 rounded-xl text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                    distAction === 'reinvest' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {distributing && <BiLoaderAlt className="animate-spin text-base" />}
                  <span>{distAction === 'reinvest' ? 'Reinvest & Update Shares' : 'Confirm Cash Payout'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
