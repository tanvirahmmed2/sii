'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function StudentLoginPage() {
  const router = useRouter();
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusFeedback(null);

    if (!identifier.trim() || !password) {
      toast.error('Registration number or email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('student/login');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_number: identifier.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.verification_status) {
          setStatusFeedback({
            status: data.verification_status,
            message: data.error,
          });
        }
        throw new Error(data.error || 'Failed to authenticate.');
      }

      toast.success(data.message || 'Logged in successfully!');
      router.push(tenantUrl('/student'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Institutional Portal'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Portal Login
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign in with your verified student registration credentials.
          </p>
        </div>

        {/* Verification Status Feedback Alert */}
        {statusFeedback && (
          <div
            className={`p-3 rounded text-xs space-y-1 border ${
              statusFeedback.status === 'submitted'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                : statusFeedback.status === 'pending_setup'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <p className="font-semibold">
              {statusFeedback.status === 'submitted' && '⏳ Account Under Review'}
              {statusFeedback.status === 'pending_setup' && '✉ Incomplete Setup'}
              {statusFeedback.status === 'rejected' && '✕ Profile Rejected'}
            </p>
            <p className="text-[11px] leading-relaxed">{statusFeedback.message}</p>
            {statusFeedback.status === 'pending_setup' && (
              <div className="pt-1">
                <Link
                  href={tenantUrl('/auth/student/setup')}
                  className="font-bold underline text-amber-800 dark:text-amber-300"
                >
                  Go to Account Setup →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Registration Number or Email *
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              placeholder="e.g. REG-2026-001 or email@example.com"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password *
              </label>
              <Link
                href={tenantUrl('/auth/student/recovery')}
                className="text-xs font-medium text-primary hover:underline"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center shadow-xs"
          >
            {loading ? 'Authenticating Credentials...' : 'Sign In to Student Portal →'}
          </button>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Received your enrollment invitation?{' '}
            <Link
              href={tenantUrl('/auth/student/setup')}
              className="font-semibold text-primary hover:underline"
            >
              Setup your account here
            </Link>
          </div>
        </form>

        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <Link href={tenantUrl('/auth')} className="hover:text-slate-800 dark:hover:text-slate-200">
            ← Switch Portal
          </Link>
          <Link href={tenantUrl('/')} className="hover:text-slate-800 dark:hover:text-slate-200">
            Homepage
          </Link>
        </div>

      </div>
    </div>
  );
}