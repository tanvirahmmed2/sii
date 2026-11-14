'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiEye, FiEyeOff, FiMail, FiPhone, FiLock, FiKey, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

function StaffRecoveryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const initialIdentifier = searchParams.get('email') || searchParams.get('identifier') || '';
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  const [step, setStep] = useState(initialToken ? 'reset' : 'request');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [channel, setChannel] = useState('email');
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestCode = async (e, customChannel = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const activeChannel = customChannel || channel;
    if (cooldown > 0 && activeChannel === channel) return;

    const cleanId = identifier.trim();
    if (!cleanId) {
      toast.error('Email address or phone number is required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('staff/recovery');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          channel: activeChannel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch recovery code.');
      }

      setChannel(activeChannel);
      setCooldown(60);
      setStep('reset');
      toast.success(data.message || `Recovery code sent via ${activeChannel === 'sms' ? 'SMS' : 'email'}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) {
      toast.error('Recovery code is required.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('staff/recovery');
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          token: cleanToken,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      toast.success(data.message || 'Password reset successfully!');
      setSuccess(true);
      setTimeout(() => {
        router.push(tenantUrl('/auth/access/staff/login'));
      }, 2000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center py-6">
        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl">
          <FiCheckCircle />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Password Reset Complete
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Your staff account credentials have been updated successfully. Redirecting you to the staff portal login...
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={tenantUrl('/auth/access/staff/login')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Go to Staff Login Now →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {step === 'request' ? (
        <form onSubmit={(e) => handleRequestCode(e)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Staff Email Address or Phone Number *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoComplete="username"
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Recovery Code Delivery Method *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium border cursor-pointer transition-colors ${
                  channel === 'email'
                    ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <FiMail />
                <span>Via Email</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('sms')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium border cursor-pointer transition-colors ${
                  channel === 'sms'
                    ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <FiPhone />
                <span>Via SMS</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
          >
            {loading ? 'Dispatching Recovery Code...' : 'Send Recovery Code →'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded text-center space-y-1">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              Verification Code Dispatched
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Code dispatched to <strong className="text-slate-900 dark:text-white">{identifier || 'your account'}</strong> via {channel.toUpperCase()}.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              6-Digit Recovery Code *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ''))}
                disabled={loading}
                className="w-full text-center px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-base font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
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
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || token.length !== 6 || newPassword.length < 6}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
          >
            {loading ? 'Updating Password...' : 'Reset Password & Re-authenticate →'}
          </button>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              ← Change identifier
            </button>

            <button
              type="button"
              onClick={(e) => handleRequestCode(e, channel)}
              disabled={loading || cooldown > 0}
              className="text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}

      <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
        <Link href={tenantUrl('/auth/access/staff/login')} className="hover:text-slate-800 dark:hover:text-slate-200">
          ← Back to Staff Login
        </Link>
        <Link href={tenantUrl('/')} className="hover:text-slate-800 dark:hover:text-slate-200">
          Homepage
        </Link>
      </div>
    </div>
  );
}

export default function StaffRecoveryPage() {
  const { website } = useTenantWebsite();

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Staff Account Recovery
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Reset credentials for your {website?.name || 'institution'} staff account.
          </p>
        </div>

        <Suspense fallback={<div className="py-6 text-center text-xs text-slate-400">Loading recovery workstation...</div>}>
          <StaffRecoveryInner />
        </Suspense>
      </div>
    </div>
  );
}
