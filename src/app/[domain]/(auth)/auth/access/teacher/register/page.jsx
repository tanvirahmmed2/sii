'use client';

import React from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function TeacherRegistrationPage() {
  const { website, tenantUrl } = useTenantWebsite();

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6 text-center">
        
        {/* Header */}
        <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Faculty Onboarding'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Institutional Registration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Teacher accounts are registered by campus administration.
          </p>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Faculty memberships are provisioned by your institution staff. Once registered, a verification invitation link is delivered to your email to verify your profile and establish your password.
          </p>
          <div className="pt-2">
            <Link
              href={tenantUrl('/auth/access/teacher/verify')}
              className="inline-block px-5 py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors"
            >
              Go to Profile Verification →
            </Link>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <Link href={tenantUrl('/auth/access/teacher/login')} className="hover:underline font-medium text-primary">
            ← Back to Teacher Login
          </Link>
          <Link href={tenantUrl('/')} className="hover:text-slate-800 dark:hover:text-slate-200">
            Homepage
          </Link>
        </div>

      </div>
    </div>
  );
}
