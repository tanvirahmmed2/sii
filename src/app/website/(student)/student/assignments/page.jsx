'use client';

import React from 'react';
import Link from 'next/link';
import { FiBookOpen, FiArrowLeft } from 'react-icons/fi';

export default function StudentAssignmentsDisabledPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
      <div className="p-4 bg-slate-100 rounded-2xl text-slate-400">
        <FiBookOpen className="text-3xl" />
      </div>
      <h1 className="text-xl font-bold text-slate-800">Assignments Module Removed</h1>
      <p className="text-xs text-slate-500 max-w-sm">
        Assignments have been deactivated. Please check Study Materials or Class Syllabus for your coursework.
      </p>
      <Link href="/student/subjects" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
        <FiArrowLeft /> Back to Subjects
      </Link>
    </div>
  );
}
