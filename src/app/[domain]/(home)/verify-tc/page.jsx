'use client';

import React, { useState } from 'react';
import { FiFileText, FiSearch, FiCheckCircle, FiAlertCircle, FiShield, FiUser } from 'react-icons/fi';
import axios from 'axios';

const VerifyTCPage = () => {
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
      const res = await axios.get(`/api/public/verify/tc?q=${encodeURIComponent(queryStr.trim())}`);
      if (res.data.success) {
        setResult(res.data.paylod.certificate);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Verification failed. Please check the TC Number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-1">
          <FiShield className="text-3xl" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transfer Certificate Verification</h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto">
          Verify the authenticity of an officially issued Transfer Certificate (TC) by entering the TC Reference Number or Student Registration Number.
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
              placeholder="Enter TC Number (e.g. TC-123456-1) or Reg No..."
              className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 pl-11 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
            <FiSearch className="absolute left-4 top-4 text-slate-400 text-lg" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Certificate'}
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
        <div className="bg-white border border-emerald-200 rounded-3xl p-8 space-y-6 shadow-2xs animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl font-bold">
                <FiCheckCircle className="text-xl" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Status: Officially Verified</span>
                <h2 className="text-xl font-bold text-slate-900">{result.tc_number}</h2>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</span>
              <p className="text-sm font-bold text-slate-700">
                {result.issue_date ? new Date(result.issue_date).toLocaleDateString('en-GB') : 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Name</span>
              <p className="text-sm font-bold text-slate-900">{result.student_name}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registration Number</span>
              <p className="text-sm font-bold text-slate-900 font-mono">{result.registration_number}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason for Leaving</span>
              <p className="text-xs font-semibold text-slate-800">{result.reason_for_leaving}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination School</span>
              <p className="text-xs font-semibold text-slate-800">{result.destination_school || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Class Attended</span>
              <p className="text-xs font-semibold text-slate-800">{result.last_class_attended}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promoted Status</span>
              <p className="text-xs font-semibold text-slate-800">{result.promoted_to_class || 'Promoted'}</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-4">
            Official record authenticated by institutional administration archive.
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyTCPage;
