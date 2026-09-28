'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiMail, FiLock, FiKey, FiArrowRight, FiShield, FiHome } from 'react-icons/fi';

const StudentRecovery = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  
  const [step, setStep] = useState(1); // 1 = Request code, 2 = Verify & Reset
  const [loading, setLoading] = useState(false);

  // Request recovery code
  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/student/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send token.');
      }

      toast.success(data.message || 'Token sent to your email successfully.');
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify and reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email || !token || !password) {
      toast.error('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/student/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          recovery_token: token,
          new_password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      toast.success(data.message || 'Password reset successfully!');
      router.push('/auth/student/login');
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Account Recovery</h1>
          <p className="text-sm text-slate-500 max-w-80">
            {step === 1 
              ? 'Enter your registered email to request a 6-digit password recovery code.' 
              : 'Enter the recovery code sent to your inbox to reset your password.'}
          </p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          {step === 1 ? (
            <form onSubmit={handleRequestToken} className="w-full flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiMail className="text-sm" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    Request Token <FiArrowRight className="text-lg" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-5">
              {/* Recovery Code */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiKey className="text-sm" /> Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              {/* New Password */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiLock className="text-sm" /> Choose New Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              {/* Reset Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FiShield className="text-lg" /> Reset Password <FiArrowRight className="text-lg" />
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-655 transition-colors mt-1 underline cursor-pointer"
              >
                Resend verification code
              </button>
            </form>
          )}
        </div>

        <div className="w-full text-center mt-6 flex justify-center gap-4">
          <Link
            href="/auth/student/login"
            className="text-xs font-semibold text-primary hover:text-primary transition-colors py-1 px-3 rounded-full hover:bg-primary-light"
          >
            Back to Login
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors py-1 px-3 rounded-full hover:bg-slate-100"
          >
            <FiHome /> Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentRecovery;