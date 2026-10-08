'use client';

import React, { useState, useContext } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { printAdmissionFeeReceipt } from 'src/lib/receipts/admission_fee';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const AdmissionStatusPage = () => {
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error('Please enter candidate email address or application number.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${getApiEndpoint('public/admissions/status')}?search=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setApplication(data.paylod.application);
      } else {
        setApplication(null);
        toast.error(data.error || 'No matching application found.');
      }
    } catch {
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
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          Selected
        </span>
      );
    }
    if (s === 'rejected' || s === 'disqualified' || isPublished) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          Disqualified
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        Pending Review
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          Paid
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        Unpaid
      </span>
    );
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Admissions Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Admission Status & Selection Verification
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Query your application progress, admission selection status, or print your official fee invoice.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Candidate Email address or Application ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 shrink-0"
            >
              {loading ? 'Searching...' : 'Search Status'}
            </button>
          </form>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Verifying candidate application index...
            </span>
          </div>
        ) : application ? (
          <div className="space-y-4">
            
            {/* Dossier Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-primary px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 inline-block">
                    {application.circular_name || 'General Admission'}
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {application.candidate_name}
                  </h2>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Email: {application.candidate_email}</span>
                    <span>Phone: {application.candidate_phone}</span>
                  </div>
                </div>

                <div className="sm:text-right space-y-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block font-mono">
                    ID: #{application.application_id}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Applied: {new Date(application.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => printAdmissionFeeReceipt(application)}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded text-xs font-medium cursor-pointer"
                  >
                    Print Fee Invoice
                  </button>
                </div>
              </div>

              {/* Grid specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">Target Class</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{application.class_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">Fee Assessment</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{parseFloat(application.fee_amount || 0).toFixed(2)}</span>
                    {getPaymentStatusBadge(application.payment_status)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">Selection Status</span>
                  <div className="mt-0.5">
                    {getStatusBadge(application.application_status)}
                  </div>
                </div>
              </div>

              {/* Result Details */}
              {isSelected(application.application_status) ? (
                <div className="p-4 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                    Selection Confirmed for Enrollment
                  </span>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    Candidate <strong>{application.candidate_name}</strong> has been selected for admission into <strong>{application.class_name}</strong>.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] text-slate-400 uppercase block">Assigned Reg No.</span>
                      <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">
                        {application.registration_number || 'Awaiting assignment'}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] text-slate-400 uppercase block">Assigned Roll</span>
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                        {application.roll_number ? `#${application.roll_number}` : 'Awaiting assignment'}
                      </span>
                    </div>
                  </div>

                  {application.registration_number && (
                    <div className="pt-1 flex justify-end">
                      <Link
                        href={tenantUrl('/auth/student/registration')}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-medium"
                      >
                        Proceed to Student Portal Setup →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                  Application is currently under administrative evaluation. Results will be published on the portal calendar.
                </div>
              )}

            </div>

          </div>
        ) : hasSearched ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Admission Record Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No application matched query &ldquo;{query}&rdquo;. Verify your input details and search again.
            </p>
          </div>
        ) : null}

      </div>
    </div>
  );
};

export default AdmissionStatusPage;
