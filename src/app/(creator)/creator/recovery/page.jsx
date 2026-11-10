'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';
import LoadingScreen from 'src/component/common/LoadingScreen';

function CreatorRecoveryForm() {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token') || '';
  const urlEmail = searchParams.get('email') || '';

  const [step, setStep] = useState(urlToken ? 2 : 1);
  const [identifier, setIdentifier] = useState(urlEmail);
  const [channel, setChannel] = useState('email');
  const [code, setCode] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (urlToken && urlEmail) {
      setStep(2);
      setCode(urlToken);
      setIdentifier(urlEmail);
      setMsg('Reset token detected. Please enter your new password.');
    }
  }, [urlToken, urlEmail]);

  const handleRequestCode = async (e, customChannel = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const activeChannel = customChannel || channel;
    if (cooldown > 0 && activeChannel === channel) return;

    if (!identifier.trim()) {
      setError('Email or phone number is required.');
      return;
    }

    setLoading(true);
    setError('');
    setMsg('');

    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recover',
          identifier: identifier.trim(),
          channel: activeChannel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChannel(activeChannel);
        setStep(2);
        setMsg(data.message || 'A 6-digit reset code has been sent.');
        setCooldown(60);
      } else {
        setError(data.error || 'Failed to send recovery code.');
      }
    } catch (_) {
      setError('Server error while requesting recovery code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!code || !newPassword) {
      setError('Please provide the recovery code and your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          identifier: identifier.trim(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(3);
      } else {
        setError(data.error || 'Failed to reset password. The code may have expired.');
      }
    } catch (_) {
      setError('Server error while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (targetChannel = channel) => {
    if (cooldown > 0 && targetChannel === channel) return;
    setResending(true);
    setError('');
    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recover',
          identifier: identifier.trim(),
          channel: targetChannel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChannel(targetChannel);
        setMsg(data.message || 'A new reset code has been sent.');
        setCooldown(60);
      } else {
        setError(data.error || 'Failed to resend code.');
      }
    } catch (_) {
      setError('Error resending code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 text-xs text-slate-800 shadow-xs">
      <div>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Password Recovery</h1>
        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
          Step {step} of 3 &middot; {step === 1 ? 'Enter Email or Phone' : step === 2 ? 'Verify & Reset' : 'Completed'}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs space-y-1">
          {error}
        </div>
      )}

      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-xs">
          {msg}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={(e) => handleRequestCode(e, 'email')} autoComplete="off" className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email or Phone Number *
            </label>
            <input
              type="text"
              name="creator_recovery_identifier"
              autoComplete="off"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-800 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 transition-colors shadow-2xs mt-1"
          >
            {loading ? 'Sending code...' : cooldown > 0 ? `Please wait ${cooldown}s` : 'Send Recovery Code'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleResetPassword} autoComplete="off" className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              6-Digit Recovery Code *
            </label>
            <input
              type="text"
              name="creator_recovery_token"
              autoComplete="off"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-center text-xl tracking-widest font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-800 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              New Password *
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                name="creator_recovery_new_password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-800 pr-14 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 px-1.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer font-mono"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Confirm New Password *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="creator_recovery_confirm_password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-800 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 transition-colors shadow-2xs mt-1"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            {channel === 'email' ? (
              <button
                type="button"
                onClick={() => handleRequestCode(null, 'sms')}
                disabled={resending || loading || cooldown > 0}
                className="text-xs text-indigo-600 font-medium hover:underline disabled:opacity-50 cursor-pointer"
              >
                Send to phone
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRequestCode(null, 'email')}
                disabled={resending || loading || cooldown > 0}
                className="text-xs text-indigo-600 font-medium hover:underline disabled:opacity-50 cursor-pointer"
              >
                Send to email
              </button>
            )}

            <button
              type="button"
              disabled={resending || cooldown > 0}
              onClick={() => handleResend(channel)}
              className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {resending ? 'Sending...' : cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setChannel('email');
                setError('');
                setMsg('');
              }}
              className="text-xs text-slate-500 hover:underline cursor-pointer"
            >
              Change Identifier
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="py-4 text-center space-y-3">
          <p className="text-slate-700 font-medium text-xs sm:text-sm">Your password has been reset successfully.</p>
          <Link
            href="/creator/login"
            className="inline-block w-full sm:w-auto py-2.5 px-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm transition-colors"
          >
            Login Now &rarr;
          </Link>
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 text-center text-slate-500 text-xs">
        Remember your password?{' '}
        <Link href="/creator/login" className="font-semibold text-slate-900 hover:underline">
          Login
        </Link>
      </div>
    </div>
  );
}

export default function CreatorRecoveryPage() {
  return (
    <CreatorAuthLayout
      headline="Account Recovery"
      description="Reset your creator credentials securely via email or SMS verification code."
    >
      <Suspense fallback={<LoadingScreen fullScreen={false} size="sm" label="Loading recovery..." />}>
        <CreatorRecoveryForm />
      </Suspense>
    </CreatorAuthLayout>
  );
}
