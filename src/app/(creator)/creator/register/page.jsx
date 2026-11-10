'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';

export default function CreatorRegisterPage() {
  const router = useRouter();

  const [mountedTime] = useState(() => Date.now());
  const [botTrap, setBotTrap] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [readOnly, setReadOnly] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          creatorData: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            phone: phone.trim(),
            bot_trap: botTrap,
            reg_timestamp: mountedTime,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.creator) {
        setRegistered(true);
        setRegisteredEmail(email.trim().toLowerCase());
        setCooldown(60);
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
    if (!registeredEmail || cooldown > 0) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_verification',
          email: registeredEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResendMsg('Verification code resent. Check your inbox.');
        setCooldown(60);
      } else {
        setError(data.error || 'Failed to resend code.');
      }
    } catch (_) {
      setError('Error resending verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <CreatorAuthLayout
      headline="Register Creator Account"
      description="Create your educational institution websites, drag-and-drop studio, and subdomain."
    >
      <div className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 text-xs text-slate-800 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Create Account</h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Register to deploy and manage educational websites.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs space-y-1.5">
            <div>{error}</div>
            {(error.toLowerCase().includes('already exists') || error.toLowerCase().includes('log in')) && (
              <div className="pt-0.5">
                <Link
                  href="/creator/login"
                  className="font-semibold text-rose-900 underline hover:text-rose-950 text-xs"
                >
                  Go to Login page &rarr;
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

        {registered ? (
          <div className="space-y-3 pt-1">
            <p className="text-slate-600 text-xs leading-relaxed">
              Account created. A 6-digit confirmation code was sent to your registered email address.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Link
                href="/creator/verify"
                className="flex-1 text-center py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm transition-colors"
              >
                Verify Account
              </Link>
              <button
                type="button"
                disabled={resending || cooldown > 0}
                onClick={handleResend}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 transition-colors"
              >
                {resending ? 'Sending...' : cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Code'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} autoComplete="off" className="space-y-3.5">
            <input
              type="text"
              name="bot_trap"
              tabIndex={-1}
              aria-hidden="true"
              value={botTrap}
              onChange={(e) => setBotTrap(e.target.value)}
              className="sr-only opacity-0 absolute -z-50 pointer-events-none h-0 w-0"
              style={{ display: 'none' }}
            />
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
                Full Name *
              </label>
              <input
                type="text"
                name="creator_full_name"
                autoComplete="off"
                required
                readOnly={readOnly}
                onFocus={() => setReadOnly(false)}
                onPointerDown={() => setReadOnly(false)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-800 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                name="creator_reg_email"
                autoComplete="off"
                required
                readOnly={readOnly}
                onFocus={() => setReadOnly(false)}
                onPointerDown={() => setReadOnly(false)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-800 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Password *
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="creator_reg_password"
                  autoComplete="new-password"
                  required
                  minLength={6}
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

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                name="creator_phone_number"
                autoComplete="off"
                required
                readOnly={readOnly}
                onFocus={() => setReadOnly(false)}
                onPointerDown={() => setReadOnly(false)}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-800 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 transition-colors shadow-2xs mt-1"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="pt-3 border-t border-slate-100 text-center text-slate-500 text-xs">
          Already have an account?{' '}
          <Link href="/creator/login" className="font-semibold text-slate-900 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </CreatorAuthLayout>
  );
}
