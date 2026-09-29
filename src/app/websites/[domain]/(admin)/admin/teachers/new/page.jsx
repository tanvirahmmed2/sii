'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiUserPlus, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import TeacherCreateForm from '@/component/forms/TeacherCreateForm';

const AdminNewTeacherPage = () => {
  const router = useRouter();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiUserPlus className="text-primary" /> Add Teacher Profile
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-create credentials and dispatch email setup links for newly joined educators.
          </p>
        </div>

        <Link
          href="/admin/teachers/list"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <FiArrowLeft className="text-xs" /> Back to Teachers List
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <TeacherCreateForm
          onSuccess={() => router.push('/admin/teachers/list')}
          onCancel={() => router.push('/admin/teachers/list')}
        />
      </div>
    </div>
  );
};

export default AdminNewTeacherPage;
