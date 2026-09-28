'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiLock, FiUser, FiArrowRight, FiBookOpen, FiHome } from 'react-icons/fi';

const StudentLogin = () => {
  const router = useRouter();
  const [regNo, setRegNo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!regNo || !password) {
      toast.error('Registration number and password are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_number: regNo, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to log in.');
      }

      toast.success(data.message || 'Logged in successfully!');
      
      // Redirect to student dashboard (e.g. /student or main portal)
      router.push('/student');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 relative px-4 py-12 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-110 animate-fade-up z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Student Portal</h1>
          <p className="text-sm text-slate-500 max-w-80">Log in to view your routine, attendance, syllabus, and fees.</p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
            {/* Registration Number */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FiUser className="text-sm" /> Registration Number
              </label>
              <input
                type="text"
                required
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiLock className="text-sm" /> Password
                </label>
                <Link
                  href="/auth/student/recovery"
                  className="text-xs font-medium text-primary hover:text-primary transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <FiBookOpen className="text-lg" /> Student Login <FiArrowRight className="text-lg" />
                </>
              )}
            </button>

            {/* Registration setup link */}
            <div className="text-center text-xs font-semibold text-slate-400 mt-2">
              First time logging in?{' '}
              <Link href="/auth/student/registration" className="text-primary hover:text-primary transition-colors underline">
                Setup your account here
              </Link>
            </div>
          </form>
        </div>

        <div className="w-full text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors py-1.5 px-3 rounded-full hover:bg-slate-100"
          >
            <FiHome className="text-sm" /> Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;