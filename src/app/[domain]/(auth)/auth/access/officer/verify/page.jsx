'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

function OfficerVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  const [token, setToken] = useState(tokenParam || '');
  const [validating, setValidating] = useState(!!tokenParam);
  const [officerData, setOfficerData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tokenParam) {
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      setValidating(true);
      setErrorMsg('');
      try {
        const endpoint = getApiEndpoint('officer/verify');
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenParam.trim() }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Verification link is invalid or expired.');
        }

        const officer = data.officer || data.payload?.officer;
        setOfficerData(officer);
        if (officer?.phone) setPhone(officer.phone);
        if (officer?.address) setAddress(officer.address);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [tokenParam, getApiEndpoint]);

  const handleManualTokenSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error('Please enter your invitation verification token.');
      return;
    }

    setValidating(true);
    setErrorMsg('');
    try {
      const endpoint = getApiEndpoint('officer/verify');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification token.');
      }

      const officer = data.officer || data.payload?.officer;
      setOfficerData(officer);
      if (officer?.phone) setPhone(officer.phone);
      if (officer?.address) setAddress(officer.address);
    } catch (err) {
      setErrorMsg(err.message);
      toast.error(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const activeToken = tokenParam || token;
      const endpoint = getApiEndpoint('officer/verify');
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeToken.trim(),
          password,
          phone: phone.trim(),
          address: address.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete account setup.');
      }

      toast.success(data.message || 'Account verified and configured successfully!');
      router.refresh();
      router.push(tenantUrl('/officer'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 shadow-2xs space-y-6">

        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block">
            {website?.name || 'Campus Portal'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Officer Account Setup
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verify your official invitation and establish your permanent password.
          </p>
        </div>

        {validating ? (
          <div className="py-12 text-center space-y-2">
            <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Validating verification credentials...
            </div>
            <p className="text-[11px] text-slate-400">Please wait while we verify your invitation.</p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
            <p className="text-xs text-slate-500">
              If your verification link has expired, please request the campus administration staff to resend your invitation.
            </p>
            <div className="pt-2 flex justify-between items-center text-xs">
              <Link href={tenantUrl('/auth/access/officer/login')} className="text-slate-900 dark:text-white font-medium hover:underline">
                Return to Login
              </Link>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Enter token manually
              </button>
            </div>
          </div>
        ) : !officerData ? (
          <form onSubmit={handleManualTokenSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Invitation Security Token *
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the 64-character token from your email"
                className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>
            <button
              type="submit"
              disabled={validating}
              className="w-full py-2 px-4 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Verify Token
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetupSubmit} className="space-y-4">
            {/* Officer Details Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded text-xs space-y-1">
              <div className="font-semibold text-slate-900 dark:text-white text-sm">
                {officerData.name}
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                {officerData.email}
              </div>
              <div className="flex gap-2 pt-1 text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-300">
                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  {officerData.designation || 'Officer'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  {officerData.department || 'General'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Permanent Login Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Residential / Work Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Campus Quarter / Office Room"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-4 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Activating Profile...' : 'Complete Setup & Enter Officer Portal'}
            </button>
          </form>
        )}

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
          <Link href={tenantUrl('/auth/access/officer/login')} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            Already verified? Sign in here →
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function OfficerVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[60vh] flex items-center justify-center text-xs text-slate-500">
          Loading verification portal...
        </div>
      }
    >
      <OfficerVerifyContent />
    </Suspense>
  );
}
