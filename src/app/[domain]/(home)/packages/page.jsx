'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { SITE_MAIL, SITE_CONTACT } from 'src/lib/database/secret';

export default function TenantDomainPackagesPage() {
  const { website, tenantUrl } = useTenantWebsite();
  const [currency, setCurrency] = useState('BDT');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inquiry form modal state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquirySchool, setInquirySchool] = useState('');
  const [inquiryStudents, setInquiryStudents] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [inquiryError, setInquiryError] = useState('');

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/packages');
      const data = await res.json();
      if (data.success && Array.isArray(data.packages)) {
        setPackages(data.packages.filter((p) => p.is_public !== false && p.is_active !== false));
      } else {
        setPackages([]);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const sortedPackages = useMemo(() => {
    return [...(packages || [])]
      .filter((pkg) => pkg.is_public !== false && pkg.is_active !== false)
      .sort((a, b) => {
        const priceA =
          currency === 'BDT'
            ? billingCycle === 'YEARLY'
              ? Number(a.yearly_price_bdt ?? 0)
              : Number(a.monthly_price_bdt ?? 0)
            : billingCycle === 'YEARLY'
            ? Number(a.yearly_price_usd ?? 0)
            : Number(a.monthly_price_usd ?? 0);

        const priceB =
          currency === 'BDT'
            ? billingCycle === 'YEARLY'
              ? Number(b.yearly_price_bdt ?? 0)
              : Number(b.monthly_price_bdt ?? 0)
            : billingCycle === 'YEARLY'
            ? Number(b.yearly_price_usd ?? 0)
            : Number(b.monthly_price_usd ?? 0);

        if (priceA !== priceB) return priceA - priceB;
        return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
      });
  }, [packages, billingCycle, currency]);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setInquirySubmitting(true);
    setInquiryError('');
    setInquirySuccess(false);

    try {
      const res = await fetch('/api/marketing/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inquiryName,
          email: inquiryEmail,
          subject: `Institutional Package Inquiry: ${inquirySchool || 'Academic Plan'}`,
          message: `Custom Institutional Package Request:
Institution: ${inquirySchool}
Estimated Students: ${inquiryStudents}
Contact Person: ${inquiryName} (${inquiryEmail})
Requirements:
${inquiryMessage}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInquirySuccess(true);
      } else {
        setInquiryError(data.error || 'Failed to submit inquiry.');
      }
    } catch (err) {
      setInquiryError('A network error occurred. Please try again.');
    } finally {
      setInquirySubmitting(false);
    }
  };

  const symbol = currency === 'BDT' ? '৳' : '$';

  return (
    <div className="w-full min-h-screen py-8 md:py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 max-w-4xl mx-auto text-center space-y-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
          Academic Subscriptions &amp; Tiers
        </span>
        <h1 className="text-2xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Institutional Plans &amp; Capabilities
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Comprehensive academic operational plans designed for schools, academies, colleges, and training institutes. Every package includes automated student records and isolated portal modules.
        </p>

        {/* Currency & Billing Toggle */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {/* Currency Switcher */}
          <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800 inline-flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setCurrency('BDT')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer font-medium ${
                currency === 'BDT'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              BDT (৳)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer font-medium ${
                currency === 'USD'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              USD ($)
            </button>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800 inline-flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer font-medium ${
                billingCycle === 'MONTHLY'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
                billingCycle === 'YEARLY'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="max-w-6xl mx-auto space-y-6">
        {loading ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-400">Loading subscription tiers...</span>
          </div>
        ) : sortedPackages.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 shadow-xs">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              [No Plans Available]
            </span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No Published Packages
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Subscription tiers will appear here once officially logged in the system.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedPackages.map((pkg, idx) => {
              const price =
                currency === 'BDT'
                  ? billingCycle === 'YEARLY'
                    ? pkg.yearly_price_bdt
                    : pkg.monthly_price_bdt
                  : billingCycle === 'YEARLY'
                  ? pkg.yearly_price_usd
                  : pkg.monthly_price_usd;

              const isPopular = Boolean(pkg.is_popular) || (sortedPackages.length >= 3 && idx === 1);
              const maxStudents = Number(pkg.max_students ?? 500);
              const maxFaculty = Number(pkg.max_teachers ?? 30) + Number(pkg.max_staff ?? 20);

              const features = Array.isArray(pkg.features)
                ? pkg.features.map((f) => (typeof f === 'string' ? f : f.name || f.description || ''))
                : ['Student Records & SIS', 'Biometric & Routine Rosters', 'Results & Exam Automation', 'Dedicated Institutional Subdomain'];

              return (
                <div
                  key={pkg.id}
                  className={`bg-white dark:bg-slate-900 rounded-md p-6 shadow-xs flex flex-col justify-between space-y-5 border ${
                    isPopular
                      ? 'border-primary ring-1 ring-primary/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {pkg.name}
                      </h3>
                      {isPopular && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          Recommended
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {pkg.tagline || pkg.description || 'Institutional administration plan.'}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-semibold text-slate-900 dark:text-white font-mono">
                          {symbol}{Number(price || 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">
                          {billingCycle === 'YEARLY' ? '/ year' : '/ month'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {billingCycle === 'YEARLY' ? 'Billed annually' : 'Billed monthly, cancel anytime'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 uppercase block">Students</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {maxStudents.toLocaleString()} Enrolled
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 uppercase block">Staff &amp; Faculty</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {maxFaculty} Seats
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Included Modules:
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {features.slice(0, 6).map((feat, fidx) => (
                          <li key={fidx} className="flex items-start gap-2">
                            <span className="text-primary font-bold mt-0.5">•</span>
                            <span className="line-clamp-2">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowInquiryModal(true)}
                      className={`w-full py-2.5 rounded text-xs font-semibold transition-colors cursor-pointer text-center ${
                        isPopular
                          ? 'bg-primary hover:bg-primary-dark text-white'
                          : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                      }`}
                    >
                      Inquire for {pkg.name} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Institutional Plan Callout */}
      <div className="max-w-6xl mx-auto bg-slate-900 text-white rounded-md p-6 sm:p-8 border border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Enterprise &amp; Multi-Campus Networks
          </span>
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Need a Bespoke Institutional Architecture?
          </h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Managing a large multi-branch campus, college board, or district registry? We provide custom student capacity, on-premise VPS deployments, and dedicated SLA contracts.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowInquiryModal(true)}
            className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            Request Custom Quotation →
          </button>
          <Link
            href={tenantUrl('/contact?subject=Custom+Institutional+Package+Request')}
            className="px-5 py-2.5 border border-slate-700 text-white hover:bg-slate-800 rounded text-xs font-semibold transition-colors"
          >
            Contact Registrar
          </Link>
        </div>
      </div>

      {/* Inquiry Modal */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-lg w-full p-6 shadow-xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Direct Registry Inquiry
                </span>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                  Institutional Plan Inquiry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInquiryModal(false);
                  setInquirySuccess(false);
                  setInquiryError('');
                }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                [Close]
              </button>
            </div>

            {inquirySuccess ? (
              <div className="text-center py-6 space-y-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  [Inquiry Logged]
                </span>
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                  Quotation Request Received
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Thank you! Our institutional coordination desk will review your campus requirements and get back to you with custom terms.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInquiryModal(false);
                      setInquirySuccess(false);
                    }}
                    className="px-4 py-2 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-3 text-xs">
                {inquiryError && (
                  <div className="p-3 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                    {inquiryError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      placeholder="e.g. Dr. Tanvir"
                      className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                      placeholder="principal@school.edu.bd"
                      className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Institution Name
                    </label>
                    <input
                      type="text"
                      value={inquirySchool}
                      onChange={(e) => setInquirySchool(e.target.value)}
                      placeholder="e.g. Ideal Model Academy"
                      className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Estimated Students
                    </label>
                    <input
                      type="text"
                      value={inquiryStudents}
                      onChange={(e) => setInquiryStudents(e.target.value)}
                      placeholder="e.g. 1,500+"
                      className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Requirements &amp; Modules Needed *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    placeholder="Describe specific modules needed (SIS, LMS, biometric attendance, custom domain, SMS gateway, etc.)..."
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInquiryModal(false)}
                    className="px-3 py-1.5 rounded text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {inquirySubmitting ? 'Sending...' : 'Send Inquiry'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
