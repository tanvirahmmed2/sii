'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';

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
      const res = await fetch('/api/marketing/developer/projects');
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
      const res = await fetch(`/api/marketing/developer/projects/${id}`, {
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
        await fetch(`/api/marketing/developer/projects/${quickEditProject.id}`, {
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
      await fetch(`/api/marketing/developer/projects/${quickEditProject.id}`, {
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
      await fetch(`/api/marketing/developer/projects/${quickEditProject.id}`, {
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
    PENDING_REVIEW: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    ACCEPTED: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    UNDER_REVIEW: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    COMPLETED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    ON_HOLD: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    CANCELLED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  };

  const paymentStatusStyles = {
    PENDING_QUOTE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    UNPAID: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    PARTIAL: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    REFUNDED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-3 rounded flex items-center justify-between text-xs font-normal shadow-xs transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-medium ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">Custom Projects</h1>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Module
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage creator custom development requests, project quotations, milestones, payments, and client deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchProjects(true)}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 text-xs font-normal"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Projects</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white mt-0.5">{stats.total || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Review</p>
          <p className="text-xl font-semibold text-amber-700 dark:text-amber-300 mt-0.5">{stats.pending_review || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">In Progress</p>
          <p className="text-xl font-semibold text-indigo-700 dark:text-indigo-300 mt-0.5">{stats.in_progress || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Under Review</p>
          <p className="text-xl font-semibold text-purple-700 dark:text-purple-300 mt-0.5">{stats.under_review || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</p>
          <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.completed || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Value</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white mt-0.5">
            ${((stats.total_budget_cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full flex-wrap">
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
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search project, creator, dev..."
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading custom projects...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">No projects found</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No custom projects match your filter criteria.'
                : 'Creators have not submitted any custom project requests yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Creator</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Budget &amp; Payment</th>
                  <th className="py-3 px-4">Assigned Dev</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filtered.map((p) => {
                  const budgetDollars = (Number(p.budget_in_cents || 0) / 100).toFixed(2);
                  const paidDollars = (Number(p.paid_amount_in_cents || 0) / 100).toFixed(2);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/developer/projects/${p.id}`)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Project info */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{p.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            #{p.project_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400">
                            {p.category || 'General'}
                          </span>
                          <span>•</span>
                          <span>{new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Creator */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {p.creator_name || `Creator #${p.creator_id}`}
                        </div>
                        <div className="text-[11px] text-slate-400">{p.creator_email}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${
                            workingStatusStyles[p.working_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {p.working_status ? p.working_status.replace('_', ' ') : 'PENDING'}
                        </span>
                      </td>

                      {/* Budget & Payment */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <span>${budgetDollars}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            (Paid: ${paidDollars})
                          </span>
                        </div>
                        <div className="mt-0.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border uppercase tracking-wider ${
                              paymentStatusStyles[p.payment_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {p.payment_status ? p.payment_status.replace('_', ' ') : 'PENDING QUOTE'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Dev */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {p.assigned_dev_name ? (
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {p.assigned_dev_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Deadline */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => openQuickEdit(p, e)}
                            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-normal transition-colors"
                            title="Quick Edit Status & Payment"
                          >
                            Edit
                          </button>

                          <Link
                            href={`/developer/projects/${p.id}`}
                            className="px-2 py-1 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 text-xs font-normal transition-colors"
                          >
                            Workspace
                          </Link>

                          {canManage && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(p.id, e)}
                              disabled={deletingId === p.id}
                              className="px-2 py-1 rounded border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-normal transition-colors disabled:opacity-50"
                              title="Delete Project"
                            >
                              Delete
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  Quick Update: #{quickEditProject.project_number}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                  {quickEditProject.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditProject(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickSave} className="p-4 space-y-3.5 text-xs">
              {/* Working Status */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Working Status
                </label>
                <select
                  value={quickWorkingStatus}
                  onChange={(e) => setQuickWorkingStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
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
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Status
                </label>
                <select
                  value={quickPaymentStatus}
                  onChange={(e) => setQuickPaymentStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
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
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Quoted Budget ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickBudget}
                    onChange={(e) => setQuickBudget(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Paid Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickPaid}
                    onChange={(e) => setQuickPaid(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Assign Developer */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Developer
                </label>
                <select
                  value={quickDevId}
                  onChange={(e) => setQuickDevId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="">-- Unassigned --</option>
                  {developers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickEditProject(null)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs font-normal text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
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
