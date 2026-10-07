'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';
import LoadingScreen from 'src/component/common/LoadingScreen';

function CreatorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [is2FARequired, setIs2FARequired] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  // Check if creator is already logged in
  useEffect(() => {
    let ignore = false;
    async function checkExistingAuth() {
      try {
        const res = await fetch('/api/marketing/creator/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'me' }),
        });
        const data = await res.json();
        if (!ignore && data.success && data.creator) {
          const dest = redirectParam && redirectParam.startsWith('/')
            ? redirectParam
            : `/creator/${data.creator.id}`;
          router.replace(dest);
          return;
        }
      } catch (_) {
      } finally {
        if (!ignore) setCheckingAuth(false);
      }
    }

    checkExistingAuth();
    return () => {
      ignore = true;
    };
  }, [router, redirectParam]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsUnverified(false);
    setResendMsg('');

    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: email.trim().toLowerCase(),
          password,
          twoFactorCode: is2FARequired ? twoFactorCode.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.requiresVerification) {
          setIsUnverified(true);
          setUnverifiedEmail(data.email || email);
          setError(data.error || 'Account not verified. Please verify your email.');
          return;
        }

        if (data.requires2FA) {
          setIs2FARequired(true);
          setError('Two-factor authentication code required.');
          return;
        }

        setError(data.error || 'Sign in failed. Check your credentials.');
        return;
      }

      if (data.creator) {
        const dest = redirectParam && redirectParam.startsWith('/')
          ? redirectParam
          : `/creator/${data.creator.id}`;
        router.replace(dest);
      }
    } catch (_) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_verification',
          email: unverifiedEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResendMsg('Verification code resent. Check your inbox.');
      } else {
        setError(data.error || 'Failed to resend code.');
      }
    } catch {
      setError('Network error resending verification.');
    } finally {
      setResending(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-medium">
        Verifying session...
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded p-5 space-y-4 text-xs text-slate-800">
      <div>
        <h1 className="text-base font-semibold text-slate-900">Creator Sign In</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Access your websites workspace and creator studio.
        </p>
      </div>

      {error && (
        <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {error}
        </div>
      )}

      {resendMsg && (
        <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
          {resendMsg}
        </div>
      )}

      {isUnverified ? (
        <div className="space-y-3 pt-1">
          <p className="text-slate-600">
            A 6-digit confirmation code was sent to <strong className="text-slate-900">{unverifiedEmail}</strong>.
          </p>
          <div className="flex gap-2">
            <Link
              href={`/creator/verify?email=${encodeURIComponent(unverifiedEmail)}`}
              className="flex-1 text-center py-2 px-3 rounded bg-slate-900 text-white font-medium"
            >
              Enter Code
            </Link>
            <button
              type="button"
              disabled={resending}
              onClick={handleResendVerification}
              className="px-3 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
            >
              {resending ? 'Sending...' : 'Resend'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Email Address *
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Password *
              </label>
              <Link
                href="/creator/recovery"
                className="text-[11px] text-slate-500 hover:text-slate-800 underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer font-mono"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          {is2FARequired && (
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                2FA Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono tracking-widest text-center focus:outline-none focus:border-slate-800"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}

      <div className="pt-2 border-t border-slate-100 text-center text-slate-500 text-[11px]">
        Don&apos;t have a creator account?{' '}
        <Link href="/creator/register" className="font-semibold text-slate-800 hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
}

export default function CreatorLoginPage() {
  return (
    <CreatorAuthLayout
      headline="Creator Sign In"
      description="Access your school, academy, and portfolio website deployments."
    >
      <Suspense fallback={<LoadingScreen fullScreen={false} size="sm" label="Loading sign in..." />}>
        <CreatorLoginForm />
      </Suspense>
    </CreatorAuthLayout>
  );
}
