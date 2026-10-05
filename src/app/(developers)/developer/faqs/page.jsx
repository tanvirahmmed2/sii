'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import { Context } from 'src/component/helper/Context';

export default function DeveloperFaqsPage() {
  const { user } = useContext(Context);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // In-page form state
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({ question: '', answer: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const formRef = useRef(null);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage =
    permissions.includes('faqs') ||
    user?.role === 'admin' ||
    user?.role === 'manager';

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/faqs');
      const data = await res.json();
      if (data.success) {
        setFaqs(data.records || data.faqs || []);
      }
    } catch (err) {
      console.error('Failed to fetch FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/marketing/developer/faqs')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setFaqs(data.records || data.faqs || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to fetch FAQs:', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openCreateForm = () => {
    if (!canManage) {
      alert('Access denied: faqs permission required.');
      return;
    }
    setEditingFaq(null);
    setFormData({ question: '', answer: '' });
    setFeedback({ type: '', message: '' });
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const openEditForm = (faq) => {
    if (!canManage) {
      alert('Access denied: faqs permission required.');
      return;
    }
    setEditingFaq(faq);
    setFormData({ question: faq.question || '', answer: faq.answer || '' });
    setFeedback({ type: '', message: '' });
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingFaq(null);
    setFormData({ question: '', answer: '' });
    setFeedback({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setFeedback({ type: 'error', message: 'Access denied: faqs permission required to manage FAQs.' });
      return;
    }

    if (!formData.question.trim() || !formData.answer.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both question and answer.' });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      const method = editingFaq ? 'PUT' : 'POST';
      const payload = editingFaq ? { id: editingFaq.id, ...formData } : formData;

      const res = await fetch('/api/marketing/developer/faqs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        closeForm();
        fetchFaqs();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Operation failed.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, question) => {
    if (!canManage) {
      alert('Access denied: faqs permission required.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${question || 'this FAQ'}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/faqs?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setFaqs((prev) => prev.filter((f) => f.id !== id));
        if (editingFaq?.id === id) {
          closeForm();
        }
      } else {
        alert(data.error || 'Failed to delete FAQ.');
      }
    } catch (err) {
      console.error(err);
      alert('Error occurred while deleting FAQ.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (faq.question || '').toLowerCase().includes(term) ||
      (faq.answer || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900">
              Platform FAQs Management
            </h1>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
              Support
            </span>
            {!canManage && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                Read-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, update, and manage frequently asked questions displayed on the public /faqs portal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchFaqs}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Refresh
          </button>
          {canManage && (
            <button
              type="button"
              onClick={showForm && !editingFaq ? closeForm : openCreateForm}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {showForm && !editingFaq ? 'Close Form' : 'Add FAQ'}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-3 text-xs">
          You are currently viewing FAQs in read-only mode. Only administrators and managers can make changes.
        </div>
      )}

      {/* Integrated In-Page Creation & Edit Form */}
      {showForm && (
        <div
          ref={formRef}
          className="bg-white border border-slate-200 rounded p-4 space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              {editingFaq ? `Edit FAQ #${editingFaq.id}` : 'Create New FAQ Item'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          {feedback.message && (
            <div
              className={`p-3 rounded text-xs font-normal ${
                feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Question <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g. How do I point my custom domain to the platform?"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Answer <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Detailed explanation answering the question..."
                className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeForm}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Create FAQ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List Card */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search FAQs by question or answer keywords..."
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

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <span className="font-semibold text-slate-800">{filteredFaqs.length}</span> of {faqs.length} FAQs
          </div>
        </div>

        {/* FAQs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 w-12">#</th>
                <th className="pb-2">Question &amp; Answer Summary</th>
                <th className="pb-2 text-center w-28 hidden sm:table-cell">Updated</th>
                <th className="pb-2 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Loading FAQs...
                  </td>
                </tr>
              ) : filteredFaqs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No FAQs found.
                  </td>
                </tr>
              ) : (
                filteredFaqs.map((faq) => {
                  const formattedDate = faq.updated_at || faq.created_at
                    ? new Date(faq.updated_at || faq.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={faq.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        #{faq.id}
                      </td>

                      <td className="py-2.5">
                        <div className="space-y-0.5">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openEditForm(faq)}
                              className="text-xs font-semibold text-slate-900 hover:underline text-left cursor-pointer"
                            >
                              {faq.question}
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-900">
                              {faq.question}
                            </span>
                          )}

                          {faq.answer ? (
                            <p className="text-[11px] text-slate-500 line-clamp-2 max-w-xl">
                              {faq.answer}
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No answer provided</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 text-center text-xs text-slate-500 hidden sm:table-cell font-mono">
                        {formattedDate}
                      </td>

                      <td className="py-2.5 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditForm(faq)}
                              className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === faq.id}
                              onClick={() => handleDelete(faq.id, faq.question)}
                              className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
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
    </div>
  );
}
