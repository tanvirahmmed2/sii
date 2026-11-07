'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreatorAuthLayout from 'src/component/marketing/creator/CreatorAuthLayout';

export default function CreatorRegisterPage() {
  const router = useRouter();

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
      <div className="w-full bg-white border border-slate-200 rounded p-5 space-y-4 text-xs text-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Create Account</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Register to deploy and manage educational websites.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs space-y-1">
            <div>{error}</div>
            {(error.toLowerCase().includes('already exists') || error.toLowerCase().includes('log in')) && (
              <div className="pt-0.5">
                <Link
                  href="/creator/login"
                  className="font-semibold text-rose-900 underline hover:text-rose-950 text-[11px]"
                >
                  Go to Login page &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {resendMsg && (
          <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
            {resendMsg}
          </div>
        )}

        {registered ? (
          <div className="space-y-3 pt-1">
            <p className="text-slate-600">
              Account created. A 6-digit confirmation code was sent to <strong className="text-slate-900">{registeredEmail}</strong>.
            </p>
            <div className="flex gap-2">
              <Link
                href={`/creator/verify?email=${encodeURIComponent(registeredEmail)}`}
                className="flex-1 text-center py-2 px-3 rounded bg-slate-900 text-white font-medium"
              >
                Verify Email
              </Link>
              <button
                type="button"
                disabled={resending}
                onClick={handleResend}
                className="px-3 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} autoComplete="off" className="space-y-3">
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
              autoComplete="new-password"
              className="sr-only opacity-0 absolute -z-50 pointer-events-none h-0 w-0"
            />
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
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
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
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
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
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

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
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
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-100 text-center text-slate-500 text-[11px]">
          Already have an account?{' '}
          <Link href="/creator/login" className="font-semibold text-slate-800 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </CreatorAuthLayout>
  );
}
