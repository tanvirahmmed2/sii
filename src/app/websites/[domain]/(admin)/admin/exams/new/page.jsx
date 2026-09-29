'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ExamCreateForm from '@/component/forms/ExamCreateForm';

const AdminNewExamPage = () => {
  const router = useRouter();

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Create Exam Routine
        </h1>
        <p className="text-sm text-slate-500">
          Define new examination routines, terms, and subject schedules per class.
        </p>
      </div>

      <ExamCreateForm
        onSuccess={() => router.push('/admin/exams/current')}
        onCancel={() => router.push('/admin/exams/current')}
      />
    </div>
  );
};

export default AdminNewExamPage;
