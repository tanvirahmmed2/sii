'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';
import {
  FiUsers,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiRefreshCw,
  FiCreditCard,
  FiArrowRight,
  FiAlertCircle
} from 'react-icons/fi';

export default function DeveloperPayrollAssignPage() {
  const { user } = useContext(Context);
  const searchParams = useSearchParams();
  const initialPayrollId = searchParams.get('payroll_id') || '';

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdmin = Boolean(
    permissions.includes('payroll') ||
    permissions.includes('*') ||
    Number(user?.id) === 1 ||
    String(user?.email).toLowerCase() === 'tanvir004006@gmail.com'
  );

  const [allocations, setAllocations] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [stats, setStats] = useState({
    total_allocated: 0,
    total_paid: 0,
    total_pending: 0,
    assigned_developers_count: 0,
    total_allocations: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [selectedPayrollFilter, setSelectedPayrollFilter] = useState(initialPayrollId);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    payroll_id: initialPayrollId,
    developer_id: '',
    base_salary: 3000,
    bonus: 0,
    deductions: 0,
    payment_method: 'BANK_TRANSFER',
    notes: '',
  });

  const calculatedNet = useMemo(() => {
    const base = parseFloat(form.base_salary) || 0;
    const bon = parseFloat(form.bonus) || 0;
    const ded = parseFloat(form.deductions) || 0;
    return Math.max(0, base + bon - ded);
  }, [form.base_salary, form.bonus, form.deductions]);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPayrollFilter) params.append('payroll_id', selectedPayrollFilter);
      if (selectedStatusFilter !== 'ALL') params.append('status', selectedStatusFilter);

      const res = await fetch(`/api/marketing/developer/payroll/allocations?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAllocations(data.allocations || []);
        setStats(data.stats || {
          total_allocated: 0,
          total_paid: 0,
          total_pending: 0,
          assigned_developers_count: 0,
          total_allocations: 0,
        });
        setPayrolls(data.payrolls || []);
        setDevelopers(data.developers || []);

        if (!form.payroll_id && data.payrolls?.length > 0) {
          setForm((prev) => ({ ...prev, payroll_id: String(data.payrolls[0].id) }));
        }
      } else {
        showToastMsg(data.error || 'Failed to fetch allocations.', 'error');
      }
    } catch (err) {
      showToastMsg('Network connection error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [selectedPayrollFilter, selectedStatusFilter]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!form.payroll_id || !form.developer_id) {
      showToastMsg('Please select a payroll cycle and developer.', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/marketing/developer/payroll/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        showToastMsg('Developer assigned to payroll cycle successfully.');
        setShowAssignPanel(false);
        setForm({
          payroll_id: form.payroll_id,
          developer_id: '',
          base_salary: 3000,
          bonus: 0,
          deductions: 0,
          payment_method: 'BANK_TRANSFER',
          notes: '',
        });
        fetchAllocations();
      } else {
        showToastMsg(data.error || 'Assignment failed.', 'error');
      }
    } catch (err) {
      showToastMsg('Network error while assigning developer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSaving(true);
      const res = await fetch('/api/marketing/developer/payroll/allocations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          base_salary: editingItem.base_salary,
          bonus: editingItem.bonus,
          deductions: editingItem.deductions,
          payment_status: editingItem.payment_status,
          payment_method: editingItem.payment_method,
          notes: editingItem.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Allocation updated successfully.');
        setEditingItem(null);
        fetchAllocations();
      } else {
        showToastMsg(data.error || 'Update failed.', 'error');
      }
    } catch (err) {
      showToastMsg('Network error while updating.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Remove this developer allocation from the payroll cycle?')) return;
    try {
      const res = await fetch(`/api/marketing/developer/payroll/allocations?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Allocation removed.');
        fetchAllocations();
      } else {
        showToastMsg(data.error || 'Removal failed.', 'error');
      }
    } catch (err) {
      showToastMsg('Network error.', 'error');
    }
  };

  const filteredAllocations = allocations.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(item.developer_name || '').toLowerCase().includes(q) ||
      String(item.developer_email || '').toLowerCase().includes(q) ||
      String(item.payroll_title || '').toLowerCase().includes(q) ||
      String(item.developer_role_name || '').toLowerCase().includes(q)
    );
  });

  if (loading && allocations.length === 0) {
    return <LoadingScreen message="Loading developer payroll allocations..." />;
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
            Assign Salaries to Developers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Allocate salary structures, bonuses, deductions, and payment methods for each staff member.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAllocations}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FiRefreshCw className="text-xs" />
            <span>Refresh</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAssignPanel(!showAssignPanel)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FiPlus className="text-xs" />
              <span>{showAssignPanel ? 'Close Form' : 'Assign Developer'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <Link
          href="/developer/payroll"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          Payroll Runs
        </Link>
        <Link
          href="/developer/payroll/assign"
          className="px-3 py-1.5 rounded font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
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
            <span className="text-xs font-normal">Total Allocated</span>
            <FiDollarSign className="text-blue-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ${Number(stats.total_allocated || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Across all allocations</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Paid Allocations</span>
            <FiCheckCircle className="text-emerald-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ${Number(stats.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Successfully disbursed</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Pending Payouts</span>
            <FiClock className="text-amber-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ${Number(stats.total_pending || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Awaiting payment</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Assigned Staff</span>
            <FiUsers className="text-violet-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {Number(stats.assigned_developers_count || 0)}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Distinct developers</span>
        </div>
      </div>

      {showAssignPanel && (
        <form
          onSubmit={handleAssignSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Assign Salary to Developer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Attach compensation and deduction breakdown for a specific cycle.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAssignPanel(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Target Payroll Cycle
              </label>
              <select
                required
                value={form.payroll_id}
                onChange={(e) => setForm({ ...form, payroll_id: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400 cursor-pointer"
              >
                <option value="">Select Payroll Run</option>
                {payrolls.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({new Date(p.pay_period_start).toLocaleDateString()} to {new Date(p.pay_period_end).toLocaleDateString()}) [{p.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Developer / Staff Member
              </label>
              <select
                required
                value={form.developer_id}
                onChange={(e) => setForm({ ...form, developer_id: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400 cursor-pointer"
              >
                <option value="">Select Developer</option>
                {developers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.email}) - {d.role_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Base Salary ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.base_salary}
                onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Bonus / Incentive ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.bonus}
                onChange={(e) => setForm({ ...form, bonus: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Deductions ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.deductions}
                onChange={(e) => setForm({ ...form, deductions: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Net Salary
              </label>
              <div className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium">
                ${calculatedNet.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Payment Method
              </label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400 cursor-pointer"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
                <option value="CASH">Cash</option>
                <option value="CRYPTO">Crypto</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Allocation Notes
              </label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAssignPanel(false)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-normal transition-colors cursor-pointer"
            >
              {saving ? 'Assigning...' : 'Save Allocation'}
            </button>
          </div>
        </form>
      )}

      {editingItem && (
        <form
          onSubmit={handleUpdateItem}
          className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 rounded p-5 shadow-xs space-y-4"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Edit Developer Allocation: {editingItem.developer_name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cycle: {editingItem.payroll_title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Base Salary ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={editingItem.base_salary}
                onChange={(e) => setEditingItem({ ...editingItem, base_salary: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Bonus ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingItem.bonus}
                onChange={(e) => setEditingItem({ ...editingItem, bonus: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Deductions ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingItem.deductions}
                onChange={(e) => setEditingItem({ ...editingItem, deductions: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Payment Status
              </label>
              <select
                value={editingItem.payment_status}
                onChange={(e) => setEditingItem({ ...editingItem, payment_status: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400 cursor-pointer"
              >
                <option value="UNPAID">UNPAID</option>
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Payment Method
              </label>
              <select
                value={editingItem.payment_method || 'BANK_TRANSFER'}
                onChange={(e) => setEditingItem({ ...editingItem, payment_method: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400 cursor-pointer"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
                <option value="CASH">Cash</option>
                <option value="CRYPTO">Crypto</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Notes
              </label>
              <input
                type="text"
                value={editingItem.notes || ''}
                onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-normal transition-colors cursor-pointer"
            >
              {saving ? 'Updating...' : 'Update Allocation'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPayrollFilter}
            onChange={(e) => setSelectedPayrollFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-normal text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="">All Payroll Cycles</option>
            {payrolls.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-normal text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PAID">PAID</option>
          </select>
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
                <th className="py-2.5 px-3">Developer</th>
                <th className="py-2.5 px-3">Payroll Cycle</th>
                <th className="py-2.5 px-3 text-right">Base Salary</th>
                <th className="py-2.5 px-3 text-right">Bonus</th>
                <th className="py-2.5 px-3 text-right">Deductions</th>
                <th className="py-2.5 px-3 text-right">Net Salary</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-normal">
                    No developer salary allocations found. Click 'Assign Developer' to create one.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.developer_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {item.developer_email} &bull; {item.developer_role_name}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-normal text-slate-900 dark:text-white">{item.payroll_title}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {new Date(item.pay_period_start).toLocaleDateString()} - {new Date(item.pay_period_end).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-normal">
                      ${Number(item.base_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-normal">
                      +${Number(item.bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-red-600 font-normal">
                      -${Number(item.deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      ${Number(item.net_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-normal whitespace-nowrap">
                      {item.payment_method || 'BANK_TRANSFER'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-normal ${
                        item.payment_status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {item.payment_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1.5">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-normal transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      )}

                      {item.payment_status !== 'PAID' && isAdmin && (
                        <Link
                          href={`/developer/payroll/payments?allocation_id=${item.id}`}
                          className="inline-block px-2 py-1 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-normal hover:bg-slate-800 transition-colors"
                        >
                          Disburse
                        </Link>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

