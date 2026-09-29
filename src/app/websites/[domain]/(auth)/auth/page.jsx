'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiBookOpen, FiShield, FiArrowRight, FiHome } from 'react-icons/fi';

const AuthPortalSelectionPage = () => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('');

  const handleNext = () => {
    if (selectedRole === 'student') {
      router.push('/auth/student');
    } else if (selectedRole === 'administration') {
      router.push('/auth/access');
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 relative px-4 py-16 overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40"></div>

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_15px_50px_rgba(0,0,0,0.03)] z-10 animate-fade-up">
        <div className="flex flex-col items-center text-center mb-8">
          
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Choose Portal</h1>
          <p className="text-sm text-slate-500 mt-2">Which system access portal do you want to enter?</p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Student Radio option */}
          <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
            selectedRole === 'student'
              ? 'border-primary bg-primary-light/20'
              : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
          }`}>
            <input
              type="radio"
              name="portalRole"
              value="student"
              checked={selectedRole === 'student'}
              onChange={() => setSelectedRole('student')}
              className="hidden"
            />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selectedRole === 'student' ? 'bg-primary-light text-primary' : 'bg-slate-100 text-slate-500'
            }`}>
              <FiBookOpen className="text-lg" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">Student Portal</p>
              <p className="text-xs text-slate-400 mt-0.5">Access grades, classes & reports</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              selectedRole === 'student' ? 'border-primary bg-primary' : 'border-slate-300'
            }`}>
              {selectedRole === 'student' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
            </div>
          </label>

          {/* Administration Radio option */}
          <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
            selectedRole === 'administration'
              ? 'border-primary bg-primary-light/20'
              : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
          }`}>
            <input
              type="radio"
              name="portalRole"
              value="administration"
              checked={selectedRole === 'administration'}
              onChange={() => setSelectedRole('administration')}
              className="hidden"
            />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selectedRole === 'administration' ? 'bg-primary-light text-primary' : 'bg-slate-100 text-slate-500'
            }`}>
              <FiShield className="text-lg" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">Administration</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              selectedRole === 'administration' ? 'border-primary bg-primary' : 'border-slate-300'
            }`}>
              {selectedRole === 'administration' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
            </div>
          </label>
        </div>

        {/* Dynamic Next Button */}
        {selectedRole && (
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 mt-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-all duration-250 animate-fade-in active:scale-[0.98] cursor-pointer"
          >
            Continue to Portal <FiArrowRight className="text-lg" />
          </button>
        )}
      </div>

      <div className="w-full text-center mt-8 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-655 transition-colors py-2 px-4 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-xs"
        >
          <FiHome /> Return to Home Screen
        </Link>
      </div>
    </div>
  );
};

export default AuthPortalSelectionPage;
