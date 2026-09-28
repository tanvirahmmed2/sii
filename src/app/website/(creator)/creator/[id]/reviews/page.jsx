'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCreator } from '../layout';
import {
  BiStar,
  BiCheckCircle,
  BiCube,
  BiMessageSquareDetail,
  BiLoaderAlt,
  BiPlus,
  BiX,
  BiCheck,
  BiTimeFive,
  BiCheckShield,
  BiErrorCircle,
} from 'react-icons/bi';

export default function CreatorReviewsPage() {
  const params = useParams();
  const creatorId = params?.id;

  const [subscriptions, setSubscriptions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  const fetchReviewsData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/creator/reviews');
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
        setReviews(data.reviews || []);
      } else {
        setErrorMsg(data.error || 'Failed to load reviews.');
      }
    } catch (err) {
      console.error('Failed to fetch creator reviews:', err);
      setErrorMsg('Network error while loading reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch('/api/creator/reviews')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setSubscriptions(data.subscriptions || []);
          setReviews(data.reviews || []);
        } else if (!ignore && !data.success) {
          setErrorMsg(data.error || 'Failed to load reviews.');
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to fetch creator reviews:', err);
          setErrorMsg('Network error while loading reviews.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenReviewModal = (sub) => {
    setSelectedSub(sub);
    setRating(5);
    setTitle('');
    setComment('');
    setModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedSub || !comment.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/creator/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: selectedSub.id,
          rating: Number(rating),
          title: title.trim() || null,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Review submitted successfully!');
        setModalOpen(false);
        await fetchReviewsData();
      } else {
        setErrorMsg(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setErrorMsg('Network error while submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSubs = subscriptions.length;
  const reviewedCount = subscriptions.filter((s) => s.hasReviewed).length;
  const approvedCount = reviews.filter((r) => r.status === 'APPROVED').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Reviews</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Verified Feedback
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Share your authentic platform experience for each package subscription. Submissions are approved by our administration before appearing on the public site.
          </p>
        </div>

        <Link
          href={`/creator/${creatorId}/purchases`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <BiCube className="text-base" />
          <span>View Packages & Subscriptions</span>
        </Link>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <BiCheckCircle className="text-lg flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <BiErrorCircle className="text-lg flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Subscriptions</span>
          <div className="text-2xl font-bold text-slate-900">{totalSubs}</div>
          <p className="text-[11px] text-slate-500">Packages activated on this account</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reviews Submitted</span>
          <div className="text-2xl font-bold text-slate-900">
            {reviewedCount} / {totalSubs}
          </div>
          <p className="text-[11px] text-slate-500">1 review allowed per subscription</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Approved & Live</span>
          <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
          <p className="text-[11px] text-emerald-600 font-medium">Published on public /reviews page</p>
        </div>
      </div>

      {/* Subscriptions & Reviews Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BiMessageSquareDetail className="text-slate-500 text-lg" />
            <span>Your Subscriptions & Feedback Eligibility</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {reviewedCount} of {totalSubs} reviewed
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
            <BiLoaderAlt className="animate-spin text-3xl text-slate-700" />
            <span className="text-xs font-semibold">Loading subscription reviews...</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-3">
            <BiCube className="text-4xl text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Subscriptions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              You must have an active or previous package subscription to submit a verified platform review.
            </p>
            <Link
              href={`/creator/${creatorId}/purchases`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
            >
              <span>Explore Packages & Upgrade</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => {
              const rev = sub.review;
              return (
                <div
                  key={sub.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col gap-4"
                >
                  {/* Subscription Info Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl shrink-0">
                        <BiCube />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {sub.package_name}
                          </h3>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Sub #{sub.id}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              sub.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Started:{' '}
                          {new Date(sub.current_period_start || sub.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Action / Review Status */}
                    {sub.hasReviewed ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold uppercase px-3 py-1 rounded-full border flex items-center gap-1 ${
                            rev?.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : rev?.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <BiCheckShield className="text-sm" />
                          <span>Status: {rev?.status || 'PENDING'}</span>
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          (1 review limit reached)
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenReviewModal(sub)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                      >
                        <BiStar className="text-amber-400 text-sm" />
                        <span>Write Review for this Subscription</span>
                      </button>
                    )}
                  </div>

                  {/* If Reviewed: Show the Review Body */}
                  {sub.hasReviewed && rev && (
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400 text-sm">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <BiStar
                                key={s}
                                className={s <= Number(rev.rating) ? 'fill-current' : 'opacity-25'}
                              />
                            ))}
                          </div>
                          {rev.title && (
                            <h4 className="text-xs font-bold text-slate-800">
                              {rev.title}
                            </h4>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-slate-400">
                          Submitted:{' '}
                          {new Date(rev.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        &ldquo;{rev.comment}&rdquo;
                      </p>

                      {/* Status Explainer */}
                      <div className="pt-2 text-[11px]">
                        {rev.status === 'APPROVED' ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <BiCheckCircle /> Approved by staff & visible to public visitors on /reviews.
                          </span>
                        ) : rev.status === 'REJECTED' ? (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <BiErrorCircle /> Review was rejected during staff moderation.
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <BiTimeFive /> Awaiting Administrator/Manager approval. It will appear on the public /reviews page once approved.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Submission Modal */}
      {modalOpen && selectedSub && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Write Subscription Review
                </h3>
                <p className="text-xs text-slate-500">
                  Reviewing {selectedSub.package_name} (Subscription #{selectedSub.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <BiX className="text-2xl" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Rating <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${
                        s <= rating ? 'text-amber-400' : 'text-slate-200'
                      }`}
                      title={`${s} Star${s > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    {rating} out of 5 Stars
                  </span>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Headline / Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Excellent custom domain setup and fast canvas editor"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Review / Feedback <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your experience with this subscription, platform features, customer support, or site speed..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Notice: Only 1 review can be submitted per subscription. Your review will be published to the public /reviews page upon management approval.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !comment.trim()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <BiLoaderAlt className="animate-spin text-sm" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <BiCheck className="text-base" />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
