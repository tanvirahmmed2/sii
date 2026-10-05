'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function CreatorReviewsPage() {
  const [review, setReview] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('');

  const fetchReviewsData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/marketing/creator/reviews');
      const data = await res.json();
      if (data.success) {
        setReview(data.review || null);
        setWebsites(data.websites || []);
        if (data.review) {
          setTitle(data.review.title || '');
          setReviewText(data.review.content || '');
          setRating(data.review.rating || 5);
          setReviewerName(data.review.reviewer_name || '');
          setInstitutionName(data.review.institution_name || '');
          setSelectedWebsiteId(data.review.website_id || '');
        }
      } else {
        setErrorMsg(data.error || 'Failed to load review.');
      }
    } catch {
      setErrorMsg('Network error while loading review.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewsData(true);
  }, [fetchReviewsData]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/marketing/creator/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: review ? 'update' : 'create',
          title: title.trim(),
          content: reviewText.trim(),
          rating: Number(rating),
          reviewer_name: reviewerName.trim() || undefined,
          institution_name: institutionName.trim() || undefined,
          website_id: selectedWebsiteId ? Number(selectedWebsiteId) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Review saved successfully.');
        await fetchReviewsData(false);
        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg('');
        }, 1000);
      } else {
        setErrorMsg(data.error || 'Failed to submit review.');
      }
    } catch {
      setErrorMsg('Network error submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!confirm('Are you sure you want to delete your review?')) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/marketing/creator/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      const data = await res.json();
      if (data.success) {
        setReview(null);
        setTitle('');
        setReviewText('');
      } else {
        alert(data.error || 'Failed to delete review.');
      }
    } catch {
      alert('Network error deleting review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Platform Feedback & Reviews
          </h1>
          <p className="text-slate-500 text-xs">
            Share your experience with our SaaS platform and have your testimonial featured.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setModalOpen(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
          >
            {review ? 'Edit Review' : 'Submit Review'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Review Content Card */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">Your Testimonial</h2>
          {review && (
            <span
              className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                review.is_published
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {review.is_published ? 'Featured on Website' : 'Pending Approval'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 font-medium">Loading review...</div>
        ) : !review ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <p>You have not submitted a testimonial yet.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium cursor-pointer"
            >
              Write a Review
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-900 font-semibold text-xs">{review.title}</span>
                <span className="block text-[11px] text-slate-500">
                  Rating: {review.rating} / 5 stars
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
              </span>
            </div>

            <p className="text-slate-700 text-xs leading-normal bg-slate-50 p-3 rounded border border-slate-100">
              &ldquo;{review.content}&rdquo;
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <div>
                Reviewer: <span className="font-medium text-slate-800">{review.reviewer_name || 'Creator'}</span>
                {review.institution_name && <span> &middot; {review.institution_name}</span>}
              </div>

              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="text-slate-800 hover:underline font-medium cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  disabled={submitting}
                  className="text-rose-600 hover:underline font-medium cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full p-5 space-y-4 text-xs text-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {review ? 'Edit Review' : 'Submit Review'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Headline *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excellent platform for educational institutions"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Rating</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value={5}>5 Stars (Exceptional)</option>
                    <option value={4}>4 Stars (Very Good)</option>
                    <option value={3}>3 Stars (Average)</option>
                    <option value={2}>2 Stars (Below Average)</option>
                    <option value={1}>1 Star (Poor)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Attach to Website</label>
                  <select
                    value={selectedWebsiteId}
                    onChange={(e) => setSelectedWebsiteId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="">General Platform</option>
                    {websites.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Your Review *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us what you liked about the studio, website builder, or developer services..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Principal Ahmed"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Institution</label>
                  <input
                    type="text"
                    placeholder="e.g. City Model Academy"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
