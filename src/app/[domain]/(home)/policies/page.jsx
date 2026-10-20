'use client';

import React, { useState, useEffect, useMemo, useContext } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
    fetch(getApiEndpoint('policies'))
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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">
              Institutional Governance
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
            Institutional Policies &amp; Regulations
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Official rules, compliance guidelines, and academic codes governing students, faculty, and campus life at {website?.name || 'our institution'}.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative"
        >
          <input
            type="text"
            placeholder="Search regulatory clauses and policies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-style w-full py-3 px-4 text-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-primary transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center flex items-center justify-center">
            <div className="loader loader-md" />
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <h3 className="font-serif text-base font-medium text-slate-800 dark:text-slate-200">No Matching Policies Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No regulatory guidelines matched &ldquo;{searchTerm}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredPolicies.map((policy, index) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={policy.id || index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border rounded-2xl shadow-xs transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'border-primary/40 shadow-md shadow-primary/5'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                      {policy.title}
                    </span>
                    <span
                      className={`text-xs w-6 h-6 rounded-full flex items-center justify-center transition-transform shrink-0 ${
                        isOpen
                          ? 'bg-primary/10 text-primary rotate-180'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      ▾
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-5 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800/80 overflow-hidden"
                      >
                        <div className="flex justify-end pt-1">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => handleCopyText(policy)}
                            className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            {copiedId === policy.id ? 'Copied' : 'Copy'}
                          </motion.button>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                          {policy.description}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Inquiries */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-linear-to-br from-white via-slate-50 to-primary/5 dark:from-slate-900 dark:via-slate-900 dark:to-primary/10 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
        >
          <div>
            <h3 className="font-serif text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100">
              Questions regarding disciplinary or academic policy?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Contact the registrar office for guidance.
            </p>
          </div>
          <Link
            href={tenantUrl('/contact')}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-primary/20 transition-all shrink-0"
          >
            Contact Registrar Office &rarr;
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
