'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import { Context } from '@/components/helper/Context';
import {
  BiSearch,
  BiPlus,
  BiEdit,
  BiTrash,
  BiRefresh,
  BiHelpCircle,
  BiX,
  BiCheckCircle,
  BiErrorCircle,
  BiLoaderAlt,
  BiShieldQuarter,
  BiLockAlt,
} from 'react-icons/bi';

export default function DeveloperFaqsPage() {
  const { user } = useContext(Context);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // In-page form state (NO POPUP MODAL)
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({ question: '', answer: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const formRef = useRef(null);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('faqs');

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/faqs');
      const data = await res.json();
      if (data.success) {
        setFaqs(data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/developer/faqs')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setFaqs(data.records || []);
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
      setFeedback({ type: 'error', message: 'Access denied: faqs permission required to create or edit FAQs.' });
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

      const res = await fetch('/api/developer/faqs', {
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
      const res = await fetch(`/api/developer/faqs?id=${id}`, {
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
      faq.question?.toLowerCase().includes(term) ||
      faq.answer?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Platform FAQs Management
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              Support
            </span>
            {!canManage && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                <BiLockAlt className="text-xs" />
                <span>Read-Only</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">
            Create, update, and manage frequently asked questions displayed on the public /faqs portal.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchFaqs}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh FAQs"
            aria-label="Refresh"
          >
            <BiRefresh className="text-lg" />
          </button>
          {canManage && (
            <button
              type="button"
              onClick={showForm && !editingFaq ? closeForm : openCreateForm}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer shrink-0"
              title="Add New FAQ"
            >
              {showForm && !editingFaq ? (
                <>
                  <BiX className="text-base" />
                  <span>Close Form</span>
                </>
              ) : (
                <>
                  <BiPlus className="text-base" />
                  <span>Add FAQ</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Permission Warning if not admin or manager */}
      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 flex items-center gap-2.5 text-xs">
          <BiShieldQuarter className="text-base text-amber-600 shrink-0" />
          <span>
            You are currently viewing FAQs in read-only mode. Only <strong>Admin</strong> and <strong>Manager</strong> accounts can create, edit, or delete items.
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Integrated In-Page Creation & Edit Form (NO POPUP MODAL) */}
      {/* ========================================================================= */}
      {showForm && (
        <div
          ref={formRef}
          className="bg-white border-2 border-secondary/30 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BiHelpCircle className="text-secondary text-lg" />
              <span>{editingFaq ? `Edit FAQ #${editingFaq.id}` : 'Create New FAQ Item'}</span>
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {feedback.message && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {feedback.type === 'error' ? <BiErrorCircle className="text-base" /> : <BiCheckCircle className="text-base" />}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Question <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g. How do I point my custom domain to the platform?"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Answer <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Detailed explanation answering the question..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-secondary focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <BiLoaderAlt className="animate-spin text-sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <BiCheckCircle className="text-base" />
                    <span>{editingFaq ? 'Update FAQ' : 'Create FAQ'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
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
              placeholder="Search FAQs by question or answer keywords..."
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

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <span className="font-bold text-slate-800">{filteredFaqs.length}</span> of {faqs.length} FAQs
          </div>
        </div>

        {/* Responsive View List (Strictly zero horizontal overflow) */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-12 shrink-0">Type</span>
            <span className="flex-1 min-w-0">Question &amp; Answer Summary</span>
            <span className="w-24 shrink-0 text-center hidden sm:block">Updated</span>
            <span className="w-20 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
              <span className="text-xs font-semibold">Loading FAQs from database...</span>
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiHelpCircle />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No FAQs Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? `No FAQ matching "${searchTerm}". Try a different search term.`
                  : 'Start adding questions and answers for platform users.'}
              </p>
              {canManage && !searchTerm && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-dark transition-colors cursor-pointer mt-2"
                >
                  <BiPlus />
                  <span>Create First FAQ</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 w-full">
              {filteredFaqs.map((faq) => {
                const formattedDate = faq.updated_at || faq.created_at
                  ? new Date(faq.updated_at || faq.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <div
                    key={faq.id}
                    className="p-3 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden"
                  >
                    {/* ID */}
                    <span className="w-8 shrink-0 font-mono font-bold text-[11px] text-slate-400 hidden md:block">
                      #{faq.id}
                    </span>

                    {/* Icon Box */}
                    <div className="w-10 h-8 sm:w-12 sm:h-9 rounded-lg border border-secondary/20 bg-secondary/10 text-secondary shrink-0 relative flex items-center justify-center">
                      <BiHelpCircle className="text-sm sm:text-base" />
                    </div>

                    {/* Question & Answer Details */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => openEditForm(faq)}
                            className="text-xs sm:text-sm font-bold text-slate-900 hover:text-secondary truncate block tracking-tight text-left cursor-pointer"
                            title={faq.question}
                          >
                            {faq.question}
                          </button>
                        ) : (
                          <span
                            className="text-xs sm:text-sm font-bold text-slate-900 truncate block tracking-tight"
                            title={faq.question}
                          >
                            {faq.question}
                          </span>
                        )}
                      </div>

                      {faq.answer ? (
                        <p className="text-[11px] text-slate-500 truncate block leading-normal">
                          {faq.answer}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block">No answer provided</span>
                      )}

                      {/* Small screen date */}
                      <div className="text-[10px] text-slate-400 sm:hidden pt-0.5">
                        Updated {formattedDate}
                      </div>
                    </div>

                    {/* Updated Date Column (Tablet/Desktop) */}
                    <div className="w-24 shrink-0 text-center hidden sm:block">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actions Column */}
                    <div className="w-20 shrink-0 flex items-center justify-end gap-1">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditForm(faq)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-secondary hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Edit FAQ in form"
                          >
                            <BiEdit className="text-sm" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === faq.id}
                            onClick={() => handleDelete(faq.id, faq.question)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete FAQ"
                          >
                            {deletingId === faq.id ? (
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
    </div>
  );
}
