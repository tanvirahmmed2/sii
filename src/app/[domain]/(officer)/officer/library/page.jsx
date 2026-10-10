'use client';

import React, { useState } from 'react';
import LibraryManagementHub from 'src/component/website/admin/library/LibraryManagementHub.jsx';
import LibraryBooksWorkstation from 'src/component/website/admin/library/LibraryBooksWorkstation.jsx';
import LibraryCirculationWorkstation from 'src/component/website/admin/library/LibraryCirculationWorkstation.jsx';
import LibrarySetupWorkstation from 'src/component/website/admin/library/LibrarySetupWorkstation.jsx';
import LibraryShelvesWorkstation from 'src/component/website/admin/library/LibraryShelvesWorkstation.jsx';

export default function OfficerLibraryPage() {
  const [activeTab, setActiveTab] = useState('books'); // 'overview' | 'books' | 'shelves' | 'students' | 'faculty' | 'setup'

  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">
          Officer Library Operations Desk
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Dedicated librarian portal for accessioning catalog titles, managing book inventory stock, handling student &amp; faculty borrowing, and processing returns.
        </p>
      </div>

      {/* Main Tab Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-medium space-x-6">
        {[
          { key: 'books', label: 'Catalog & Stock' },
          { key: 'shelves', label: 'Racks & Shelves' },
          { key: 'students', label: 'Student Circulation' },
          { key: 'faculty', label: 'Faculty Circulation' },
          { key: 'setup', label: 'Categories & Writers' },
          { key: 'overview', label: 'Executive Dashboard' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === tab.key
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Workstation */}
      {activeTab === 'books' && <LibraryBooksWorkstation />}
      {activeTab === 'shelves' && <LibraryShelvesWorkstation />}
      {activeTab === 'students' && <LibraryCirculationWorkstation targetType="student" defaultTab="all" />}
      {activeTab === 'faculty' && <LibraryCirculationWorkstation targetType="teacher" defaultTab="all" />}
      {activeTab === 'setup' && <LibrarySetupWorkstation initialTab="categories" />}
      {activeTab === 'overview' && <LibraryManagementHub isOfficer={true} />}
    </div>
  );
}
