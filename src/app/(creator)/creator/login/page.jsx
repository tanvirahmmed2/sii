'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiLoaderAlt,
  BiLockAlt,
  BiShieldQuarter,
  BiEnvelope,
  BiArrowBack,
  BiCheckCircle,
  BiErrorCircle,
} from 'react-icons/bi';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';

export default function CreatorLoginPage() {
  const router = useRouter();
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsUnverified(false);
    setResendMsg('');

    try {
      const res = await fetch('/api/creator/auth', {
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
      setError('Server error during Login. Please try again.');
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
      const res = await fetch('/api/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_verification',
          email: targetEmail.trim(),
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
      description="Access your visual site builder, manage live projects, monitor client inquiries, and scale your digital operations."
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
      <div className="w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {is2FARequired ? 'Security Verification' : 'Creator LogIn'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {is2FARequired
              ? `Enter the 6-digit verification code sent to ${email}.`
              : 'Login to access your creator dashboard and website builder.'}
          </p>
        </div>

        {/* Success / Info Alert */}
        {resendMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-start gap-2.5">
            <BiCheckCircle className="text-base text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>{resendMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium space-y-2.5">
            <div className="flex items-start gap-2.5">
              <BiErrorCircle className="text-base text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {isUnverified && (
              <div className="pt-2 flex flex-col gap-2 border-t border-rose-200/60 dark:border-rose-800/60">
                <Link
                  href={`/creator/verify?email=${encodeURIComponent(unverifiedEmail || email)}`}
                  className="w-full py-2 px-3 rounded-lg bg-secondary hover:bg-secondary-dark text-white font-bold text-center transition-colors text-xs shadow-xs"
                >
                  Verify Email Address Now →
                </Link>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-base">
                    <BiEnvelope />
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <Link
                    href="/creator/recovery"
                    className="text-xs text-secondary hover:text-secondary-dark dark:hover:text-secondary-light hover:underline font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-base">
                    <BiLockAlt />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-sm"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                  className="w-full text-center tracking-[10px] font-mono text-2xl font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setIs2FARequired(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer font-medium"
                >
                  <BiArrowBack className="text-xs" /> Back to password
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-secondary hover:text-secondary-dark dark:hover:text-secondary-light hover:underline font-semibold cursor-pointer disabled:opacity-50"
                >
                  {resending ? 'Resending...' : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-md shadow-secondary/25 hover:shadow-secondary/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
          >
            {loading ? (
              <>
                <BiLoaderAlt className="animate-spin text-base" />
                <span>{is2FARequired ? 'Verifying Code...' : 'Signing In...'}</span>
              </>
            ) : (
              <span>{is2FARequired ? 'Verify & Continue →' : 'LogIn →'}</span>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Don&apos;t have a creator account yet?{' '}
            <Link
              href="/creator/register"
              className="font-semibold text-secondary hover:text-secondary-dark dark:hover:text-secondary-light hover:underline transition-colors"
            >
              Create Account
            </Link>
          </p>
          <p className="text-[11px] text-slate-400">
            Received a 6-digit confirmation code?{' '}
            <Link
              href="/creator/verify"
              className="text-slate-600 dark:text-slate-300 hover:text-secondary hover:underline font-medium transition-colors"
            >
              Verify Email Here
            </Link>
          </p>
        </div>
      </div>
    </CreatorAuthLayout>
  );
}
