'use client';

import { useState, useEffect, useContext } from 'react';
import {
  BiCreditCard,
  BiPlus,
  BiCheckCircle,
  BiTime,
  BiUser,
  BiDollar,
  BiTrash,
  BiRefresh,
  BiCheckShield,
  BiX,
  BiDetail,
  BiCheck,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function DeveloperPayrollPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdmin = Boolean(permissions.includes('payroll'));

  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState({
    total_disbursed: 0,
    pending_payouts: 0,
    total_runs: 0,
    active_developers: 0,
  });
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetail, setPayrollDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [targetItemToPay, setTargetItemToPay] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    pay_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    pay_period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    notes: '',
    items: [],
  });
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_method: 'BANK_TRANSFER',
    transaction_reference: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/payroll');
      const data = await res.json();
      if (data.success) {
        setPayrolls(data.payrolls || []);
        setStats(data.stats || {});
        setDevelopers(data.developers || []);

        // Prepopulate items for create modal
        if (data.developers && createForm.items.length === 0) {
          const defaultItems = data.developers.map((d) => ({
            developer_id: d.id,
            name: d.name,
            role: d.role,
            base_salary: 3000,
            bonus: 0,
            deductions: 0,
            payment_method: 'BANK_TRANSFER',
            notes: '',
          }));
          setCreateForm((prev) => ({ ...prev, items: defaultItems }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollDetail = async (id) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/developer/payroll/${id}`);
      const data = await res.json();
      if (data.success) {
        setPayrollDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPayrolls();
    }
  }, [isAdmin]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/developer/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Payroll run created successfully!');
        setShowCreateModal(false);
        fetchPayrolls();
      } else {
        showToastMsg(data.error || 'Failed to create payroll', 'error');
      }
    } catch (err) {
      showToastMsg(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!targetItemToPay) return;
    try {
      setSaving(true);
      const res = await fetch('/api/developer/payroll/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          developer_payroll_id: targetItemToPay.id,
          amount: payForm.amount || targetItemToPay.net_salary,
          payment_method: payForm.payment_method,
          transaction_reference: payForm.transaction_reference,
          notes: payForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Salary payment recorded successfully!');
        setShowPayModal(false);
        if (selectedPayroll) {
          fetchPayrollDetail(selectedPayroll.id);
        }
        fetchPayrolls();
      } else {
        showToastMsg(data.error || 'Failed to record payment', 'error');
      }
    } catch (err) {
      showToastMsg(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayroll = async (id) => {
    if (!confirm('Are you sure you want to delete this payroll run and all its allocations?')) return;
    try {
      const res = await fetch(`/api/developer/payroll/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Payroll run deleted successfully.');
        if (selectedPayroll?.id === id) {
          setSelectedPayroll(null);
          setPayrollDetail(null);
        }
        fetchPayrolls();
      } else {
        showToastMsg(data.error || 'Failed to delete payroll', 'error');
      }
    } catch (err) {
      showToastMsg(err.message, 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto text-3xl">
          <BiCreditCard />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The Payroll & Salary Management system contains sensitive financial data and is strictly restricted to platform Super Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 border ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {toast.type === 'error' ? '⚠️' : '✓'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-widest mb-1">
            <BiCheckShield className="text-base" /> Executive Payroll & Compensation
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Developer Payroll & Salary System
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage developer compensation runs, salary allocations, deductions, and payment disbursement tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPayrolls}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <BiRefresh className="text-xl" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-white font-semibold text-sm shadow-md hover:bg-secondary/90 transition-all active:scale-95"
          >
            <BiPlus className="text-lg" /> Create Payroll Run
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Disbursed</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              <BiDollar />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${Number(stats.total_disbursed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-600 font-medium">Completed platform payouts</div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Payouts</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
              <BiTime />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${Number(stats.pending_payouts || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-amber-600 font-medium">Unpaid developer salaries</div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payroll Runs</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
              <BiCreditCard />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total_runs || 0}</div>
          <div className="text-xs text-indigo-600 font-medium">Historical payment cycles</div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Developers</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
              <BiUser />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.active_developers || 0}</div>
          <div className="text-xs text-purple-600 font-medium">Eligible staff members</div>
        </div>
      </div>

      {/* Main Content: Payroll Runs Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Payroll Disbursement Runs</h2>
          <span className="text-xs text-slate-400 font-semibold">{payrolls.length} total cycles</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">Loading payroll records...</div>
        ) : payrolls.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
              <BiCreditCard />
            </div>
            <p className="text-slate-500 text-sm font-medium">No payroll cycles created yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs text-secondary font-bold hover:underline"
            >
              + Create your first payroll cycle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Title & Period</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Disbursements</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.map((p) => {
                  const isFullyPaid = p.status === 'PAID';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{p.title}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <BiTime /> {new Date(p.pay_period_start).toLocaleDateString()} –{' '}
                          {new Date(p.pay_period_end).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            p.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'APPROVED'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        ${Number(p.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-600">
                          {p.paid_count || 0} / {p.developer_count || 0} Paid
                        </div>
                        <div className="w-28 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${p.developer_count ? (p.paid_count / p.developer_count) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPayroll(p);
                            fetchPayrollDetail(p.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        >
                          Manage Salaries
                        </button>
                        <button
                          onClick={() => handleDeletePayroll(p.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                          title="Delete Payroll Run"
                        >
                          <BiTrash className="text-base" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Payroll Detail Drawer / Section */}
      {selectedPayroll && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-secondary uppercase tracking-widest">Active Payroll Breakdown</span>
              <h2 className="text-xl font-bold text-slate-900">{selectedPayroll.title}</h2>
              <p className="text-xs text-slate-400">
                Period: {new Date(selectedPayroll.pay_period_start).toLocaleDateString()} to{' '}
                {new Date(selectedPayroll.pay_period_end).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPayroll(null);
                setPayrollDetail(null);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 self-start"
            >
              Close Breakdown ✕
            </button>
          </div>

          {detailLoading ? (
            <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading developer salary lines...</div>
          ) : !payrollDetail || !payrollDetail.items || payrollDetail.items.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No developer salary lines found for this run.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Developer</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Base Salary</th>
                    <th className="px-4 py-3">Bonus</th>
                    <th className="px-4 py-3">Deductions</th>
                    <th className="px-4 py-3">Net Salary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollDetail.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.developer_name}</div>
                        <div className="text-xs text-slate-400">{item.developer_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-slate-100 text-slate-600">
                          {item.developer_role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">${Number(item.base_salary).toFixed(2)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">+${Number(item.bonus).toFixed(2)}</td>
                      <td className="px-4 py-3 text-rose-600 font-medium">-${Number(item.deductions).toFixed(2)}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">${Number(item.net_salary).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                            item.payment_status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.payment_status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <BiCheck className="text-lg" /> Paid
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetItemToPay(item);
                              setPayForm({
                                amount: item.net_salary,
                                payment_method: item.payment_method || 'BANK_TRANSFER',
                                transaction_reference: `PAY-${Date.now()}`,
                                notes: '',
                              });
                              setShowPayModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                          >
                            Record Payout
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Payroll Run Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Create New Payroll Cycle</h3>
                <p className="text-xs text-slate-500">Configure pay period and assign compensation per developer.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-light"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payroll Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. October 2026 Developer Salary Run"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Period Start Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.pay_period_start}
                    onChange={(e) => setCreateForm({ ...createForm, pay_period_start: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Period End Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.pay_period_end}
                    onChange={(e) => setCreateForm({ ...createForm, pay_period_end: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary focus:bg-white"
                  />
                </div>
              </div>

              {/* Developer Salary Allocations Table */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Staff Salary Allocations ({createForm.items.length} Developers)
                </label>
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100">
                  {createForm.items.map((itm, idx) => (
                    <div key={itm.developer_id} className="p-3 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="min-w-[140px]">
                        <div className="font-bold text-slate-900">{itm.name}</div>
                        <div className="text-slate-400 capitalize">{itm.role}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                        <div>
                          <label className="block text-[10px] text-slate-400">Base ($)</label>
                          <input
                            type="number"
                            value={itm.base_salary}
                            onChange={(e) => {
                              const next = [...createForm.items];
                              next[idx].base_salary = Number(e.target.value);
                              setCreateForm({ ...createForm, items: next });
                            }}
                            className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400">Bonus ($)</label>
                          <input
                            type="number"
                            value={itm.bonus}
                            onChange={(e) => {
                              const next = [...createForm.items];
                              next[idx].bonus = Number(e.target.value);
                              setCreateForm({ ...createForm, items: next });
                            }}
                            className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400">Deduct ($)</label>
                          <input
                            type="number"
                            value={itm.deductions}
                            onChange={(e) => {
                              const next = [...createForm.items];
                              next[idx].deductions = Number(e.target.value);
                              setCreateForm({ ...createForm, items: next });
                            }}
                            className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Optional internal disbursement notes..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Creating Run...' : 'Initialize Payroll Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && targetItemToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Salary Disbursement</h3>
                <p className="text-xs text-slate-500">
                  Recipient: <span className="font-semibold text-slate-800">{targetItemToPay.developer_name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-light"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Disbursed Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Disbursement Channel</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary focus:bg-white"
                >
                  <option value="BANK_TRANSFER">Direct Wire / Bank Transfer</option>
                  <option value="STRIPE">Stripe Payout</option>
                  <option value="PAYPAL">PayPal Business</option>
                  <option value="CRYPTO">Crypto (USDC / USDT)</option>
                  <option value="CASH">Cash Voucher</option>
                  <option value="CHECK">Company Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Transaction Ref #</label>
                <input
                  type="text"
                  required
                  value={payForm.transaction_reference}
                  onChange={(e) => setPayForm({ ...payForm, transaction_reference: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="Optional bank confirmation code..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Processing...' : 'Confirm Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
