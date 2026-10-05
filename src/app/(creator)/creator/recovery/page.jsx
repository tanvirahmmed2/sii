'use client';

import { useState } from 'react';
import Link from 'next/link';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';

export default function CreatorRecoveryPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [resending, setResending] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email address is required.');
      return;
    }

    setLoading(true);
    setError('');
    setMsg('');

    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recover', email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(2);
        setMsg(data.message || 'A 6-digit reset code has been sent to your email.');
      } else {
        setError(data.error || 'No creator account found with this email.');
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
          email: email.trim().toLowerCase(),
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

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recover', email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg('A new reset code has been sent.');
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
    <CreatorAuthLayout
      headline="Account Recovery"
      description="Reset your creator credentials securely via email verification code."
    >
      <div className="w-full bg-white border border-slate-200 rounded p-5 space-y-4 text-xs text-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Password Recovery</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Step {step} of 3 &middot; {step === 1 ? 'Enter Email' : step === 2 ? 'Verify & Reset' : 'Completed'}
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
            {error}
          </div>
        )}

        {msg && (
          <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
            {msg}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Your Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="you@institution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Sending code...' : 'Send Recovery Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                6-Digit Recovery Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono tracking-widest text-center focus:outline-none focus:border-slate-800"
              />
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                New Password *
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 text-[10px] text-slate-400 hover:text-slate-700 font-mono"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="py-4 text-center space-y-3">
            <p className="text-slate-700 font-medium">Your password has been reset successfully.</p>
            <Link
              href="/creator/login"
              className="inline-block py-2 px-4 rounded bg-slate-900 text-white font-medium"
            >
              Sign In Now &rarr;
            </Link>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 text-center text-slate-500 text-[11px]">
          Remember your password?{' '}
          <Link href="/creator/login" className="font-semibold text-slate-800 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </CreatorAuthLayout>
  );
}
