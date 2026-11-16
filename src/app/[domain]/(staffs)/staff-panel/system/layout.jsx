import React from 'react';

export const metadata = {
  title: 'System & Architecture | Staff Panel',
  description: 'Manage institution profile, domains, academic hierarchy, and platform configuration.',
};

export default function Layout({ children }) {
  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Staff Portal</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span>Administration</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-slate-900 dark:text-slate-200 font-semibold">System & Architecture</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5 tracking-tight">
            System & Architecture Studio
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            System Core
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            Modular Hierarchy
          </span>
        </div>
      </div>

      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
