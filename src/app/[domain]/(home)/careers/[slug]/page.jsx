'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function CareerDetailPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;
  const { website, tenantUrl } = useTenantWebsite();

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
        const res = await fetch(`/api/marketing/careers/${slug}`);
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

      const res = await fetch(`/api/marketing/careers/${slug}/apply`, {
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
      <div className="w-full min-h-[60vh] flex items-center justify-center py-20">
        <span className="text-xs font-medium text-slate-400">Loading position details...</span>
      </div>
    );
  }

  if (notFound || !career) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-6 rounded-md border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
            [Position Unavailable]
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Position Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This vacancy may have been fulfilled, expired, or removed from the active registry.
          </p>
          <div className="pt-2">
            <Link
              href={tenantUrl('/careers')}
              className="inline-block px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors"
            >
              ← View All Openings
            </Link>
          </div>
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
    <div className="w-full min-h-screen py-8 md:py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Link
            href={tenantUrl('/careers')}
            className="hover:text-primary transition-colors font-medium"
          >
            ← Back to Open Positions
          </Link>
          <span className="text-[11px] font-mono text-slate-400">{career.slug}</span>
        </div>

        {/* Position Header Card */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              {career.department}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {(career.job_type || '').replace('_', ' ')}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {career.location} ({career.workplace_type})
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {(career.experience_level || '').replace('_', ' ')}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {career.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            {career.salary_range && (
              <span className="font-semibold text-slate-900 dark:text-white">
                Scale: {career.salary_range}
              </span>
            )}
            {career.deadline && (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Deadline: {new Date(career.deadline).toLocaleDateString()}
              </span>
            )}
            <span>Posted: {new Date(career.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Content & Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Job Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Role Description &amp; Scope
              </h2>
              <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {career.description}
              </div>
            </div>

            {responsibilities.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Key Responsibilities
                </h2>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {requirements.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Qualifications &amp; Requirements
                </h2>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {benefits.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Benefits &amp; Institutional Perks
                </h2>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {benefits.map((ben, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      <span>{ben}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Application Form */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              {submitSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    [Submission Received]
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Application Logged Successfully
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Thank you for applying. The human resources and academic recruitment committee will review your submission and contact shortlisted candidates.
                  </p>
                  <div className="pt-2">
                    <Link
                      href={tenantUrl('/careers')}
                      className="inline-block px-4 py-2 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
                    >
                      Browse Other Openings
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Submit Candidacy
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Direct application to {website?.name || 'institution'} hiring board.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                      {errorMessage}
                    </div>
                  )}

                  <form onSubmit={handleSubmitApplication} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Jane Doe"
                        value={form.applicant_name}
                        onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                        className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="jane.doe@example.com"
                        value={form.applicant_email}
                        onChange={(e) => setForm({ ...form, applicant_email: e.target.value })}
                        className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+880 1XXXXXXXXX"
                        value={form.applicant_phone}
                        onChange={(e) => setForm({ ...form, applicant_phone: e.target.value })}
                        className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Resume / CV File *
                      </label>
                      <div className="space-y-1.5">
                        <label className="block p-3 rounded border border-dashed border-slate-300 dark:border-slate-700 hover:border-primary text-center cursor-pointer bg-slate-50 dark:bg-slate-950">
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium block">
                            {resumeFileName || 'Select PDF or DOC file (Max 10MB)'}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="url"
                          placeholder="Or paste cloud link (Drive, Dropbox)..."
                          value={form.resume_url}
                          onChange={(e) => setForm({ ...form, resume_url: e.target.value })}
                          className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Cover Letter / Statement of Purpose
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Brief summary of your academic background and teaching philosophy..."
                        value={form.cover_letter}
                        onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
                        className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white font-medium transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {submitting ? 'Submitting Application...' : 'Submit Application'}
                    </button>

                    <p className="text-[10px] text-slate-400 text-center">
                      Applications are processed in accordance with institution confidentiality guidelines.
                    </p>
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
