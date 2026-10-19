'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
    <div className="w-full min-h-[75vh] py-10 md:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">
              Registry Archive
            </span>
            <span className="text-xs text-slate-400">&bull; Official Database</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-white tracking-tight">
            Student Identity Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
            Input the official student registration number to verify enrollment status, designated class, and authenticated profile records.
          </p>
        </motion.div>

        {/* Search Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs"
        >
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="regNumber" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Registration / Student ID Number *
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="regNumber"
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="e.g. 2026-REG-0145"
                  className="input-style flex-1 px-4 py-2.5 text-xs sm:text-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-primary/20 transition-all cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {loading ? 'Verifying...' : 'Verify Student'}
                </motion.button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Matches active and archived student rosters registered under {website?.name || 'this institution'}.
            </p>
          </form>
        </motion.div>

        {/* Verification Result Display */}
        {searched && (
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
            {student ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary-dark dark:text-primary-light border border-primary/20">
                      [Verified Record]
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {student.registration_number || student.reg_no || regNumber}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Status: Active Registry</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {student.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.image}
                      alt={student.name || 'Student photo'}
                      className="w-24 h-24 rounded-2xl object-cover border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-medium text-center p-2 shrink-0">
                      No Photo on File
                    </div>
                  )}

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">
                        Student Full Name
                      </span>
                      <p className="text-sm font-serif font-medium text-slate-900 dark:text-white">
                        {student.name || 'N/A'}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">
                        Class / Grade
                      </span>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {student.class_name || student.class || 'N/A'}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">
                        Section / Batch
                      </span>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {student.section_name || student.section || 'General'}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">
                        Enrollment Status
                      </span>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {student.status || 'Active Enrollment'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span>Official record authenticated by institutional administration.</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">Institutional ID: {student.id || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold bg-secondary/10 text-secondary-dark dark:text-secondary-light border border-secondary/20">
                  [Record Not Found]
                </span>
                <h3 className="font-serif text-base font-medium text-slate-900 dark:text-white mt-2">
                  No Matching Student Record
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
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
