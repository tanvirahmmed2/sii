'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PayrollsScaleManager from './PayrollsScaleManager';

export default function UnifiedPayrollsHub() {
  const [activeTab, setActiveTab] = useState('teacher'); // 'teacher' | 'officer'

  return (
    <div className="w-full space-y-4">
      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href="./salary-teacher"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 hover:border-slate-400 dark:hover:border-slate-600 transition-colors shadow-2xs group"
        >
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Teacher Subsystem</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Assign Salaries</span>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">→</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Map scales to academic teaching staff</p>
        </Link>

        <Link
          href="./salary-teacher-payments"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 hover:border-slate-400 dark:hover:border-slate-600 transition-colors shadow-2xs group"
        >
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Teacher Subsystem</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Teacher Payments</span>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">→</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Monthly disbursements & payslips</p>
        </Link>

        <Link
          href="./salary-officers"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 hover:border-slate-400 dark:hover:border-slate-600 transition-colors shadow-2xs group"
        >
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Officer Subsystem</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Assign Salaries</span>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">→</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Map scales to administrative officers</p>
        </Link>

        <Link
          href="./salary-officer-payments"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 hover:border-slate-400 dark:hover:border-slate-600 transition-colors shadow-2xs group"
        >
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Officer Subsystem</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Officer Payments</span>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">→</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Monthly disbursements & payslips</p>
        </Link>
      </div>

      {/* Role Tabs for Scale Configuration */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2">
        <button
          onClick={() => setActiveTab('teacher')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'teacher'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Teacher Payroll Scales
        </button>
        <button
          onClick={() => setActiveTab('officer')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'officer'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Officer Payroll Scales
        </button>
      </div>

      {/* Embedded Scale Manager based on active role tab */}
      {activeTab === 'teacher' ? (
        <PayrollsScaleManager
          roleType="teacher"
          title="Teacher Payroll Scales"
          subtitle="Define base salary and allowance schedules for academic teaching personnel."
        />
      ) : (
        <PayrollsScaleManager
          roleType="officer"
          title="Officer Payroll Scales"
          subtitle="Define base salary and allowance schedules for administrative officer personnel."
        />
      )}
    </div>
  );
}
