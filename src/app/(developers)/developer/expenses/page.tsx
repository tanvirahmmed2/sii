'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FiFileText as Receipt,
  FiPlus as Plus,
  FiSearch as Search,
  FiRefreshCw as RefreshCw,
  FiCheckCircle as CheckCircle2,
  FiXCircle as XCircle,
  FiCreditCard as CreditCard,
  FiTrash2 as Trash2,
  FiX as X,
  FiArrowUpRight as ArrowUpRight,
  FiDollarSign as Wallet
} from 'react-icons/fi';

interface ExpenseRecord {
  id: number;
  title: string;
  category: string;
  amount: number | string;
  paid_amount?: number | string;
  currency: string;
  expense_date: string;
  payee_name: string | null;
  payee_type: string | null;
  status: string;
  notes?: string | null;
  created_at?: string;
}

interface ExpenseTransaction {
  id: number;
  expense_id: number;
  expense_title?: string;
  amount: number | string;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  notes?: string | null;
  paid_at?: string;
  created_at?: string;
}

interface CompanyBalance {
  currency: string;
  available_balance: number | string;
  total_inflow?: number | string;
  total_outflow?: number | string;
}

interface ExpenseStats {
  total_count: number;
  total_recorded: number;
  salary_total: number;
  custom_total: number;
  current_month_total: number;
  total_paid_out: number;
}

const FINANCE_TABS = [
  { label: 'Shareholders', href: '/developer/shareholders' },
  { label: 'Investments', href: '/developer/investments' },
  { label: 'Expenses', href: '/developer/expenses' },
  { label: 'Accounting', href: '/developer/monthly-accounting' },
  { label: 'Withdrawals', href: '/developer/withdraws' },
  { label: 'Cashflow', href: '/developer/cashflow' }
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [balances, setBalances] = useState<CompanyBalance[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    total_count: 0,
    total_recorded: 0,
    salary_total: 0,
    custom_total: 0,
    current_month_total: 0,
    total_paid_out: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'expenses' | 'transactions'>('expenses');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('operations');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payeeName, setPayeeName] = useState('');
  const [payeeType, setPayeeType] = useState('vendor');
  const [payImmediately, setPayImmediately] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');

  const [disbursingExpense, setDisbursingExpense] = useState<ExpenseRecord | null>(null);
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disburseMethod, setDisburseMethod] = useState('bank_transfer');
  const [disburseReference, setDisburseReference] = useState('');
  const [disburseNotes, setDisburseNotes] = useState('');
  const [disbursing, setDisbursing] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/marketing/developer/expenses?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
        setTransactions(data.transactions || []);
        setBalances(data.balances || []);
        if (data.stats) setStats(data.stats);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load expenses.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error while fetching expenses.' });
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const parsedAmount = Number(amount);
    if (!title.trim() || !parsedAmount || parsedAmount <= 0) {
      setMessage({ type: 'error', text: 'Title and a positive amount are required.' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/marketing/developer/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          amount: parsedAmount,
          currency,
          expense_date: expenseDate,
          payee_name: payeeName.trim() || null,
          payee_type: payeeType,
          pay_immediately: payImmediately,
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || null,
          notes: notes.trim() || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Expense recorded successfully.' });
        setShowCreatePanel(false);
        setTitle('');
        setAmount('');
        setPayeeName('');
        setPaymentReference('');
        setNotes('');
        fetchExpenses();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to record expense.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error recording expense.' });
    } finally {
      setCreating(false);
    }
  };

  const openDisbursePanel = (expense: ExpenseRecord) => {
    const total = Number(expense.amount || 0);
    const paid = Number(expense.paid_amount || 0);
    const remaining = Math.max(0, total - paid);
    setDisbursingExpense(expense);
    setDisburseAmount(String(remaining > 0 ? remaining : total));
    setDisburseMethod('bank_transfer');
    setDisburseReference('');
    setDisburseNotes('');
    setShowCreatePanel(false);
  };

  const handleDisbursePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disbursingExpense) return;
    setMessage(null);
    const parsedAmount = Number(disburseAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setMessage({ type: 'error', text: 'Disbursement amount must be positive.' });
      return;
    }

    setDisbursing(true);
    try {
      const res = await fetch('/api/marketing/developer/expenses/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: disbursingExpense.id,
          amount: parsedAmount,
          currency: disbursingExpense.currency || 'BDT',
          payment_method: disburseMethod,
          payment_reference: disburseReference.trim() || null,
          notes: disburseNotes.trim() || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Expense payment disbursed and recorded.' });
        setDisbursingExpense(null);
        fetchExpenses();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to disburse payment.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error processing payment disbursement.' });
    } finally {
      setDisbursing(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    setDeletingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/marketing/developer/expenses?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Expense removed successfully.' });
        setConfirmDeleteId(null);
        fetchExpenses();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete expense.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error deleting expense.' });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      exp.title.toLowerCase().includes(q) ||
      exp.category.toLowerCase().includes(q) ||
      (exp.payee_name && exp.payee_name.toLowerCase().includes(q)) ||
      exp.status.toLowerCase().includes(q)
    );
  });

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (tx.expense_title && tx.expense_title.toLowerCase().includes(q)) ||
      (tx.payment_method && tx.payment_method.toLowerCase().includes(q)) ||
      (tx.payment_reference && tx.payment_reference.toLowerCase().includes(q))
    );
  });

  const primaryBalance = balances.find((b) => b.currency === 'BDT') || balances[0];

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'paid') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (s === 'partial') {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800 dark:text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
              Expense & Disbursement Ledger
            </h1>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
              Record operating expenses, review salary outflows, and disburse vendor payments.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchExpenses}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreatePanel(!showCreatePanel);
              setDisbursingExpense(null);
            }}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer flex items-center gap-1.5"
          >
            {showCreatePanel ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showCreatePanel ? 'Close Form' : 'New Expense'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        {FINANCE_TABS.map((tab) => {
          const isActive = tab.href === '/developer/expenses';
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
            <span className="text-xs font-normal">Total Recorded</span>
            <Receipt className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            BDT {Number(stats.total_recorded || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            {stats.total_count} ledger items
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Total Paid Out</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-medium text-emerald-700 dark:text-emerald-400">
            BDT {Number(stats.total_paid_out || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Settled disbursements
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Salary Expenses</span>
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            BDT {Number(stats.salary_total || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Custom: BDT {Number(stats.custom_total || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">This Month</span>
            <Receipt className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            BDT {Number(stats.current_month_total || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Current billing cycle
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Treasury Balance</span>
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {primaryBalance?.currency || 'BDT'}{' '}
            {Number(primaryBalance?.available_balance || 0).toLocaleString()}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Available liquidity
          </p>
        </div>
      </div>

      {showCreatePanel && (
        <form
          onSubmit={handleCreateExpense}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Record New Expense
              </h2>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                Create an expense item and optionally settle it immediately from company balance.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Expense Title
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
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                <option value="operations">Operations</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="marketing">Marketing</option>
                <option value="software">Software & SaaS</option>
                <option value="office">Office & Rent</option>
                <option value="salary">Salary Adjustment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Expense Date
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
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

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Payee Name
              </label>
              <input
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Payee Type
              </label>
              <select
                value={payeeType}
                onChange={(e) => setPayeeType(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                <option value="vendor">Vendor</option>
                <option value="provider">Service Provider</option>
                <option value="developer">Developer</option>
                <option value="agency">Agency</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 pt-2">
              <input
                id="payImmediately"
                type="checkbox"
                checked={payImmediately}
                onChange={(e) => setPayImmediately(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700"
              />
              <label
                htmlFor="payImmediately"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Disburse payment immediately
              </label>
            </div>

            {payImmediately && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="card">Corporate Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
            />
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
              disabled={creating}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {creating ? 'Recording...' : 'Save Expense'}
            </button>
          </div>
        </form>
      )}

      {disbursingExpense && (
        <form
          onSubmit={handleDisbursePayment}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Disburse Payment for {disbursingExpense.title}
              </h2>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                Total: {disbursingExpense.currency} {Number(disbursingExpense.amount).toLocaleString()} | Paid so far: {disbursingExpense.currency} {Number(disbursingExpense.paid_amount || 0).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDisbursingExpense(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Disbursement Amount ({disbursingExpense.currency})
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={disburseAmount}
                onChange={(e) => setDisburseAmount(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Method
              </label>
              <select
                value={disburseMethod}
                onChange={(e) => setDisburseMethod(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="card">Corporate Card</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Transaction Reference
              </label>
              <input
                type="text"
                value={disburseReference}
                onChange={(e) => setDisburseReference(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Payment Notes
              </label>
              <input
                type="text"
                value={disburseNotes}
                onChange={(e) => setDisburseNotes(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDisbursingExpense(null)}
              className="px-3.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disbursing}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {disbursing ? 'Processing...' : 'Confirm Disbursement'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="lg:col-span-2">
            <label
              htmlFor="expenseSearch"
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Search Expenses & Transactions
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="expenseSearch"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="expenseCategoryFilter"
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Category
            </label>
            <select
              id="expenseCategoryFilter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
            >
              <option value="all">All Categories</option>
              <option value="salary">Salary</option>
              <option value="operations">Operations</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="marketing">Marketing</option>
              <option value="software">Software & SaaS</option>
              <option value="office">Office</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="expenseStatusFilter"
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Status
            </label>
            <select
              id="expenseStatusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Expense Ledger ({filteredExpenses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Disbursement Transactions ({filteredTransactions.length})
          </button>
        </div>

        {activeTab === 'expenses' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Payee</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-normal">
                      Loading expenses...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-normal">
                      No expense records match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const totalAmt = Number(exp.amount || 0);
                    const paidAmt = Number(exp.paid_amount || 0);
                    const isPaid = exp.status.toLowerCase() === 'paid';
                    return (
                      <tr
                        key={exp.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {exp.title}
                          </div>
                          {exp.notes && (
                            <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {exp.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-normal capitalize">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-300">
                          {exp.payee_name || '-'}
                          {exp.payee_type ? ` (${exp.payee_type})` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {exp.currency} {totalAmt.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-normal text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {exp.currency} {paidAmt.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-medium capitalize ${getStatusBadge(
                              exp.status
                            )}`}
                          >
                            {exp.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => openDisbursePanel(exp)}
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer"
                              >
                                Pay
                              </button>
                            )}

                            {confirmDeleteId === exp.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  disabled={deletingId === exp.id}
                                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-medium cursor-pointer"
                                >
                                  {deletingId === exp.id ? '...' : 'Confirm'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-normal cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(exp.id)}
                                className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-600 cursor-pointer"
                                title="Delete expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Expense Item</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3 text-right">Paid Amount</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-normal">
                      Loading transactions...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-normal">
                      No disbursement transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {tx.paid_at || tx.created_at
                          ? new Date(tx.paid_at || tx.created_at || '').toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {tx.expense_title || `Expense #${tx.expense_id}`}
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-300 capitalize">
                        {(tx.payment_method || '-').replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-600 dark:text-slate-400">
                        {tx.payment_reference || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {tx.currency} {Number(tx.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {tx.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
