'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function FaqsPage() {
  const { getApiEndpoint, tenantUrl, website } = useContext(TenantWebsiteContext);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState(0);

  const defaultFaqs = [
    {
      id: 'd-1',
      question: 'How do candidate students apply for academic admission?',
      answer: 'Prospective students can check published admission circulars under the Admissions menu. Fill in candidate biodata, submit the online form to obtain an Applicant Number, and settle the application fee at the accounts desk.'
    },
    {
      id: 'd-2',
      question: 'Where can students verify term examination mark sheets?',
      answer: 'Term marks and official grade transcripts are published via the Results Portal. Enter your official Student Registration Number and select the examination session to inspect subject marks and print marks documentation.'
    },
    {
      id: 'd-3',
      question: 'What is the procedure for student tuition fee payments?',
      answer: 'Monthly tuition rates and assigned fines can be reviewed via the Payments Ledger. Payments are logged in the cashier desk, and printed receipts are accessible immediately.'
    },
    {
      id: 'd-4',
      question: 'How are hostel housing rooms allocated?',
      answer: 'Residential dormitories strictly follow gender matching rules. Male students are admitted to Male Hostels and female students to Female Hostels. Room requests must be endorsed by the designated hostel provost.'
    },
    {
      id: 'd-5',
      question: 'How do candidates verify transfer certificates and testimonials?',
      answer: 'The public verification desk allows employers and universities to confirm student ID cards, transfer certificates, and testimonials online using serial numbers.'
    }
  ];

  useEffect(() => {
    let isMounted = true;
    fetch(getApiEndpoint('faqs'))
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.success && Array.isArray(data?.faqs) && data.faqs.length > 0) {
          setFaqs(data.faqs);
        } else {
          setFaqs(defaultFaqs);
        }
      })
      .catch(() => {
        if (isMounted) setFaqs(defaultFaqs);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [getApiEndpoint]);

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const filteredFaqs = faqs.filter((faq) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (faq.question || '').toLowerCase().includes(q) ||
      (faq.answer || '').toLowerCase().includes(q)
    );
  });

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
              Information Desk
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Common questions regarding admissions, fee schedules, examination transcripts, and campus life at {website?.name || 'our institution'}.
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search frequently asked questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-style w-full text-xs py-3 px-4"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-primary transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Accordion */}
        {loading ? (
          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center flex items-center justify-center">
            <div className="loader loader-md" />
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <h3 className="font-serif text-base font-medium text-slate-800 dark:text-slate-200">No Matching Questions Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No answers matched query &ldquo;{search}&rdquo;. You may submit an inquiry directly through our contact desk.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={faq.id || index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                  className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border rounded-2xl shadow-xs transition-colors duration-200 overflow-hidden ${
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
                      {faq.question}
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
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 whitespace-pre-line">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Contact fallback */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="bg-linear-to-br from-white via-slate-50 to-primary/5 dark:from-slate-900 dark:via-slate-900 dark:to-primary/10 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
        >
          <div>
            <h3 className="font-serif text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100">
              Have another academic or administrative query?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Contact our office secretariat for custom inquiries.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/contact')}
              className="inline-block px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-primary/20 transition-all shrink-0"
            >
              Submit Inquiry &rarr;
            </Link>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
