'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BiLoaderAlt, BiCheckCircle, BiErrorCircle, BiEnvelope, BiKey, BiShieldQuarter } from 'react-icons/bi';
import CreatorAuthLayout from '@/components/creator/CreatorAuthLayout';

function CreatorVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || searchParams.get('code') || '';
  const emailParam = searchParams.get('email') || '';

  const [emailInput, setEmailInput] = useState(emailParam);
  const [codeInput, setCodeInput] = useState(tokenParam);
  const [loading, setLoading] = useState(false);
  const [verifyingAuto, setVerifyingAuto] = useState(Boolean(tokenParam && emailParam));
  const [success, setSuccess] = useState(false);
  const [creatorId, setCreatorId] = useState(null);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  // Auto-verify if URL parameters are present
  useEffect(() => {
    if (!tokenParam || !emailParam) return;

    let ignore = false;
    async function verifyFromUrl() {
      setVerifyingAuto(true);
      setError('');
      try {
        const res = await fetch('/api/creator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify',
            code: tokenParam,
            email: emailParam,
          }),
        });
        const data = await res.json();
        if (!ignore) {
          if (data.success) {
            setSuccess(true);
            if (data.creator?.id) setCreatorId(data.creator.id);
            if (data.alreadyVerified) setAlreadyVerified(true);
          } else {
            setError(data.error || 'Verification link expired or invalid.');
          }
        }
      } catch (_) {
        if (!ignore) {
          setError('Network error while verifying your account.');
        }
      } finally {
        if (!ignore) {
          setVerifyingAuto(false);
        }
      }
    }

    verifyFromUrl();
    return () => {
      ignore = true;
    };
  }, [tokenParam, emailParam]);

  // Manual verification handler
  const handleManualVerify = async (e) => {
    e.preventDefault();
    if (!emailInput || !codeInput) {
      setError('Please provide both your email address and 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');
    setResendMsg('');

    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          code: codeInput.trim(),
          email: emailInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        if (data.creator?.id) setCreatorId(data.creator.id);
        if (data.alreadyVerified) setAlreadyVerified(true);
      } else {
        setError(data.error || 'Invalid verification code.');
      }
    } catch (_) {
      setError('Network error during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code handler
  const handleResend = async () => {
    const targetEmail = emailInput || emailParam;
    if (!targetEmail) {
      setError('Please enter your email address to receive a new code.');
      return;
    }

    setResending(true);
    setResendMsg('');
    setError('');

    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_verification',
          email: targetEmail.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResendMsg(data.message || 'A new 6-digit code has been sent to your email.');
      } else {
        setError(data.error || 'Failed to resend verification code.');
      }
    } catch (_) {
      setError('Server error while requesting new code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <CreatorAuthLayout
      badge="Email Verification"
      headline="Activate Your Creator Account"
      description="Verify your email address to unlock instantaneous website publishing, custom domain connection, and 0% commission creator store sales."
      features={[
        'Instant activation of cloud hosting & custom subdomain',
        'Protected against bots and automated registrations',
        'One-click verification or manual 6-digit code entry',
      ]}
      stats={[
        { label: 'Verification', value: 'Instant' },
        { label: 'Fast Activation', value: '100%' },
        { label: 'Live Sites', value: '50k+' },
      ]}
      quote={{
        text: 'One-click verification and my portfolio was live on the custom domain within seconds.',
        author: 'David Kim',
        role: 'Freelance UI/UX Specialist',
      }}
      topRightLink={{
        prompt: 'Already verified?',
        text: 'Login',
        href: '/creator/login',
      }}
    >
      <div className="w-full p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        {/* State 1: Auto-verifying from URL */}
        {verifyingAuto && (
          <div className="text-center space-y-4 py-8">
            <BiLoaderAlt className="animate-spin text-4xl text-slate-900 dark:text-white mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verifying Your Account...</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Validating security token for <span className="font-semibold text-slate-700 dark:text-slate-200">{emailParam}</span>.
            </p>
          </div>
        )}

        {/* State 2: Verified Successfully */}
        {!verifyingAuto && success && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-4xl mx-auto border border-emerald-100 dark:border-emerald-800">
              <BiCheckCircle />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {alreadyVerified ? 'Account Already Verified' : 'Account Confirmed!'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your creator account is fully verified and active. You can now access your Creator Studio.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              {creatorId ? (
                <Link
                  href={`/creator/${creatorId}`}
                  className="w-full block py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all text-center cursor-pointer"
                >
                  Enter Creator Studio →
                </Link>
              ) : (
                <Link
                  href="/creator/login"
                  className="w-full block py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all text-center cursor-pointer"
                >
                  Proceed to Login →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* State 3: Manual Code Entry & Error Recovery */}
        {!verifyingAuto && !success && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Verify Email Address
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your registered email and the 6-digit verification code received.
              </p>
            </div>

            {resendMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                {resendMsg}
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleManualVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-[8px] font-mono text-xl font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-indigo-600 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <BiLoaderAlt className="animate-spin text-base" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Verify Account →</span>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-70"
              >
                {resending ? (
                  <>
                    <BiLoaderAlt className="animate-spin text-xs" />
                    <span>Resending...</span>
                  </>
                ) : (
                  <>
                    <BiEnvelope className="text-xs" />
                    <span>Resend 6-Digit Code</span>
                  </>
                )}
              </button>

              <Link
                href="/creator/login"
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </CreatorAuthLayout>
  );
}

export default function CreatorVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <BiLoaderAlt className="animate-spin text-3xl text-slate-800 dark:text-white" />
        </div>
      }
    >
      <CreatorVerifyContent />
    </Suspense>
  );
}
