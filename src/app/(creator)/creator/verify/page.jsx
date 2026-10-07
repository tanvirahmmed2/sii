'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';
import LoadingScreen from 'src/component/common/LoadingScreen';

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

  // Auto-verify if token & email are provided in URL
  useEffect(() => {
    if (!tokenParam || !emailParam) return;

    let ignore = false;
    async function verifyFromUrl() {
      setVerifyingAuto(true);
      setError('');
      try {
        const res = await fetch('/api/marketing/creator/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify',
            code: tokenParam.trim(),
            email: emailParam.trim().toLowerCase(),
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
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          code: codeInput.trim(),
          email: emailInput.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        if (data.creator?.id) setCreatorId(data.creator.id);
        if (data.alreadyVerified) setAlreadyVerified(true);
      } else {
        setError(data.error || 'Invalid or expired verification code.');
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
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_verification',
          email: targetEmail.trim().toLowerCase(),
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
      badge="Account Activation"
      headline="Activate Your Creator Account"
      description="Verify your email address to unlock instantaneous website publishing, custom domain connection, and creator store management."
      features={[
        'Instant activation of cloud hosting and domain engine',
        'Protected against automated registrations',
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
        text: 'Sign In',
        href: '/creator/login',
      }}
    >
      <div className="w-full p-5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        {/* State 1: Auto-verifying from URL */}
        {verifyingAuto && (
          <div className="text-center space-y-2 py-6">
            <div className="text-xs uppercase tracking-wider text-secondary font-medium">Validating Token</div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Verifying Your Account</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Validating security token for <span className="font-medium text-slate-700 dark:text-slate-200">{emailParam}</span>...
            </p>
          </div>
        )}

        {/* State 2: Verified Successfully */}
        {!verifyingAuto && success && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium">Verified</span>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                {alreadyVerified ? 'Account Already Verified' : 'Account Confirmed'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your creator account is fully verified and active. You can now access your Creator Studio.
              </p>
            </div>

            <div className="pt-2">
              {creatorId ? (
                <Link
                  href={`/creator/${creatorId}`}
                  className="w-full block py-2 rounded bg-secondary hover:bg-secondary-dark text-white text-xs font-medium text-center transition-colors"
                >
                  Enter Creator Studio
                </Link>
              ) : (
                <Link
                  href="/creator/login"
                  className="w-full block py-2 rounded bg-secondary hover:bg-secondary-dark text-white text-xs font-medium text-center transition-colors"
                >
                  Proceed to Sign In
                </Link>
              )}
            </div>
          </div>
        )}

        {/* State 3: Manual Code Entry */}
        {!verifyingAuto && !success && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                Verify Email Address
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your registered email and the 6-digit confirmation code.
              </p>
            </div>

            {resendMsg && (
              <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                {resendMsg}
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleManualVerify} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="creator@example.com"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-[8px] font-mono text-xl font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-secondary"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded bg-secondary hover:bg-secondary-dark text-white text-xs font-medium cursor-pointer disabled:opacity-70 transition-colors"
              >
                {loading ? 'Verifying Code...' : 'Verify Account'}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-secondary hover:underline cursor-pointer disabled:opacity-70"
              >
                {resending ? 'Resending...' : 'Resend 6-Digit Code'}
              </button>

              <Link
                href="/creator/login"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Back to Sign In
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
      fallback={<LoadingScreen fullScreen={true} label="Loading verification..." />}
    >
      <CreatorVerifyContent />
    </Suspense>
  );
}
