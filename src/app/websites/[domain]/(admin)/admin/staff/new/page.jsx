'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiUserPlus } from 'react-icons/fi';
import StaffCreateForm from '@/component/forms/StaffCreateForm';

const AdminNewStaffPage = () => {
  const router = useRouter();

  return (
    <div className="w-full space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 pb-2 border-b border-slate-200/60">
        <Link
          href="/admin/staff/list"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <FiArrowLeft className="text-xs" /> Back to Staff Registry
        </Link>

        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiUserPlus className="text-primary" /> Pre-register Staff Account
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create administrative or desk access credentials for Cashier, Registrar, and Support Staff.
          </p>
        </div>
      </div>

      <StaffCreateForm
        onSuccess={() => router.push('/admin/staff/list')}
        onCancel={() => router.push('/admin/staff/list')}
      />
    </div>
  );
};

export default AdminNewStaffPage;
