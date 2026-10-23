'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiAward, FiBookOpen, FiArrowRight, FiCheckCircle, FiSearch } from 'react-icons/fi';
import AdmissionResultsContent from './admission/page.jsx';
import AcademicResultsContent from './academic/page.jsx';

export default function ResultsHubPage() {
  const [activeTab, setActiveTab] = useState('admission'); // 'admission' | 'academic'

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        
        {/* Hub Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold uppercase tracking-wider">
            <FiAward className="w-3.5 h-3.5" /> Examination & Merit Portal
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 dark:text-white tracking-tight">
            Institutional Results Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
            Select an evaluation category below to query official individual candidate dossiers and academic examination transcripts.
          </p>

          {/* Quick Category Cards / Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-4 text-left">
            <button
              onClick={() => setActiveTab('admission')}
              className={`p-5 rounded-3xl border transition-all cursor-pointer text-left ${
                activeTab === 'admission'
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${activeTab === 'admission' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                  <FiAward className="w-5 h-5" />
                </div>
                <Link
                  href="/results/admission"
                  onClick={(e) => e.stopPropagation()}
                  className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                    activeTab === 'admission' ? 'text-white/90 hover:underline' : 'text-primary hover:underline'
                  }`}
                >
                  <span>Dedicated Page</span>
                  <FiArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <h3 className="font-serif text-lg font-semibold mt-3">Admission Intake Results</h3>
              <p className={`text-xs mt-1 leading-relaxed ${activeTab === 'admission' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                Query applicant tracking status, merit ranking, exam scores, and student setup clearance.
              </p>
            </button>

            <button
              onClick={() => setActiveTab('academic')}
              className={`p-5 rounded-3xl border transition-all cursor-pointer text-left ${
                activeTab === 'academic'
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${activeTab === 'academic' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                  <FiBookOpen className="w-5 h-5" />
                </div>
                <Link
                  href="/results/academic"
                  onClick={(e) => e.stopPropagation()}
                  className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                    activeTab === 'academic' ? 'text-white/90 hover:underline' : 'text-primary hover:underline'
                  }`}
                >
                  <span>Dedicated Page</span>
                  <FiArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <h3 className="font-serif text-lg font-semibold mt-3">Academic Term Results</h3>
              <p className={`text-xs mt-1 leading-relaxed ${activeTab === 'academic' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                Query term examination GPAs, subject-wise marksheet breakdowns, and print certificates.
              </p>
            </button>
          </div>
        </motion.div>

        {/* Embedded Active Results Component */}
        <div className="pt-2">
          {activeTab === 'admission' ? (
            <AdmissionResultsContent />
          ) : (
            <AcademicResultsContent />
          )}
        </div>

      </div>
    </div>
  );
}
