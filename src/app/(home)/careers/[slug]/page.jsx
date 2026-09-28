'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiArrowBack,
  BiBriefcase,
  BiMapPin,
  BiTime,
  BiDollarCircle,
  BiCalendar,
  BiUpload,
  BiCheckCircle,
  BiLink,
  BiFile,
  BiUser,
  BiEnvelope,
  BiPhone,
  BiCheckShield,
  BiStar,
} from 'react-icons/bi';

export default function CareerDetailPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;
  const router = useRouter();

  const [career, setCareer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Application form state
  const [form, setForm] = useState({
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    portfolio_url: '',
    linkedin_url: '',
    cover_letter: '',
    resume_url: '',
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadJob() {
      try {
        setLoading(true);
        const res = await fetch(`/api/careers/${slug}`);
        const data = await res.json();
        if (data.success && data.career) {
          setCareer(data.career);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load job details:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      loadJob();
    }
  }, [slug]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be under 10MB');
        return;
      }
      setResumeFile(file);
      setResumeFileName(file.name);
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!form.applicant_name.trim() || !form.applicant_email.trim()) {
      setErrorMessage('Full name and email address are required.');
      return;
    }

    if (!resumeFile && !form.resume_url.trim()) {
      setErrorMessage('Please upload your resume file or provide a direct link.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('applicant_name', form.applicant_name.trim());
      formData.append('applicant_email', form.applicant_email.trim());
      formData.append('applicant_phone', form.applicant_phone.trim());
      formData.append('portfolio_url', form.portfolio_url.trim());
      formData.append('linkedin_url', form.linkedin_url.trim());
      formData.append('cover_letter', form.cover_letter.trim());

      if (resumeFile) {
        formData.append('resume', resumeFile);
      } else if (form.resume_url) {
        formData.append('resume_url', form.resume_url.trim());
      }

      const res = await fetch(`/api/careers/${slug}/apply`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
      } else {
        setErrorMessage(data.error || 'Failed to submit application. Please try again.');
      }
    } catch (err) {
      console.error('Application submission error:', err);
      setErrorMessage('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-slate-950 py-24">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-9 w-9 border-3 border-slate-200 border-t-indigo-600" />
          <p className="text-sm font-semibold text-slate-500">Loading position details...</p>
        </div>
      </div>
    );
  }

  if (notFound || !career) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center bg-slate-50/50 dark:bg-slate-950 py-24 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-500 text-2xl">
            <BiBriefcase />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Position Not Found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This job posting may have been closed, fulfilled, or the URL may be incorrect.
          </p>
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <BiArrowBack /> View All Openings
          </Link>
        </div>
      </div>
    );
  }

  const parseLines = (text) => {
    if (!text) return [];
    return text
      .split('\n')
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  };

  const responsibilities = parseLines(career.responsibilities);
  const requirements = parseLines(career.requirements);
  const benefits = parseLines(career.benefits);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 dark:bg-slate-950 py-10 md:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Back Link */}
        <Link
          href="/careers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <BiArrowBack className="text-lg" /> Back to All Openings
        </Link>

        {/* Job Header Card */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
              {career.department}
            </span>
            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {career.job_type.replace('_', ' ')}
            </span>
            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <BiMapPin className="text-slate-400" />
              {career.location} ({career.workplace_type})
            </span>
            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {career.experience_level.replace('_', ' ')}
            </span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {career.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {career.salary_range && (
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <BiDollarCircle className="text-indigo-600 text-base" />
                <span>{career.salary_range}</span>
              </div>
            )}
            {career.deadline && (
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                <BiTime className="text-base" />
                <span>Deadline: {new Date(career.deadline).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <BiCalendar className="text-base text-slate-400" />
              <span>Posted on {new Date(career.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Content & Application Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Job Details */}
          <div className="lg:col-span-7 space-y-8">
            {/* Overview */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BiStar className="text-indigo-600" />
                Role Overview
              </h2>
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {career.description}
              </div>
            </div>

            {/* Responsibilities */}
            {responsibilities.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  What You’ll Do
                </h2>
                <ul className="space-y-2.5">
                  {responsibilities.map((resp, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {requirements.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  What We’re Looking For
                </h2>
                <ul className="space-y-2.5">
                  {requirements.map((req, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                    >
                      <BiCheckCircle className="text-indigo-600 text-lg mt-0.5 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits & Perks */}
            {benefits.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Benefits & Perks
                </h2>
                <ul className="space-y-2.5">
                  {benefits.map((ben, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                    >
                      <span className="w-2 h-2 rounded-md bg-emerald-500 mt-2 shrink-0" />
                      <span>{ben}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Application Form */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-6">
              {submitSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 text-3xl">
                    <BiCheckCircle />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Application Received!
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Thank you for applying to join our team. Our hiring managers review every submission and will get in touch with you shortly.
                  </p>
                  <Link
                    href="/careers"
                    className="inline-block px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Explore Other Openings
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Apply For This Role
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Fill out the form below. Takes less than 2 minutes.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      {errorMessage}
                    </div>
                  )}

                  <form onSubmit={handleSubmitApplication} className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <BiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Alex Morgan"
                          value={form.applicant_name}
                          onChange={(e) =>
                            setForm({ ...form, applicant_name: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <BiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                        <input
                          type="email"
                          required
                          placeholder="alex@example.com"
                          value={form.applicant_email}
                          onChange={(e) =>
                            setForm({ ...form, applicant_email: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <BiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={form.applicant_phone}
                          onChange={(e) =>
                            setForm({ ...form, applicant_phone: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Resume Upload / Link */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Resume / CV (PDF or DOC) <span className="text-rose-500">*</span>
                      </label>
                      <div className="space-y-2">
                        <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-950/50 transition-colors cursor-pointer text-center">
                          <BiUpload className="text-2xl text-indigo-600 dark:text-indigo-400 mb-1" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {resumeFileName ? resumeFileName : 'Click to upload your resume'}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            PDF, DOC, DOCX up to 10MB
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>

                        <div className="text-center text-[11px] text-slate-400">or link</div>

                        <div className="relative">
                          <BiLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                          <input
                            type="url"
                            placeholder="Direct resume link (Google Drive, Dropbox, etc.)"
                            value={form.resume_url}
                            onChange={(e) => setForm({ ...form, resume_url: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Portfolio / GitHub */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Portfolio / GitHub Profile
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/yourhandle or portfolio URL"
                        value={form.portfolio_url}
                        onChange={(e) =>
                          setForm({ ...form, portfolio_url: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    {/* LinkedIn */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        LinkedIn Profile
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/yourprofile"
                        value={form.linkedin_url}
                        onChange={(e) =>
                          setForm({ ...form, linkedin_url: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    {/* Cover Letter */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Cover Letter / Why You?
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Share a short note about why you are passionate about this role..."
                        value={form.cover_letter}
                        onChange={(e) =>
                          setForm({ ...form, cover_letter: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Application...</span>
                        </>
                      ) : (
                        <span>Submit Application</span>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                      <BiCheckShield className="text-sm text-emerald-500" />
                      <span>Your information is encrypted & kept strictly confidential.</span>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
