'use client';

import React from 'react';
import Link from 'next/link';
import { FiBookOpen, FiArrowLeft } from 'react-icons/fi';

export default function TeacherAssignmentsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-600 dark:text-emerald-400">
        <FiBookOpen className="text-3xl" />
      </div>
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Classroom Learning Management</h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
        Assignments, Syllabus, Lectures, and Study Notes are managed inside your assigned Classrooms.
      </p>
      <Link href="/teacher/classrooms" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
        Go to Classrooms &amp; Learning Hub <FiArrowLeft className="rotate-180" />
      </Link>
    </div>
  );
}
