'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheckIcon } from '@/components/ui/Icons';
import { SITE_NAME } from '@/lib/db/secret';

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('support@disibin.com');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedInfo, setUnverifiedInfo] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnverifiedInfo(null);

    try {
      const res = await fetch('/api/developer/me/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/developer');
        router.refresh();
      } else {
        if (data.unverified) {
          setUnverifiedInfo({
            email: data.email || email,
            message: data.error || 'This admin account is not verified. Please verify your email with the 6-digit code.',
          });
        } else {
          setError(data.error || 'Authentication failed. Please check your credentials.');
        }
      }
    } catch (err) {
      setError('Network or server error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-2 border border-secondary/20">
          <ShieldCheckIcon className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{SITE_NAME} Admin Access</h1>
        <p className="text-xs text-slate-500">Restricted administrative gateway for platform operators.</p>
      </div>

      {unverifiedInfo && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
          <div className="text-xs font-semibold">{unverifiedInfo.message}</div>
          <Link
            href={`/developer-auth/verify?email=${encodeURIComponent(unverifiedInfo.email)}`}
            className="inline-flex items-center justify-center w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            Enter 6-Digit Verification Code →
          </Link>
        </div>
      )}

      {error && !unverifiedInfo && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="support@disibin.com"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Password</label>
            <Link href="/developer-auth/recovery" className="text-xs text-secondary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary-dark disabled:opacity-50 text-white text-sm font-semibold shadow-md shadow-secondary/20 transition-all cursor-pointer"
        >
          {loading ? 'Authenticating...' : 'Sign In to Admin Portal'}
        </button>
      </form>

      <div className="text-center pt-2">
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
          ← Return to Platform Home
        </Link>
      </div>
    </div>
  );
}
