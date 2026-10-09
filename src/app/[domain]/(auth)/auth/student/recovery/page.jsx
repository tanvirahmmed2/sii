'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

function StudentRecoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  const urlToken = searchParams.get('token') || '';
  const urlEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(urlEmail);
  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(urlToken ? 2 : 1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken);
      setStep(2);
    }
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, [urlToken, urlEmail]);

  // Request recovery code
  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('student/recovery');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send token.');
      }

      toast.success(data.message || 'Verification token sent to your email.');
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
    if (!email.trim() || !token.trim() || !password) {
      toast.error('Email, verification code, and new password are required.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('student/recovery');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          recovery_token: token.trim(),
          new_password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      toast.success(data.message || 'Password reset successfully!');
      router.push(tenantUrl('/auth/student/login'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Security Desk'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Account Recovery
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {step === 1
              ? 'Enter your registered email to receive a password reset token.'
              : 'Enter your verification code and set your new password.'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestToken} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Registered Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="student@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
            >
              {loading ? 'Sending Code...' : 'Request Recovery Token →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Registered Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="student@example.com"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Verification Code *
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
                placeholder="Enter 6-digit code or paste token"
                className="w-full text-center px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

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
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
            >
              {loading ? 'Updating Password...' : 'Reset Password →'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Request a new verification code
            </button>
          </form>
        )}

        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <Link href={tenantUrl('/auth/student/login')} className="hover:underline font-medium text-primary">
            ← Back to Login
          </Link>
          <Link href={tenantUrl('/')} className="hover:text-slate-800 dark:hover:text-slate-200">
            Homepage
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function StudentRecoveryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading account recovery...</div>}>
      <StudentRecoveryContent />
    </Suspense>
  );
}