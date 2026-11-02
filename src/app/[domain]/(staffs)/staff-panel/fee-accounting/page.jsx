'use client';

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiDollarSign, FiCreditCard, FiPieChart, FiTrendingUp, FiPlus, FiTrash2, FiRefreshCw, FiFileText } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function FeeAccountingStaffPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices'); // invoices | heads | structures | refunds
  const [data, setData] = useState({ fee_heads: [], fee_structures: [], invoices: [], refund_requests: [], wallet_summary: {} });

  // Fee Head Modal
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [headName, setHeadName] = useState('');
  const [headCode, setHeadCode] = useState('');
  const [headCategory, setHeadCategory] = useState('academic');
  const [headTaxable, setHeadTaxable] = useState(false);
  const [submittingHead, setSubmittingHead] = useState(false);

  // Fee Structure Modal
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [structHeadId, setStructHeadId] = useState('');
  const [structAmount, setStructAmount] = useState('');
  const [structFreq, setStructFreq] = useState('monthly');
  const [structDueDay, setStructDueDay] = useState(10);
  const [submittingStruct, setSubmittingStruct] = useState(false);

  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/fee-accounting'), [getApiEndpoint]);

  const fetchData = useCallback(async (showToast = false) => {
    if (!apiEndpoint) return;
    try {
      if (showToast) setRefreshing(true);
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setData(res.data);
        if (showToast) toast.success('Fee & Accounting records refreshed');
      } else {
        toast.error(res.data?.error || 'Failed to load accounting data');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error connecting to accounting service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateHead = async (e) => {
    e.preventDefault();
    if (!headName.trim()) return;
    setSubmittingHead(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'create_head',
        name: headName.trim(),
        code: headCode.trim(),
        category: headCategory,
        is_taxable: headTaxable,
      });
      if (res.data?.success) {
        toast.success('Fee head account created');
        setIsHeadModalOpen(false);
        setHeadName('');
        setHeadCode('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to create fee head');
      }
    } catch (err) {
      toast.error('Error creating fee head');
    } finally {
      setSubmittingHead(false);
    }
  };

  const handleCreateStructure = async (e) => {
    e.preventDefault();
    if (!structHeadId || !structAmount) return;
    setSubmittingStruct(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'create_structure',
        head_id: structHeadId,
        amount: structAmount,
        frequency: structFreq,
        due_day: structDueDay,
      });
      if (res.data?.success) {
        toast.success('Fee pricing structure saved');
        setIsStructureModalOpen(false);
        setStructAmount('');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to create fee structure');
      }
    } catch (err) {
      toast.error('Error creating fee structure');
    } finally {
      setSubmittingStruct(false);
    }
  };

  const handleDeleteHead = async (headId) => {
    if (!confirm('Are you sure you want to remove this fee head account?')) return;
    try {
      const res = await axios.delete(`${apiEndpoint}?head_id=${headId}`);
      if (res.data?.success) {
        toast.success('Fee head deleted');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to delete fee head');
    }
  };

  if (loading) {
    return <Loader message="Loading Double-Entry Fee & Accounting Console..." />;
  }

  const { fee_heads, fee_structures, invoices, refund_requests, wallet_summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiDollarSign className="text-emerald-500" /> Double-Entry Fee & Accounting
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage chart of fee accounts, class-wise pricing rules, student billing invoices, wallet deposits & double-entry ledgers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setIsHeadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
          >
            <FiPlus /> New Fee Head
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fee Account Heads</span>
            <FiPieChart className="text-lg text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{fee_heads.length} Accounts</div>
          <p className="text-xs text-slate-500 mt-1">Tuition, lab, exam, hostel, transport</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Invoices</span>
            <FiFileText className="text-lg text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{invoices.length} Invoices</div>
          <p className="text-xs text-slate-500 mt-1">Generated student billing statements</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Student Wallets</span>
            <FiCreditCard className="text-lg text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ৳ {parseFloat(wallet_summary.total_wallet_balance || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">{wallet_summary.total_wallets || 0} prepaid wallets</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Refund Requests</span>
            <FiTrendingUp className="text-lg text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{refund_requests.length} Pending</div>
          <p className="text-xs text-slate-500 mt-1">Overpayment & deposit claims</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'invoices'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiFileText /> Student Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('heads')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'heads'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiPieChart /> Fee Heads ({fee_heads.length})
        </button>
        <button
          onClick={() => setActiveTab('structures')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'structures'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiDollarSign /> Pricing Structures ({fee_structures.length})
        </button>
      </div>

      {/* Tab 1: Student Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Billing Month</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3">Paid / Due</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                      No invoices generated yet for this billing cycle.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {inv.invoice_no}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {inv.student_name} (Roll: {inv.roll || 'N/A'})
                      </td>
                      <td className="px-6 py-4 text-xs">{inv.month || 'Current'}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        ৳ {parseFloat(inv.total_amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="text-emerald-600 font-semibold">৳ {parseFloat(inv.paid_amount || 0).toLocaleString()}</span> /{' '}
                        <span className="text-red-600 font-semibold">৳ {parseFloat(inv.due_amount).toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(inv.due_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Fee Heads */}
      {activeTab === 'heads' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chart of Fee Accounts</h2>
            <button
              onClick={() => setIsHeadModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition"
            >
              <FiPlus /> Add Fee Head
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fee_heads.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                No fee heads configured yet.
              </div>
            ) : (
              fee_heads.map((h) => (
                <div key={h.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">{h.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {h.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">Code: {h.code || 'None'}</p>
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    <span>Taxable: {h.is_taxable ? 'Yes' : 'No'}</span>
                    <button onClick={() => handleDeleteHead(h.id)} className="text-red-500 hover:text-red-700">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Pricing Structures */}
      {activeTab === 'structures' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Configured Pricing Structures</h2>
            <button
              onClick={() => setIsStructureModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition"
            >
              <FiPlus /> Add Pricing Rule
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fee_structures.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                No fee structures configured yet.
              </div>
            ) : (
              fee_structures.map((s) => (
                <div key={s.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{s.head_name}</span>
                    <span className="text-emerald-600 font-bold text-sm">৳ {parseFloat(s.amount).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500">Frequency: <span className="capitalize">{s.frequency}</span></p>
                  <p className="text-xs text-slate-500">Due Day: {s.due_day}th of month</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Fee Head Modal */}
      {isHeadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Create Fee Account Head</h3>
            <form onSubmit={handleCreateHead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fee Head Name</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Tuition Fee"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Code</label>
                <input
                  type="text"
                  placeholder="e.g. TUI-101"
                  value={headCode}
                  onChange={(e) => setHeadCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={headCategory}
                  onChange={(e) => setHeadCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="academic">Academic</option>
                  <option value="admission">Admission</option>
                  <option value="exam">Examination</option>
                  <option value="transport">Transport</option>
                  <option value="hostel">Hostel & Dormitory</option>
                  <option value="fines">Late Fines</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHeadModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHead}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingHead ? 'Saving...' : 'Save Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Fee Structure Modal */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Configure Pricing Rule</h3>
            <form onSubmit={handleCreateStructure} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fee Head</label>
                <select
                  value={structHeadId}
                  onChange={(e) => setStructHeadId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                >
                  <option value="">Select Fee Head</option>
                  {fee_heads.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount (BDT)</label>
                <input
                  type="number"
                  placeholder="e.g. 2500"
                  value={structAmount}
                  onChange={(e) => setStructAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStructureModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStruct}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  {submittingStruct ? 'Saving...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

