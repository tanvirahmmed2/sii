'use client';

import React from 'react';

const SubjectCard = ({ subject, onEdit, onDelete, className = '' }) => {
  if (!subject) return null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 flex items-center justify-between gap-3 transition-colors ${className}`}
    >
      <div className="flex flex-col min-w-0">
        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
          {subject.name}
        </h4>
        {subject.code && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            Code: {subject.code}
          </span>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex items-center gap-1.5 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(subject)}
              className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(subject.id)}
              className="px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-[11px] font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SubjectCard;
