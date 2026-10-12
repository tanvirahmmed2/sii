'use client';

import React from 'react';

export default function StudentFilterEmptyState({
  title = 'Select Session, Class & Section to View Data',
  description = 'To view and manage student records for this module, please select the Academic Session, Class, and Section in the filter above, then click "View Data".',
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-2 shadow-2xs">
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Use the filter controls above to fetch live records.
      </div>
    </div>
  );
}
