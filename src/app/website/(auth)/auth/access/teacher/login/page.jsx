'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiLock, FiMail, FiArrowRight, FiBookOpen, FiHome, FiShield, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';

const TeacherLogin = () => {
  const router = useRouter();
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/teachers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to log in.');
      }

      if (data.requires2FA || data.paylod?.requires2FA) {
        toast.success(data.message || '2FA code sent to your email!');
        setStep('2fa');
      } else {
        toast.success(data.message || 'Logged in successfully!');
        router.push('/teacher');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit 2FA Code
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Please enter the valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/teachers/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Verification failed.');
      }

      toast.success(data.message || 'Verification successful! Redirecting...');
      router.push('/teacher');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend 2FA Code
  const handleResendCode = async () => {
    if (resending) return;
    setResending(true);
    try {
      const response = await fetch('/api/teachers/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to resend code.');
      }

      toast.success(data.message || 'New verification code sent to your email!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 relative px-4 py-12 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-110 animate-fade-up z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Teacher Portal</h1>
          <p className="text-sm text-slate-500 max-w-80">Log in to manage your classes, routines, student registry, and salary.</p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          {step === '2fa' ? (
            <form onSubmit={handleOtpSubmit} className="w-full flex flex-col gap-5 animate-fade-up">
              <div className="flex flex-col items-center text-center gap-2 p-4 bg-emerald-50 border border-emerald-200/60 rounded-2xl">
                <FiShield className="text-2xl text-emerald-600 mb-1" />
                <h3 className="text-base font-bold text-slate-800">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500 max-w-64">
                  We sent a 6-digit verification code to <span className="font-semibold text-slate-700">{email}</span>
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiShield className="text-sm" /> 6-Digit Security Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={loading}
                  placeholder="• • • • • •"
                  className="w-full text-center px-4 py-3 bg-white border border-slate-300 rounded-xl text-xl font-bold tracking-[0.4em] text-slate-900 placeholder:text-slate-300 outline-none transition-all duration-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Verify & Log In <FiArrowRight className="text-lg" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <FiArrowLeft className="text-sm" /> Back to credentials
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="flex items-center gap-1.5 font-semibold text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FiRefreshCw className={`text-xs ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Sending...' : 'Resend Code'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCredentialsSubmit} className="w-full flex flex-col gap-5">
              {/* Email Address */}
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
                  placeholder="teacher@school.com"
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
                    href="/auth/access/teacher/recovery"
                    className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
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
                  placeholder="••••••••"
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
                    <FiBookOpen className="text-lg" /> Teacher Login <FiArrowRight className="text-lg" />
                  </>
                )}
              </button>

              {/* Registration setup link */}
              <div className="text-center text-xs font-semibold text-slate-400 mt-2">
                First time logging in?{' '}
                <Link href="/auth/access/teacher/register" className="text-primary hover:text-primary-dark transition-colors underline">
                  Setup your account here
                </Link>
              </div>
            </form>
          )}
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

export default TeacherLogin;
