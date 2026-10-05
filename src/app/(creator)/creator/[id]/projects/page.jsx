'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useCreator } from '../layout';

export default function CreatorProjectsListPage() {
  const { creatorId, projects: contextProjects = [], refetch } = useCreator();

  const [projects, setProjects] = useState(contextProjects);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('CUSTOM_FEATURE');
  const [priority, setPriority] = useState('MEDIUM');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchProjects = useCallback(async (showLoading = false) => {
    if (!creatorId) return;
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`/api/marketing/creator/projects?creatorId=${creatorId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        setProjects(data.projects);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    fetchProjects(true);
  }, [fetchProjects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormError('Please enter a project title and description.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const budgetCents = estimatedBudget ? Math.round(parseFloat(estimatedBudget) * 100) : 0;

      const res = await fetch('/api/marketing/creator/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: Number(creatorId),
          title: title.trim(),
          description: description.trim(),
          category,
          budget_in_cents: budgetCents,
          priority,
          target_deadline: deadline || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFormSuccess('Project created successfully.');
        setTitle('');
        setDescription('');
        setEstimatedBudget('');
        setDeadline('');
        await fetchProjects(false);
        if (refetch) await refetch();
        setTimeout(() => {
          setShowCreateModal(false);
          setFormSuccess('');
        }, 1000);
      } else {
        setFormError(data.error || 'Failed to create project.');
      }
    } catch {
      setFormError('Network error creating project.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      !searchTerm.trim() ||
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.status?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Custom Projects
          </h1>
          <p className="text-slate-500 text-xs">
            Bespoke feature development, quotes, project timelines, and developer collaboration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchProjects(true)}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setFormError('');
              setFormSuccess('');
            }}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded p-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
        />

        <div className="flex items-center gap-1 self-start sm:self-auto text-[11px]">
          {['ALL', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white border-slate-900 font-medium'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="border-b border-slate-100 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Projects ({filtered.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 font-medium">
            Loading projects...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            No custom projects found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Project</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Budget</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Deadline</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">
                      {p.title}
                      {p.description && (
                        <span className="block text-[11px] text-slate-400 truncate max-w-xs">
                          {p.description}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-slate-600 capitalize">
                      {String(p.category || '').toLowerCase().replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-slate-50 text-slate-700 border-slate-200">
                        {p.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-900 font-medium">
                      {p.budget_in_cents ? `$${(p.budget_in_cents / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {p.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                      {p.target_deadline ? new Date(p.target_deadline).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        href={`/creator/${creatorId}/projects/${p.id}`}
                        className="text-slate-800 hover:underline font-medium"
                      >
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full p-5 space-y-4 text-xs text-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">Request Custom Project</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student Enrollment Form Integration"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="CUSTOM_FEATURE">Custom Feature</option>
                    <option value="DESIGN">Design & Styling</option>
                    <option value="INTEGRATION">Third-party Integration</option>
                    <option value="BUGFIX">Bug Fix / Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Budget ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150"
                    value={estimatedBudget}
                    onChange={(e) => setEstimatedBudget(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Target Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Project Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail feature requirements, target website, and expected user behavior..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
