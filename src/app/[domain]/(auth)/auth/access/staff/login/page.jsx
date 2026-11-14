'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiEye, FiEyeOff, FiMail, FiPhone, FiAlertCircle } from 'react-icons/fi';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function StaffLoginPage() {
  const router = useRouter();
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [step, setStep] = useState('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [channel, setChannel] = useState('email');
  const [hasPhone, setHasPhone] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [maskedTarget, setMaskedTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [lockoutError, setLockoutError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCredentialsSubmit = async (e, customChannel = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      toast.error('Email address or phone number and password are required.');
      return;
    }

    setLoading(true);
    setLockoutError('');

    try {
      const activeChannel = customChannel || channel;
      const endpoint = getApiEndpoint('staff/login');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          password,
          channel: activeChannel,
        }),
      });

      const data = await response.json();

      if (!response.ok && response.status === 429 && data.locked) {
        setLockoutError(data.error || 'Your account is temporarily locked.');
        toast.error(data.error || 'Account locked due to multiple failed attempts.');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to authenticate.');
      }

      if (data.twoFactorRequired || data.requires2FA) {
        setStep('2fa');
        if (data.channel) setChannel(data.channel);
        setHasPhone(Boolean(data.hasPhone));
        setHasEmail(Boolean(data.hasEmail));
        setMaskedTarget(data.channel === 'sms' ? (data.phone || 'your phone') : (data.email || 'your email'));
        setCooldown(60);
        toast.success(data.message || 'Verification code dispatched.');
      } else {
        toast.success(data.message || 'Logged in successfully!');
        router.refresh();
        router.push(tenantUrl('/staff-panel'));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = twoFactorCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      toast.error('Please enter the complete 6-digit security code.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('staff/verify-2fa');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code: cleanCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Two-factor verification failed.');
      }

      toast.success(data.message || 'Verification successful!');
      router.refresh();
      router.push(tenantUrl('/staff-panel'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (targetChannel = null) => {
    if (resending || cooldown > 0) return;
    const activeChannel = targetChannel || channel;
    setResending(true);

    try {
      const endpoint = getApiEndpoint('staff/resend-2fa');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          channel: activeChannel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to resend code.');
      }

      setChannel(activeChannel);
      setCooldown(60);
      toast.success(data.message || `New code sent via ${activeChannel === 'sms' ? 'SMS' : 'email'}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Staff Portal Login
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log in to access {website?.name || 'institution'} operational desks & management workstations.
          </p>
        </div>

        {lockoutError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded flex items-start gap-2.5">
            <FiAlertCircle className="text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            <div className="text-xs text-rose-800 dark:text-rose-300">
              {lockoutError}
            </div>
          </div>
        )}

        {step === '2fa' ? (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded text-center space-y-1">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Two-Factor Security Verification
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                A 6-digit passcode was dispatched to <strong className="text-slate-900 dark:text-white">{maskedTarget || identifier}</strong> via {channel.toUpperCase()}.
              </p>
            </div>

            {hasPhone && hasEmail && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleResendCode(channel === 'email' ? 'sms' : 'email')}
                  disabled={resending || cooldown > 0}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium cursor-pointer disabled:opacity-50"
                >
                  {channel === 'email' ? <FiPhone size={13} /> : <FiMail size={13} />}
                  <span>{channel === 'email' ? 'Switch to SMS delivery' : 'Switch to Email delivery'}</span>
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                6-Digit Security Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                disabled={loading}
                className="w-full text-center px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-base font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading || twoFactorCode.length !== 6}
              className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
            >
              {loading ? 'Verifying Code...' : 'Authenticate & Enter Desk →'}
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                ← Back to credentials
              </button>

              <button
                type="button"
                onClick={() => handleResendCode(channel)}
                disabled={resending || cooldown > 0}
                className="text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : (resending ? 'Sending...' : 'Resend Code')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => handleCredentialsSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Staff Email Address or Phone Number *
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password *
                </label>
                <Link
                  href={tenantUrl('/auth/access/staff/recovery')}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
            >
              {loading ? 'Authenticating...' : 'Login to Staff Desk →'}
            </button>
          </form>
        )}

        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
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
