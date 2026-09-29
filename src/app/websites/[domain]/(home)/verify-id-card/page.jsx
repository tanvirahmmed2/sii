'use client';

import React, { useState } from 'react';
import { FiCreditCard, FiSearch, FiCheckCircle, FiAlertCircle, FiShield, FiUser } from 'react-icons/fi';
import axios from 'axios';

const VerifyIDCardPage = () => {
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
      const res = await axios.get(`/api/public/verify/id-card?q=${encodeURIComponent(queryStr.trim())}`);
      if (res.data.success) {
        setResult(res.data.paylod.idCard);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Verification failed. Please check the ID Card Number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 py-12 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-1">
          <FiCreditCard className="text-3xl" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Student ID Card Verification</h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto">
          Verify the authenticity and validity of an official Student Identity Card by entering the ID Card Number or Registration Number.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xs">
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={queryStr}
              onChange={(e) => setQueryStr(e.target.value)}
              placeholder="Enter ID Card Number (e.g. IDC-2026-0001) or Reg No..."
              className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 pl-11 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              required
            />
            <FiSearch className="absolute left-4 top-4 text-slate-400 text-lg" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify ID Card'}
          </button>
        </form>
      </div>

      {/* Error Output */}
      {searched && errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-3xl flex items-center gap-3">
          <FiAlertCircle className="text-xl shrink-0 text-rose-600" />
          <p className="text-xs font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Verification Result Card */}
      {result && (
        <div className="bg-white border border-indigo-200 rounded-3xl p-8 space-y-6 shadow-2xs animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl font-bold">
                <FiCheckCircle className="text-xl" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Status: Authentic & Active</span>
                <h2 className="text-xl font-bold text-slate-900">{result.id_card_no}</h2>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date</span>
              <p className="text-sm font-bold text-slate-700">
                {result.expiry_date ? new Date(result.expiry_date).toLocaleDateString('en-GB') : 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Name</span>
              <p className="text-sm font-bold text-slate-900">{result.student_name}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class & Section</span>
              <p className="text-sm font-bold text-slate-900">{result.class_name} {result.section_name ? `(${result.section_name})` : ''}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Roll Number</span>
              <p className="text-xs font-semibold text-slate-800">{result.roll || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registration Number</span>
              <p className="text-xs font-semibold text-slate-800 font-mono">{result.registration_number}</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-4">
            Official active identity credential authenticated by institution registry.
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyIDCardPage;
