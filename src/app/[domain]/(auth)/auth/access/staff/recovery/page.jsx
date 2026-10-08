'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

function StaffRecoveryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('staff/recovery');
      const response = await fetch(endpoint, {
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
      const endpoint = getApiEndpoint('staff/recovery');
      const response = await fetch(endpoint, {
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
      setTimeout(() => router.push(tenantUrl('/auth/access/staff/login')), 2000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-3 text-center py-6">
        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 inline-block">
          [Success]
        </span>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {token ? 'Password Reset Complete' : 'Reset Link Dispatched'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          {token 
            ? 'Your credentials have been updated. Redirecting to staff login...' 
            : 'A password recovery link has been emailed to you. Please check your inbox and follow the instructions.'}
        </p>
      </div>
    );
  }

  if (token) {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            New Password *
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="Minimum 6 characters"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Confirm New Password *
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder="Repeat password"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (confirmPassword !== '' && password !== confirmPassword)}
          className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
        >
          {loading ? 'Updating Password...' : 'Reset Password →'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestLink} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
          Registered Staff Email *
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="staff@institution.edu"
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
      >
        {loading ? 'Sending Link...' : 'Send Password Reset Link →'}
      </button>
    </form>
  );
}

export default function StaffRecoveryPage() {
  const { website, tenantUrl } = useTenantWebsite();

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Staff Security'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Staff Password Recovery
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Request an authorized password recovery link or enter your reset token.
          </p>
        </div>

        <Suspense fallback={<div className="py-12 text-center text-xs text-slate-400">Loading...</div>}>
          <StaffRecoveryInner />
        </Suspense>

        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <Link href={tenantUrl('/auth/access/staff/login')} className="hover:underline font-medium text-primary">
            ← Back to Staff Login
          </Link>
        </div>

      </div>
    </div>
  );
}
