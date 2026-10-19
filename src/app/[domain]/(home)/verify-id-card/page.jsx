'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function VerifyIDCardPage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [queryStr, setQueryStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [searched, setSearched] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!queryStr.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setResult(null);
    setSearched(true);

    try {
      const endpoint = getApiEndpoint(`public/verify/id-card?q=${encodeURIComponent(queryStr.trim())}`);
      const res = await fetch(endpoint);
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.paylod?.idCard || data.idCard || data.payload?.idCard);
      } else {
        setErrorMsg(data.error || 'Verification failed. Please check the ID Card Number or Registration Number.');
      }
    } catch (err) {
      setErrorMsg('A network error occurred while verifying the student ID card.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[75vh] py-10 md:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">
              Identity Services
            </span>
            <span className="text-xs text-slate-400">&bull; Card Registry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-white tracking-tight">
            Student ID Card Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
            Authenticate officially issued student identification credentials using the card reference number or student registration number.
          </p>
        </motion.div>

        {/* Search Input Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs"
        >
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="queryStr" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                ID Card Number or Registration Number *
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="queryStr"
                  type="text"
                  value={queryStr}
                  onChange={(e) => setQueryStr(e.target.value)}
                  placeholder="e.g. IDC-2026-0001 or REG-1092"
                  className="input-style flex-1 px-4 py-2.5 text-xs sm:text-sm"
                  required
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-primary/20 transition-all cursor-pointer shrink-0 disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify ID Card'}
                </motion.button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Validates credentials issued by {website?.name || 'the institution'} registry authority.
            </p>
          </form>
        </motion.div>

        {/* Error Output */}
        {searched && errorMsg && (
          <div className="bg-secondary/5 dark:bg-secondary/10 border border-secondary/20 text-secondary-dark dark:text-secondary-light p-4 rounded-2xl text-xs font-medium">
            <span className="font-semibold mr-1.5">[Notice]</span>
            {errorMsg}
          </div>
        )}

        {/* Verification Result Card */}
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <span className="text-[10px] font-semibold text-primary-dark dark:text-primary-light uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 inline-block">
                  [Status: Authentic &amp; Active]
                </span>
                <h2 className="text-xl font-serif font-medium text-slate-900 dark:text-white mt-1.5">
                  {result.id_card_no || 'Authenticated Card'}
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Validity Expiration</span>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  {result.expiry_date ? new Date(result.expiry_date).toLocaleDateString('en-GB') : 'Perpetual / Ongoing'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">Student Name</span>
                <p className="text-sm font-serif font-medium text-slate-900 dark:text-white">{result.student_name || 'N/A'}</p>
              </div>

              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">Class &amp; Section</span>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {result.class_name || 'N/A'} {result.section_name ? `(${result.section_name})` : ''}
                </p>
              </div>

              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">Roll Number</span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{result.roll || 'N/A'}</p>
              </div>

              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">Registration Number</span>
                <p className="text-xs font-medium font-mono text-slate-800 dark:text-slate-200">{result.registration_number || 'N/A'}</p>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 dark:border-slate-800/80 pt-4">
              Official active identity credential authenticated by {website?.name || 'institution'} registrar records.
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
