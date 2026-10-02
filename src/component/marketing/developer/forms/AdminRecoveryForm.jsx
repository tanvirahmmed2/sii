'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SITE_NAME } from 'src/lib/database/secret';

export default function AdminRecoveryForm() {
  const [step, setStep] = useState('request'); // 'request' | 'reset' | 'success'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Request recovery token
  const handleRequestToken = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/marketing/developer/me/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_token', email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGeneratedToken(data.token);
        setToken(data.token);
        setSuccessMessage(data.message || 'Recovery token generated and sent to email.');
        setStep('reset');
      } else {
        setError(data.error || 'Failed to generate recovery token.');
      }
    } catch (err) {
      setError('Server error processing recovery.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password using token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/marketing/developer/me/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          email,
          token,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep('success');
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      setError('Server error processing password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium text-slate-900 dark:text-white">
          {SITE_NAME} Password Recovery
        </h1>
        <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
          Request a security recovery token and set a new password.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-normal">
          {error}
        </div>
      )}

      {/* Step 3: Password reset completed */}
      {step === 'success' && (
        <div className="space-y-4">
          <div className="p-3 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-normal space-y-1">
            <p className="font-medium">Password Reset Complete</p>
            <p>Your password has been updated. You can now sign in with your new password.</p>
          </div>
          <Link
            href="/developer-auth/login"
            className="block text-center w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors"
          >
            Sign In with New Password
          </Link>
        </div>
      )}

      {/* Step 2: Reset Form (Token received) */}
      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {successMessage && (
            <div className="p-3 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-normal">
              {successMessage}
            </div>
          )}

          {generatedToken && (
            <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">Recovery Token:</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Valid for 60m</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded font-mono text-xs text-slate-900 dark:text-slate-200 select-all break-all border border-slate-200 dark:border-slate-700 font-normal">
                {generatedToken}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
              Security Token
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="rec_..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>
      )}

      {/* Step 1: Request Form */}
      {step === 'request' && (
        <form onSubmit={handleRequestToken} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
              Developer Email Address
            </label>
            <input
              type="email"
              required
              placeholder="developer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Sending Request...' : 'Send Recovery Token'}
          </button>
        </form>
      )}

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
        <Link
          href="/developer-auth/login"
          className="text-xs font-normal text-slate-500 dark:text-slate-400 hover:underline"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}
