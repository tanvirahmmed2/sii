'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';
import {
  FiDollarSign,
  FiCalendar,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiPlus,
  FiTrash2,
  FiEye,
  FiRefreshCw,
  FiArrowRight,
  FiCreditCard,
  FiShield
} from 'react-icons/fi';

export default function DeveloperPayrollPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdmin = Boolean(
    permissions.includes('payroll') ||
    permissions.includes('*') ||
    Number(user?.id) === 1 ||
    String(user?.email).toLowerCase() === 'tanvir004006@gmail.com'
  );

  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState({
    total_disbursed: 0,
    pending_payouts: 0,
    total_runs: 0,
    active_developers: 0,
  });
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetail, setPayrollDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    pay_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    pay_period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    notes: '',
    auto_seed_developers: true,
    default_base_salary: 3000,
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
        setStats(data.stats || {
          total_disbursed: 0,
          pending_payouts: 0,
          total_runs: 0,
          active_developers: 0,
        });
        setDevelopers(data.developers || []);
      } else {
        showToastMsg(data.error || 'Failed to load payroll data.', 'error');
      }
    } catch (err) {
      showToastMsg('Network connection error while fetching payrolls.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollDetail = async (id) => {
    try {
      setDetailLoading(true);
      setSelectedPayroll(id);
      const res = await fetch(`/api/marketing/developer/payroll/${id}`);
      const data = await res.json();
      if (data.success) {
        setPayrollDetail(data);
      } else {
        showToastMsg(data.error || 'Failed to fetch payroll details.', 'error');
      }
    } catch (err) {
      showToastMsg('Failed to fetch details.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.pay_period_start || !createForm.pay_period_end) {
      showToastMsg('Please provide a title and pay period dates.', 'error');
      return;
    }

    try {
      setSaving(true);
      let items = [];
      if (createForm.auto_seed_developers && developers.length > 0) {
        const base = parseFloat(createForm.default_base_salary) || 0;
        items = developers.map((dev) => ({
          developer_id: dev.id,
          base_salary: base,
          bonus: 0,
          deductions: 0,
          payment_method: 'BANK_TRANSFER',
          notes: '',
        }));
      }

      const payload = {
        title: createForm.title.trim(),
        pay_period_start: createForm.pay_period_start,
        pay_period_end: createForm.pay_period_end,
        notes: createForm.notes.trim(),
        items,
      };

      const res = await fetch('/api/marketing/developer/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showToastMsg('Payroll run created successfully.');
        setShowCreatePanel(false);
        setCreateForm({
          title: '',
          pay_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
          pay_period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
          notes: '',
          auto_seed_developers: true,
          default_base_salary: 3000,
        });
        fetchPayrolls();
      } else {
        showToastMsg(data.error || 'Creation failed.', 'error');
      }
    } catch (err) {
      showToastMsg('Network error while creating payroll.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/marketing/developer/payroll/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Payroll status updated.');
        fetchPayrolls();
        if (selectedPayroll === id) fetchPayrollDetail(id);
      } else {
        showToastMsg(data.error || 'Update failed.', 'error');
      }
    } catch (err) {
      showToastMsg('Network error.', 'error');
    }
  };

  const handleDeletePayroll = async (id) => {
    if (!window.confirm('Delete this payroll cycle and all associated allocations?')) return;
    try {
      const res = await fetch(`/api/marketing/developer/payroll/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Payroll cycle deleted.');
        if (selectedPayroll === id) {
          setSelectedPayroll(null);
          setPayrollDetail(null);
        }
        fetchPayrolls();
      } else {
        showToastMsg(data.error || 'Deletion failed.', 'error');
      }
    } catch (err) {
      showToastMsg('Network error.', 'error');
    }
  };

  const filteredPayrolls = payrolls.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesSearch = !searchQuery.trim() ||
      String(p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading && payrolls.length === 0) {
    return <LoadingScreen message="Loading payroll cycles..." />;
  }

  return (
    <div className="w-full space-y-5">
      {toast && (
        <div
          className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
          }`}
        >
          <span>{toast.msg}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
            Payroll &amp; Salary Cycles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage company payroll runs, salary disbursement schedules, and team compensation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPayrolls}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FiRefreshCw className="text-xs" />
            <span>Refresh</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreatePanel(!showCreatePanel)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FiPlus className="text-xs" />
              <span>{showCreatePanel ? 'Close Form' : 'New Payroll Run'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <Link
          href="/developer/payroll"
          className="px-3 py-1.5 rounded font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        >
          Payroll Runs
        </Link>
        <Link
          href="/developer/payroll/assign"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          Assign to Developer
        </Link>
        <Link
          href="/developer/payroll/payments"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          Payroll Payments
        </Link>
        <Link
          href="/developer/my-salaries"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          My Salaries
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Total Disbursed</span>
            <FiCheckCircle className="text-emerald-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ${Number(stats.total_disbursed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Completed payouts</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Pending Payouts</span>
            <FiClock className="text-amber-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ${Number(stats.pending_payouts || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Awaiting disbursement</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Total Payroll Runs</span>
            <FiCalendar className="text-blue-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {Number(stats.total_runs || 0)}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Recorded cycles</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Active Developers</span>
            <FiUsers className="text-violet-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {Number(stats.active_developers || developers.length || 0)}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Team staff on record</span>
        </div>
      </div>

      {showCreatePanel && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Create New Payroll Cycle
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set compensation period and allocate staff compensation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreatePanel(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Cycle Title
              </label>
              <input
                type="text"
                required
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Pay Period Start
              </label>
              <input
                type="date"
                required
                value={createForm.pay_period_start}
                onChange={(e) => setCreateForm({ ...createForm, pay_period_start: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Pay Period End
              </label>
              <input
                type="date"
                required
                value={createForm.pay_period_end}
                onChange={(e) => setCreateForm({ ...createForm, pay_period_end: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
              Notes &amp; Description
            </label>
            <textarea
              rows={2}
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-normal text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={createForm.auto_seed_developers}
                onChange={(e) => setCreateForm({ ...createForm, auto_seed_developers: e.target.checked })}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Automatically allocate all active developers ({developers.length} found)</span>
            </label>

            {createForm.auto_seed_developers && (
              <div className="max-w-xs space-y-1">
                <label className="text-xs font-normal text-slate-600 dark:text-slate-400">
                  Default Base Salary ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.default_base_salary}
                  onChange={(e) => setCreateForm({ ...createForm, default_base_salary: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreatePanel(false)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-normal transition-colors cursor-pointer"
            >
              {saving ? 'Creating...' : 'Create Payroll Cycle'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {['ALL', 'DRAFT', 'APPROVED', 'PAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-normal'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal">
                <th className="py-2.5 px-3">Title &amp; Notes</th>
                <th className="py-2.5 px-3">Pay Period</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Allocations</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-normal">
                    No payroll cycles found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((p) => {
                  const statusColors = {
                    DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    APPROVED: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                    PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                    CANCELLED: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                  };

                  const isSelected = selectedPayroll === p.id;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-slate-50 dark:bg-slate-800/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {p.title}
                        </div>
                        {p.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs font-normal">
                            {p.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px] font-normal">
                        <div>{new Date(p.pay_period_start).toLocaleDateString()}</div>
                        <div className="text-slate-400">to {new Date(p.pay_period_end).toLocaleDateString()}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-normal ${statusColors[p.status] || statusColors.DRAFT}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        ${Number(p.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="font-normal text-slate-900 dark:text-white">
                          {p.paid_count || 0} / {p.developer_count || 0}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">paid staff</span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => fetchPayrollDetail(p.id)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-normal transition-colors cursor-pointer"
                        >
                          {isSelected ? 'Close' : 'Details'}
                        </button>

                        <Link
                          href={`/developer/payroll/assign?payroll_id=${p.id}`}
                          className="inline-block px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 text-[11px] font-normal transition-colors"
                        >
                          Assign Staff
                        </Link>

                        {isAdmin && (
                          <select
                            value={p.status}
                            onChange={(e) => handleStatusUpdate(p.id, e.target.value)}
                            className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-normal text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="PAID">PAID</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeletePayroll(p.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPayroll && payrollDetail && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Payroll Cycle Breakdown: {payrollDetail.payroll?.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Period: {new Date(payrollDetail.payroll?.pay_period_start).toLocaleDateString()} to {new Date(payrollDetail.payroll?.pay_period_end).toLocaleDateString()} | Total: ${Number(payrollDetail.payroll?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/developer/payroll/assign?payroll_id=${payrollDetail.payroll?.id}`}
                className="px-3 py-1 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-normal"
              >
                Manage Staff Allocations
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSelectedPayroll(null);
                  setPayrollDetail(null);
                }}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-normal text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Staff Allocations ({payrollDetail.items?.length || 0})
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[11px]">
                    <th className="py-2 px-3">Developer</th>
                    <th className="py-2 px-3">Base Salary</th>
                    <th className="py-2 px-3">Bonus</th>
                    <th className="py-2 px-3">Deductions</th>
                    <th className="py-2 px-3">Net Salary</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  {(!payrollDetail.items || payrollDetail.items.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        No developer allocations attached yet. Click 'Manage Staff Allocations' to assign.
                      </td>
                    </tr>
                  ) : (
                    payrollDetail.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                          {item.developer_name}
                          <span className="text-[10px] text-slate-400 block font-normal">{item.developer_email}</span>
                        </td>
                        <td className="py-2 px-3 font-normal">${Number(item.base_salary || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 font-normal text-emerald-600">+${Number(item.bonus || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 font-normal text-red-600">-${Number(item.deductions || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">${Number(item.net_salary || 0).toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-normal ${
                            item.payment_status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                            {item.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
