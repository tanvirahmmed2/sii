'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BiCheckCircle, BiLoaderAlt, BiKey, BiEnvelope, BiArrowBack, BiLockAlt } from 'react-icons/bi';
import CreatorAuthLayout from '@/components/creator/CreatorAuthLayout';

export default function CreatorRecoveryPage() {
  const [step, setStep] = useState(1); // 1: Request Code, 2: Reset Password, 3: Completed
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [resending, setResending] = useState(false);

  // Step 1: Request 6-digit recovery code
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
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recover', email: email.trim() }),
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

  // Step 2: Submit 6-digit code and new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!code || !newPassword) {
      setError('Please provide the reset code and your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please double check.');
      return;
    }

    setLoading(true);
    setError('');
    setMsg('');

    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          email: email.trim(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(3);
        setMsg(data.message || 'Your password has been reset successfully!');
      } else {
        setError(data.error || 'Failed to reset password. Check your code and try again.');
      }
    } catch (_) {
      setError('Server error during password reset.');
    } finally {
      setLoading(false);
    }
  };

  // Resend code from step 2
  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError('');
    setMsg('');

    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recover', email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message || 'A new 6-digit code has been sent.');
      } else {
        setError(data.error || 'Failed to resend reset code.');
      }
    } catch (_) {
      setError('Network error while requesting code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <CreatorAuthLayout
      badge="Account Recovery"
      headline="Securely Reset Your Password"
      description="Forgot your password? No worries. Enter your registered email to receive a verified 6-digit recovery code and regain immediate access."
      features={[
        'End-to-end encrypted password verification tokens',
        'Rapid account recovery with zero data loss',
        'Instant access to your portfolios once updated',
      ]}
      stats={[
        { label: 'Encryption', value: '256-Bit' },
        { label: 'Code Expiry', value: '15 Mins' },
        { label: 'Recovery SLA', value: 'Instant' },
      ]}
      quote={{
        text: 'Account recovery was quick and protected our studio projects without any downtime.',
        author: 'Sophia Chen',
        role: 'Lead Architect, ArchiForm',
      }}
      topRightLink={{
        prompt: 'Remember your password?',
        text: 'Sign In',
        href: '/creator/login',
      }}
    >
      <div className="w-full p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {step === 1 && 'Reset Password'}
            {step === 2 && 'Set New Password'}
            {step === 3 && 'Password Reset Complete'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {step === 1 && 'Enter your account email to receive a 6-digit reset code.'}
            {step === 2 && `Enter the code sent to ${email} and set your new password.`}
            {step === 3 && 'Your password has been updated. You can now sign in.'}
          </p>
        </div>

        {/* Alerts */}
        {msg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            {msg}
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Step 1: Request Code */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <>
                  <BiLoaderAlt className="animate-spin text-base" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <span>Send 6-Digit Reset Code →</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Already have a reset code?
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Enter Code and New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                6-Digit Reset Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[8px] font-mono text-xl font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-indigo-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <>
                  <BiLoaderAlt className="animate-spin text-base" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Reset Password →</span>
              )}
            </button>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {resending ? 'Resending...' : 'Resend Code'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <BiArrowBack className="text-xs" /> Change Email
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success Completed */}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed font-medium">
              Your account password has been updated securely. You can now use your new credentials to access your Creator Studio.
            </div>

            <Link
              href="/creator/login"
              className="w-full block py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all text-center cursor-pointer"
            >
              Sign In with New Password →
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/creator/login"
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
          >
            ← Back to Creator Sign In
          </Link>
        </div>
      </div>
    </CreatorAuthLayout>
  );
}
