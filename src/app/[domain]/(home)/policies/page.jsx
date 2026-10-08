'use client';

import React, { useState, useEffect, useMemo, useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function TenantPoliciesPage() {
  const { getApiEndpoint, tenantUrl, website } = useContext(TenantWebsiteContext);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const defaultPolicies = [
    {
      id: 'p-1',
      title: 'Academic Integrity & Examination Regulations',
      description: 'Students must strictly follow examination hall codes. Unfair means, copying, or digital device usage inside the exam center will result in immediate disqualification and disciplinary action by the Academic Council.'
    },
    {
      id: 'p-2',
      title: 'Student Code of Conduct & Campus Discipline',
      description: 'Scholars are expected to maintain courteous conduct towards faculty, staff, and peers. Any form of harassment, ragging, vandalism, or unauthorized political gathering on campus grounds is strictly prohibited.'
    },
    {
      id: 'p-3',
      title: 'Tuition Fees & Billing Schedule Policy',
      description: 'Tuition rates are due by the designated cutoff day of each calendar month. Late clearing is subject to automated fine assessments as determined by the institutional finance registry.'
    },
    {
      id: 'p-4',
      title: 'Residential Hostel Allocation & Curfew Rules',
      description: 'Hostel admissions observe strict gender-segregated dormitories. Resident scholars must observe evening check-in curfews and report leaves to the resident hall provost in writing.'
    },
    {
      id: 'p-5',
      title: 'Student Data Privacy & Credential Security',
      description: 'All candidate credentials, transcripts, and financial records are safeguarded. Student accounts are protected under institutional privacy benchmarks, and public inquiries only display verified status indices.'
    }
  ];

  useEffect(() => {
    let active = true;
    fetch(getApiEndpoint('marketing/policies'))
      .then((res) => (res.ok ? res.json() : { success: false }))
      .then((data) => {
        if (!active) return;
        if (data.success && Array.isArray(data.policies) && data.policies.length > 0) {
          setPolicies(data.policies);
        } else {
          setPolicies(defaultPolicies);
        }
      })
      .catch(() => {
        if (!active) return;
        setPolicies(defaultPolicies);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [getApiEndpoint]);

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
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Institutional Governance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Institutional Policies & Regulations
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Official rules, compliance guidelines, and academic codes governing students, faculty, and campus life at {website?.name || 'our institution'}.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="relative">
            <input
              type="text"
              placeholder="Search regulatory clauses and policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading regulatory documentation...</span>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Matching Policies Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No regulatory guidelines matched &ldquo;{searchTerm}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPolicies.map((policy, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={policy.id || index}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                      {policy.title}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                      {isOpen ? '▴' : '▾'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyText(policy)}
                          className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          {copiedId === policy.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                        {policy.description}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Inquiries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Questions regarding disciplinary or academic policy?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Contact the registrar office for guidance.
            </p>
          </div>
          <Link
            href={tenantUrl('/contact')}
            className="px-3.5 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors shrink-0"
          >
            Contact Registrar Office →
          </Link>
        </div>

      </div>
    </div>
  );
}
