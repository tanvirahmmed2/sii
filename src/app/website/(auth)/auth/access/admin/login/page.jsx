'use client';

import React from 'react';
import Link from 'next/link';
import AdminLoginForm from '@/component/forms/AdminLoginForm';
import { FiHome } from 'react-icons/fi';

const AdminLogin = () => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-55 text-slate-900 relative px-4 py-12 overflow-hidden bg-slate-50">
      {/* Subtle light background decorations */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-110 animate-fade-up z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Administrative Portal</h1>
          <p className="text-sm text-slate-500 max-w-70">Authorized personnel login only. System access is monitored.</p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          <AdminLoginForm />
        </div>
        <div className="w-full text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-655 transition-colors py-1.5 px-3 rounded-full hover:bg-slate-100"
          >
            <FiHome className="text-sm" /> Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
