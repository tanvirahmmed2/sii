'use client';

import { useState, useEffect, useContext } from 'react';
import { Context } from 'src/component/helper/Context';

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
      const res = await fetch('/api/marketing/developer/payroll');
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
      const res = await fetch(`/api/marketing/developer/payroll/${id}`);
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
      const res = await fetch('/api/marketing/developer/payroll', {
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
      const res = await fetch('/api/marketing/developer/payroll/payments', {
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
      const res = await fetch(`/api/marketing/developer/payroll/${id}`, { method: 'DELETE' });
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
      <div className="w-full p-8 text-center space-y-4">
        <h2 className="text-xl font-medium text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          The Payroll &amp; Salary Management system contains sensitive financial data and is strictly restricted to platform Super Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded shadow-lg text-xs font-normal flex items-center gap-2 border ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
          }`}
        >
          <span>{toast.type === 'error' ? '!' : '✓'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
            Developer Payroll &amp; Salaries
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage developer compensation cycles, salary allocations, deductions, and payment disbursement tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPayrolls}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal transition-colors cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs shadow-xs transition-colors cursor-pointer"
          >
            Create Payroll Run
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Total Disbursed</span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">
            ${Number(stats.total_disbursed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Completed platform payouts</div>
        </div>

        <div className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Pending Payouts</span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">
            ${Number(stats.pending_payouts || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Unpaid developer salaries</div>
        </div>

        <div className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Payroll Runs</span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">{stats.total_runs || 0}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Historical payment cycles</div>
        </div>

        <div className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Active Developers</span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">{stats.active_developers || 0}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Eligible staff members</div>
        </div>
      </div>

      {/* Main Content: Payroll Runs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white">Payroll Disbursement Runs</h2>
          <span className="text-xs text-slate-400 font-normal">{payrolls.length} total cycles</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading payroll records...</div>
        ) : payrolls.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-slate-500 text-xs font-medium">No payroll cycles created yet.</p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="text-xs text-slate-700 dark:text-slate-300 font-medium hover:underline cursor-pointer"
            >
              + Create your first payroll cycle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-medium text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Title &amp; Period</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Disbursements</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payrolls.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{p.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {new Date(p.pay_period_start).toLocaleDateString()} – {new Date(p.pay_period_end).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                            p.status === 'PAID'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : p.status === 'APPROVED'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        ${Number(p.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {p.paid_count || 0} / {p.developer_count || 0} Paid
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded mt-1 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded"
                            style={{
                              width: `${p.developer_count ? (p.paid_count / p.developer_count) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayroll(p);
                              fetchPayrollDetail(p.id);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Manage Salaries
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayroll(p.id)}
                            className="px-2 py-1 rounded text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
                            title="Delete Payroll Run"
                          >
                            Delete
                          </button>
                        </div>
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block">Active Payroll Breakdown</span>
              <h2 className="text-base font-medium text-slate-900 dark:text-white">{selectedPayroll.title}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Period: {new Date(selectedPayroll.pay_period_start).toLocaleDateString()} to{' '}
                {new Date(selectedPayroll.pay_period_end).toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPayroll(null);
                setPayrollDetail(null);
              }}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 self-start cursor-pointer"
            >
              Close Breakdown ✕
            </button>
          </div>

          {detailLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading developer salary lines...</div>
          ) : !payrollDetail || !payrollDetail.items || payrollDetail.items.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No developer salary lines found for this run.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-medium text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Developer</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Base Salary</th>
                    <th className="px-4 py-2.5">Bonus</th>
                    <th className="px-4 py-2.5">Deductions</th>
                    <th className="px-4 py-2.5">Net Salary</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payrollDetail.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900 dark:text-white">{item.developer_name}</div>
                        <div className="text-[11px] text-slate-400">{item.developer_email}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-normal uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.developer_role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium">${Number(item.base_salary).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400 font-medium">+${Number(item.bonus).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-rose-600 dark:text-rose-400 font-medium">-${Number(item.deductions).toFixed(2)}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">${Number(item.net_salary).toFixed(2)}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                            item.payment_status === 'PAID'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {item.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {item.payment_status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ Paid
                          </span>
                        ) : (
                          <button
                            type="button"
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
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-medium text-slate-900 dark:text-white">Create New Payroll Cycle</h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure pay period and assign compensation per developer.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">Payroll Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. October 2026 Developer Salary Run"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">Period Start Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.pay_period_start}
                    onChange={(e) => setCreateForm({ ...createForm, pay_period_start: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">Period End Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.pay_period_end}
                    onChange={(e) => setCreateForm({ ...createForm, pay_period_end: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Developer Salary Allocations Table */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                  Staff Salary Allocations ({createForm.items.length} Developers)
                </label>
                <div className="max-h-60 overflow-y-auto rounded border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {createForm.items.map((itm, idx) => (
                    <div key={itm.developer_id} className="p-2.5 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="min-w-[140px]">
                        <div className="font-medium text-slate-900 dark:text-white">{itm.name}</div>
                        <div className="text-slate-400 capitalize text-[11px]">{itm.role}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Base ($)</label>
                          <input
                            type="number"
                            value={itm.base_salary}
                            onChange={(e) => {
                              const next = [...createForm.items];
                              next[idx].base_salary = Number(e.target.value);
                              setCreateForm({ ...createForm, items: next });
                            }}
                            className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Bonus ($)</label>
                          <input
                            type="number"
                            value={itm.bonus}
                            onChange={(e) => {
                              const next = [...createForm.items];
                              next[idx].bonus = Number(e.target.value);
                              setCreateForm({ ...createForm, items: next });
                            }}
                            className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Deduct ($)</label>
                          <input
                            type="number"
                            value={itm.deductions}
                            onChange={(e) => {
                              const next = [...createForm.items];
                              next[idx].deductions = Number(e.target.value);
                              setCreateForm({ ...createForm, items: next });
                            }}
                            className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Optional internal disbursement notes..."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-medium text-slate-900 dark:text-white">Record Salary Disbursement</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recipient: <span className="font-medium text-slate-800 dark:text-slate-200">{targetItemToPay.developer_name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">Disbursed Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">Disbursement Channel</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
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
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">Transaction Ref #</label>
                <input
                  type="text"
                  required
                  value={payForm.transaction_reference}
                  onChange={(e) => setPayForm({ ...payForm, transaction_reference: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="Optional bank confirmation code..."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
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
