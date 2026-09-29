'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiPlusCircle } from 'react-icons/fi';
import HistoryForm from '@/component/forms/HistoryForm';

export default function NewHistoryPage() {
  const router = useRouter();

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      <div>
        <Link 
          href="/admin/history"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-wider"
        >
          <FiArrowLeft className="text-sm" /> Back to History List
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
          <FiPlusCircle className="text-primary" /> Create Historical Milestone
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Add a new timeline milestone to the institutional history records.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xs">
        <HistoryForm
          onSuccess={() => {
            router.push('/admin/history');
          }}
          onCancel={() => {
            router.push('/admin/history');
          }}
        />
      </div>
    </div>
  );
}
