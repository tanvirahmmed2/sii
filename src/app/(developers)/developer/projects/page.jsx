'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiBriefcase,
  BiSearch,
  BiRefresh,
  BiTrash,
  BiTimeFive,
  BiCheckCircle,
  BiDollarCircle,
  BiUser,
  BiPlus,
  BiX,
  BiMessageSquareDetail,
  BiLinkExternal,
  BiEditAlt,
  BiFilterAlt,
  BiCalendar,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function AdminProjectsPage() {
  const router = useRouter();
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('projects') || permissions.includes('support') || user?.role_id === 1;

  const [projects, setProjects] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending_review: 0,
    in_progress: 0,
    under_review: 0,
    completed: 0,
    unpaid_quote: 0,
    total_budget_cents: 0,
    total_paid_cents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  // Quick edit status/developer modal
  const [quickEditProject, setQuickEditProject] = useState(null);
  const [quickWorkingStatus, setQuickWorkingStatus] = useState('');
  const [quickPaymentStatus, setQuickPaymentStatus] = useState('');
  const [quickBudget, setQuickBudget] = useState('');
  const [quickPaid, setQuickPaid] = useState('');
  const [quickDevId, setQuickDevId] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 5000);
  };

  const fetchProjects = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/developer/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects || []);
        if (data.developers) setDevelopers(data.developers);
        if (data.stats) setStats(data.stats);
      } else {
        notify(data.error || 'Failed to fetch projects', 'error');
      }
    } catch (e) {
      console.error('Error fetching developer projects:', e);
      notify('Network error fetching projects.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects(true);
  }, [fetchProjects]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!canManage) {
      notify('Permission denied: projects permission required to delete.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to permanently delete this project and all discussion logs?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/developer/projects/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        notify('Project deleted successfully.');
        fetchProjects();
      } else {
        notify(data.error || 'Failed to delete project.', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Network error deleting project.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const openQuickEdit = (p, e) => {
    if (e) e.stopPropagation();
    setQuickEditProject(p);
    setQuickWorkingStatus(p.working_status || 'PENDING_REVIEW');
    setQuickPaymentStatus(p.payment_status || 'PENDING_QUOTE');
    setQuickBudget((Number(p.budget_in_cents || 0) / 100).toFixed(2));
    setQuickPaid((Number(p.paid_amount_in_cents || 0) / 100).toFixed(2));
    setQuickDevId(p.assigned_developer_id ? String(p.assigned_developer_id) : '');
  };

  const handleQuickSave = async (e) => {
    e.preventDefault();
    if (!quickEditProject) return;
    setQuickSaving(true);

    try {
      // 1. Update working status
      if (quickWorkingStatus !== quickEditProject.working_status) {
        await fetch(`/api/developer/projects/${quickEditProject.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_working_status',
            working_status: quickWorkingStatus,
          }),
        });
      }

      // 2. Update payment
      const budgetCents = Math.round(parseFloat(quickBudget || 0) * 100);
      const paidCents = Math.round(parseFloat(quickPaid || 0) * 100);
      await fetch(`/api/developer/projects/${quickEditProject.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_payment',
          budget_in_cents: budgetCents,
          paid_amount_in_cents: paidCents,
          payment_status: quickPaymentStatus,
          currency: quickEditProject.currency || 'USD',
        }),
      });

      // 3. Assign developer
      await fetch(`/api/developer/projects/${quickEditProject.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_developer',
          assigned_developer_id: quickDevId ? Number(quickDevId) : null,
        }),
      });

      notify('Project updated successfully!');
      setQuickEditProject(null);
      await fetchProjects();
    } catch (err) {
      console.error(err);
      notify('Failed to save project updates.', 'error');
    } finally {
      setQuickSaving(false);
    }
  };

  const filtered = projects.filter((p) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'UNPAID') {
        if (p.payment_status !== 'UNPAID' && p.payment_status !== 'PENDING_QUOTE') return false;
      } else if (p.working_status !== statusFilter) {
        return false;
      }
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.project_number?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.creator_name?.toLowerCase().includes(q) ||
      p.creator_email?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.assigned_dev_name?.toLowerCase().includes(q)
    );
  });

  const workingStatusStyles = {
    PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
    ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    UNDER_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ON_HOLD: 'bg-slate-100 text-slate-700 border-slate-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const paymentStatusStyles = {
    PENDING_QUOTE: 'bg-amber-50 text-amber-700 border-amber-200',
    UNPAID: 'bg-rose-50 text-rose-700 border-rose-200',
    PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REFUNDED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <BiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Custom Projects</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Module
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Manage creator custom development requests, project quotations, milestones, payments, and client deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchProjects(true)}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <BiRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Projects</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total || 0}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Pending Review</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending_review || 0}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-medium text-indigo-600 uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.in_progress || 0}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wider">Under Review</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{stats.under_review || 0}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.completed || 0}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Value</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            ${((stats.total_budget_cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'ALL', label: 'All Projects' },
            { id: 'PENDING_REVIEW', label: 'Pending Review' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'UNDER_REVIEW', label: 'Under Review' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'UNPAID', label: 'Unpaid / Quotes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search project, creator, dev..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Projects Table / Card List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <BiRefresh className="w-6 h-6 animate-spin text-slate-400" />
            Loading custom projects...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <BiBriefcase className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No projects found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No custom projects match your filter criteria.'
                : 'Creators have not submitted any custom project requests yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Creator</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Budget & Payment</th>
                  <th className="py-3 px-4">Assigned Dev</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((p) => {
                  const budgetDollars = (Number(p.budget_in_cents || 0) / 100).toFixed(2);
                  const paidDollars = (Number(p.paid_amount_in_cents || 0) / 100).toFixed(2);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/developer/projects/${p.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Project info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                          <span>{p.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            #{p.project_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600">
                            {p.category || 'General'}
                          </span>
                          <span>•</span>
                          <span>{new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Creator */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {p.creator_name || `Creator #${p.creator_id}`}
                        </div>
                        <div className="text-[11px] text-slate-400">{p.creator_email}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            workingStatusStyles[p.working_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {p.working_status ? p.working_status.replace('_', ' ') : 'PENDING'}
                        </span>
                      </td>

                      {/* Budget & Payment */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <span>${budgetDollars}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            (Paid: ${paidDollars})
                          </span>
                        </div>
                        <div className="mt-0.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                              paymentStatusStyles[p.payment_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {p.payment_status ? p.payment_status.replace('_', ' ') : 'PENDING QUOTE'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Dev */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {p.assigned_dev_name ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                            <BiUser className="w-3.5 h-3.5 text-indigo-500" />
                            {p.assigned_dev_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Deadline */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => openQuickEdit(p, e)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Quick Edit Status & Payment"
                          >
                            <BiEditAlt className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            href={`/developer/projects/${p.id}`}
                            className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title="Open Project Workspace & Messages"
                          >
                            <BiMessageSquareDetail className="w-3.5 h-3.5" />
                          </Link>

                          {canManage && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(p.id, e)}
                              disabled={deletingId === p.id}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                              title="Delete Project"
                            >
                              <BiTrash className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* Quick Edit Modal */}
      {quickEditProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Quick Update: #{quickEditProject.project_number}
                </h3>
                <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                  {quickEditProject.title}
                </p>
              </div>
              <button
                onClick={() => setQuickEditProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <BiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSave} className="p-4 space-y-3.5 text-xs">
              {/* Working Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Working Status
                </label>
                <select
                  value={quickWorkingStatus}
                  onChange={(e) => setQuickWorkingStatus(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-slate-400"
                >
                  <option value="PENDING_REVIEW">PENDING REVIEW</option>
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ON_HOLD">ON HOLD</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={quickPaymentStatus}
                  onChange={(e) => setQuickPaymentStatus(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-slate-400"
                >
                  <option value="PENDING_QUOTE">PENDING QUOTE</option>
                  <option value="UNPAID">UNPAID</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="PAID">PAID</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              {/* Budget & Paid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Quoted Budget ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickBudget}
                    onChange={(e) => setQuickBudget(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-slate-400"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Paid Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickPaid}
                    onChange={(e) => setQuickPaid(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-slate-400"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Assign Developer */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Assigned Developer
                </label>
                <select
                  value={quickDevId}
                  onChange={(e) => setQuickDevId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-slate-400"
                >
                  <option value="">-- Unassigned --</option>
                  {developers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickEditProject(null)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {quickSaving ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
