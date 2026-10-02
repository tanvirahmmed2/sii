'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  BiEdit,
  BiTrash,
  BiGlobe,
} from 'react-icons/bi';

export default function CreatorReviewsPage() {
  const params = useParams();
  const creatorId = params?.id;

  const [review, setReview] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [creatorInfo, setCreatorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
        if (data.creator) setCreatorInfo(data.creator);
      } else {
        setErrorMsg(data.error || 'Failed to load review data.');
      }
    } catch (err) {
      console.error('Failed to fetch creator review:', err);
      setErrorMsg('Network error while loading review.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch('/api/marketing/creator/reviews')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setReview(data.review || null);
          setWebsites(data.websites || []);
          if (data.creator) setCreatorInfo(data.creator);
        } else if (!ignore && !data.success) {
          setErrorMsg(data.error || 'Failed to load review.');
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to fetch creator review:', err);
          setErrorMsg('Network error while loading review.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setRating(5);
    setTitle('');
    setReviewText('');
    setReviewerName(creatorInfo?.name || '');
    setInstitutionName(creatorInfo?.institution || '');
    setSelectedWebsiteId(websites.length > 0 ? String(websites[0].id) : '');
    setModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (!review) return;
    setIsEditing(true);
    setRating(Number(review.rating) || 5);
    setTitle(review.title || '');
    setReviewText(review.review_text || review.comment || '');
    setReviewerName(review.reviewer_name || creatorInfo?.name || '');
    setInstitutionName(review.institution_name || creatorInfo?.institution || '');
    setSelectedWebsiteId(review.website_id ? String(review.website_id) : '');
    setModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/marketing/creator/reviews', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: Number(rating),
          title: title.trim() || null,
          review_text: reviewText.trim(),
          reviewer_name: reviewerName.trim() || creatorInfo?.name || 'Verified Creator',
          institution_name: institutionName.trim() || null,
          website_id: selectedWebsiteId ? Number(selectedWebsiteId) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(
          data.message || (isEditing ? 'Review updated successfully!' : 'Review submitted successfully!')
        );
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

  const handleDeleteReview = async () => {
    if (!review || submitting) return;
    if (!confirm('Are you sure you want to permanently delete your review?')) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/marketing/creator/reviews', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Your review has been successfully removed.');
        setReview(null);
        await fetchReviewsData();
      } else {
        setErrorMsg(data.error || 'Failed to delete review.');
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      setErrorMsg('Network error while deleting review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Review</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Creator Testimonial
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Share your experience with our educational management platform. Each creator can submit one review, which is reviewed by management before publishing publicly.
          </p>
        </div>

        <Link
          href={`/reviews`}
          target="_blank"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <BiGlobe className="text-base" />
          <span>View Public Reviews</span>
        </Link>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BiCheckCircle className="text-lg flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <BiX className="text-lg" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BiErrorCircle className="text-lg flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <BiX className="text-lg" />
          </button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
          <BiLoaderAlt className="animate-spin text-3xl text-slate-700" />
          <span className="text-xs font-semibold">Loading your review...</span>
        </div>
      ) : !review ? (
        /* Empty State: Creator hasn't submitted a review yet */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center text-3xl mx-auto">
            <BiStar />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">
              Submit Your Platform Experience
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              We value your authentic feedback. As a verified institution owner, you can share your rating, feedback, and story. Submitted reviews are held as <strong>Pending</strong> until approved by our moderation team.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 max-w-md mx-auto text-left text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <BiCheckShield className="text-emerald-600 text-base" />
              <span>Review Policy & Moderation:</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-6">
              • Strictly <strong>1 review per creator</strong>.
            </p>
            <p className="text-[11px] text-slate-500 pl-6">
              • Created reviews start with <strong>Pending Approval</strong> status.
            </p>
            <p className="text-[11px] text-slate-500 pl-6">
              • Once approved by management, your testimonial appears on the public site.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
            >
              <BiStar className="text-amber-400 text-base" />
              <span>Write Your Platform Review</span>
            </button>
          </div>
        </div>
      ) : (
        /* Review Card: Creator has already submitted 1 review */
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BiMessageSquareDetail className="text-slate-500 text-lg" />
              <span>Your Submitted Review (1 Allowed)</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Review #{review.id}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            {/* Top row: Stars, Status Badge, and Action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 text-lg">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <BiStar
                      key={s}
                      className={s <= Number(review.rating) ? 'fill-current' : 'opacity-25'}
                    />
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-1">
                    {review.rating} out of 5
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Submitted on: {new Date(review.created_at).toLocaleDateString([], {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}</span>
                  {review.updated_at && review.updated_at !== review.created_at && (
                    <span>• (Edited)</span>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {review.is_approved ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <BiCheckCircle className="text-base" />
                    <span>Approved & Live</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <BiTimeFive className="text-base" />
                    <span>Pending Moderation</span>
                  </span>
                )}
              </div>
            </div>

            {/* Review Title & Body */}
            <div className="space-y-3">
              {review.title && (
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {review.title}
                </h3>
              )}

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                &ldquo;{review.review_text || review.comment}&rdquo;
              </p>
            </div>

            {/* Review Details Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Reviewer Name
                </span>
                <p className="font-semibold text-slate-800">
                  {review.reviewer_name || creatorInfo?.name || 'Verified Creator'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Institution / School
                </span>
                <p className="font-semibold text-slate-800">
                  {review.institution_name || review.website_name || creatorInfo?.institution || 'Educational Institution'}
                </p>
              </div>
            </div>

            {/* Status Information Box */}
            <div className="rounded-2xl p-4 border text-xs">
              {review.is_approved ? (
                <div className="flex items-start gap-2.5 text-emerald-800 bg-emerald-50/50">
                  <BiCheckCircle className="text-lg text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Your review is published!</strong>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      It is now visible on the public /reviews page and social proof widgets across the platform.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-amber-800 bg-amber-50/50">
                  <BiTimeFive className="text-lg text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Review Pending Management Approval</strong>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Your review has been submitted to administrators for moderation. Once approved, it will be published live to the public reviews section.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions: Edit or Delete */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeleteReview}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <BiTrash className="text-sm" />
                <span>Delete Review</span>
              </button>

              <button
                type="button"
                onClick={handleOpenEditModal}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <BiEdit className="text-sm" />
                <span>Edit Review</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Write or Edit Review */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isEditing ? 'Edit Your Platform Review' : 'Write Platform Review'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEditing
                    ? 'Updates will be resubmitted for management approval.'
                    : 'Share your feedback. Only 1 review per creator account is allowed.'}
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

              {/* Reviewer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Name / Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Ahmmed"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                />
              </div>

              {/* Institution Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Institution / School Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Oxford Model School & College"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                />
              </div>

              {/* Associated Website (Optional) */}
              {websites.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Linked Website (Optional)
                  </label>
                  <select
                    value={selectedWebsiteId}
                    onChange={(e) => setSelectedWebsiteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                  >
                    <option value="">None / General Platform Feedback</option>
                    {websites.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.subdomain})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Review Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Headline / Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Outstanding platform for school management and student records"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Review Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your authentic experience with the SaaS platform, fee collection, staff management, or support..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Submitted reviews are set to <strong>Pending</strong> and must be approved by permitted administrators before appearing on the public reviews page.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reviewText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <BiLoaderAlt className="animate-spin text-sm" />
                      <span>{isEditing ? 'Updating...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <>
                      <BiCheck className="text-base" />
                      <span>{isEditing ? 'Save Changes' : 'Submit Review'}</span>
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
