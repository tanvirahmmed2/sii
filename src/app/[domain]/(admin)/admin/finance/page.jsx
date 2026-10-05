'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiDollarSign, FiPlus, FiFileText, FiTrendingUp, FiTrendingDown, FiTrash2, FiList } from 'react-icons/fi';

const FinancePage = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [categories, setCategories] = useState({ expenseCategories: [], incomeCategories: [] });
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showLogExpense, setShowLogExpense] = useState(false);
  const [showLogIncome, setShowLogIncome] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    title: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    paid_by: '',
    description: ''
  });

  const [incomeForm, setIncomeForm] = useState({
    category_id: '',
    title: '',
    amount: '',
    income_date: new Date().toISOString().split('T')[0],
    received_by: '',
    description: ''
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    type: 'Expense' 
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const catRes = await fetch('/api/admin/finance/categories');
      const catData = await catRes.json();
      if (catRes.ok && catData.success) {
        setCategories(catData.paylod);
      }

      const expRes = await fetch('/api/admin/finance/expenses');
      const expData = await expRes.json();
      if (expRes.ok && expData.success) {
        setExpenses(expData.paylod.expenses || []);
      }

      const incRes = await fetch('/api/admin/finance/incomes');
      const incData = await incRes.json();
      if (incRes.ok && incData.success) {
        setIncomes(incData.paylod.incomes || []);
      }

      const txnRes = await fetch('/api/admin/finance/transactions');
      const txnData = await txnRes.json();
      if (txnRes.ok && txnData.success) {
        setTransactions(txnData.paylod.transactions || []);
      }
    } catch (err) {
      toast.error('Failed to retrieve ledger data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.category_id || !expenseForm.title || !expenseForm.amount || !expenseForm.expense_date) {
      toast.error('All required fields must be filled.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Expense registered successfully!');
        setShowLogExpense(false);
        setExpenseForm({
          category_id: '',
          title: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          paid_by: '',
          description: ''
        });
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to log expense.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    if (!incomeForm.category_id || !incomeForm.title || !incomeForm.amount || !incomeForm.income_date) {
      toast.error('All required fields must be filled.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/finance/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incomeForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Income registered successfully!');
        setShowLogIncome(false);
        setIncomeForm({
          category_id: '',
          title: '',
          amount: '',
          income_date: new Date().toISOString().split('T')[0],
          received_by: '',
          description: ''
        });
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to log income.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name || !categoryForm.type) {
      toast.error('Name and type are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/finance/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Category registered successfully!');
        setShowAddCategory(false);
        setCategoryForm({ name: '', description: '', type: 'Expense' });
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to register category.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalInflow = incomes.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totalOutflow = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const netBalance = totalInflow - totalOutflow;

  if (loading) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading ledger files...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiDollarSign className="text-primary" /> General Finance & Audit Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Categorized inflow tracking, organizational outflow logging, and unified transaction sheets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowLogIncome(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            <FiPlus /> Log Income
          </button>
          <button
            onClick={() => setShowLogExpense(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-tertiary hover:bg-tertiary-dark text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            <FiPlus /> Log Expense
          </button>
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-850 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            <FiPlus /> New Category
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-primary rounded-2xl flex items-center justify-center">
            <FiTrendingUp className="text-xl" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Income Inflow</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">৳{totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-tertiary rounded-2xl flex items-center justify-center">
            <FiTrendingDown className="text-xl" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expense Outflow</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">৳{totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${netBalance >= 0 ? 'bg-emerald-50 text-primary' : 'bg-red-50 text-red-600'}`}>
            <FiDollarSign className="text-xl" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Treasury Balance</p>
            <h3 className={`text-xl font-bold mt-0.5 ${netBalance >= 0 ? 'text-primary' : 'text-red-600'}`}>
              ৳{netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-100 gap-1.5 flex-wrap mt-2">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Transactions Ledger ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('incomes')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'incomes'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Income Inflow Registry ({incomes.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Expense Outflow Registry ({expenses.length})
        </button>
      </div>

      {/* Content views */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <FiList className="text-slate-500" />
            <h2 className="text-base font-bold text-slate-800">Double-Entry Transaction Ledger</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
              <span className="text-slate-350 text-5xl mb-3">🧾</span>
              <h3 className="text-sm font-bold text-slate-600">Treasury Clean</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                No financial transaction entries found. Payments and cash flow details list inside this audit deck.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Txn Number</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks / Notes</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-primary bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                          {txn.transaction_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 font-semibold">
                          {new Date(txn.payment_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {txn.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500 max-w-sm truncate" title={txn.remarks}>
                          {txn.remarks}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${
                          txn.transaction_type === 'Credit'
                            ? 'text-primary bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full'
                            : 'text-tertiary bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full'
                        }`}>
                          {txn.transaction_type === 'Credit' ? 'Inflow (+)' : 'Outflow (-)'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold text-sm ${
                        txn.transaction_type === 'Credit' ? 'text-primary' : 'text-tertiary'
                      }`}>
                        ৳{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'incomes' && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <FiTrendingUp className="text-primary" />
            <h2 className="text-base font-bold text-slate-800">Income Inflow Registers</h2>
          </div>

          {incomes.length === 0 ? (
            <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
              <span className="text-slate-350 text-5xl mb-3">💵</span>
              <h3 className="text-sm font-bold text-slate-600">Incomes Clean</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                No recorded incomes in treasury. Log your first category inflow using the button above.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Received By</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{inc.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{inc.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-600">
                          {inc.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 font-semibold">
                          {new Date(inc.income_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {inc.received_by || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-primary">
                        +৳{parseFloat(inc.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <FiTrendingDown className="text-rose-500" />
            <h2 className="text-base font-bold text-slate-800">Expense Outflow Registers</h2>
          </div>

          {expenses.length === 0 ? (
            <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
              <span className="text-slate-350 text-5xl mb-3">💸</span>
              <h3 className="text-sm font-bold text-slate-600">Expenses Clean</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                No recorded outflow logs. Log new payments or utility slips using the button above.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Paid By</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{exp.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{exp.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-600">
                          {exp.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 font-semibold">
                          {new Date(exp.expense_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {exp.paid_by || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-tertiary">
                        -৳{parseFloat(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal dialogs */}
      {showLogExpense && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-md animate-scale-up">
            <h3 className="text-base font-bold text-slate-850 border-b border-slate-50 pb-2 mb-4">Log Outgoing Expense</h3>
            <form onSubmit={handleExpenseSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category *</label>
                <select
                  value={expenseForm.category_id}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, category_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                >
                  <option value="">Select a category...</option>
                  {categories.expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title / Payee *</label>
                <input
                  type="text"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date *</label>
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, expense_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paid By</label>
                <input
                  type="text"
                  value={expenseForm.paid_by}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, paid_by: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes / Description</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowLogExpense(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-tertiary hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  Log Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogIncome && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-md animate-scale-up">
            <h3 className="text-base font-bold text-slate-850 border-b border-slate-50 pb-2 mb-4">Log Incoming Inflow</h3>
            <form onSubmit={handleIncomeSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category *</label>
                <select
                  value={incomeForm.category_id}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, category_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                >
                  <option value="">Select a category...</option>
                  {categories.incomeCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title *</label>
                <input
                  type="text"
                  value={incomeForm.title}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date *</label>
                  <input
                    type="date"
                    value={incomeForm.income_date}
                    onChange={(e) => setIncomeForm((p) => ({ ...p, income_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Received By</label>
                <input
                  type="text"
                  value={incomeForm.received_by}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, received_by: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes / Description</label>
                <textarea
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowLogIncome(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  Log Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCategory && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-sm animate-scale-up">
            <h3 className="text-base font-bold text-slate-850 border-b border-slate-50 pb-2 mb-4">Register Ledger Category</h3>
            <form onSubmit={handleCategorySubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category Type *</label>
                <select
                  value={categoryForm.type}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
                >
                  <option value="Expense">Expense Outflow</option>
                  <option value="Income">Income Inflow</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-850 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  Register Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
