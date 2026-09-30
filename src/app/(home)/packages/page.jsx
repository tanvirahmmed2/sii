'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiLoaderAlt,
  BiPackage,
  BiRefresh,
  BiCheckCircle,
  BiSupport,
  BiRocket,
  BiCheckShield,
  BiServer,
  BiMessageSquareDetail,
  BiPhoneCall,
  BiEnvelope,
  BiArrowBack,
  BiX,
} from 'react-icons/bi';
import Package from 'src/component/marketing/home/cards/Package';
import { SITE_MAIL, SITE_CONTACT } from 'src/lib/database/secret';

export default function PackagesPage() {
  const [currency, setCurrency] = useState('USD');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState(null);

  // Quick Custom Package Inquiry Modal state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquirySchool, setInquirySchool] = useState('');
  const [inquiryStudents, setInquiryStudents] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [inquiryError, setInquiryError] = useState('');

  // 1. Fetch available packages
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/packages');
      const data = await res.json();
      if (data.success && Array.isArray(data.packages)) {
        setPackages(data.packages);
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

    // Check creator session to personalize Creator Support link
    fetch('/api/marketing/creator/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'me' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.creator) {
          setCreator(data.creator);
          setInquiryName(data.creator.name || '');
          setInquiryEmail(data.creator.email || '');
        }
      })
      .catch(() => setCreator(null));
  }, []);

  // Sort packages from lowest to highest price based on currency and billing cycle
  const sortedPackages = useMemo(() => {
    return [...(packages || [])].sort((a, b) => {
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

  // Handle custom package inquiry submission
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setInquirySubmitting(true);
    setInquiryError('');
    setInquirySuccess(false);

    try {
      if (creator?.id) {
        // Submit directly to Creator Support Tickets system
        const res = await fetch('/api/marketing/creator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_ticket',
            creatorId: Number(creator.id),
            subject: `Custom Package Request: ${inquirySchool || 'Enterprise Plan'}`,
            category: 'BILLING',
            priority: 'HIGH',
            message: `Custom Package Inquiry from Creator #${creator.id} (${creator.name} / ${creator.email}):
Institution: ${inquirySchool || 'N/A'}
Estimated Student Count: ${inquiryStudents || 'Not specified'}
Requirements:
${inquiryMessage}`,
          }),
        });
        const data = res.ok ? await res.json() : { success: false, error: 'Failed to submit support ticket.' };
        if (data.success) {
          setInquirySuccess(true);
        } else {
          setInquiryError(data.error || 'Failed to submit support ticket.');
        }
      } else {
        // Submit via contact API
        const res = await fetch('/api/marketing/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: inquiryName,
            email: inquiryEmail,
            subject: `Custom Package Inquiry: ${inquirySchool || 'Enterprise Plan'}`,
            message: `Custom Institutional Package Request:
Institution / Organization: ${inquirySchool}
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
          setInquiryError(data.error || 'Failed to send inquiry.');
        }
      }
    } catch (err) {
      setInquiryError('A network error occurred. Please try again.');
    } finally {
      setInquirySubmitting(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-16 space-y-16 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
          <BiRocket className="text-sm" />
          <span>Transparent Pricing & Plans</span>
        </span>

        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Invest in Your Educational Excellence
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Predictable subscription tiers designed for schools, academies, colleges, and training institutes. Every plan includes automated student records, dedicated portal isolation, and instant subdomain provisioning.
        </p>

        {/* Currency & Billing Toggle Controls */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          {/* Currency Switcher */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold ${
                currency === 'USD'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('BDT')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold ${
                currency === 'BDT'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              BDT (৳)
            </button>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 inline-flex items-center gap-2 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-secondary text-white shadow-md shadow-secondary/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'YEARLY'
                  ? 'bg-secondary text-white shadow-md shadow-secondary/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-md font-bold">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl mx-auto shadow-xs">
          <BiLoaderAlt className="animate-spin text-4xl text-secondary mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-semibold">
            Loading subscription packages...
          </p>
        </div>
      ) : sortedPackages.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary text-2xl border border-secondary/20">
            <BiPackage />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No Packages Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Subscription tiers will appear here once published in the administrative system.
          </p>
          <button
            type="button"
            onClick={fetchPackages}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-secondary hover:bg-secondary-dark transition-all cursor-pointer"
          >
            <BiRefresh className="text-base" />
            <span>Refresh Plans</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
            <span>
              Showing {sortedPackages.length} available {sortedPackages.length === 1 ? 'plan' : 'plans'} (arranged from lowest to highest)
            </span>
            <button
              type="button"
              onClick={fetchPackages}
              className="flex items-center gap-1 hover:text-secondary transition-colors cursor-pointer"
            >
              <BiRefresh className="text-sm" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Pricing Cards Grid */}
          <div className={`grid gap-8 ${
            sortedPackages.length === 1
              ? 'max-w-md mx-auto grid-cols-1'
              : sortedPackages.length === 2
              ? 'max-w-3xl mx-auto grid-cols-1 md:grid-cols-2'
              : sortedPackages.length === 3
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {sortedPackages.map((pkg, idx) => {
              const price =
                currency === 'BDT'
                  ? billingCycle === 'YEARLY'
                    ? pkg.yearly_price_bdt
                    : pkg.monthly_price_bdt
                  : billingCycle === 'YEARLY'
                  ? pkg.yearly_price_usd
                    : pkg.monthly_price_usd;

              const hasExplicitPopular = sortedPackages.some((p) => Boolean(p.is_popular));
              const isPopular = hasExplicitPopular
                ? Boolean(pkg.is_popular)
                : sortedPackages.length >= 3 && idx === 1;

              return (
                <Package
                  key={pkg.id}
                  pkg={{ ...pkg, popular: isPopular }}
                  price={price}
                  billingCycle={billingCycle}
                  currency={currency}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Feature Guarantee & Trust Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200/70 dark:border-slate-800">
        <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-secondary flex items-center justify-center text-xl shrink-0">
            <BiRocket />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Instant Provisioning</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Subdomain, SSL encryption, and institutional databases are initialized automatically upon checkout settlement.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
            <BiCheckShield />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Full Data Isolation</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Every institution operates with separated security boundaries, automated audit logs, and encrypted cloud backups.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center text-xl shrink-0">
            <BiServer />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">99.9% High Availability</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Enterprise-grade uptime with geo-redundant server clusters ensuring seamless online classes, exams, and attendance.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* CUSTOM PACKAGE & CREATOR SUPPORT CARD (AT THE BOTTOM)                    */}
      {/* ------------------------------------------------------------------------ */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-8 sm:p-10 lg:p-12 shadow-2xl border border-indigo-500/20">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/15 backdrop-blur-md">
              <BiSupport className="text-secondary text-sm" />
              <span>Enterprise & Custom Institutional Packages</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-snug">
              Need a Custom Package for Your Educational Network?
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Managing a multi-campus school, large university, or district education board? Require custom student capacity, dedicated cloud VPS or on-premise servers, custom tenant modules, or legacy SIS data migration?
            </p>

            {/* Value checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <BiCheckCircle className="text-emerald-400 text-base shrink-0" />
                <span>Custom Student, Teacher & Staff Quotas</span>
              </div>
              <div className="flex items-center gap-2">
                <BiCheckCircle className="text-emerald-400 text-base shrink-0" />
                <span>Dedicated High-Availability Server Clusters</span>
              </div>
              <div className="flex items-center gap-2">
                <BiCheckCircle className="text-emerald-400 text-base shrink-0" />
                <span>Bespoke Tenant Modules & API Integrations</span>
              </div>
              <div className="flex items-center gap-2">
                <BiCheckCircle className="text-emerald-400 text-base shrink-0" />
                <span>Direct 24/7 Creator Support & Dedicated SLA</span>
              </div>
            </div>
          </div>

          {/* Action box */}
          <div className="lg:w-80 shrink-0 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-col gap-3.5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Creator Support Desk</h3>
              <p className="text-[11px] text-slate-300">
                Talk directly with our technical architecture & creator support team.
              </p>
            </div>

            {/* Direct Ticket button */}
            {creator?.id ? (
              <Link
                href={`/creator/${creator.id}/tickets`}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-secondary hover:bg-secondary-dark text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-secondary/30 cursor-pointer"
              >
                <BiSupport className="text-base" />
                <span>Open Creator Support Ticket</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowInquiryModal(true)}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-secondary hover:bg-secondary-dark text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-secondary/30 cursor-pointer"
              >
                <BiSupport className="text-base" />
                <span>Request Custom Package</span>
              </button>
            )}

            {/* Secondary button: Contact desk */}
            <Link
              href="/contact?subject=Custom+Institutional+Package+Request"
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <BiMessageSquareDetail className="text-sm" />
              <span>Contact via Contact Page</span>
            </Link>

            {/* Direct helpline contacts */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5 text-[11px] text-slate-300">
              {SITE_MAIL && (
                <div className="flex items-center gap-2 truncate">
                  <BiEnvelope className="text-secondary shrink-0 text-xs" />
                  <a href={`mailto:${SITE_MAIL}`} className="hover:text-white transition-colors truncate">
                    {SITE_MAIL}
                  </a>
                </div>
              )}
              {SITE_CONTACT && (
                <div className="flex items-center gap-2 truncate">
                  <BiPhoneCall className="text-secondary shrink-0 text-xs" />
                  <a href={`tel:${SITE_CONTACT}`} className="hover:text-white transition-colors truncate">
                    {SITE_CONTACT}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* QUICK CUSTOM PACKAGE INQUIRY MODAL                                       */}
      {/* ------------------------------------------------------------------------ */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowInquiryModal(false);
                setInquirySuccess(false);
                setInquiryError('');
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <BiX className="text-2xl" />
            </button>

            {inquirySuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-3xl mx-auto">
                  <BiCheckCircle />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Custom Request Received!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Thank you! Our Creator Support team has received your custom plan inquiry and will review your institution's specifications shortly.
                </p>
                {creator?.id && (
                  <Link
                    href={`/creator/${creator.id}/tickets`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-secondary text-white hover:bg-secondary-dark transition-all"
                  >
                    <span>View Support Tickets</span>
                  </Link>
                )}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInquiryModal(false);
                      setInquirySuccess(false);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div className="space-y-1 pr-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                    Creator Support Desk
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Custom Package Inquiry
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Let us know what limits, modules, and hosting capabilities your institution needs.
                  </p>
                </div>

                {inquiryError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                    {inquiryError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      placeholder="e.g. Dr. Tanvir"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                      placeholder="contact@school.edu"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Institution Name
                    </label>
                    <input
                      type="text"
                      value={inquirySchool}
                      onChange={(e) => setInquirySchool(e.target.value)}
                      placeholder="e.g. Oxford Grammar School"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Estimated Students
                    </label>
                    <input
                      type="text"
                      value={inquiryStudents}
                      onChange={(e) => setInquiryStudents(e.target.value)}
                      placeholder="e.g. 2,500+"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Requirements & Modules Needed *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    placeholder="Describe desired modules (SIS, LMS, biometric attendance, custom domain, SMS gateway, dedicated VPS, etc.)..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowInquiryModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-secondary hover:bg-secondary-dark transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md shadow-secondary/25"
                  >
                    {inquirySubmitting && <BiLoaderAlt className="animate-spin text-sm" />}
                    <span>{inquirySubmitting ? 'Sending...' : 'Send Inquiry to Support'}</span>
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
