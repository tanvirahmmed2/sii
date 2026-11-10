'use client';

import { useState, useEffect, useContext, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';
import LoadingScreen from 'src/component/common/LoadingScreen';
import { Context } from 'src/component/helper/Context';

function resolveCreatorDestination(redirect, creatorId) {
  if (!redirect || typeof redirect !== 'string' || !redirect.startsWith('/')) {
    return `/creator/${creatorId}`;
  }
  if (redirect.startsWith('/creator/login') || redirect.startsWith('/creator/register')) {
    return `/creator/${creatorId}`;
  }
  const creatorMatch = redirect.match(/^\/creator\/(\d+)(.*)$/);
  if (creatorMatch) {
    const subPath = creatorMatch[2] || '';
    return `/creator/${creatorId}${subPath}`;
  }
  return redirect;
}

function CreatorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const { setCreator, fetchCurrentUser } = useContext(Context) || {};

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [readOnly, setReadOnly] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [twoFactorChannel, setTwoFactorChannel] = useState('email');
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [channelSwitching, setChannelSwitching] = useState(false);
  const [error, setError] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

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
          if (typeof setCreator === 'function') {
            setCreator(data.creator);
          }
          if (typeof fetchCurrentUser === 'function') {
            fetchCurrentUser();
          }
          const dest = resolveCreatorDestination(redirectParam, data.creator.id);
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

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleLogin = async (e, customChannel = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError('');
    setIsUnverified(false);
    setResendMsg('');

    try {
      const activeChannel = customChannel || twoFactorChannel;
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          identifier: identifier.trim(),
          password,
          twoFactorCode: is2FARequired ? twoFactorCode.trim() : undefined,
          channel: activeChannel,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.requiresVerification) {
          setIsUnverified(true);
          setUnverifiedEmail(data.email || identifier);
          setError(data.error || 'Account not verified. Please verify your email.');
          return;
        }

        if (data.requires2FA || data.twoFactorRequired) {
          setIs2FARequired(true);
          if (data.channel) {
            setTwoFactorChannel(data.channel);
          }
          if (data.rateLimited) {
            setError(data.error || 'Verification code limit reached.');
          } else {
            setCooldown(60);
            setError('');
            setResendMsg(data.error ? '' : `Two-factor verification code dispatched via ${data.channel === 'sms' ? 'SMS' : 'Email'}.`);
          }
          return;
        }

        if (data.locked) {
          setError(data.error || 'Account temporarily locked due to multiple failed login attempts.');
          return;
        }

        setError(data.error || 'Login failed. Check your credentials.');
        return;
      }

      if (data.creator) {
        if (typeof setCreator === 'function') {
          setCreator(data.creator);
        }
        if (typeof fetchCurrentUser === 'function') {
          fetchCurrentUser();
        }
        const dest = resolveCreatorDestination(redirectParam, data.creator.id);
        router.replace(dest);
      }
    } catch (_) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setChannelSwitching(false);
    }
  };

  const handleSelectChannel = async (targetChannel) => {
    if (cooldown > 0 && targetChannel === twoFactorChannel) return;
    setChannelSwitching(true);
    setTwoFactorCode('');
    setError('');
    setResendMsg('');
    await handleLogin(null, targetChannel);
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
    <div className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 text-xs text-slate-800 shadow-xs">
      <div>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Creator Login</h1>
        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
          {is2FARequired
            ? 'Two-Factor Authentication required to verify your identity.'
            : 'Access your websites workspace and creator studio.'}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs space-y-1.5">
          <div>{error}</div>
          {(error.toLowerCase().includes('register') || error.toLowerCase().includes('no creator account')) && (
            <div className="pt-0.5">
              <Link
                href="/creator/register"
                className="font-semibold text-rose-900 underline hover:text-rose-950 text-xs"
              >
                Create a new Creator account &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {resendMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-xs">
          {resendMsg}
        </div>
      )}

      {isUnverified ? (
        <div className="space-y-3 pt-1">
          <p className="text-slate-600 text-xs leading-relaxed">
            A 6-digit confirmation code was sent to your registered email address.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Link
              href={`/creator/verify?email=${encodeURIComponent(unverifiedEmail)}`}
              className="flex-1 text-center py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm transition-colors"
            >
              Enter Code
            </Link>
            <button
              type="button"
              disabled={resending}
              onClick={handleResendVerification}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 transition-colors"
            >
              {resending ? 'Sending...' : 'Resend'}
            </button>
          </div>
        </div>
      ) : is2FARequired ? (
        <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
          <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/60 text-indigo-900 text-xs space-y-1">
            <p className="font-semibold">
              {twoFactorChannel === 'sms' ? 'SMS Code Dispatched' : 'Email Code Dispatched'}
            </p>
            <p className="leading-relaxed">
              {twoFactorChannel === 'sms'
                ? 'Please enter the 6-digit verification code sent via SMS to your registered mobile phone.'
                : 'Please enter the 6-digit verification code sent to your registered email address.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Verification Code *
            </label>
            <input
              type="text"
              name="creator_2fa_code"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-center text-xl tracking-widest font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-800 transition-colors"
            />
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={loading || twoFactorCode.length < 6}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
              {twoFactorChannel === 'email' ? (
                <button
                  type="button"
                  disabled={cooldown > 0 || channelSwitching || loading}
                  onClick={() => handleSelectChannel('sms')}
                  className="text-xs text-indigo-600 font-medium hover:underline disabled:opacity-50 cursor-pointer"
                >
                  Send to phone
                </button>
              ) : (
                <button
                  type="button"
                  disabled={cooldown > 0 || channelSwitching || loading}
                  onClick={() => handleSelectChannel('email')}
                  className="text-xs text-indigo-600 font-medium hover:underline disabled:opacity-50 cursor-pointer"
                >
                  Send to email
                </button>
              )}

              <button
                type="button"
                disabled={cooldown > 0 || channelSwitching || loading}
                onClick={() => handleSelectChannel(twoFactorChannel)}
                className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
              >
                {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIs2FARequired(false);
                setTwoFactorCode('');
                setError('');
                setResendMsg('');
              }}
              className="w-full py-2 rounded-lg border border-slate-300 text-slate-600 text-xs hover:bg-slate-50 text-center cursor-pointer transition-colors"
            >
              Cancel &amp; Re-enter Credentials
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLogin} autoComplete="off" className="space-y-3.5">
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
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email or Phone Number *
            </label>
            <input
              type="text"
              name="creator_auth_identifier"
              autoComplete="off"
              required
              readOnly={readOnly}
              onFocus={() => setReadOnly(false)}
              onPointerDown={() => setReadOnly(false)}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-800 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Password *
              </label>
              <Link
                href="/creator/recovery"
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                name="creator_auth_secret"
                autoComplete="new-password"
                required
                readOnly={readOnly}
                onFocus={() => setReadOnly(false)}
                onPointerDown={() => setReadOnly(false)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 transition-colors shadow-2xs mt-1"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      )}

      <div className="pt-3 border-t border-slate-100 text-center text-slate-500 text-xs">
        Don&apos;t have a creator account?{' '}
        <Link href="/creator/register" className="font-semibold text-slate-900 hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
}

export default function CreatorLoginPage() {
  return (
    <CreatorAuthLayout
      headline="Creator Login"
      description="Access your school, academy, and portfolio website deployments."
    >
      <Suspense fallback={<LoadingScreen fullScreen={false} size="sm" label="Loading login..." />}>
        <CreatorLoginForm />
      </Suspense>
    </CreatorAuthLayout>
  );
}
