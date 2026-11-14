'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

function TeacherRecoveryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token') || '';
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  const [step, setStep] = useState(() => (urlToken ? 2 : 1));
  const [identifier, setIdentifier] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('email');
  const [recoveryToken, setRecoveryToken] = useState(() => urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Email address or phone number is required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('teacher/recovery');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          channel: selectedChannel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to dispatch recovery code.');
      }

      toast.success(data.message || 'Recovery code dispatched successfully.');
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!recoveryToken.trim() || !newPassword || !confirmPassword) {
      toast.error('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('teacher/recovery');
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: recoveryToken.trim(),
          recovery_token: recoveryToken.trim(),
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to reset password.');
      }

      toast.success(data.message || 'Password reset successfully! Redirecting to login...');
      setTimeout(() => router.push(tenantUrl('/auth/access/teacher/login')), 1500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
          {website?.name || 'Faculty Security'}
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Teacher Password Recovery
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {step === 1
            ? 'Enter your registered faculty email or phone number to receive a security recovery code.'
            : urlToken
            ? 'Security token verified. Establish your new faculty password.'
            : 'Enter your recovery code and establish your new faculty password.'}
        </p>
      </div>

      {step === 1 ? (
        <form onSubmit={handleRequestToken} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Faculty Email Address or Phone Number *
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Recovery Channel *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedChannel('email')}
                className={`py-2 px-3 rounded border text-xs font-medium cursor-pointer transition-colors ${
                  selectedChannel === 'email'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                }`}
              >
                Email Address
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel('sms')}
                className={`py-2 px-3 rounded border text-xs font-medium cursor-pointer transition-colors ${
                  selectedChannel === 'sms'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                }`}
              >
                SMS Notification
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
          >
            {loading ? 'Dispatching Recovery Code...' : 'Request Recovery Code →'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Recovery Code or Token *
            </label>
            <input
              type="text"
              required
              value={recoveryToken}
              onChange={(e) => setRecoveryToken(e.target.value)}
              disabled={loading}
              className="w-full text-center px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer select-none"
              >
                {showNewPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer select-none"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
          >
            {loading ? 'Updating Password...' : 'Reset Teacher Password →'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep(1);
              setRecoveryToken('');
            }}
            disabled={loading}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            Request a new recovery code
          </button>
        </form>
      )}

      <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
        <Link href={tenantUrl('/auth/access/teacher/login')} className="hover:underline font-medium text-primary">
          ← Back to Teacher Login
        </Link>
        <Link href={tenantUrl('/')} className="hover:text-slate-800 dark:hover:text-slate-200">
          Homepage
        </Link>
      </div>
    </div>
  );
}

export default function TeacherRecoveryPage() {
  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs">
        <Suspense
          fallback={
            <div className="py-12 flex justify-center items-center">
              <div className="loader loader-md" />
            </div>
          }
        >
          <TeacherRecoveryInner />
        </Suspense>
      </div>
    </div>
  );
}
