'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function AuthPortalSelectionPage() {
  const router = useRouter();
  const { website, tenantUrl } = useTenantWebsite();
  const [selectedRole, setSelectedRole] = useState('');

  const handleNext = () => {
    if (selectedRole === 'student') {
      router.push(tenantUrl('/auth/student/login'));
    } else if (selectedRole === 'administration') {
      router.push(tenantUrl('/auth/access'));
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Campus Portal'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Select Portal Access
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose your designated academic or administrative access desk.
          </p>
        </div>

        {/* Roles Selection */}
        <div className="space-y-3">
          {/* Student Radio option */}
          <label
            className={`flex items-start gap-3 p-4 rounded-md border transition-colors cursor-pointer ${
              selectedRole === 'student'
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950'
            }`}
          >
            <input
              type="radio"
              name="portalRole"
              value="student"
              checked={selectedRole === 'student'}
              onChange={() => setSelectedRole('student')}
              className="mt-1"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                Student Portal
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                View enrolled classes, routine, daily attendance, exam results, and fees ledger.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-primary uppercase">
              [Student]
            </span>
          </label>

          {/* Administration Radio option */}
          <label
            className={`flex items-start gap-3 p-4 rounded-md border transition-colors cursor-pointer ${
              selectedRole === 'administration'
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950'
            }`}
          >
            <input
              type="radio"
              name="portalRole"
              value="administration"
              checked={selectedRole === 'administration'}
              onChange={() => setSelectedRole('administration')}
              className="mt-1"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                Faculty &amp; Staff Administration
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Access teaching rosters, grading tools, registrar archives, and cashier desks.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-primary uppercase">
              [Staff/Faculty]
            </span>
          </label>
        </div>

        {/* Action Button */}
        {selectedRole && (
          <button
            onClick={handleNext}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            Continue to {selectedRole === 'student' ? 'Student Portal' : 'Faculty & Staff Desk'} →
          </button>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <Link
            href={tenantUrl('/')}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            ← Return to Homepage
          </Link>
        </div>

      </div>
    </div>
  );
}
