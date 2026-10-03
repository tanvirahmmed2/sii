'use client';

import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import {
  BiPlus,
  BiEditAlt,
  BiTrash,
  BiCheck,
  BiX,
  BiRefresh,
  BiShieldQuarter,
  BiFile,
  BiSearch,
  BiCheckCircle,
  BiInfoCircle,
  BiChevronDown,
  BiChevronUp,
  BiWorld,
} from 'react-icons/bi';

export default function DeveloperPoliciesPage() {
  const { user } = useContext(Context);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // In-page Editor states (no modal!)
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
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight truncate">
              Company Policies &amp; Compliance
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            Manage public legal standards, terms of service, privacy disclosures, and compliance guidelines. All edits are applied in-page without popups.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchPolicies}
            className="p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh policies"
            aria-label="Refresh"
          >
            <BiRefresh className="text-base" />
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-medium transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer shrink-0"
              title="Create Policy"
            >
              <BiPlus className="text-base" />
              <span>{isEditorOpen && !editingPolicy ? 'Close Form' : 'New Policy'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded flex items-center justify-between text-xs font-normal shadow-xs ${
            feedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {feedback.type === 'error' ? (
              <BiInfoCircle className="text-base shrink-0" />
            ) : (
              <BiCheckCircle className="text-base shrink-0" />
            )}
            <span className="truncate">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-0.5 cursor-pointer"
          >
            <BiX className="text-base" />
          </button>
        </div>
      )}

      {/* In-Page Create / Edit Panel (NO POPUP!) */}
      {isEditorOpen && (
        <div
          ref={editorRef}
          className="bg-white dark:bg-slate-900 border-2 border-secondary/40 dark:border-secondary/60 rounded shadow-md p-5 sm:p-6 transition-all space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
              <h2 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                {editingPolicy ? `Edit Policy: "${editingPolicy.title}"` : 'Create New Policy Document'}
              </h2>
              {editingPolicy && (
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                  #{editingPolicy.id}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={closeEditor}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Close in-page editor"
            >
              <BiX className="text-xl" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Policy Document Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Terms of Service, Privacy Policy, Cookie Compliance"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Web slugs are securely and uniquely auto-generated by the system.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Policy Content / Text <span className="text-rose-500">*</span>
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
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 leading-relaxed font-sans transition-colors"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-normal">
                  Publish publicly on platform website
                </span>
              </label>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded bg-secondary hover:bg-secondary-dark text-white text-xs font-medium shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <BiCheck className="text-base" />
                  <span>{submitting ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden w-full max-w-full">
        {/* Search & Filter Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search policies by title or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded pl-8.5 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <BiX className="text-sm" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded w-full sm:w-auto shrink-0 overflow-x-auto">
            {[
              { key: 'ALL', label: `All (${totalCount})` },
              { key: 'PUBLISHED', label: `Published (${publishedCount})` },
              { key: 'DRAFT', label: `Drafts (${draftCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded text-xs font-normal transition-all cursor-pointer text-center whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive View List (Strictly zero horizontal overflow) */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-10 shrink-0">Icon</span>
            <span className="flex-1 min-w-0">Policy Title &amp; Details</span>
            <span className="w-24 shrink-0 text-center">Status</span>
            <span className="w-24 shrink-0 text-center hidden sm:block">Updated</span>
            <span className="w-28 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-normal">Loading policy documents...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiFile />
              </div>
              <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">No Policies Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {searchTerm
                  ? `No policies matched "${searchTerm}". Try a different keyword.`
                  : statusFilter !== 'ALL'
                  ? `No policies found in the ${statusFilter.toLowerCase()} filter.`
                  : 'Start adding legal policies, terms, and compliance documentation.'}
              </p>
              {canManage && !searchTerm && statusFilter === 'ALL' && (
                <button
                  type="button"
                  onClick={openCreateInPage}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-secondary text-white text-xs font-medium hover:bg-secondary-dark transition-colors cursor-pointer mt-2"
                >
                  <BiPlus className="text-base" />
                  <span>Create First Policy</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 w-full">
              {filtered.map((policy) => {
                const isCurrentlyEditing = editingPolicy?.id === policy.id && isEditorOpen;
                const formattedDate = policy.updated_at || policy.created_at
                  ? new Date(policy.updated_at || policy.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <div
                    key={policy.id}
                    className={`p-3 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden ${
                      isCurrentlyEditing
                        ? 'bg-secondary/5 dark:bg-secondary/10 border-l-4 border-l-secondary'
                        : ''
                    }`}
                  >
                    {/* ID */}
                    <span className="w-8 shrink-0 font-mono font-medium text-[11px] text-slate-400 hidden md:block">
                      #{policy.id}
                    </span>

                    {/* Icon Box */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded border border-secondary/20 bg-secondary/10 text-secondary shrink-0 relative flex items-center justify-center">
                      <BiShieldQuarter className="text-lg" />
                    </div>

                    {/* Title & Details */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => openEditInPage(policy)}
                            className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white hover:text-secondary truncate block tracking-tight text-left cursor-pointer"
                            title={policy.title}
                          >
                            {policy.title}
                          </button>
                        ) : (
                          <span
                            className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate block tracking-tight"
                            title={policy.title}
                          >
                            {policy.title}
                          </span>
                        )}
                        {isCurrentlyEditing && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-white shrink-0">
                            Editing In-Page
                          </span>
                        )}
                      </div>

                      {policy.description ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate block leading-normal">
                          {policy.description}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block">No description added</span>
                      )}

                      {/* Small screen date */}
                      <div className="text-[10px] text-slate-400 sm:hidden pt-0.5">
                        Updated {formattedDate}
                      </div>
                    </div>

                    {/* Status Column */}
                    <div className="w-24 shrink-0 text-center">
                      <button
                        type="button"
                        onClick={() => canManage && handleToggleStatus(policy)}
                        disabled={!canManage}
                        className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          canManage ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
                        } ${
                          policy.is_published !== false
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={canManage ? 'Click to toggle status' : 'Status'}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            policy.is_published !== false ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{policy.is_published !== false ? 'Published' : 'Draft'}</span>
                      </button>
                    </div>

                    {/* Updated Date Column (Tablet/Desktop) */}
                    <div className="w-24 shrink-0 text-center hidden sm:block">
                      <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actions Column */}
                    <div className="w-28 shrink-0 flex items-center justify-end gap-1.5">
                      {policy.slug && (
                        <Link
                          href={`/policies?slug=${policy.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-secondary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          title="View live policy document"
                        >
                          <BiWorld className="text-base" />
                        </Link>
                      )}

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditInPage(policy)}
                            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-secondary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit policy in-page"
                          >
                            <BiEditAlt className="text-base" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === policy.id}
                            onClick={() => handleDelete(policy.id, policy.title)}
                            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete policy"
                          >
                            <BiTrash className="text-base" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
