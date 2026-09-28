'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheckIcon, CheckCircleIcon } from '@/components/ui/Icons';

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

    try {
      const res = await fetch('/api/developer/me/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_token', email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGeneratedToken(data.token);
        setToken(data.token);
        setSuccessMessage(data.message || 'Recovery token generated.');
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
      const res = await fetch('/api/developer/me/recovery', {
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
    <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/80 border border-indigo-500/20 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-500/30">
          <ShieldCheckIcon className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-white">Admin Recovery</h1>
        <p className="text-xs text-slate-400">
          Generate a verified security recovery token and reset your administrator password.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Step 3: Password reset completed */}
      {step === 'success' && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-emerald-400">Password Reset Complete</h2>
            <p className="text-xs text-slate-300">
              Your administrator password has been updated in the database.
            </p>
          </div>
          <Link
            href="/developer-auth/login"
            className="block w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all"
          >
            Sign In with New Password
          </Link>
        </div>
      )}

      {/* Step 2: Reset Form (Token received) */}
      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {generatedToken && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400">Recovery Token:</span>
                <span className="text-[10px] text-slate-400">Expires in 60m</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg font-mono text-xs text-emerald-300 select-all break-all border border-white/5 text-center font-bold tracking-wider">
                {generatedToken}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Security Token</label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="rec_..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {loading ? 'Updating Password...' : 'Save New Password & Finish'}
          </button>
        </form>
      )}

      {/* Step 1: Request Form */}
      {step === 'request' && (
        <form onSubmit={handleRequestToken} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Account Email</label>
            <input
              type="email"
              required
              placeholder="support@disibin.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {loading ? 'Validating...' : 'Send Security Recovery Token'}
          </button>
        </form>
      )}

      <div className="text-center pt-2">
        <Link href="/developer-auth/login" className="text-xs text-slate-500 hover:text-slate-400">
          ← Back to Admin Login
        </Link>
      </div>
    </div>
  );
}
