'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiTrendingUp,
  BiTrendingDown,
  BiDollarCircle,
  BiPlus,
  BiRefresh,
  BiFilter,
  BiInfoCircle,
  BiCheckCircle,
  BiLoaderAlt,
  BiX,
  BiMoneyWithdraw,
  BiSearch,
  BiAward,
} from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function DeveloperCashflowPage() {
  const [cashflows, setCashflows] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalInflow: 0,
    totalOutflow: 0,
    netCashflow: 0,
    totalTransactions: 0,
    currency: 'BDT',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterCurrency, setFilterCurrency] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formType, setFormType] = useState<'inflow' | 'outflow'>('inflow');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<string>('BDT');
  const [formCategory, setFormCategory] = useState<string>('adjustment');
  const [formNotes, setFormNotes] = useState<string>('');

  const fetchCashflowData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.set('flow_type', filterType);
      if (filterCategory !== 'ALL') params.set('category', filterCategory);
      if (filterCurrency !== 'ALL') params.set('currency', filterCurrency);

      const res = await fetch(`/api/marketing/developer/cashflow?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCashflows(data.records || []);
        setBalances(data.balances || []);
        if (data.stats) setStats(data.stats);
      } else {
        setErrorMessage(data.error || 'Failed to load cashflow records');
      }
    } catch {
      setErrorMessage('Network error loading cashflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashflowData();
  }, [filterType, filterCategory, filterCurrency]);

  const handleReconcile = async () => {
    try {
      setReconciling(true);
      const res = await fetch('/api/marketing/developer/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconcile' }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage('Platform balances successfully reconciled from ledger.');
        fetchCashflowData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to reconcile balance.');
      }
    } catch {
      setErrorMessage('Network error reconciling balances.');
    } finally {
      setReconciling(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formAmount || Number(formAmount) <= 0) {
      setErrorMessage('Please provide a valid title and positive amount.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/developer/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          flow_type: formType,
          amount: Number(formAmount),
          currency: formCurrency,
          category: formCategory,
          notes: formNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Cashflow ${formType} of ${formAmount} ${formCurrency} recorded.`);
        setShowModal(false);
        setFormTitle('');
        setFormAmount('');
        setFormNotes('');
        fetchCashflowData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to record entry.');
      }
    } catch {
      setErrorMessage('Network error recording cashflow.');
    } finally {
      setSubmitting(false);
    }
  };

  const bdtBal = balances.find((b) => b.currency === 'BDT');
  const usdBal = balances.find((b) => b.currency === 'USD');

  const filteredCashflows = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return cashflows;
    return cashflows.filter((cf) => {
      const titleMatch = (cf.title || '').toLowerCase().includes(q);
      const catMatch = (cf.category || '').toLowerCase().includes(q);
      const refMatch = String(cf.reference_id || '').toLowerCase().includes(q) || String(cf.reference_type || '').toLowerCase().includes(q);
      const creatorMatch = (cf.creator_name || '').toLowerCase().includes(q) || (cf.creator_email || '').toLowerCase().includes(q);
      const devMatch = (cf.developer_name || '').toLowerCase().includes(q) || (cf.developer_email || '').toLowerCase().includes(q);
      const notesMatch = (cf.notes || '').toLowerCase().includes(q);
      const methodMatch = (cf.payment_method || '').toLowerCase().includes(q);
      return titleMatch || catMatch || refMatch || creatorMatch || devMatch || notesMatch || methodMatch;
    });
  }, [cashflows, searchTerm]);

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
              Platform Cashflow &amp; Financial Ledger
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
              Live Balance
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time multi-currency income stream, package sales sync, manual approvals, and shareholder distributions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchCashflowData}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <BiRefresh className="text-base" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleReconcile}
            disabled={reconciling}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {reconciling ? <BiLoaderAlt className="animate-spin text-base" /> : <BiDollarCircle className="text-base" />}
            <span>Reconcile Ledger</span>
          </button>
          <Link
            href="/developer/shareholders"
            className="px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5"
          >
            <BiAward className="text-base" />
            <span>Shareholders &amp; Equity</span>
          </Link>
          <Link
            href="/developer/withdraws"
            className="px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5"
          >
            <BiMoneyWithdraw className="text-base" />
            <span>Withdrawals</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer shadow-md shadow-secondary/20 flex items-center gap-1.5"
          >
            <BiPlus className="text-base" />
            <span>Record Adjustment</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>BDT Available Balance</span>
            <BiDollarCircle className="text-base text-secondary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ৳{Number(bdtBal?.available_balance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Total Revenue:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ৳{Number(bdtBal?.total_revenue || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>USD Available Balance</span>
            <BiDollarCircle className="text-base text-secondary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ${Number(usdBal?.available_balance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Total Revenue:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ${Number(usdBal?.total_revenue || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Total Inflows</span>
            <BiTrendingUp className="text-base text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {stats.currency === 'BDT' ? '৳' : '$'}{Number(stats.totalInflow || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Active Filter:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.currency}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Total Outflows / Withdrawn</span>
            <BiTrendingDown className="text-base text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            {stats.currency === 'BDT' ? '৳' : '$'}{Number(stats.totalOutflow || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Disbursed:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ৳{Number(bdtBal?.total_withdrawn || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-full md:w-80">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Search Transactions
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

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <span className="text-slate-500 font-semibold text-xs flex items-center gap-1">
              <BiFilter className="text-sm" />
              <span>Filters:</span>
            </span>

            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50">
              {['ALL', 'inflow', 'outflow'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-lg font-semibold capitalize cursor-pointer transition ${
                    filterType === t
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50">
              {['ALL', 'BDT', 'USD'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilterCurrency(c)}
                  className={`px-3 py-1 rounded-lg font-semibold cursor-pointer transition ${
                    filterCurrency === c
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50">
              {['ALL', 'package_sale', 'subscription', 'withdrawal', 'manual_adjustment'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-semibold capitalize cursor-pointer transition ${
                    filterCategory === cat
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            <span className="text-slate-400 font-medium">
              Showing {filteredCashflows.length} entries
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingScreen fullScreen={false} label="Loading cashflow ledger..." />
        ) : filteredCashflows.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <BiTrendingUp className="text-3xl mx-auto text-slate-400" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300">No Cashflow Records Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Transactions will automatically appear here as creators subscribe, purchase packages, or developers approve payments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">ID / Date</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Flow Type</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-right">Balance After</th>
                  <th className="py-3 px-3">Reference / Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCashflows.map((cf) => {
                  const isInflow = cf.flow_type === 'inflow';
                  const sym = cf.currency === 'BDT' ? '৳' : '$';

                  return (
                    <tr key={cf.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">#{cf.id}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(cf.created_at).toLocaleDateString()} {new Date(cf.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{cf.title}</span>
                        <span className="text-[11px] text-slate-400 capitalize">
                          Method: {cf.payment_method || 'sslcommerz'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {cf.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isInflow
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isInflow ? <BiTrendingUp className="text-xs" /> : <BiTrendingDown className="text-xs" />}
                          <span>{cf.flow_type}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`font-mono font-black text-sm ${
                            isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isInflow ? '+' : '-'}{sym}{Number(cf.amount).toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">{cf.currency}</span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        {sym}{Number(cf.balance_after).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 text-[11px] text-slate-500">
                        {cf.creator_name ? (
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{cf.creator_name}</span>
                            <span className="text-slate-400">{cf.creator_email}</span>
                          </div>
                        ) : cf.developer_name ? (
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">Dev: {cf.developer_name}</span>
                            <span className="text-slate-400">{cf.developer_email}</span>
                          </div>
                        ) : (
                          <span className="font-mono text-slate-400">{cf.reference_type} #{cf.reference_id || ''}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Cashflow Entry</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Title
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Flow Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary cursor-pointer"
                  >
                    <option value="inflow">Inflow (Credit)</option>
                    <option value="outflow">Outflow (Debit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary cursor-pointer"
                  >
                    <option value="adjustment">Adjustment</option>
                    <option value="package_sale">Package Sale</option>
                    <option value="manual_payment">Manual Payment</option>
                    <option value="subscription">Subscription</option>
                    <option value="gateway_fee">Gateway Fee</option>
                    <option value="operational">Operational Expense</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary cursor-pointer"
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-secondary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Record Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
