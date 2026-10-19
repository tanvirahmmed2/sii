'use client';

import React from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function AccessPortalSelectionPage() {
  const { website, tenantUrl } = useTenantWebsite();

  const accessOptions = [
    {
      title: 'Teacher',
      description: 'Manage assigned classes, attendance logs, exam questions, grading, and schedules.',
      href: tenantUrl('/auth/access/teacher/login'),
    },
    {
      title: 'Staff',
      description: 'Access cashier ledger, registrar student archives, admissions, and library management.',
      href: tenantUrl('/auth/access/staff/login'),
    },
    {
      title: 'Officer',
      description: 'Direct login for assigned department officers, approvals, and administrative duties.',
      href: tenantUrl('/auth/access/officer/login'),
    },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Institutional Access
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select your assigned faculty, staff, or department officer desk.
          </p>
        </div>

        <div className="space-y-3">
          {accessOptions.map((option) => (
            <Link
              key={option.title}
              href={option.href}
              className="group flex items-start justify-between gap-3 p-4 rounded-md border border-slate-200 dark:border-slate-800 hover:border-primary/60 hover:bg-primary/5 dark:hover:bg-primary/10 bg-slate-50 dark:bg-slate-950 transition-all cursor-pointer block"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    {option.title}
                  </span>
                  <span className="text-[10px] font-semibold text-primary uppercase ml-2">
                    {option.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {option.description}
                </p>
              </div>
              <span className="text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-sm mt-0.5">
                &rarr;
              </span>
            </Link>
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <Link
            href={tenantUrl('/auth')}
            className="font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            &larr; Change Portal
          </Link>
          <Link
            href={tenantUrl('/')}
            className="font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Home
          </Link>
        </div>

      </div>
    </div>
  );
}
