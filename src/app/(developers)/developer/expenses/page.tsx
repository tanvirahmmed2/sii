'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiReceipt,
  BiPlus,
  BiRefresh,
  BiFilter,
  BiCheckCircle,
  BiInfoCircle,
  BiLoaderAlt,
  BiX,
  BiTrendingDown,
  BiDollarCircle,
  BiSearch,
  BiTrash,
  BiMoneyWithdraw,
  BiCalendar,
  BiListUl,
} from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function DeveloperExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total_count: 0,
    total_recorded: 0,
    salary_total: 0,
    custom_total: 0,
    current_month_total: 0,
    total_paid_out: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'transactions'>('expenses');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('servers_hosting');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<string>('BDT');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formPayeeName, setFormPayeeName] = useState<string>('');
  const [formPayeeType, setFormPayeeType] = useState<string>('vendor');
  const [formPayImmediately, setFormPayImmediately] = useState<boolean>(true);
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('bank_transfer');
  const [formPaymentRef, setFormPaymentRef] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const [payTarget, setPayTarget] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('bank_transfer');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [paying, setPaying] = useState<boolean>(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchExpensesData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/marketing/developer/expenses?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
        setTransactions(data.transactions || []);
        setBalances(data.balances || []);
        if (data.stats) setStats(data.stats);
      } else {
        setErrorMessage(data.error || 'Failed to load expenses data.');
      }
    } catch {
      setErrorMessage('Network error loading expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesData();
  }, [categoryFilter, statusFilter]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || Number(formAmount) <= 0) {
      setErrorMessage('Title and positive amount are required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/developer/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          category: formCategory,
          amount: Number(formAmount),
          currency: formCurrency,
          expense_date: formDate,
          payee_name: formPayeeName.trim() || 'Vendor',
          payee_type: formPayeeType,
          pay_immediately: formPayImmediately,
          payment_method: formPaymentMethod,
          payment_reference: formPaymentRef.trim(),
          notes: formNotes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message || 'Expense recorded successfully.');
        setShowCreateModal(false);
        setFormTitle('');
        setFormAmount('');
        setFormPayeeName('');
        setFormPaymentRef('');
        setFormNotes('');
        fetchExpensesData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to record expense.');
      }
    } catch {
      setErrorMessage('Network error creating expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (exp: any) => {
    const remaining = Math.max(0, Number(exp.amount) - Number(exp.paid_amount || 0));
    setPayTarget(exp);
    setPayAmount(String(remaining > 0 ? remaining : exp.amount));
    setPayMethod('bank_transfer');
    setPayRef('');
    setPayNotes(`Settlement for ${exp.expense_code}`);
  };

  const handleDisbursePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget || !payAmount || Number(payAmount) <= 0) {
      setErrorMessage('Please enter a positive payment amount.');
      return;
    }

    setPaying(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/marketing/developer/expenses/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: payTarget.id,
          amount: Number(payAmount),
          currency: payTarget.currency || 'BDT',
          payment_method: payMethod,
          payment_reference: payRef.trim(),
          notes: payNotes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Payment of ${payAmount} ${payTarget.currency} disbursed for ${payTarget.expense_code}.`);
        setPayTarget(null);
        fetchExpensesData();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to record transaction.');
      }
    } catch {
      setErrorMessage('Network error recording payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/marketing/developer/expenses?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message || 'Expense removed.');
        setDeleteTarget(null);
        fetchExpensesData();
        setTimeout(() => setToastMessage(''), 4000);
      } else {
        setErrorMessage(data.error || 'Failed to delete expense.');
      }
    } catch {
      setErrorMessage('Network error deleting expense.');
    } finally {
      setDeleting(false);
    }
  };

  const bdtBal = balances.find((b) => b.currency === 'BDT');

  const filteredExpenses = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return expenses;
    return expenses.filter((e) => {
      return (
        (e.expense_code || '').toLowerCase().includes(q) ||
        (e.title || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.payee_name || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q)
      );
    });
  }, [expenses, searchTerm]);

  const filteredTransactions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return transactions;
    return transactions.filter((t) => {
      return (
        (t.transaction_number || '').toLowerCase().includes(q) ||
        (t.expense_code || '').toLowerCase().includes(q) ||
        (t.expense_title || '').toLowerCase().includes(q) ||
        (t.payee_name || '').toLowerCase().includes(q) ||
        (t.payment_reference || '').toLowerCase().includes(q) ||
        (t.payment_method || '').toLowerCase().includes(q)
      );
    });
  }, [transactions, searchTerm]);

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
              Company Expenses &amp; Transactions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
              Cost Accounting
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track custom operational bills, auto-logged developer salary disbursements, and real-time balance deductions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchExpensesData}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <BiRefresh className="text-base" />
            <span>Refresh</span>
          </button>
          <Link
            href="/developer/payroll/payments"
            className="px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5"
          >
            <BiMoneyWithdraw className="text-base" />
            <span>Payroll Payments</span>
          </Link>
          <Link
            href="/developer/monthly-accounting"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5"
          >
            <BiCalendar className="text-base" />
            <span>Monthly Reports</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer shadow-md shadow-secondary/20 flex items-center gap-1.5"
          >
            <BiPlus className="text-base" />
            <span>New Custom Expense</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Platform Available Balance</span>
            <BiDollarCircle className="text-base text-secondary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ৳{Number(bdtBal?.available_balance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Currency:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">BDT</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Current Month Expenses</span>
            <BiTrendingDown className="text-base text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            ৳{Number(stats.current_month_total || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Total Paid Out:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ৳{Number(stats.total_paid_out || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Developer Salary Expenses</span>
            <BiReceipt className="text-base text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            ৳{Number(stats.salary_total || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Auto-Synced Payrolls</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Custom / Overhead Expenses</span>
            <BiListUl className="text-base text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            ৳{Number(stats.custom_total || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Recorded Bills:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.total_count}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Expenses Registry ({expenses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Expense Transactions Ledger ({transactions.length})
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-full md:w-80">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Search Expenses &amp; Transactions
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

          {activeTab === 'expenses' && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <span className="text-slate-500 font-semibold text-xs flex items-center gap-1">
                <BiFilter className="text-sm" />
                <span>Filters:</span>
              </span>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="salary">Developer Salaries</option>
                <option value="servers_hosting">Servers &amp; Cloud Hosting</option>
                <option value="marketing_ads">Marketing &amp; Ads</option>
                <option value="office_rent">Office &amp; Utilities</option>
                <option value="software_licenses">Software Licenses</option>
                <option value="legal_accounting">Legal &amp; Accounting</option>
                <option value="hardware">Hardware &amp; Equipment</option>
                <option value="operational">Operational</option>
                <option value="misc">Miscellaneous</option>
              </select>

              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/50">
                {['ALL', 'recorded', 'partially_paid', 'paid'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize cursor-pointer transition ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingScreen fullScreen={false} label="Loading expense registry..." />
        ) : activeTab === 'expenses' ? (
          filteredExpenses.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <BiReceipt className="text-3xl mx-auto text-slate-400" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No Expenses Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Record custom company expenditures or pay developer salaries to automatically populate this ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Code / Date</th>
                    <th className="py-3 px-3">Title &amp; Notes</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Payee</th>
                    <th className="py-3 px-3 text-right">Billed Amount</th>
                    <th className="py-3 px-3 text-right">Paid Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredExpenses.map((e) => {
                    const sym = e.currency === 'BDT' ? '৳' : '$';
                    const paid = Number(e.paid_amount || 0);
                    const total = Number(e.amount || 0);

                    return (
                      <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            {e.expense_code}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(e.expense_date).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{e.title}</span>
                          {e.notes && <span className="text-[11px] text-slate-400">{e.notes}</span>}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            e.category === 'salary'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}>
                            {e.category?.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{e.payee_name}</div>
                          <div className="text-[10px] text-slate-400 uppercase">{e.payee_type}</div>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {sym}{total.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {sym}{paid.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              e.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : e.status === 'partially_paid'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                : e.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {e.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {e.status !== 'paid' && e.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => openPayModal(e)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                              >
                                <BiMoneyWithdraw className="text-xs" />
                                <span>Disburse</span>
                              </button>
                            )}
                            {e.category !== 'salary' && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(e)}
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                              >
                                <BiTrash className="text-sm" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No expense transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Transaction #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Expense &amp; Category</th>
                  <th className="py-3 px-3">Payee</th>
                  <th className="py-3 px-3">Method &amp; Ref</th>
                  <th className="py-3 px-3 text-right">Amount Disbursed</th>
                  <th className="py-3 px-3">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredTransactions.map((t) => {
                  const sym = t.currency === 'BDT' ? '৳' : '$';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {t.transaction_number}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(t.transaction_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{t.expense_title}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {t.expense_code} &middot; {t.expense_category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {t.payee_name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="uppercase text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {t.payment_method}
                        </span>
                        {t.payment_reference && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Ref: {t.payment_reference}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        -{sym}{Number(t.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {t.paid_by_name || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Record New Custom Expense
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Expense Title / Description
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Expense Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="servers_hosting">Servers &amp; Cloud Hosting</option>
                    <option value="marketing_ads">Marketing &amp; Advertising</option>
                    <option value="office_rent">Office Rent &amp; Utilities</option>
                    <option value="software_licenses">Software Licenses &amp; SaaS</option>
                    <option value="legal_accounting">Legal &amp; Accounting</option>
                    <option value="hardware">Hardware &amp; Equipment</option>
                    <option value="operational">General Operational</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Currency
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Payee / Vendor Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formPayeeName}
                    onChange={(e) => setFormPayeeName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Payee Classification
                  </label>
                  <select
                    value={formPayeeType}
                    onChange={(e) => setFormPayeeType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="vendor">External Vendor / Provider</option>
                    <option value="contractor">Freelancer / Contractor</option>
                    <option value="government">Government / Tax</option>
                    <option value="developer">Team Developer</option>
                    <option value="external">Other External</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pay-immediately-check"
                    checked={formPayImmediately}
                    onChange={(e) => setFormPayImmediately(e.target.checked)}
                    className="rounded border-slate-300 text-secondary cursor-pointer"
                  />
                  <label htmlFor="pay-immediately-check" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Pay Immediately (Creates Expense Transaction &amp; Deducts Platform Balance)
                  </label>
                </div>

                {formPayImmediately && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Payment Method</label>
                      <select
                        value={formPaymentMethod}
                        onChange={(e) => setFormPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="credit_card">Corporate Card</option>
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                        <option value="cash">Petty Cash</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Transaction Ref</label>
                      <input
                        type="text"
                        value={formPaymentRef}
                        onChange={(e) => setFormPaymentRef(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Notes / Justification
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <BiLoaderAlt className="animate-spin text-base" />}
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Disburse Expense Payment
                </h3>
                <p className="text-xs text-slate-500">{payTarget.title} ({payTarget.expense_code})</p>
              </div>
              <button
                type="button"
                onClick={() => setPayTarget(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleDisbursePayment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Disbursement Amount ({payTarget.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-bold text-base"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Corporate Card</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Payment Reference / Slip ID
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {paying && <BiLoaderAlt className="animate-spin text-base" />}
                  <span>Confirm Disbursement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Remove Expense</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove or cancel expense <strong className="text-slate-800 dark:text-slate-200">{deleteTarget.title}</strong> ({deleteTarget.expense_code})?
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteExpense}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
