'use client';

import React from 'react';

export default function StudentFilterEmptyState({
  icon = '📋',
  title = 'Select Session, Class & Section to View Data',
  description = 'To view and manage student records for this module, please select the Academic Session, Class, and Section in the filter above, then click "View Data".',
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-10 flex flex-col items-center justify-center text-center space-y-3 shadow-2xs">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
        {icon}
      </div>
      <div className="max-w-md space-y-1">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
      <div className="pt-2 flex items-center gap-1.5 text-[11px] text-primary font-medium">
        <span>👆 Use the filter bar above to fetch records</span>
      </div>
    </div>
  );
}
