'use client';

import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';

export default function DeveloperPoliciesPage() {
  const { user } = useContext(Context);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // In-page Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_published: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const editorRef = useRef(null);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('policies') || user?.role === 'admin';

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/policies');
      const data = await res.json();
      if (data.success) {
        setPolicies(data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/marketing/developer/policies')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setPolicies(data.records || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to fetch policies:', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openCreateInPage = () => {
    setEditingPolicy(null);
    setFormData({
      title: '',
      description: '',
      is_published: true,
    });
    setFeedback({ type: '', message: '' });
    setIsEditorOpen(true);
    setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openEditInPage = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      title: policy.title || '',
      description: policy.description || '',
      is_published: policy.is_published !== false,
    });
    setFeedback({ type: '', message: '' });
    setIsEditorOpen(true);
    setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingPolicy(null);
    setFormData({
      title: '',
      description: '',
      is_published: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both title and policy content.' });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      const method = editingPolicy ? 'PUT' : 'POST';
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        is_published: Boolean(formData.is_published),
        id: editingPolicy?.id,
      };

      const res = await fetch('/api/marketing/developer/policies', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: 'success',
          message: editingPolicy ? 'Policy document updated successfully.' : 'Policy document created successfully.',
        });
        closeEditor();
        fetchPolicies();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save policy document.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (policy) => {
    const nextState = !policy.is_published;
    try {
      const res = await fetch('/api/marketing/developer/policies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: policy.id, is_published: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setPolicies((prev) =>
          prev.map((p) => (p.id === policy.id ? { ...p, is_published: nextState, is_active: nextState } : p))
        );
        setFeedback({
          type: 'success',
          message: `"${policy.title}" marked as ${nextState ? 'Published' : 'Draft'}.`,
        });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to change status.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Network error.' });
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to permanently delete "${title || 'this policy'}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/policies?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Policy "${title}" deleted successfully.` });
        if (editingPolicy?.id === id) {
          closeEditor();
        }
        fetchPolicies();
      } else {
        alert(data.error || 'Failed to delete policy.');
      }
    } catch (err) {
      alert(err.message || 'Network error occurred.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return policies.filter((p) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PUBLISHED' && p.is_published !== false) ||
        (statusFilter === 'DRAFT' && p.is_published === false);

      return matchesSearch && matchesStatus;
    });
  }, [policies, searchTerm, statusFilter]);

  const totalCount = policies.length;
  const publishedCount = policies.filter((p) => p.is_published !== false).length;
  const draftCount = totalCount - publishedCount;

  return (
    <div className="w-full space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900">
              Company Policies &amp; Compliance
            </h1>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
              Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage public legal standards, terms of service, privacy disclosures, and compliance guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPolicies}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Refresh
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                if (isEditorOpen && !editingPolicy) {
                  closeEditor();
                } else {
                  openCreateInPage();
                }
              }}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {isEditorOpen && !editingPolicy ? 'Close Form' : 'New Policy'}
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback.message && (
        <div
          className={`p-3 rounded flex items-center justify-between text-xs font-normal ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* In-Page Create / Edit Panel */}
      {isEditorOpen && (
        <div
          ref={editorRef}
          className="bg-white border border-slate-200 rounded p-4 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {editingPolicy ? `Edit Policy: "${editingPolicy.title}"` : 'Create New Policy Document'}
            </h2>
            <button
              type="button"
              onClick={closeEditor}
              className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Policy Document Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Terms of Service, Privacy Policy, Cookie Compliance"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Policy Content / Text <span className="text-rose-600">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formData.description?.length || 0} characters
                </span>
              </div>
              <textarea
                rows={7}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Write full terms, legal guidelines, or privacy clauses..."
                className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-800 leading-relaxed font-sans"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-normal">
                  Publish publicly on platform website
                </span>
              </label>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search policies by title or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
            {[
              { key: 'ALL', label: `All (${totalCount})` },
              { key: 'PUBLISHED', label: `Published (${publishedCount})` },
              { key: 'DRAFT', label: `Drafts (${draftCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-white text-slate-900 font-medium shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Policies Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 w-12">#</th>
                <th className="pb-2">Policy Title &amp; Description</th>
                <th className="pb-2 text-center w-24">Status</th>
                <th className="pb-2 text-center w-24 hidden sm:table-cell">Updated</th>
                <th className="pb-2 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading policies...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No policy documents found.
                  </td>
                </tr>
              ) : (
                filtered.map((policy) => {
                  const isCurrentlyEditing = editingPolicy?.id === policy.id && isEditorOpen;
                  const formattedDate = policy.updated_at || policy.created_at
                    ? new Date(policy.updated_at || policy.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr
                      key={policy.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCurrentlyEditing ? 'bg-slate-50 font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        #{policy.id}
                      </td>

                      <td className="py-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            {canManage ? (
                              <button
                                type="button"
                                onClick={() => openEditInPage(policy)}
                                className="text-xs font-semibold text-slate-900 hover:underline text-left cursor-pointer"
                              >
                                {policy.title}
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-slate-900">
                                {policy.title}
                              </span>
                            )}
                            {isCurrentlyEditing && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 text-slate-700 border-slate-200">
                                Editing
                              </span>
                            )}
                          </div>
                          {policy.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-md">
                              {policy.description}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => canManage && handleToggleStatus(policy)}
                          disabled={!canManage}
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
                            canManage ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            policy.is_published !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {policy.is_published !== false ? 'Published' : 'Draft'}
                        </button>
                      </td>

                      <td className="py-2.5 text-center text-xs text-slate-500 hidden sm:table-cell font-mono">
                        {formattedDate}
                      </td>

                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {policy.slug && (
                            <Link
                              href={`/policies?slug=${policy.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                            >
                              View
                            </Link>
                          )}

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditInPage(policy)}
                                className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === policy.id}
                                onClick={() => handleDelete(policy.id, policy.title)}
                                className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
