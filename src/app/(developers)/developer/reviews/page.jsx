'use client';

import { useState, useEffect, useContext, useCallback } from 'react';



export default function AdminReviewsPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canModerate = permissions.includes('reviews');

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
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-medium text-slate-900 tracking-tight">Reviews Moderation</h1>
            <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Admin & Staff Oversight
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Moderate creator testimonials. Creator submissions start as <strong>Pending</strong> and become publicly visible on /reviews once approved.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reviews"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-normal transition-colors cursor-pointer shadow-xs"
          >
            
            <span>Public Page</span>
          </Link>
          <button
            type="button"
            onClick={() => fetchReviews(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded bg-slate-900 text-white hover:bg-slate-800 text-xs font-normal transition-colors cursor-pointer shadow-xs"
          >
            
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded border text-xs font-normal flex items-center justify-between gap-2 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            
          </button>
        </div>
      )}

      {/* Permission Notice */}
      {!canModerate && (
        <div className="p-4 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
          
          <span>
            You do not have permission to moderate reviews. Management requires the <strong className="font-mono">reviews</strong> permission.
          </span>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white border rounded p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ALL' ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-normal text-slate-500 mb-1">Total Reviews</div>
          <div className="text-2xl font-medium text-slate-900">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white border rounded p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'PENDING' ? 'border-amber-600 ring-2 ring-amber-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-normal text-amber-600 mb-1">Pending Approval</div>
          <div className="text-2xl font-medium text-amber-700">{pendingCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`bg-white border rounded p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'APPROVED' ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-normal text-emerald-600 mb-1">Approved & Live</div>
          <div className="text-2xl font-medium text-emerald-700">{approvedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('FEATURED')}
          className={`bg-white border rounded p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'FEATURED' ? 'border-indigo-600 ring-2 ring-indigo-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-normal text-indigo-600 mb-1">Featured Testimonials</div>
          <div className="text-2xl font-medium text-indigo-700">{featuredCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
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
              className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
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
          <div className="p-16 text-center bg-white border border-slate-200 rounded flex flex-col items-center justify-center gap-2 text-slate-400">
            
            <span className="text-xs font-normal">Loading reviews for moderation...</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded space-y-2">
            
            <h3 className="text-base font-medium text-slate-800">No reviews found</h3>
            <p className="text-xs text-slate-400">
              {statusFilter !== 'ALL'
                ? `No reviews match status filter: ${statusFilter}.`
                : 'No reviews have been submitted by creators yet.'}
            </p>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const isApproved = Boolean(rev.is_approved);
            const isProcessing = actionLoadingId === rev.id;

            return (
              <div
                key={rev.id}
                className="bg-white border border-slate-200 rounded p-6 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6 hover:border-slate-300 transition-all"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  {/* Top metadata row */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex text-amber-400 text-sm">
                      {[1, 2, 3, 4, 5].map((s) => <span key={s}>★</span>)}
                    </div>

                    <span
                      className={`text-[10px] font-medium uppercase px-2.5 py-0.5 rounded border ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isApproved ? 'Approved & Live' : 'Pending Approval'}
                    </span>

                    {rev.is_featured && (
                      <span className="text-[10px] font-medium uppercase px-2.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                        Featured
                      </span>
                    )}

                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Review #{rev.id}
                    </span>

                    {(rev.institution_name || rev.package_name) && (
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        
                        <span>{rev.institution_name || rev.package_name}</span>
                        {rev.website_name && (
                          <span className="text-slate-400 font-mono">({rev.website_name})</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Title & Comment */}
                  {rev.title && (
                    <h3 className="text-sm font-medium text-slate-900 leading-snug">
                      {rev.title}
                    </h3>
                  )}

                  <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-3.5 rounded border border-slate-100">
                    &ldquo;{rev.review_text || rev.comment}&rdquo;
                  </p>

                  {/* Creator Info Footer */}
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-900 text-white font-medium flex items-center justify-center text-[10px]">
                        {(rev.reviewer_name || rev.creator_name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <span>
                        By <strong className="text-slate-800">{rev.reviewer_name || rev.creator_name || 'Creator'}</strong>
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

                {/* Moderation Controls (Admin & Staff with 'reviews' permission) */}
                <div className="flex items-center gap-2 self-end md:self-start shrink-0 pt-2 md:pt-0 flex-wrap">
                  {canModerate ? (
                    <>
                      {/* Approve Button */}
                      {!isApproved ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(rev.id, 'APPROVED')}
                          className="flex items-center gap-1 px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          title="Approve and publish to public /reviews page"
                        >
                          
                          <span>Approve</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(rev.id, 'PENDING')}
                          className="flex items-center gap-1 px-3.5 py-2 rounded border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                          title="Set back to pending"
                        >
                          
                          <span>Unapprove</span>
                        </button>
                      )}

                      {/* Featured Toggle */}
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleToggleFeatured(rev.id, !rev.is_featured)}
                        className={`flex items-center gap-1 px-3 py-2 rounded border text-xs font-normal transition-colors cursor-pointer disabled:opacity-50 ${
                          rev.is_featured
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title={rev.is_featured ? 'Remove from featured' : 'Highlight as featured review'}
                      >
                        
                        <span>{rev.is_featured ? 'Featured' : 'Feature'}</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleDelete(rev.id)}
                        className="p-2 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Permanently delete review"
                      >
                        
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

