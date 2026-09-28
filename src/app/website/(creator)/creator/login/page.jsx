'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BiLoaderAlt, BiLockAlt, BiShieldQuarter, BiEnvelope, BiArrowBack } from 'react-icons/bi';
import CreatorAuthLayout from '@/components/creator/CreatorAuthLayout';

export default function CreatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [is2FARequired, setIs2FARequired] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsUnverified(false);
    setResendMsg('');

    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: email.trim(),
          password,
          twoFactorCode: is2FARequired ? twoFactorCode.trim() : undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.creator) {
        router.push(`/creator/${data.creator.id}`);
        return;
      }

      if (data.twoFactorRequired) {
        setIs2FARequired(true);
        if (data.twoFactorInvalid) {
          setError(data.error || 'Invalid or expired 2FA security code.');
        } else {
          setResendMsg('A 6-digit security code has been sent to your email.');
        }
        return;
      }

      setError(data.error || 'Authentication failed. Please check your credentials.');
      if (data.unverified) {
        setIsUnverified(true);
        setUnverifiedEmail(data.email || email);
      }
    } catch (_) {
      setError('Server error during sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const targetEmail = unverifiedEmail || email;
    if (!targetEmail) return;
    setResending(true);
    setResendMsg('');
    setError('');

    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_verification',
          email: targetEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResendMsg(data.message || 'Verification code sent! Check your inbox.');
      } else {
        setError(data.error || 'Failed to resend verification link.');
      }
    } catch (_) {
      setError('Network error while resending verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <CreatorAuthLayout
      badge="Creator Studio"
      headline="Welcome Back to Your Studio"
      description="Access your visual site builder, manage live projects, monitor client inquiries, and scale your commerce operations."
      features={[
        'Drag-and-drop website editor with instant global publishing',
        'Built-in store engine with zero commission and instant payouts',
        'Automated appointment bookings, lead management, and live chat',
      ]}
      stats={[
        { label: 'Active Creators', value: '23k+' },
        { label: 'Websites Built', value: '54k+' },
        { label: 'Uptime SLA', value: '99.99%' },
      ]}
      quote={{
        text: 'Switching to this platform transformed our studio workflow. Publishing client sites takes minutes, not weeks.',
        author: 'Elena Rostova',
        role: 'Creative Director, Studio Aura',
      }}
      topRightLink={{
        prompt: "Don't have a studio yet?",
        text: 'Create Account',
        href: '/creator/register',
      }}
    >
      <div className="w-full p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {is2FARequired ? 'Security Verification' : 'Creator Login'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {is2FARequired
              ? 'Enter the 6-digit verification code sent to your email.'
              : 'Access your creator dashboard, manage portfolios, and scale your brand.'}
          </p>
        </div>

        {/* Alerts */}
        {resendMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            {resendMsg}
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold space-y-2">
            <p>{error}</p>
            {isUnverified && (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href={`/creator/verify?email=${encodeURIComponent(unverifiedEmail || email)}`}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-center transition-colors text-[11px]"
                >
                  Go to Verification Page →
                </Link>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                >
                  {resending ? (
                    <>
                      <BiLoaderAlt className="animate-spin text-xs" />
                      <span>Resending code...</span>
                    </>
                  ) : (
                    <span>Resend 6-Digit Code</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {!is2FARequired ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <Link
                    href="/creator/recovery"
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                6-Digit Security Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full text-center tracking-[8px] font-mono text-xl font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 transition-colors"
              />
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setIs2FARequired(false)}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
                >
                  <BiArrowBack className="text-xs" /> Back to password
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <>
                <BiLoaderAlt className="animate-spin text-base" />
                <span>{is2FARequired ? 'Verifying...' : 'Authenticating...'}</span>
              </>
            ) : (
              <span>{is2FARequired ? 'Verify & Continue →' : 'Login →'}</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Don&apos;t have an account yet?{' '}
            <Link
              href="/creator/register"
              className="font-semibold text-slate-900 dark:text-white hover:underline"
            >
              Create Account
            </Link>
          </p>
          <p className="text-[11px] text-slate-400">
            Have a verification code?{' '}
            <Link
              href="/creator/verify"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Verify Email Here
            </Link>
          </p>
        </div>
      </div>
    </CreatorAuthLayout>
  );
}
