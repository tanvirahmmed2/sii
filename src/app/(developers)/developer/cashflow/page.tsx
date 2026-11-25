'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FiRepeat as ArrowLeftRight,
  FiPlus as Plus,
  FiSearch as Search,
  FiRefreshCw as RefreshCw,
  FiCheckCircle as CheckCircle2,
  FiXCircle as XCircle,
  FiArrowUpRight as ArrowUpRight,
  FiArrowDownLeft as ArrowDownLeft,
  FiDollarSign as Wallet,
  FiSliders as Scale,
  FiX as X
} from 'react-icons/fi';

interface CashflowRecord {
  id: number;
  title: string;
  flow_type: 'inflow' | 'outflow';
  amount: number | string;
  currency: string;
  category: string;
  reference_type?: string | null;
  reference_id?: number | null;
  notes?: string | null;
  created_at: string;
}

interface CompanyBalance {
  currency: string;
  available_balance: number | string;
  total_inflow?: number | string;
  total_outflow?: number | string;
  updated_at?: string;
}

interface CashflowStats {
  totalInflow: number;
  totalOutflow: number;
  netCashflow: number;
  totalTransactions: number;
  currency: string;
}

const FINANCE_TABS = [
  { label: 'Shareholders', href: '/developer/shareholders' },
  { label: 'Investments', href: '/developer/investments' },
  { label: 'Expenses', href: '/developer/expenses' },
  { label: 'Accounting', href: '/developer/monthly-accounting' },
  { label: 'Withdrawals', href: '/developer/withdraws' },
  { label: 'Cashflow', href: '/developer/cashflow' }
];

export default function CashflowPage() {
  const [records, setRecords] = useState<CashflowRecord[]>([]);
  const [balances, setBalances] = useState<CompanyBalance[]>([]);
  const [stats, setStats] = useState<CashflowStats>({
    totalInflow: 0,
    totalOutflow: 0,
    netCashflow: 0,
    totalTransactions: 0,
    currency: 'BDT'
  });
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [flowFilter, setFlowFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('BDT');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [flowType, setFlowType] = useState<'inflow' | 'outflow'>('inflow');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [category, setCategory] = useState('operations');
  const [notes, setNotes] = useState('');

  const fetchCashflow = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (flowFilter !== 'all') params.set('flow_type', flowFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (currencyFilter !== 'all') params.set('currency', currencyFilter);

      const res = await fetch(`/api/marketing/developer/cashflow?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        setBalances(data.balances || []);
        if (data.stats) setStats(data.stats);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch cashflow ledger.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error loading cashflow ledger.' });
    } finally {
      setLoading(false);
    }
  }, [flowFilter, categoryFilter, currencyFilter]);

  useEffect(() => {
    fetchCashflow();
  }, [fetchCashflow]);

  const handleReconcile = async () => {
    setReconciling(true);
    setMessage(null);
    try {
      const res = await fetch('/api/marketing/developer/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconcile' })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Company treasury balances reconciled successfully.' });
        fetchCashflow();
      } else {
        setMessage({ type: 'error', text: data.error || 'Reconciliation failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error reconciling balances.' });
    } finally {
      setReconciling(false);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const parsedAmount = Number(amount);
    if (!title.trim() || !parsedAmount || parsedAmount <= 0) {
      setMessage({ type: 'error', text: 'Title and a positive amount are required.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/marketing/developer/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          flow_type: flowType,
          amount: parsedAmount,
          currency,
          category,
          notes: notes.trim() || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Cashflow entry recorded.' });
        setShowCreatePanel(false);
        setTitle('');
        setAmount('');
        setNotes('');
        fetchCashflow();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to record entry.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error recording cashflow entry.' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rec.title.toLowerCase().includes(q) ||
      rec.category.toLowerCase().includes(q) ||
      rec.flow_type.toLowerCase().includes(q) ||
      (rec.notes && rec.notes.toLowerCase().includes(q))
    );
  });

  const activeBalance =
    balances.find((b) => b.currency === (currencyFilter === 'all' ? 'BDT' : currencyFilter)) ||
    balances[0];

  return (
    <div className="w-full space-y-4 text-xs text-slate-800 dark:text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
              Treasury & Cashflow Ledger
            </h1>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
              Unified inflow/outflow ledger tracking package sales, investments, expenses, and withdrawals.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReconcile}
            disabled={reconciling}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
          >
            <Scale className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            {reconciling ? 'Reconciling...' : 'Reconcile Balance'}
          </button>
          <button
            type="button"
            onClick={fetchCashflow}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreatePanel(!showCreatePanel)}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer flex items-center gap-1.5"
          >
            {showCreatePanel ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showCreatePanel ? 'Close Form' : 'Record Entry'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        {FINANCE_TABS.map((tab) => {
          const isActive = tab.href === '/developer/cashflow';
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Available Balance</span>
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {activeBalance?.currency || stats.currency || 'BDT'}{' '}
            {Number(activeBalance?.available_balance || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Current treasury liquidity
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Total Inflow</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-medium text-emerald-700 dark:text-emerald-400">
            {stats.currency || 'BDT'} {Number(stats.totalInflow || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Package sales & capital injections
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Total Outflow</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-lg font-medium text-red-700 dark:text-red-400">
            {stats.currency || 'BDT'} {Number(stats.totalOutflow || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Salaries, expenses & withdrawals
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Net Cashflow</span>
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </div>
          <div
            className={`text-lg font-medium ${
              Number(stats.netCashflow || 0) >= 0
                ? 'text-slate-900 dark:text-white'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {stats.currency || 'BDT'} {Number(stats.netCashflow || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            {stats.totalTransactions} recorded movements
          </p>
        </div>
      </div>

      {showCreatePanel && (
        <form
          onSubmit={handleCreateEntry}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Record Manual Cashflow Entry
              </h2>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                Add a direct adjustment or off-system cash inflow/outflow to the ledger.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreatePanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Entry Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Flow Type
              </label>
              <select
                value={flowType}
                onChange={(e) => setFlowType(e.target.value as 'inflow' | 'outflow')}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                <option value="inflow">Inflow (Credit)</option>
                <option value="outflow">Outflow (Debit)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Amount
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                <option value="BDT">BDT</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                <option value="operations">Operations</option>
                <option value="package_sale">Package Sale</option>
                <option value="investment">Investment</option>
                <option value="expense">Expense</option>
                <option value="salary">Salary</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreatePanel(false)}
              className="px-3.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Record Entry'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label
              htmlFor="cashflowSearch"
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Search Transactions
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="cashflowSearch"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="cashflowFlowFilter"
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Flow Type
            </label>
            <select
              id="cashflowFlowFilter"
              value={flowFilter}
              onChange={(e) => setFlowFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
            >
              <option value="all">All Flows</option>
              <option value="inflow">Inflow Only</option>
              <option value="outflow">Outflow Only</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="cashflowCategoryFilter"
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Category
            </label>
            <select
              id="cashflowCategoryFilter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
            >
              <option value="all">All Categories</option>
              <option value="package_sale">Package Sale</option>
              <option value="investment">Investment</option>
              <option value="expense">Expense</option>
              <option value="salary">Salary</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="dividend">Dividend</option>
              <option value="operations">Operations</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="cashflowCurrencyFilter"
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Currency
            </label>
            <select
              id="cashflowCurrencyFilter"
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
            >
              <option value="BDT">BDT</option>
              <option value="USD">USD</option>
              <option value="all">All Currencies</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-normal">
                    Loading cashflow transactions...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-normal">
                    No cashflow transactions match your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isInflow = rec.flow_type === 'inflow';
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(rec.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {rec.title}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-normal capitalize">
                          {rec.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium capitalize ${
                            isInflow
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                          }`}
                        >
                          {isInflow ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {rec.flow_type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-medium whitespace-nowrap ${
                          isInflow
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {isInflow ? '+' : '-'} {rec.currency}{' '}
                        {Number(rec.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {rec.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
