'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function OfficerLoginPage() {
  const router = useRouter();
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Officer email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('officer/login');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to authenticate officer.');
      }

      if (data.requires2FA || data.payload?.requires2FA) {
        toast.success(data.message || 'Two-factor authentication code sent to your email.');
        setStep('2fa');
      } else {
        toast.success(data.message || 'Welcome back! Signed in successfully.');
        router.refresh();
        router.push(tenantUrl('/officer'));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit security code.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('officer/login');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, code: otpCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Security code verification failed.');
      }

      toast.success('Two-factor verification successful.');
      router.refresh();
      router.push(tenantUrl('/officer'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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
            Officer Portal Login
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign in to access Residential, Library, Club, and Administrative desks.
          </p>
        </div>

        {step === '2fa' ? (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-center space-y-1">
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Two-Factor Security Verification
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                A 6-digit passcode was sent to <strong className="text-slate-900 dark:text-white font-medium">{email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                6-Digit Security Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verifying Passcode...' : 'Verify & Proceed'}
            </button>

            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 pt-2"
            >
              Back to email sign-in
            </button>
          </form>
        ) : (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Officer Email Address *
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password *
                </label>
                <Link
                  href={tenantUrl('/auth/access/officer/forget-password')}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Officer Portal'}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Received an invitation email?{' '}
            <Link
              href={tenantUrl('/auth/access/officer/verify')}
              className="text-slate-900 dark:text-white font-medium hover:underline"
            >
              Verify Officer Account
            </Link>
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-1">
            <Link href={tenantUrl('/auth/access/staff/login')} className="hover:text-slate-700 dark:hover:text-slate-200">
              Staff Portal
            </Link>
            <span>•</span>
            <Link href={tenantUrl('/auth/access/teacher/login')} className="hover:text-slate-700 dark:hover:text-slate-200">
              Faculty Portal
            </Link>
            <span>•</span>
            <Link href={tenantUrl('/')} className="hover:text-slate-700 dark:hover:text-slate-200">
              Campus Home
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
