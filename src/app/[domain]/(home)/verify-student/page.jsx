'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function VerifyStudentPage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [regNumber, setRegNumber] = useState('');
  const [student, setStudent] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!regNumber.trim()) {
      toast.error('Please enter a student registration number.');
      return;
    }

    setLoading(true);
    setStudent(null);
    setSearched(false);

    try {
      const endpoint = getApiEndpoint(`verify-student?reg=${encodeURIComponent(regNumber.trim())}`);
      const res = await fetch(endpoint);
      const data = await res.json();

      if (res.ok && data.success) {
        setStudent(data.paylod || data.student || data.payload);
      } else {
        toast.error(data.error || 'Student verification failed.');
      }
    } catch (err) {
      toast.error('An error occurred while verifying student record.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="w-full min-h-[75vh] py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Registry Archive
            </span>
            <span className="text-xs text-slate-400">Official Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Student Identity Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Input the official student registration number to verify enrollment status, designated class, and authenticated profile records.
          </p>
        </div>

        {/* Search Form Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 sm:p-6 shadow-xs">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="regNumber" className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Registration / Student ID Number *
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="regNumber"
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="e.g. 2026-REG-0145"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {loading ? 'Verifying...' : 'Verify Student'}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Matches active and archived student rosters registered under {website?.name || 'this institution'}.
            </p>
          </form>
        </div>

        {/* Verification Result Display */}
        {searched && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 sm:p-6 shadow-xs">
            {student ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      [Verified Record]
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {student.registration_number || student.reg_no || regNumber}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Status: Active Registry</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  {student.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.image}
                      alt={student.name || 'Student photo'}
                      className="w-24 h-24 rounded object-cover border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-medium text-center p-2 shrink-0">
                      No Photo on File
                    </div>
                  )}

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Student Full Name
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {student.name || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Class / Grade
                      </span>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                        {student.class_name || student.class || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Section / Batch
                      </span>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                        {student.section_name || student.section || 'General'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Enrollment Status
                      </span>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                        {student.status || 'Active Enrollment'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Official record authenticated by institutional administration.</span>
                  <span>Institutional ID: {student.id || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  [Record Not Found]
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No Matching Student Record
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  No verified student enrollment found matching registration credential &ldquo;{regNumber}&rdquo;. Please verify the input number with the registrar office.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
