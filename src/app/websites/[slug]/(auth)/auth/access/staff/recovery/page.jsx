'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiMail, FiLock, FiKey, FiArrowRight, FiCheckCircle } from 'react-icons/fi';

const RecoveryInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/staff/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send recovery link.');
      }

      toast.success(data.message || 'Reset link sent to your email.');
      setSuccess(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/staff/recovery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      toast.success('Password updated successfully!');
      setSuccess(true);
      setTimeout(() => router.push('/auth/access/staff/login'), 2500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full flex flex-col items-center gap-5 text-center py-6 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-primary-light border border-primary-light flex items-center justify-center">
          <FiCheckCircle className="text-primary text-2xl" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Success!</h2>
          <p className="text-sm text-slate-500 mt-2">
            {token 
              ? 'Your password has been reset successfully. Redirecting to login…' 
              : `A password reset link has been emailed to you. Please check your inbox.`}
          </p>
        </div>
      </div>
    );
  }

  if (token) {
    return (
      <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiLock className="text-slate-400" /> New Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiLock className="text-slate-400" /> Confirm Password
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 outline-none transition-all ${
              confirmPassword && password !== confirmPassword 
                ? 'border-red-300 focus:border-red-400 focus:ring-red-400/10' 
                : 'border-slate-200 focus:border-primary focus:ring-primary/5'
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={loading || (confirmPassword !== '' && password !== confirmPassword)}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-1"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestLink} className="w-full flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <FiMail className="text-sm" /> Enter Registered Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            Send Reset Link <FiArrowRight />
          </>
        )}
      </button>
    </form>
  );
};

const StaffRecoveryPage = () => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 relative px-4 py-12 overflow-hidden bg-slate-55 bg-slate-50">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[500px] animate-fade-up z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-[0_10px_30px_rgba(2,132,199,0.3)]">
            <FiKey className="text-white text-xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Password Recovery</h1>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Enter your email to request a secure password reset link, or verify your recovery token to choose a new password.
          </p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <Suspense fallback={
            <div className="w-full flex flex-col items-center justify-center gap-5 min-h-[200px]">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">Loading...</p>
            </div>
          }>
            <RecoveryInner />
          </Suspense>
        </div>

        <div className="w-full text-center mt-6">
          <Link
            href="/auth/access/staff/login"
            className="text-xs font-semibold hover:text-sky-605 transition-colors py-1.5 px-3 rounded-full hover:bg-primary-light text-primary"
          >
            Back to Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StaffRecoveryPage;
