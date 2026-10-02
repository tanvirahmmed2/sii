'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SITE_NAME } from 'src/lib/database/secret';

export default function AdminVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';
  const errorParam = searchParams.get('error') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialToken ? '' : '');
  const [autoVerifying, setAutoVerifying] = useState(Boolean(initialToken));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const autoVerifyAttempted = useRef(false);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (errorParam === 'invalid_token') {
      setError('This verification link is invalid or has already been used.');
    } else if (errorParam === 'expired_token') {
      setError('This verification link has expired. Please request a new activation link.');
    } else if (errorParam === 'missing_token') {
      setError('No verification token was provided in the link.');
    }
  }, [errorParam]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Automatic token verification on landing
  useEffect(() => {
    if (initialToken && !autoVerifyAttempted.current) {
      autoVerifyAttempted.current = true;
      setAutoVerifying(true);
      setError('');
      setSuccess('');

      fetch('/api/marketing/developer/me/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: initialToken, email: initialEmail || undefined }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSuccess(data.message || 'Account verified successfully. Redirecting to login...');
            setTimeout(() => {
              const targetEmail = data.email || initialEmail;
              router.push(`/developer-auth/login?verified=true&email=${encodeURIComponent(targetEmail)}`);
            }, 1200);
          } else {
            setError(data.error || 'Verification link is invalid or expired.');
          }
        })
        .catch((err) => {
          console.error('Auto verify error:', err);
          setError('Network or server error during automatic verification. Please try manual verification.');
        })
        .finally(() => {
          setAutoVerifying(false);
        });
    }
  }, [initialToken, initialEmail, router]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/marketing/developer/me/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: code || initialToken }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message || 'Account verified successfully. Redirecting to login...');
        setTimeout(() => {
          router.push(`/developer-auth/login?verified=true&email=${encodeURIComponent(email)}`);
        }, 1200);
      } else {
        setError(data.error || 'Verification failed. Please check the code or link.');
      }
    } catch (err) {
      setError('Network or server error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your developer email address to resend the activation link.');
      return;
    }
    setResending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/marketing/developer/me/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('A new verification activation link was sent to your email.');
        setResendCooldown(60);
      } else {
        setError(data.error || 'Failed to resend verification link.');
      }
    } catch (err) {
      setError('Network error resending verification link.');
    } finally {
      setResending(false);
    }
  };

  if (autoVerifying) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-3 text-center">
        <h2 className="text-xl font-medium text-slate-900 dark:text-white">Verifying Account</h2>
        <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
          Please wait while your activation token is being verified...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium text-slate-900 dark:text-white">
          {SITE_NAME} Developer Verification
        </h1>
        <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
          Activate your developer account using the verification code or token.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-normal">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-normal">
          {success}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
            Developer Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="developer@example.com"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
            Verification Code or Token
          </label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter verification code or token"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(success)}
          className="w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? 'Verifying...' : 'Verify & Activate'}
        </button>
      </form>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={resending || resendCooldown > 0}
          onClick={handleResend}
          className="text-xs font-normal text-slate-700 dark:text-slate-300 hover:underline disabled:opacity-50 cursor-pointer"
        >
          {resending
            ? 'Sending link...'
            : resendCooldown > 0
            ? `Resend available in ${resendCooldown}s`
            : 'Resend Verification Link'}
        </button>

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
