'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function AccessPortalSelectionPage() {
  const router = useRouter();
  const { website, tenantUrl } = useTenantWebsite();
  const [selectedRole, setSelectedRole] = useState('');

  const handleNext = () => {
    if (selectedRole === 'teacher') {
      router.push(tenantUrl('/auth/access/teacher/login'));
    } else if (selectedRole === 'staff') {
      router.push(tenantUrl('/auth/access/staff/login'));
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Institutional Desk'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Institutional Access
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select your assigned faculty or administrative role to proceed.
          </p>
        </div>

        {/* Roles Selection */}
        <div className="space-y-3">
          {/* Teacher Option */}
          <label
            className={`flex items-start gap-3 p-4 rounded-md border transition-colors cursor-pointer ${
              selectedRole === 'teacher'
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950'
            }`}
          >
            <input
              type="radio"
              name="accessRole"
              value="teacher"
              checked={selectedRole === 'teacher'}
              onChange={() => setSelectedRole('teacher')}
              className="mt-1"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                Teacher / Faculty Portal
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Manage assigned classes, attendance logs, exam questions, grading, and schedules.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-primary uppercase">
              [Faculty]
            </span>
          </label>

          {/* Staff Option */}
          <label
            className={`flex items-start gap-3 p-4 rounded-md border transition-colors cursor-pointer ${
              selectedRole === 'staff'
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950'
            }`}
          >
            <input
              type="radio"
              name="accessRole"
              value="staff"
              checked={selectedRole === 'staff'}
              onChange={() => setSelectedRole('staff')}
              className="mt-1"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                Staff / Operations Desk
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Access cashier ledger, registrar student archives, admissions, and library management.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-primary uppercase">
              [Staff]
            </span>
          </label>
        </div>

        {/* Action Button */}
        {selectedRole && (
          <button
            onClick={handleNext}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            Proceed to {selectedRole === 'teacher' ? 'Faculty Login' : 'Staff Login'} →
          </button>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <Link
            href={tenantUrl('/auth')}
            className="font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            ← Change Portal
          </Link>
          <Link
            href={tenantUrl('/')}
            className="font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Home
          </Link>
        </div>

      </div>
    </div>
  );
}
