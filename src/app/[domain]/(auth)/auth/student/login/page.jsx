'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function StudentLoginPage() {
  const router = useRouter();
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);

  const [lockoutState, setLockoutState] = useState({
    isLocked: false,
    remainingSeconds: 0,
    message: '',
  });

  useEffect(() => {
    if (lockoutState.remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutState((prev) => {
        if (prev.remainingSeconds <= 1) {
          return { isLocked: false, remainingSeconds: 0, message: '' };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutState.remainingSeconds]);

  const formatLockoutTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusFeedback(null);

    if (!identifier.trim() || !password) {
      toast.error('Registration number, email, or phone number and password are required.');
      return;
    }

    setLoading(true);
    setLockoutState({ isLocked: false, remainingSeconds: 0, message: '' });

    try {
      const endpoint = getApiEndpoint('student/login');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 && data.locked) {
          const seconds = Number(data.remainingSeconds) || (Number(data.remainingMinutes) ? data.remainingMinutes * 60 : 900);
          setLockoutState({
            isLocked: true,
            remainingSeconds: seconds,
            message: data.error || 'Too many consecutive failed login attempts. Your account has been temporarily locked.',
          });
          return;
        }

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
    <div className="w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Student Portal'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Portal Login
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log in with your verified student registration credentials.
          </p>
        </div>

        {lockoutState.isLocked && (
          <div className="p-4 rounded-md border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">Account Locked</span>
            </div>
            <p className="text-xs leading-relaxed">{lockoutState.message}</p>
            <div className="flex items-center justify-between text-xs font-mono font-semibold pt-1 border-t border-rose-200 dark:border-rose-900/60">
              <span>Time Remaining:</span>
              <span className="text-rose-900 dark:text-rose-100">{formatLockoutTimer(lockoutState.remainingSeconds)}</span>
            </div>
          </div>
        )}

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Registration Number, Email, or Phone Number *
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading || lockoutState.isLocked}
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || lockoutState.isLocked}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer select-none"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || lockoutState.isLocked}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center shadow-xs"
          >
            {loading ? 'Authenticating Credentials...' : 'Student Portal →'}
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
          <Link href={tenantUrl('/auth/access')} className="hover:text-slate-800 dark:hover:text-slate-200">
            ← Switch Role
          </Link>
          <Link href={tenantUrl('/')} className="hover:text-slate-800 dark:hover:text-slate-200">
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
