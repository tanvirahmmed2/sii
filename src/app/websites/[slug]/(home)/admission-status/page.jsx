'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  FiSearch, FiCheckCircle, FiXCircle, FiClock,
  FiAward, FiPrinter, FiUser, FiMail, FiPhone, FiMapPin, FiLayers, FiFileText
} from 'react-icons/fi';
import { printAdmissionFeeReceipt } from '@/lib/receipts/admission_fee';

const AdmissionStatusPage = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error('Please enter your candidate Email address or Application ID.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/public/admissions/status?search=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setApplication(data.paylod.application);
      } else {
        setApplication(null);
        toast.error(data.error || 'No matching application found for that email address.');
      }
    } catch (err) {
      setApplication(null);
      toast.error('Failed to lookup admission application status.');
    } finally {
      setLoading(false);
    }
  };

  const isSelected = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'selected' || s === 'approved';
  };

  const getStatusBadge = (status, isPublished) => {
    const s = (status || '').toLowerCase();
    if (isSelected(s)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FiCheckCircle /> Selected
        </span>
      );
    }
    if (s === 'rejected' || s === 'disqualified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
          <FiXCircle /> Disqualified
        </span>
      );
    }
    if (isPublished) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
          <FiXCircle /> Disqualified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <FiClock /> Pending Review
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
        Unpaid
      </span>
    );
  };

  return (
    <div className="w-full min-h-[70vh] py-12 px-4 md:px-8 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Page Header */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mx-auto mb-3 border border-emerald-100 shadow-2xs">
          <FiAward />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
          Admission Results &amp; Application Status
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Search by candidate Email address or Application ID to check your selection status.
        </p>
      </div>

      {/* Email / Application ID Search Form */}
      <div className="w-full max-w-xl mx-auto">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search by Email address (e.g. candidate@example.com)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-emerald-600 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60 shrink-0"
          >
            {loading ? 'Searching...' : 'Search Status'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-400">Verifying candidate application index...</span>
        </div>
      ) : application ? (
        <div className="flex flex-col gap-5">
          
          {/* Status Result Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col gap-6">
            
            {/* Top Row: Candidate Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                  Circular: {application.circular_name || 'General Admission'}
                </span>
                <h2 className="text-xl font-bold text-slate-800">{application.candidate_name}</h2>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1 font-medium">
                  <span className="flex items-center gap-1"><FiMail /> {application.candidate_email}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><FiPhone /> {application.candidate_phone}</span>
                </div>
              </div>

              <div className="sm:text-right flex flex-col sm:items-end gap-1">
                <span className="text-xs font-bold text-slate-700">App ID: #{application.application_id}</span>
                <span className="text-[10px] text-slate-400">Applied: {new Date(application.created_at).toLocaleDateString()}</span>
                <button
                  onClick={() => printAdmissionFeeReceipt(application)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer mt-1"
                >
                  <FiPrinter className="text-xs" /> Print Receipt
                </button>
              </div>
            </div>

            {/* Candidate & Family Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Class</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <FiLayers className="text-emerald-600" /> {application.class_name || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Blood Group &amp; DOB</span>
                <span className="font-bold text-slate-800">
                  {application.blood_group ? `${application.blood_group} • ` : ''}{application.date_of_birth ? new Date(application.date_of_birth).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fee Payment Status</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">BDT {parseFloat(application.fee_amount || 0).toFixed(2)}</span>
                  {getPaymentStatusBadge(application.payment_status)}
                </div>
              </div>

              {application.father_name && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Father Details</span>
                  <span className="font-bold text-slate-800 block">{application.father_name}</span>
                  <span className="text-[10px] text-slate-500 block">{application.father_phone}</span>
                </div>
              )}

              {application.mother_name && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mother Details</span>
                  <span className="font-bold text-slate-800 block">{application.mother_name}</span>
                  <span className="text-[10px] text-slate-500 block">{application.mother_phone}</span>
                </div>
              )}

              {application.address && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Address</span>
                  <span className="font-semibold text-slate-700 block truncate">{application.address}</span>
                </div>
              )}
            </div>

            {/* Selection Result Status Banner */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Final Admission Selection Result</span>

              {isSelected(application.application_status) ? (
                <div className="p-5 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                    <FiCheckCircle className="text-emerald-600 text-xl shrink-0" />
                    <span>Selection Result: Selected</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-semibold">
                    Congratulations! Candidate <strong>{application.candidate_name}</strong> has been officially <strong>Selected</strong> for admission in <strong>{application.class_name}</strong>.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                    <div className="bg-white border border-emerald-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Reg No.</span>
                      <span className="text-xs font-bold text-emerald-700 font-mono mt-0.5 block">
                        {application.registration_number || 'Generated on publication'}
                      </span>
                    </div>

                    <div className="bg-white border border-emerald-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Roll</span>
                      <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                        {application.roll_number ? `#${application.roll_number}` : 'Generated on publication'}
                      </span>
                    </div>

                    <div className="bg-white border border-emerald-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Class</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {application.class_name}
                      </span>
                    </div>
                  </div>

                  {application.registration_number && (
                    <div className="mt-2 flex items-center justify-end">
                      <Link
                        href="/auth/student/registration"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                      >
                        <FiUser /> Complete Student Account Setup
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                    <FiXCircle className="text-rose-600 text-xl shrink-0" />
                    <span>Selection Result: Disqualified</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed font-semibold">
                    The candidate was not selected for admission in this drive. We appreciate your interest in our institution.
                  </p>
                </div>
              )}

            </div>

          </div>

        </div>
      ) : hasSearched ? (
        <div className="w-full max-w-md mx-auto p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center flex flex-col items-center gap-2">
          <FiXCircle className="text-rose-500 text-3xl" />
          <h3 className="text-xs font-bold text-rose-800">No Admission Record Found</h3>
          <p className="text-xs text-rose-600">
            No application corresponds to that email address. Please verify your email and try again.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md mx-auto p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 flex flex-col items-center gap-2">
          <span className="text-3xl">🎓</span>
          <p className="text-xs font-semibold">Enter your candidate email address above to view your admission selection result.</p>
        </div>
      )}
    </div>
  );
};

export default AdmissionStatusPage;
