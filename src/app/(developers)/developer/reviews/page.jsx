'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';

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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Customer Reviews Moderation
            </h1>
            <span className="text-[9px] font-medium uppercase px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              Testimonials
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Moderate creator testimonials and ratings. Approved reviews are highlighted across the main platform.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Link
            href="/reviews"
            target="_blank"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Public Page
          </Link>
          <button
            type="button"
            onClick={() => fetchReviews(true)}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice.text && (
        <div
          className={`p-3 rounded flex items-center justify-between text-xs font-medium transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300'
              : 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'border-slate-900 dark:border-slate-100'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Total Reviews</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'PENDING'
              ? 'border-amber-600'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 mb-1">Pending Approval</div>
          <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">{pendingCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'APPROVED'
              ? 'border-emerald-600'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Approved &amp; Live</div>
          <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{approvedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('FEATURED')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'FEATURED'
              ? 'border-slate-900 dark:border-slate-100'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">Featured</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{featuredCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 flex items-center justify-between gap-4 flex-wrap">
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
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
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
      <div className="space-y-3">
        {loading && reviews.length === 0 ? (
          <LoadingScreen fullScreen={false} label="Loading reviews for moderation..." />
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No reviews found</h3>
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
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Top metadata row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      ★ {ratingNum}/5
                    </span>

                    <span
                      className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded border ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {isApproved ? 'Approved & Live' : 'Pending Approval'}
                    </span>

                    {rev.is_featured && (
                      <span className="text-[9px] font-medium uppercase px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                        Featured
                      </span>
                    )}

                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      #{rev.id}
                    </span>

                    {(rev.institution_name || rev.package_name) && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {rev.institution_name || rev.package_name}
                        {rev.website_name && (
                          <span className="text-slate-400 font-mono ml-1">({rev.website_name})</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Title & Comment */}
                  {rev.title && (
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {rev.title}
                    </h3>
                  )}

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-100 dark:border-slate-800">
                    &ldquo;{rev.review_text || rev.comment}&rdquo;
                  </p>

                  {/* Creator Info Footer */}
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                    <div>
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
                      {!isApproved ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(rev.id, 'APPROVED')}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(rev.id, 'PENDING')}
                          className="px-2.5 py-1 rounded border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Unapprove
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleToggleFeatured(rev.id, !rev.is_featured)}
                        className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                          rev.is_featured
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300'
                            : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {rev.is_featured ? 'Featured' : 'Feature'}
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleDelete(rev.id)}
                        className="px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Delete
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
