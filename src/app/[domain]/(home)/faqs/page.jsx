'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Information Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Common questions regarding admissions, fee schedules, examination transcripts, and campus life at {website?.name || 'our institution'}.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="relative">
            <input
              type="text"
              placeholder="Search frequently asked questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Accordion */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading help questions...</span>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Matching Questions Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No answers matched query &ldquo;{search}&rdquo;. You may submit an inquiry directly through our contact desk.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.id || index}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                      {faq.question}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                      {isOpen ? '▴' : '▾'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 whitespace-pre-line">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Contact fallback */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Have another academic or administrative query?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Contact our office secretariat for custom inquiries.
            </p>
          </div>
          <Link
            href={tenantUrl('/contact')}
            className="px-3.5 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors shrink-0"
          >
            Submit Inquiry →
          </Link>
        </div>

      </div>
    </div>
  );
}
