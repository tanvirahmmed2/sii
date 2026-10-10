'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

function OfficerForgetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  // Mode 1: Request reset link
  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  // Mode 2: Reset password using token
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Officer email is required.');
      return;
    }

    setRequestLoading(true);
    try {
      const endpoint = getApiEndpoint('officer/recovery');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch password recovery email.');
      }

      setRequestSent(true);
      toast.success(data.message || 'Recovery email dispatched. Please check your inbox.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    try {
      const endpoint = getApiEndpoint('officer/recovery');
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenParam.trim(),
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      toast.success(data.message || 'Password reset successfully! You can now sign in.');
      router.push(tenantUrl('/auth/access/officer/login'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 shadow-2xs space-y-6">

        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block">
            {website?.name || 'Campus Portal'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {tokenParam ? 'Reset Officer Password' : 'Officer Password Recovery'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tokenParam
              ? 'Establish a new secure password for your officer portal account.'
              : 'Enter your registered officer email to receive a secure recovery link.'}
          </p>
        </div>

        {tokenParam ? (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full py-2 px-4 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {resetLoading ? 'Saving New Password...' : 'Update Password & Return to Login'}
            </button>
          </form>
        ) : requestSent ? (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded text-xs text-emerald-800 dark:text-emerald-300">
              Recovery link has been dispatched to <strong>{email}</strong>. Please check your inbox and spam folder.
            </div>
            <p className="text-xs text-slate-500">The recovery link will expire in 1 hour.</p>
            <button
              type="button"
              onClick={() => setRequestSent(false)}
              className="text-xs text-slate-600 dark:text-slate-400 hover:underline"
            >
              Did not receive it? Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Registered Officer Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@campus.edu"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={requestLoading}
              className="w-full py-2 px-4 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {requestLoading ? 'Dispatching Recovery Email...' : 'Send Password Reset Link'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
          <Link
            href={tenantUrl('/auth/access/officer/login')}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
          >
            ← Back to Officer Portal Login
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function OfficerForgetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[60vh] flex items-center justify-center text-xs text-slate-500">
          Loading password recovery portal...
        </div>
      }
    >
      <OfficerForgetPasswordContent />
    </Suspense>
  );
}
