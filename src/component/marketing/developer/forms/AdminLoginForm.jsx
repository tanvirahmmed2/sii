'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SITE_NAME } from 'src/lib/database/secret';
import { Context } from 'src/component/helper/Context';

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = useContext(Context);

  const initialVerified = searchParams.get('verified') === 'true';
  const initialEmailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmailParam || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(initialVerified);
  const [unverifiedInfo, setUnverifiedInfo] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    if (initialEmailParam) {
      setEmail(initialEmailParam);
    }
    if (initialVerified) {
      setVerifiedSuccess(true);
    }
  }, [initialEmailParam, initialVerified]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnverifiedInfo(null);
    setResendNotice('');

    try {
      const res = await fetch('/api/marketing/developer/me/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (context?.fetchCurrentUser) {
          await context.fetchCurrentUser();
        }
        router.push('/developer');
        router.refresh();
      } else {
        if (data.unverified) {
          setUnverifiedInfo({
            email: data.email || email,
            message: data.error || 'Your developer account has not been verified yet. Please check your email for the activation link.',
          });
        } else {
          setError(data.error || 'Authentication failed. Please check your credentials.');
        }
      }
    } catch (err) {
      setError('Network or server error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    const targetEmail = unverifiedInfo?.email || email;
    if (!targetEmail) return;

    setResending(true);
    setResendNotice('');

    try {
      const res = await fetch('/api/marketing/developer/me/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendNotice('A new verification activation link has been sent to your email.');
      } else {
        setError(data.error || 'Failed to resend verification link.');
      }
    } catch (err) {
      setError('Network error resending verification link.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium text-slate-900 dark:text-white">
          {SITE_NAME} Developer Access
        </h1>
        <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
          Sign in to the developer administration console.
        </p>
      </div>

      {verifiedSuccess && (
        <div className="p-3 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-normal space-y-0.5">
          <p className="font-medium">Account verified successfully.</p>
          <p>Your administrator account is now active. Please sign in below.</p>
        </div>
      )}

      {unverifiedInfo && (
        <div className="p-3 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-normal space-y-2">
          <p>{unverifiedInfo.message}</p>

          {resendNotice ? (
            <p className="text-emerald-700 dark:text-emerald-300 font-medium">
              {resendNotice}
            </p>
          ) : (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleResendLink}
                disabled={resending}
                className="px-3 py-1.5 rounded border border-amber-600 bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
              >
                {resending ? 'Sending Link...' : 'Resend Verification Link'}
              </button>

              <Link
                href={`/developer-auth/verify?email=${encodeURIComponent(unverifiedInfo.email)}`}
                className="text-xs text-amber-800 dark:text-amber-300 hover:underline font-normal"
              >
                Enter code manually
              </Link>
            </div>
          )}
        </div>
      )}

      {error && !unverifiedInfo && (
        <div className="p-3 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-normal">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="developer@company.com"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
              Password
            </label>
            <Link
              href="/developer-auth/recovery"
              className="text-xs font-normal text-slate-500 dark:text-slate-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
        <Link
          href="/"
          className="text-xs font-normal text-slate-500 dark:text-slate-400 hover:underline"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
