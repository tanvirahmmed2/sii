'use client';
import { useState, useEffect, useContext, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';
import LoadingScreen from 'src/component/common/LoadingScreen';
import { Context } from 'src/component/helper/Context';

function CreatorVerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenParam = searchParams.get('token') || searchParams.get('code') || '';
    const emailParam = searchParams.get('email') || '';
    const { setCreator, fetchCurrentUser } = useContext<any>(Context) || {};

    const [emailInput, setEmailInput] = useState<any>(emailParam);
    const [codeInput, setCodeInput] = useState<any>(tokenParam);
    const [channel, setChannel] = useState<any>('email');
    const [loading, setLoading] = useState<any>(false);
    const [success, setSuccess] = useState<any>(false);
    const [creatorId, setCreatorId] = useState<any>(null);
    const [alreadyVerified, setAlreadyVerified] = useState<any>(false);
    const [error, setError] = useState<any>('');
    const [resending, setResending] = useState<any>(false);
    const [resendMsg, setResendMsg] = useState<any>('');
    const [cooldown, setCooldown] = useState<any>(0);

    useEffect(() => {
        let ignore = false;
        async function checkLoggedIn() {
            try {
                const res = await fetch('/api/marketing/creator/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'me' }),
                });
                const data = await res.json();
                if (!ignore && data.success && data.creator?.id) {
                    if (typeof setCreator === 'function') {
                        setCreator(data.creator);
                    }
                    if (typeof fetchCurrentUser === 'function') {
                        fetchCurrentUser();
                    }
                    router.replace(`/creator/${data.creator.id}`);
                }
            } catch {}
        }
        checkLoggedIn();
        return () => {
            ignore = true;
        };
    }, [router, setCreator, fetchCurrentUser]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev: any) => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleManualVerify = async (e: any) => {
        e.preventDefault();
        if (!emailInput || !codeInput) {
            setError('Please provide both your identifier and 6-digit code.');
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
                if (data.creator) {
                    if (typeof setCreator === 'function') {
                        setCreator(data.creator);
                    }
                    if (typeof fetchCurrentUser === 'function') {
                        fetchCurrentUser();
                    }
                    if (data.creator.id) {
                        setCreatorId(data.creator.id);
                        setTimeout(() => {
                            router.push(`/creator/${data.creator.id}`);
                        }, 1200);
                    }
                }
                if (data.alreadyVerified) {
                    setAlreadyVerified(true);
                }
            } else {
                setError(data.error || 'Invalid or expired verification code.');
            }
        } catch {
            setError('Network error during verification. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async (targetChannel: any = channel) => {
        if (cooldown > 0 && targetChannel === channel && resendMsg) return;
        const targetIdentifier = emailInput || emailParam;
        if (!targetIdentifier) {
            setError('Please enter your email address or phone number to receive a new code.');
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
                    email: targetIdentifier.trim().toLowerCase(),
                    channel: targetChannel,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setChannel('email');
                setResendMsg(data.message || 'A new 6-digit verification code and link has been sent via email.');
                setCooldown(60);
            } else {
                setError(data.error || 'Failed to resend verification code.');
            }
        } catch {
            setError('Server error while requesting new code.');
        } finally {
            setResending(false);
        }
    };

    return (
        <CreatorAuthLayout
            badge="Account Activation"
            headline="Activate Your Creator Account"
            description="Verify your account using the 6-digit confirmation code dispatched to your registered email or phone."
            features={[
                'Instant activation of cloud hosting and domain engine',
                'Protected against automated registrations',
                'Secure 6-digit one-time code verification',
            ]}
            stats={[
                { label: 'Verification', value: 'Instant' },
                { label: 'Fast Activation', value: '100%' },
                { label: 'Live Sites', value: '50k+' },
            ]}
            quote={{
                text: 'Instant 6-digit verification code and my school website was live within seconds.',
                author: 'David Kim',
                role: 'Freelance UI/UX Specialist',
            }}
            topRightLink={{
                prompt: 'Already verified?',
                text: 'Login',
                href: '/creator/login',
            }}
        >
            <div className="w-full p-4 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                {success ? (
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <span className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium">Verified</span>
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {alreadyVerified ? 'Account Already Verified' : 'Account Confirmed'}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Your creator account is fully verified and active. Redirecting to your Creator Studio...
                            </p>
                        </div>

                        <div className="pt-2">
                            {creatorId ? (
                                <Link
                                    href={`/creator/${creatorId}`}
                                    className="w-full block py-2.5 rounded-lg bg-secondary hover:bg-secondary-dark text-white text-xs sm:text-sm font-medium text-center transition-colors shadow-2xs"
                                >
                                    Enter Creator Studio
                                </Link>
                            ) : (
                                <Link
                                    href="/creator/login"
                                    className="w-full block py-2.5 rounded-lg bg-secondary hover:bg-secondary-dark text-white text-xs sm:text-sm font-medium text-center transition-colors shadow-2xs"
                                >
                                    Proceed to Login
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Account Verification
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Enter your registered email or phone and the 6-digit confirmation code.
                            </p>
                        </div>

                        {resendMsg && (
                            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                                {resendMsg}
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleManualVerify} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Email or Phone Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={emailInput}
                                    onChange={(e: any) => setEmailInput(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-secondary transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    6-Digit Verification Code *
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={codeInput}
                                    onChange={(e: any) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center tracking-[8px] font-mono text-xl font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-secondary transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || codeInput.length < 6}
                                className="w-full py-2.5 rounded-lg bg-secondary hover:bg-secondary-dark text-white text-xs sm:text-sm font-medium cursor-pointer disabled:opacity-70 transition-colors shadow-2xs mt-1"
                            >
                                {loading ? 'Verifying Code...' : 'Verify Account'}
                            </button>
                        </form>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 text-xs">
                            <button
                                type="button"
                                disabled={resending || cooldown > 0}
                                onClick={() => handleResend('email')}
                                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-50 cursor-pointer"
                            >
                                {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Code to Email'}
                            </button>
                        </div>

                        <div className="text-center pt-1">
                            <Link href="/creator/login" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
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
        <Suspense fallback={<LoadingScreen fullScreen={true} label="Loading verification..." />}>
            <CreatorVerifyContent />
        </Suspense>
    );
}
