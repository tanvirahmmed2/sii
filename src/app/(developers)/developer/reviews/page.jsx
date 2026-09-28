'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import { Context } from '@/components/helper/Context';
import {
  BiStar,
  BiCheckCircle,
  BiXCircle,
  BiTrash,
  BiRefresh,
  BiCube,
  BiUser,
  BiCheckShield,
  BiTimeFive,
  BiLoaderAlt,
  BiMessageSquareDetail,
  BiCheck,
  BiX,
} from 'react-icons/bi';

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
      const res = await fetch('/api/developer/reviews');
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
    fetch('/api/developer/reviews')
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
      const res = await fetch('/api/developer/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: `Review #${reviewId} has been successfully ${newStatus.toLowerCase()}!`,
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

  const handleDelete = async (reviewId) => {
    if (!canModerate) return;
    if (!confirm('Are you sure you want to permanently delete this review?')) return;

    setActionLoadingId(reviewId);
    setActionNotice({ text: '', type: '' });

    try {
      const res = await fetch(`/api/developer/reviews?id=${reviewId}`, {
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
    return String(r.status).toUpperCase() === statusFilter;
  });

  const totalCount = reviews.length;
  const pendingCount = reviews.filter((r) => String(r.status).toUpperCase() === 'PENDING').length;
  const approvedCount = reviews.filter((r) => String(r.status).toUpperCase() === 'APPROVED').length;
  const rejectedCount = reviews.filter((r) => String(r.status).toUpperCase() === 'REJECTED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reviews Moderation</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Admin & Manager Approval
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Review and approve authentic client reviews submitted by creators per subscription. Approved reviews appear on the public /reviews page and homepage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchReviews(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <BiRefresh className="text-base" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 ${
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
            <BiX className="text-lg" />
          </button>
        </div>
      )}

      {/* Permission Notice */}
      {!canModerate && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
          <BiCheckShield className="text-base shrink-0" />
          <span>
            You do not have permission to moderate reviews. Management requires the <strong className="font-mono">reviews</strong> permission.
          </span>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ALL' ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500 mb-1">Total Reviews</div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'PENDING' ? 'border-amber-600 ring-2 ring-amber-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-amber-600 mb-1">Pending Approval</div>
          <div className="text-2xl font-black text-amber-700">{pendingCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`bg-white border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'APPROVED' ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-600 mb-1">Approved & Live</div>
          <div className="text-2xl font-black text-emerald-700">{approvedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`bg-white border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'REJECTED' ? 'border-rose-600 ring-2 ring-rose-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-rose-600 mb-1">Rejected</div>
          <div className="text-2xl font-black text-rose-700">{rejectedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
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
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 text-slate-400">
            <BiLoaderAlt className="animate-spin text-3xl text-slate-700" />
            <span className="text-xs font-semibold">Loading reviews for moderation...</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
            <BiMessageSquareDetail className="text-4xl text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No reviews found</h3>
            <p className="text-xs text-slate-400">
              {statusFilter !== 'ALL'
                ? `No reviews match status filter: ${statusFilter}.`
                : 'No reviews have been submitted by creators yet.'}
            </p>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const isApproved = rev.status === 'APPROVED';
            const isRejected = rev.status === 'REJECTED';
            const isPending = rev.status === 'PENDING';
            const isProcessing = actionLoadingId === rev.id;

            return (
              <div
                key={rev.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6 hover:border-slate-300 transition-all"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  {/* Top metadata row */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex text-amber-400 text-sm">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <BiStar
                          key={s}
                          className={s <= Number(rev.rating) ? 'fill-current' : 'opacity-25'}
                        />
                      ))}
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isRejected
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {rev.status}
                    </span>

                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Review #{rev.id}
                    </span>

                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <BiCube className="text-indigo-600" />
                      <span>{rev.package_name}</span>
                      <span className="text-slate-400 font-mono">(Sub #{rev.subscription_id})</span>
                    </span>
                  </div>

                  {/* Title & Comment */}
                  {rev.title && (
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {rev.title}
                    </h3>
                  )}

                  <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  {/* Creator Info Footer */}
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      {rev.creator_avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={rev.creator_avatar}
                          alt={rev.creator_name}
                          className="w-6 h-6 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
                          {rev.creator_name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                      )}
                      <span>
                        By <strong className="text-slate-800">{rev.creator_name}</strong> ({rev.creator_email})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Submitted {new Date(rev.created_at).toLocaleDateString()}</span>
                      {rev.approved_by_name && (
                        <span className="text-emerald-700 font-medium">
                          • {rev.status === 'APPROVED' ? 'Approved' : 'Reviewed'} by {rev.approved_by_name} ({rev.approved_by_role})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Moderation Controls (Admin & Manager only) */}
                <div className="flex items-center gap-2 self-end md:self-start shrink-0 pt-2 md:pt-0">
                  {canModerate ? (
                    <>
                      {!isApproved && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(rev.id, 'APPROVED')}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          title="Approve and publish to public /reviews page"
                        >
                          {isProcessing ? (
                            <BiLoaderAlt className="animate-spin text-sm" />
                          ) : (
                            <BiCheck className="text-base" />
                          )}
                          <span>Approve</span>
                        </button>
                      )}

                      {!isRejected && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(rev.id, 'REJECTED')}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          title="Reject review"
                        >
                          <BiX className="text-base" />
                          <span>Reject</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleDelete(rev.id)}
                        className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete review"
                      >
                        <BiTrash className="text-base" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400 italic">
                      Admin/Manager only
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
