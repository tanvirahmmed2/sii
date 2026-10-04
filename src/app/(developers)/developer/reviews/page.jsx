'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import {
  FiStar,
  FiCheck,
  FiX,
  FiTrash2,
  FiRefreshCw,
  FiExternalLink,
  FiAward,
  FiUser,
  FiAlertCircle,
  FiCheckCircle,
  FiMessageSquare,
} from 'react-icons/fi';
import { Context } from 'src/component/helper/Context';

export default function AdminReviewsPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canModerate = permissions.includes('reviews') || user?.role === 'admin' || user?.role === 'manager';

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const fetchReviews = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/reviews');
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch('/api/marketing/developer/reviews')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleModerate = async (reviewId, newStatus) => {
    if (!canModerate || actionLoadingId) return;
    setActionLoadingId(reviewId);
    setActionNotice({ text: '', type: '' });

    try {
      const res = await fetch('/api/marketing/developer/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: `Review #${reviewId} has been successfully updated to ${newStatus.toLowerCase()}!`,
          type: 'success',
        });
        await fetchReviews(false);
      } else {
        setActionNotice({
          text: data.error || `Failed to update review to ${newStatus}.`,
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error moderating review:', err);
      setActionNotice({ text: 'Network error while moderating review.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleFeatured = async (reviewId, newFeatured) => {
    if (!canModerate || actionLoadingId) return;
    setActionLoadingId(reviewId);
    setActionNotice({ text: '', type: '' });

    try {
      const res = await fetch('/api/marketing/developer/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, is_featured: newFeatured }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: `Review #${reviewId} ${newFeatured ? 'marked as featured' : 'removed from featured'}.`,
          type: 'success',
        });
        await fetchReviews(false);
      } else {
        setActionNotice({
          text: data.error || 'Failed to update featured state.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error toggling featured state:', err);
      setActionNotice({ text: 'Network error.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!canModerate) return;
    if (!confirm('Are you sure you want to permanently delete this review?')) return;

    setActionLoadingId(reviewId);
    setActionNotice({ text: '', type: '' });

    try {
      const res = await fetch(`/api/marketing/developer/reviews?id=${reviewId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ text: 'Review permanently removed.', type: 'success' });
        await fetchReviews(false);
      } else {
        setActionNotice({ text: data.error || 'Failed to delete review.', type: 'error' });
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      setActionNotice({ text: 'Network error deleting review.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'FEATURED') return Boolean(r.is_featured);
    if (statusFilter === 'APPROVED') return Boolean(r.is_approved);
    if (statusFilter === 'PENDING') return !r.is_approved;
    return String(r.status).toUpperCase() === statusFilter;
  });

  const totalCount = reviews.length;
  const pendingCount = reviews.filter((r) => !r.is_approved).length;
  const approvedCount = reviews.filter((r) => Boolean(r.is_approved)).length;
  const featuredCount = reviews.filter((r) => Boolean(r.is_featured)).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Customer Reviews Moderation
            </h1>
            <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Testimonials
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Moderate creator testimonials and ratings. Approved reviews are highlighted across the main platform.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Link
            href="/reviews"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <span>Public Page</span>
            <FiExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => fetchReviews(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium shadow-sm transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? <FiCheckCircle className="w-4 h-4 shrink-0" /> : <FiAlertCircle className="w-4 h-4 shrink-0" />}
            <span>{actionNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-5 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'border-indigo-600 ring-2 ring-indigo-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total Reviews</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-5 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'PENDING'
              ? 'border-amber-600 ring-2 ring-amber-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Pending Approval</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-5 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'APPROVED'
              ? 'border-emerald-600 ring-2 ring-emerald-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Approved &amp; Live</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{approvedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('FEATURED')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-5 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'FEATURED'
              ? 'border-indigo-600 ring-2 ring-indigo-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Featured Testimonials</div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{featuredCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: 'ALL', label: 'All Reviews' },
            { key: 'PENDING', label: `Pending (${pendingCount})` },
            { key: 'APPROVED', label: `Approved (${approvedCount})` },
            { key: 'FEATURED', label: `Featured (${featuredCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.key
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredReviews.length} of {totalCount} reviews
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading && reviews.length === 0 ? (
          <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400">
            <FiRefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <span className="text-xs font-normal">Loading reviews for moderation...</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <FiMessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto stroke-1" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No reviews found</h3>
            <p className="text-xs text-slate-400">
              {statusFilter !== 'ALL'
                ? `No reviews match status filter: ${statusFilter}.`
                : 'No reviews have been submitted yet.'}
            </p>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const isApproved = Boolean(rev.is_approved);
            const isProcessing = actionLoadingId === rev.id;
            const ratingNum = Math.max(1, Math.min(5, Number(rev.rating) || 5));

            return (
              <div
                key={rev.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  {/* Top metadata row */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Star Rating */}
                    <div className="flex items-center text-amber-400 text-sm gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= ratingNum ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-md border ${
                        isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {isApproved ? 'Approved & Live' : 'Pending Approval'}
                    </span>

                    {rev.is_featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                        <FiAward className="w-3 h-3" />
                        <span>Featured</span>
                      </span>
                    )}

                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      #{rev.id}
                    </span>

                    {(rev.institution_name || rev.package_name) && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {rev.institution_name || rev.package_name}
                        {rev.website_name && (
                          <span className="text-slate-400 font-mono ml-1">({rev.website_name})</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Title & Comment */}
                  {rev.title && (
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {rev.title}
                    </h3>
                  )}

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic bg-slate-50 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    &ldquo;{rev.review_text || rev.comment}&rdquo;
                  </p>

                  {/* Creator Info Footer */}
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold flex items-center justify-center text-[10px]">
                        {(rev.reviewer_name || rev.creator_name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <span>
                        By <strong className="text-slate-800 dark:text-slate-200 font-medium">{rev.reviewer_name || rev.creator_name || 'Creator'}</strong>
                        {rev.creator_email && ` (${rev.creator_email})`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Submitted: {new Date(rev.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}</span>
                      {rev.creator_id && (
                        <span className="font-mono text-[10px]">
                          Creator ID: #{rev.creator_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Moderation Controls */}
                <div className="flex items-center gap-2 self-end md:self-start shrink-0 pt-2 md:pt-0 flex-wrap">
                  {canModerate ? (
                    <>
                      {/* Approve / Unapprove Button */}
                      {!isApproved ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(rev.id, 'APPROVED')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          title="Approve and publish"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(rev.id, 'PENDING')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                          title="Set back to pending"
                        >
                          <FiX className="w-3.5 h-3.5" />
                          <span>Unapprove</span>
                        </button>
                      )}

                      {/* Featured Toggle */}
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleToggleFeatured(rev.id, !rev.is_featured)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                          rev.is_featured
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                        title={rev.is_featured ? 'Remove from featured' : 'Highlight as featured review'}
                      >
                        <FiAward className="w-3.5 h-3.5" />
                        <span>{rev.is_featured ? 'Featured' : 'Feature'}</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleDelete(rev.id)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer disabled:opacity-50"
                        title="Permanently delete review"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400 italic">
                      Reviews permission required
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
