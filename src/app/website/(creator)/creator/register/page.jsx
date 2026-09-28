'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BiLoaderAlt, BiUserPlus, BiEnvelope, BiBuilding, BiPhone, BiLockAlt, BiUser } from 'react-icons/bi';
import CreatorAuthLayout from '@/components/creator/CreatorAuthLayout';

export default function CreatorRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          creatorData: {
            name: name.trim(),
            email: email.trim(),
            password,
            phone: phone.trim() || undefined,
            company: company.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.creator) {
        setRegistered(true);
        setRegisteredEmail(email.trim());
      } else {
        setError(data.error || 'Registration failed. Please check your details.');
      }
    } catch (_) {
      setError('Server error during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_verification',
          email: registeredEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResendMsg(data.message || 'A new verification code has been sent to your email.');
      } else {
        setError(data.error || 'Failed to resend verification link.');
      }
    } catch (_) {
      setError('Error resending verification link.');
    } finally {
      setResending(false);
    }
  };

  if (registered) {
    return (
      <CreatorAuthLayout
        badge="Verification Sent"
        headline="Activate Your Creator Account"
        description="We have dispatched a 6-digit confirmation code to your inbox. Complete verification to begin designing and publishing."
        features={[
          'Instant activation of your unique portfolio workspace',
          'Custom domain setup & free automatic SSL certificates',
          'Secure 2-factor authentication & team access controls',
        ]}
        stats={[
          { label: 'Activation', value: 'Instant' },
          { label: 'Security', value: '256-bit' },
          { label: 'Support', value: '24/7' },
        ]}
        quote={{
          text: 'Setting up my portfolio took under 5 minutes and the visual builder is pure joy to use.',
          author: 'Liam Vance',
          role: 'Product Designer',
        }}
        topRightLink={{
          prompt: 'Already verified?',
          text: 'Sign In',
          href: '/creator/login',
        }}
      >
        <div className="w-full p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-100 dark:border-emerald-800">
            <BiEnvelope />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Check Your Email</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We&apos;ve sent a 6-digit verification code to <span className="font-semibold text-slate-800 dark:text-slate-200">{registeredEmail}</span>. Enter the code to activate your creator account.
            </p>
          </div>

          {resendMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              {resendMsg}
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="pt-2 space-y-3">
            <Link
              href={`/creator/verify?email=${encodeURIComponent(registeredEmail)}`}
              className="w-full block py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all text-center"
            >
              Enter Verification Code →
            </Link>

            <Link
              href="/creator/login"
              className="w-full block py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all text-center"
            >
              Proceed to Sign In
            </Link>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {resending ? (
                <>
                  <BiLoaderAlt className="animate-spin text-sm" />
                  <span>Resending code...</span>
                </>
              ) : (
                <span>Resend 6-Digit Code</span>
              )}
            </button>
          </div>
        </div>
      </CreatorAuthLayout>
    );
  }

  return (
    <CreatorAuthLayout
      badge="Instant Access"
      headline="Launch Your Creative Identity"
      description="Join thousands of world-class creators, designers, and agencies building high-converting portfolio sites and digital stores."
      features={[
        'Build in minutes with our visual drag-and-drop studio engine',
        'Sell digital products, courses, and design kits with zero cuts',
        'Custom domains, automatic SSL, and global edge CDN included',
      ]}
      stats={[
        { label: 'Global Creators', value: '25,000+' },
        { label: 'Avg Setup Time', value: '< 3 mins' },
        { label: 'Commission Fee', value: '0%' },
      ]}
      quote={{
        text: 'In our first month of switching, we closed $18k in design service bookings directly through our new site.',
        author: 'Marcus Vance',
        role: 'Founder, Vance Brand Labs',
      }}
      topRightLink={{
        prompt: 'Already have an account?',
        text: 'Sign In',
        href: '/creator/login',
      }}
    >
      <div className="w-full p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        <div className="text-center space-y-2">
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create Creator Account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Build, publish, and scale your personal portfolio websites with ease.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 0192"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company / Studio
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Morgan Designs"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <>
                <BiLoaderAlt className="animate-spin text-base" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account →</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already have a creator account?{' '}
            <Link href="/creator/login" className="font-semibold text-slate-900 dark:text-white hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </CreatorAuthLayout>
  );
}
