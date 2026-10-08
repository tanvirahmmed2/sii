'use client';

import React, { useState } from 'react';
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
    <div className="w-full min-h-[75vh] py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Identity Services
            </span>
            <span className="text-xs text-slate-400">Card Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Student ID Card Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Authenticate officially issued student identification credentials using the card reference number or student registration number.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 sm:p-6 shadow-xs">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="queryStr" className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                ID Card Number or Registration Number *
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="queryStr"
                  type="text"
                  value={queryStr}
                  onChange={(e) => setQueryStr(e.target.value)}
                  placeholder="e.g. IDC-2026-0001 or REG-1092"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify ID Card'}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Validates credentials issued by {website?.name || 'the institution'} registry authority.
            </p>
          </form>
        </div>

        {/* Error Output */}
        {searched && errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-4 rounded-md text-xs font-medium">
            <span className="font-semibold mr-1.5">[Notice]</span>
            {errorMsg}
          </div>
        )}

        {/* Verification Result Card */}
        {result && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  [Status: Authentic &amp; Active]
                </span>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                  {result.id_card_no || 'Authenticated Card'}
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Validity Expiration</span>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {result.expiry_date ? new Date(result.expiry_date).toLocaleDateString('en-GB') : 'Perpetual / Ongoing'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Student Name</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.student_name || 'N/A'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Class &amp; Section</span>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {result.class_name || 'N/A'} {result.section_name ? `(${result.section_name})` : ''}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Roll Number</span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{result.roll || 'N/A'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Registration Number</span>
                <p className="text-xs font-medium font-mono text-slate-800 dark:text-slate-200">{result.registration_number || 'N/A'}</p>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 dark:border-slate-800 pt-3">
              Official active identity credential authenticated by {website?.name || 'institution'} registrar records.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
