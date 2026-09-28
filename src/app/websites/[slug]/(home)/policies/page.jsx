'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BiShieldQuarter,
  BiFile,
  BiSearch,
  BiTime,
  BiShareAlt,
  BiCheck,
  BiPrinter,
  BiLoaderAlt,
  BiCheckShield,
  BiEnvelope,
} from 'react-icons/bi';

function PoliciesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slugParam = searchParams.get('slug');

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadPolicies() {
      try {
        setLoading(true);
        const res = await fetch('/api/policies');
        const data = await res.json();
        if (data.success && Array.isArray(data.policies)) {
          setPolicies(data.policies);
          if (data.policies.length > 0) {
            const initial =
              slugParam && data.policies.some((p) => p.slug === slugParam)
                ? slugParam
                : data.policies[0].slug;
            setSelectedSlug(initial);
          }
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPolicies();
  }, [slugParam]);

  const activePolicy = useMemo(() => {
    return policies.find((p) => p.slug === selectedSlug) || policies[0] || null;
  }, [policies, selectedSlug]);

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return policies;
    const q = searchTerm.toLowerCase();
    return policies.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [policies, searchTerm]);

  const handleSelectPolicy = (slug) => {
    setSelectedSlug(slug);
    router.replace(`/policies?slug=${slug}`, { scroll: false });
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/policies?slug=${selectedSlug}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50 dark:bg-slate-950 py-14 md:py-20 px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Hero Header */}
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
          <BiCheckShield className="text-sm" /> Compliance &amp; Trust Center
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Platform Policies &amp; Legal Terms
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Transparency and security are foundational to our platform. Review our policies, terms of service, privacy disclosures, and compliance agreements.
        </p>

        {/* Search Bar */}
        <div className="pt-2 max-w-md mx-auto">
          <div className="relative">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search policies or clauses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="max-w-6xl mx-auto text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <BiLoaderAlt className="animate-spin text-3xl mx-auto mb-3 text-indigo-600" />
          <p className="text-xs font-semibold text-slate-500">Loading legal documents...</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 space-y-3 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 flex items-center justify-center text-indigo-600 text-2xl">
            <BiFile />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Policies Published Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Our legal compliance documentation will be published here shortly. If you have immediate questions, please contact our support team.
          </p>
          <div className="pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-all"
            >
              <BiEnvelope className="text-sm" />
              <span>Contact Legal Team</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Policy Selector Sidebar */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-2 sticky top-24">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Document Index ({filteredList.length})
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                Official
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              {filteredList.map((p) => {
                const isActive = p.slug === activePolicy?.slug;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPolicy(p.slug)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-bold truncate ${
                          isActive
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {p.title}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        /{p.slug}
                      </p>
                    </div>

                    <BiFile
                      className={`text-lg shrink-0 ${
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 px-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Have questions regarding our legal disclosures? Reach out to{' '}
                <Link href="/contact" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                  Support
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Right Column: Policy Document Reader */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
            {activePolicy ? (
              <>
                {/* Document Header */}
                <div className="border-b border-slate-100 dark:border-slate-800 pb-6 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <BiCheckShield className="text-sm" /> Verified Document
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                        title="Copy direct link to this policy"
                      >
                        {copied ? (
                          <>
                            <BiCheck className="text-emerald-500 text-base" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <BiShareAlt className="text-sm" />
                            <span>Share</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                        title="Print document"
                      >
                        <BiPrinter className="text-sm" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {activePolicy.title}
                  </h2>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BiTime className="text-slate-400 text-sm" />
                      Last updated:{' '}
                      {new Date(activePolicy.updated_at || activePolicy.created_at).toLocaleDateString(
                        'en-US',
                        { year: 'numeric', month: 'long', day: 'numeric' }
                      )}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      Document ID #{activePolicy.id}
                    </span>
                  </div>
                </div>

                {/* Document Body */}
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
                  {activePolicy.description}
                </div>

                {/* Document Footer Notice */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
                  <p>
                    By continuing to use our platform services, you acknowledge that you have read and agreed to these terms.
                  </p>
                  <Link
                    href="/contact"
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0"
                  >
                    Contact Legal Support &rarr;
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <p>Please select a policy from the sidebar to view its contents.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen flex items-center justify-center">
          <BiLoaderAlt className="animate-spin text-3xl text-indigo-600" />
        </div>
      }
    >
      <PoliciesContent />
    </Suspense>
  );
}
