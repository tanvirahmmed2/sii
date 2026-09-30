'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiLoaderAlt,
  BiUserPlus,
  BiEnvelope,
  BiBuilding,
  BiPhone,
  BiLockAlt,
  BiUser,
  BiCheckCircle,
  BiErrorCircle,
  BiGlobe,
} from 'react-icons/bi';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';

export default function CreatorRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [institution, setInstitution] = useState('');
  const [country, setCountry] = useState('');

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

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          creatorData: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            phone: phone.trim() || undefined,
            institution: institution.trim() || undefined,
            country: country.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.creator) {
        setRegistered(true);
        setRegisteredEmail(email.trim().toLowerCase());
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
      const res = await fetch('/api/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_verification',
          email: registeredEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResendMsg(data.message || 'A new 6-digit verification code has been dispatched.');
      } else {
        setError(data.error || 'Failed to resend verification code.');
      }
    } catch (_) {
      setError('Error resending verification code.');
    } finally {
      setResending(false);
    }
  };

  // State: Registration Success / Verification Pending
  if (registered) {
    return (
      <CreatorAuthLayout
        badge="Verification Pending"
        headline="Activate Your Creator Account"
        description="We have dispatched a 6-digit confirmation code to your inbox. Complete verification to begin designing and publishing."
        features={[
          'Instant activation of your unique portfolio workspace',
          'Custom domain setup & free automatic SSL certificates',
          'Secure 2-factor authentication & studio access controls',
        ]}
        stats={[
          { label: 'Activation', value: 'Instant' },
          { label: 'Security', value: '256-Bit' },
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
        <div className="w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-100 dark:border-emerald-800/60">
            <BiEnvelope />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Check Your Inbox
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We&apos;ve sent a 6-digit verification code to{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{registeredEmail}</span>.
              Enter the code to activate your account.
            </p>
          </div>

          {resendMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center justify-center gap-2">
              <BiCheckCircle className="text-base text-emerald-600 dark:text-emerald-400" />
              <span>{resendMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center justify-center gap-2">
              <BiErrorCircle className="text-base text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 space-y-2.5">
            <Link
              href={`/creator/verify?email=${encodeURIComponent(registeredEmail)}`}
              className="w-full block py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-md shadow-secondary/25 hover:shadow-secondary/35 transition-all text-center"
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
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

  // State: Standard Registration Form
  return (
    <CreatorAuthLayout
      badge="Instant Access"
      headline="Launch Your Creative Identity"
      description="Join thousands of world-class creators, designers, and agencies building high-converting portfolio sites and digital stores."
      features={[
        'Build in minutes with our visual drag-and-drop studio engine',
        'Sell digital products, services, and courses with zero commission',
        'Custom domains, automatic SSL, and global edge CDN included',
      ]}
      stats={[
        { label: 'Global Creators', value: '25k+' },
        { label: 'Avg Setup Time', value: '< 3m' },
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
      <div className="w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-5">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 dark:bg-secondary/20 text-secondary flex items-center justify-center text-2xl mx-auto border border-secondary/20">
            <BiUserPlus />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create Creator Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Start building your custom website and digital creator presence.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5">
            <BiErrorCircle className="text-base text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-base">
                <BiUser />
              </span>
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address *
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
                placeholder="alex@example.com"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-base">
                <BiLockAlt />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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

          {/* Institution / Studio */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Institution / Studio Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-base">
                <BiBuilding />
              </span>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Morgan Designs or Apex Academy"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors"
              />
            </div>
          </div>

          {/* Phone & Country (Grid) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-base">
                  <BiPhone />
                </span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 0192"
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Country
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-base">
                  <BiGlobe />
                </span>
                <input
                  type="text"
                  autoComplete="country-name"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-md shadow-secondary/25 hover:shadow-secondary/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
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
            <Link
              href="/creator/login"
              className="font-semibold text-secondary hover:text-secondary-dark dark:hover:text-secondary-light hover:underline transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </CreatorAuthLayout>
  );
}
