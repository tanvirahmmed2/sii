'use client';

import React from 'react';
import { FiBook, FiEdit, FiTrash2 } from 'react-icons/fi';

const SubjectCard = ({ subject, onEdit, onDelete, className = '' }) => {
  return (
    <div className={`bg-white border border-slate-100 hover:border-slate-200 cursor-pointer rounded-3xl p-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between h-full ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-800 truncate">
              {subject.name}
            </h4>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(subject)}
                className="p-1.5 bg-slate-50 hover:bg-primary-light text-slate-400 hover:text-primary rounded-lg transition-colors cursor-pointer"
                title="Edit Subject"
              >
                <FiEdit className="text-xs" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(subject.id)}
                className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                title="Delete Subject"
              >
                <FiTrash2 className="text-xs" />
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default SubjectCard;
