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

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [readOnly, setReadOnly] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(initialVerified);
  const [unverifiedInfo, setUnverifiedInfo] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    setIdentifier('');
    setPassword('');
    if (initialVerified) {
      setVerifiedSuccess(true);
    }
  }, [initialVerified]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnverifiedInfo(null);
    setResendNotice('');

    try {
      const payload = {
        identifier: identifier.trim(),
        password,
      };

      if (twoFactorRequired) {
        payload.twoFactorCode = twoFactorCode.trim();
      }

      const res = await fetch('/api/marketing/developer/me/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (context?.fetchCurrentUser) {
          await context.fetchCurrentUser();
        }
        router.push('/developer');
        router.refresh();
      } else if (data.twoFactorRequired || data.requires2FA) {
        setTwoFactorRequired(true);
        setTwoFactorEmail(data.email || '');
        setError('');
      } else {
        if (data.unverified) {
          setUnverifiedInfo({
            email: data.email || identifier,
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
    const targetEmail = unverifiedInfo?.email || identifier;
    if (!targetEmail) return;

    setResending(true);
    setResendNotice('');

    try {
      const res = await fetch('/api/marketing/developer/me/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, identifier: targetEmail }),
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

  const handleCancelTwoFactor = () => {
    setTwoFactorRequired(false);
    setTwoFactorCode('');
    setError('');
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium text-slate-900 dark:text-white">
          {SITE_NAME} Developer Access
        </h1>
        <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
          {twoFactorRequired
            ? 'Two-Factor Authentication required to verify your identity.'
            : 'Login to the developer administration console.'}
        </p>
      </div>

      {verifiedSuccess && (
        <div className="p-3 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-normal space-y-0.5">
          <p className="font-medium">Account verified successfully.</p>
          <p>Your administrator account is now active. Please login below.</p>
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

      {twoFactorRequired ? (
        <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
          <div className="p-3 rounded border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 text-xs space-y-1">
            <p className="font-medium">Two-Factor Code Sent</p>
            <p>
              Please enter the 6-digit verification code sent to your registered email address {twoFactorEmail ? `(${twoFactorEmail})` : ''}.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
              Verification Code *
            </label>
            <input
              type="text"
              name="dev_2fa_code"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-center text-lg tracking-widest font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={loading || twoFactorCode.length < 6}
              className="w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <button
              type="button"
              onClick={handleCancelTwoFactor}
              disabled={loading}
              className="w-full py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel &amp; Re-enter Credentials
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
          <input
            type="text"
            name="decoy_username_prevent_autofill"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="username"
            className="sr-only opacity-0 absolute -z-50 pointer-events-none h-0 w-0"
          />
          <input
            type="password"
            name="decoy_password_prevent_autofill"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="current-password"
            className="sr-only opacity-0 absolute -z-50 pointer-events-none h-0 w-0"
          />

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
              Email or Phone Number *
            </label>
            <input
              type="text"
              name="dev_auth_identifier"
              autoComplete="off"
              required
              readOnly={readOnly}
              onFocus={() => setReadOnly(false)}
              onPointerDown={() => setReadOnly(false)}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Password *
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
                name="dev_auth_secret"
                autoComplete="new-password"
                required
                readOnly={readOnly}
                onFocus={() => setReadOnly(false)}
                onPointerDown={() => setReadOnly(false)}
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
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      )}

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