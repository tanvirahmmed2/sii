'use client';

import { useState, useEffect, useMemo, useContext } from 'react';
import Link from 'next/link';
import { Context } from '@/components/helper/Context';
import {
  BiSearch,
  BiPlus,
  BiEdit,
  BiTrash,
  BiRefresh,
  BiCheckCircle,
  BiErrorCircle,
  BiLoaderAlt,
  BiShieldQuarter,
  BiLinkExternal,
  BiFile,
  BiX,
} from 'react-icons/bi';

export default function DeveloperPoliciesPage() {
  const { user } = useContext(Context);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    is_published: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('policies') || user?.role === 'admin';

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/policies');
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
    fetch('/api/developer/policies')
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

  const openCreateModal = () => {
    setEditingPolicy(null);
    setFormData({
      title: '',
      slug: '',
      description: '',
      is_published: true,
    });
    setFeedback({ type: '', message: '' });
    setModalOpen(true);
  };

  const openEditModal = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      title: policy.title || '',
      slug: policy.slug || '',
      description: policy.description || '',
      is_published: policy.is_published !== false,
    });
    setFeedback({ type: '', message: '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPolicy(null);
    setFormData({
      title: '',
      slug: '',
      description: '',
      is_published: true,
    });
  };

  const handleTitleChange = (val) => {
    const updated = { ...formData, title: val };
    if (!editingPolicy) {
      updated.slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    setFormData(updated);
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
        ...formData,
        id: editingPolicy?.id,
      };

      const res = await fetch('/api/developer/policies', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: 'success',
          message: editingPolicy ? 'Policy updated successfully.' : 'Policy created successfully.',
        });
        closeModal();
        fetchPolicies();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save policy.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to permanently delete "${title || 'this policy'}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/developer/policies?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Policy deleted successfully.' });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Company Policies &amp; Compliance
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              Compliance
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">
            Manage public legal standards, terms of service, privacy disclosures, and compliance guidelines published on the platform.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchPolicies}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh policies"
            aria-label="Refresh"
          >
            <BiRefresh className="text-lg" />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer shrink-0"
              title="Create Policy"
            >
              <BiPlus className="text-base" />
              <span>Create Policy</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {feedback.type === 'error' ? (
              <BiErrorCircle className="text-base shrink-0" />
            ) : (
              <BiCheckCircle className="text-base shrink-0" />
            )}
            <span className="truncate">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5"
          >
            <BiX className="text-base" />
          </button>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden w-full max-w-full">
        {/* Search & Filter Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search policies by title or content keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <BiX className="text-sm" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto shrink-0 overflow-x-auto">
            {[
              { key: 'ALL', label: `All (${totalCount})` },
              { key: 'PUBLISHED', label: `Published (${publishedCount})` },
              { key: 'DRAFT', label: `Drafts (${draftCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
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
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-12 shrink-0">Type</span>
            <span className="flex-1 min-w-0">Policy Title &amp; Summary</span>
            <span className="w-24 shrink-0 text-center">Status</span>
            <span className="w-24 shrink-0 text-center hidden sm:block">Updated</span>
            <span className="w-24 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
              <span className="text-xs font-semibold">Loading policy documents...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiFile />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Policies Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? `No policies matched "${searchTerm}". Try a different keyword.`
                  : statusFilter !== 'ALL'
                  ? `No policies found in the ${statusFilter.toLowerCase()} filter.`
                  : 'Start adding legal policies, terms, and compliance terms.'}
              </p>
              {canManage && !searchTerm && statusFilter === 'ALL' && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-dark transition-colors cursor-pointer mt-2"
                >
                  <BiPlus />
                  <span>Create First Policy</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 w-full">
              {filtered.map((policy) => {
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
                    className="p-3 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden"
                  >
                    {/* ID */}
                    <span className="w-8 shrink-0 font-mono font-bold text-[11px] text-slate-400 hidden md:block">
                      #{policy.id}
                    </span>

                    {/* Icon Box */}
                    <div className="w-10 h-8 sm:w-12 sm:h-9 rounded-lg border border-secondary/20 bg-secondary/10 text-secondary shrink-0 relative flex items-center justify-center">
                      <BiFile className="text-sm sm:text-base" />
                    </div>

                    {/* Title & Details (SLUGS ARE HIDDEN!) */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => openEditModal(policy)}
                            className="text-xs sm:text-sm font-bold text-slate-900 hover:text-secondary truncate block tracking-tight text-left cursor-pointer"
                            title={policy.title}
                          >
                            {policy.title}
                          </button>
                        ) : (
                          <span
                            className="text-xs sm:text-sm font-bold text-slate-900 truncate block tracking-tight"
                            title={policy.title}
                          >
                            {policy.title}
                          </span>
                        )}
                      </div>

                      {policy.description ? (
                        <p className="text-[11px] text-slate-500 truncate block leading-normal">
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
                      <span
                        className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          policy.is_published !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            policy.is_published !== false ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{policy.is_published !== false ? 'Published' : 'Draft'}</span>
                      </span>
                    </div>

                    {/* Updated Date Column (Tablet/Desktop) */}
                    <div className="w-24 shrink-0 text-center hidden sm:block">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actions Column */}
                    <div className="w-24 shrink-0 flex items-center justify-end gap-1">
                      {policy.slug && (
                        <Link
                          href={`/policies?slug=${policy.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-secondary hover:bg-slate-50 transition-colors"
                          title="View live policy document"
                        >
                          <BiLinkExternal className="text-sm" />
                        </Link>
                      )}

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(policy)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-secondary hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Edit policy"
                          >
                            <BiEdit className="text-sm" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === policy.id}
                            onClick={() => handleDelete(policy.id, policy.title)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete policy"
                          >
                            {deletingId === policy.id ? (
                              <BiLoaderAlt className="animate-spin text-sm" />
                            ) : (
                              <BiTrash className="text-sm" />
                            )}
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

      {/* Create / Edit Policy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 md:p-8 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPolicy ? 'Edit Policy Document' : 'Create Policy Document'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Policy Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Terms of Service, Privacy Policy"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Policy Content / Description
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Full text or legal summary of this policy..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="policy_is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="rounded border-slate-300 text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="policy_is_published" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Publish publicly on platform
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
