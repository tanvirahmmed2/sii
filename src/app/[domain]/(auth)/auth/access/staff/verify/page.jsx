'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

function StaffVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  const [status, setStatus] = useState(() => (!token ? 'invalid' : 'loading'));
  const [errorMessage, setErrorMessage] = useState(() =>
    !token ? 'No verification token found in URL. Please use the link from your email.' : ''
  );
  const [staff, setStaff] = useState(null);

  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;

    const validateToken = async () => {
      try {
        const endpoint = getApiEndpoint('staff/register');
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await response.json();

        if (response.status === 410) {
          setStatus('expired');
          setErrorMessage(data.error || 'Verification link has expired.');
          return;
        }

        if (response.status === 400 && data.error?.includes('already')) {
          setStatus('used');
          setErrorMessage(data.error || 'Account has already been configured.');
          return;
        }

        if (!response.ok) {
          setStatus('invalid');
          setErrorMessage(data.error || 'Invalid verification link.');
          return;
        }

        const s = data.paylod?.staff || data.payload?.staff || {};
        setStaff(s);
        setStatus('valid');
      } catch {
        setStatus('invalid');
        setErrorMessage('An unexpected error occurred while validating your link.');
      }
    };

    validateToken();
  }, [token, getApiEndpoint]);

  const handleCompleteSetup = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = getApiEndpoint('staff/register');
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, address: address.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete account setup.');
      }

      setStatus('success');
      toast.success('Account setup complete! Redirecting to login...');
      setTimeout(() => router.push(tenantUrl('/auth/access/staff/login')), 2000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="py-12 text-center space-y-2">
        <span className="text-xs font-medium text-slate-400">Validating staff invitation...</span>
      </div>
    );
  }

  if (status === 'invalid' || status === 'expired' || status === 'used') {
    return (
      <div className="space-y-4 text-center py-6">
        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 inline-block">
          [{status.toUpperCase()}]
        </span>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {status === 'expired' ? 'Invitation Expired' : status === 'used' ? 'Account Already Configured' : 'Invalid Link'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
          {errorMessage}
        </p>
        <div className="pt-2">
          {status === 'used' ? (
            <Link
              href={tenantUrl('/auth/access/staff/login')}
              className="inline-block px-4 py-2 rounded bg-primary text-white text-xs font-semibold"
            >
              Go to Staff Login →
            </Link>
          ) : (
            <p className="text-xs text-slate-400">
              Please contact your campus administration to request a new invitation.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-3 text-center py-6">
        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 inline-block">
          [Success]
        </span>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Account Setup Completed
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Redirecting to Staff Login...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded space-y-1">
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
          [Identity Authenticated]
        </span>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Welcome, <strong className="text-slate-900 dark:text-white">{staff?.name}</strong>. Configure your credentials below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded border border-slate-200 dark:border-slate-800 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">Full Name</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{staff?.name}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">Email</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{staff?.email}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">Contact</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{staff?.number || 'N/A'}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">Role</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{staff?.designation || 'Staff Member'}</span>
        </div>
      </div>

      <form onSubmit={handleCompleteSetup} className="space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Residential Address *
          </label>
          <textarea
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Create Password *
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            placeholder="Minimum 6 characters"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Confirm Password *
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            placeholder="Repeat password"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
        >
          {submitting ? 'Finalizing Profile...' : 'Complete Staff Setup →'}
        </button>
      </form>
    </div>
  );
}

export default function StaffVerifyPage() {
  const { website, tenantUrl } = useTenantWebsite();

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Staff Onboarding'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Staff Profile Verification
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verify your operations invitation credentials and set up your login password.
          </p>
        </div>

        <Suspense fallback={<div className="py-12 text-center text-xs text-slate-400">Loading...</div>}>
          <StaffVerifyInner />
        </Suspense>

        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Already configured?{' '}
          <Link href={tenantUrl('/auth/access/staff/login')} className="font-semibold text-primary hover:underline">
            Go to Staff Login
          </Link>
        </div>

      </div>
    </div>
  );
}
