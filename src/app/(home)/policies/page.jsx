'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiFile,
  BiSearch,
  BiTime,
  BiCheck,
  BiLoaderAlt,
  BiCheckShield,
  BiChevronDown,
  BiCopy,
  BiRefresh,
} from 'react-icons/bi';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState(0); // Open first policy by default like FAQ
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/policies');
      const data = res.ok ? await res.json() : { success: false };
      if (data.success && Array.isArray(data.policies)) {
        setPolicies(data.policies);
      }
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/marketing/policies')
      .then((res) => (res.ok ? res.json() : { success: false }))
      .then((data) => {
        if (!active) return;
        if (data.success && Array.isArray(data.policies)) {
          setPolicies(data.policies);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load policies:', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredPolicies = useMemo(() => {
    if (!searchTerm.trim()) return policies;
    const q = searchTerm.toLowerCase();
    return policies.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [policies, searchTerm]);

  const handleCopyText = (policy) => {
    if (typeof window !== 'undefined' && policy?.description) {
      navigator.clipboard.writeText(`${policy.title}\n\n${policy.description}`);
      setCopiedId(policy.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };


  return (
    <div className="w-full min-h-screen bg-slate-50/60 dark:bg-slate-950 py-14 md:py-20 px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Hero Header */}
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
          <BiCheckShield className="text-sm" /> Compliance &amp; Trust Center
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Platform Policies &amp; Legal Terms
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Transparency and security are foundational to our platform. Browse our official policies, terms of service, and compliance agreements below.
        </p>

        {/* Search Bar */}
        <div className="pt-2 max-w-xl mx-auto">
          <div className="relative">
            <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search policies or clauses by keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Policies List / Accordion Section */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BiFile className="text-indigo-600 dark:text-indigo-400 text-xl" />
              <span>Official Policies Directory</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredPolicies.length} published document{filteredPolicies.length === 1 ? '' : 's'}. Click any policy to view its full details.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPolicies}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900 text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiRefresh className={`text-sm ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-4 pt-4">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs animate-pulse flex items-center justify-between"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : filteredPolicies.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center my-8 shadow-xs max-w-lg mx-auto space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl">
              <BiFile />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {searchTerm ? 'No Matching Policies Found' : 'No Policies Published Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {searchTerm
                ? `No policy matched "${searchTerm}". Try searching with different keywords.`
                : 'Legal compliance documentation will appear here soon.'}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          /* List View with Accordion Expansion (Like FAQ, No Slugs) */
          <div className="space-y-4 pt-2">
            {filteredPolicies.map((policy, index) => {
              const isOpen = openIndex === index;
              const formattedDate = policy.updated_at || policy.created_at
                ? new Date(policy.updated_at || policy.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : null;

              return (
                <div
                  key={policy.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl transition-all duration-200 overflow-hidden shadow-xs ${
                    isOpen
                      ? 'border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Clickable Header Row */}
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full px-5 sm:px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors ${
                          isOpen
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        <BiFile />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug truncate">
                          {policy.title}
                        </h3>
                        {formattedDate && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <BiTime className="text-xs" />
                            <span>Updated {formattedDate}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen
                          ? 'bg-indigo-600 text-white rotate-180'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <BiChevronDown className="text-xl" />
                    </span>
                  </button>

                  {/* Expanded Policy Details (Like FAQ) */}
                  {isOpen && (
                    <div className="px-5 sm:px-7 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-5">
                      {/* Document Actions Bar */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => handleCopyText(policy)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                          title="Copy policy content"
                        >
                          {copiedId === policy.id ? (
                            <>
                              <BiCheck className="text-emerald-500 text-base" />
                              <span className="text-emerald-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <BiCopy className="text-sm" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Full Policy Description Text */}
                      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {policy.description}
                      </div>

                      {/* Footer Note */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                        <p>
                          By using our platform services, you acknowledge having read and agreed to these terms.
                        </p>
                        <Link
                          href="/contact"
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0"
                        >
                          Contact Legal Team &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Support Box */}
      <div className="max-w-4xl mx-auto pt-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-xs">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Need clarification on any compliance clause?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Our legal and compliance team is available to assist partner institutions with customized agreements.
            </p>
          </div>
          <Link
            href="/contact"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shrink-0 shadow-xs"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
