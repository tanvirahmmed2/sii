'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function TeacherLoginPage() {
  const router = useRouter();
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  const [step, setStep] = useState('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('email');
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '', hasPhone: false, hasEmail: false });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('Email address or phone number and password are required.');
      return;
    }

    setLoading(true);
    setLockoutState({ isLocked: false, remainingSeconds: 0, message: '' });

    try {
      const endpoint = getApiEndpoint('teacher/login');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          channel: selectedChannel,
        }),
      });

      const data = await response.json();

      if (response.status === 429 && data.locked) {
        const secs = Number(data.remainingSeconds) || Number(data.remainingMinutes) * 60 || 900;
        setLockoutState({
          isLocked: true,
          remainingSeconds: secs,
          message: data.error || 'Account is temporarily locked due to multiple failed login attempts.',
        });
        toast.error(data.error);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate teacher.');
      }

      if (data.requires2FA || data.twoFactorRequired) {
        setContactInfo({
          email: data.email || '',
          phone: data.phone || '',
          hasPhone: Boolean(data.hasPhone || data.phone),
          hasEmail: Boolean(data.hasEmail || data.email),
        });
        setSelectedChannel(data.channel || 'email');
        setStep('2fa');
        setResendCooldown(60);
        toast.success(data.message || 'Security verification code dispatched.');
        return;
      }

      toast.success(data.message || 'Logged into teacher portal successfully.');
      router.push(tenantUrl('/teacher'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2Fa = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('teacher/verify-2fa');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code: twoFactorCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Security verification failed.');
      }

      toast.success(data.message || 'Verification successful. Redirecting...');
      router.push(tenantUrl('/teacher'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend2Fa = async (targetChannel) => {
    if (resending || resendCooldown > 0) return;
    const channelToUse = targetChannel || selectedChannel;
    setResending(true);
    try {
      const endpoint = getApiEndpoint('teacher/resend-2fa');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          channel: channelToUse,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      if (data.channel) {
        setSelectedChannel(data.channel);
      }
      setResendCooldown(60);
      toast.success(data.message || 'New verification code dispatched.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  const formatLockoutTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Faculty Portal'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Teacher Portal Login
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log in to manage assigned classes, attendance logs, evaluations, and routine.
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

        {step === '2fa' ? (
          <form onSubmit={handleVerify2Fa} className="space-y-4">
            <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded text-center space-y-1">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                Two-Factor Security Verification
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                A 6-digit passcode was sent to your registered{' '}
                <strong className="text-slate-900 dark:text-white">
                  {selectedChannel === 'sms'
                    ? (contactInfo.phone ? `phone number (${contactInfo.phone.replace(/.(?=.{4})/g, '*')})` : 'mobile phone via SMS')
                    : (contactInfo.email || identifier)}
                </strong>
              </p>
            </div>

            {contactInfo.hasPhone && (
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-slate-500">Deliver via:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChannel('email');
                    handleResend2Fa('email');
                  }}
                  disabled={resending}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer border ${
                    selectedChannel === 'email'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChannel('sms');
                    handleResend2Fa('sms');
                  }}
                  disabled={resending}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer border ${
                    selectedChannel === 'sms'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  SMS
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
              {loading ? 'Verifying Code...' : 'Authenticate & Log In →'}
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
                onClick={() => handleResend2Fa(selectedChannel)}
                disabled={resending || resendCooldown > 0}
                className="text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Address or Phone Number *
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
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password *
                </label>
                <Link
                  href={tenantUrl('/auth/access/teacher/recovery')}
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
              {loading ? 'Authenticating...' : 'Teacher Portal →'}
            </button>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              Received a faculty invitation?{' '}
              <Link
                href={tenantUrl('/auth/access/teacher/verify')}
                className="font-semibold text-primary hover:underline"
              >
                Verify profile & set password
              </Link>
            </div>
          </form>
        )}

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
