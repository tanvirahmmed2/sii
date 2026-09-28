'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheckIcon } from '@/components/ui/Icons';
import { SITE_NAME } from '@/lib/db/secret';

export default function AdminVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/developer/me/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message || 'Account verified successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/developer-auth/login');
        }, 1500);
      } else {
        setError(data.error || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      setError('Network or server error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your admin email address to resend the code.');
      return;
    }
    setResending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/developer/me/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('A new 6-digit verification code was sent via Brevo email.');
        setResendCooldown(60);
      } else {
        setError(data.error || 'Failed to resend code.');
      }
    } catch (err) {
      setError('Network error resending code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-2 border border-secondary/20">
          <ShieldCheckIcon className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{SITE_NAME} Admin Verification</h1>
        <p className="text-xs text-slate-500">
          Enter the 6-digit security code dispatched to your email via Brevo.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          {success}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@domain.com"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit Verification Code</label>
          <input
            type="text"
            required
            maxLength={6}
            pattern="[0-9]{6}"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary-dark disabled:opacity-50 text-white text-sm font-semibold shadow-md shadow-secondary/20 transition-all cursor-pointer"
        >
          {loading ? 'Verifying...' : 'Verify Admin Account'}
        </button>
      </form>

      <div className="flex items-center justify-between pt-2 text-xs">
        <button
          type="button"
          disabled={resending || resendCooldown > 0}
          onClick={handleResend}
          className="text-secondary hover:underline font-semibold disabled:opacity-50 cursor-pointer"
        >
          {resending
            ? 'Resending...'
            : resendCooldown > 0
            ? `Resend Code in ${resendCooldown}s`
            : "Didn't receive code? Resend"}
        </button>

        <Link href="/developer-auth/login" className="text-slate-500 hover:text-slate-800">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}
