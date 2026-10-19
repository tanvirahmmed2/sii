'use client';

import React from 'react';
import { motion } from 'framer-motion';

const SubjectCard = ({ subject, onEdit, onDelete, className = '' }) => {
  if (!subject) return null;

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs hover:shadow-md hover:border-primary/40 transition-colors duration-200 ${className}`}
    >
      <div className="flex flex-col min-w-0">
        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
          {subject.name}
        </h4>
        {subject.code && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
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
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(subject.id)}
              className="px-3 py-1.5 rounded-xl border border-secondary/30 bg-secondary/10 text-xs font-semibold text-secondary hover:bg-secondary hover:text-white transition-colors cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SubjectCard;
