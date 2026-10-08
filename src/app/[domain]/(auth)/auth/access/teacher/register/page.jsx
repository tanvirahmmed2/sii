'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function TeacherRegistrationPage() {
  const router = useRouter();
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [email, setEmail] = useState('');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email address is required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('teachers/register');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email address.');
      }

      toast.success(data.message || 'Email verified. Complete your profile details below.');
      const t = data.paylod?.teacher || data.payload?.teacher || {};
      setName(t.name || '');
      setPhone(t.number || t.phone || '');
      setDesignation(t.designation || 'Faculty Member');
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !address.trim() || !password) {
      toast.error('Address and Password are required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = getApiEndpoint('teachers/register');
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          address: address.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete profile setup.');
      }

      toast.success(data.message || 'Account setup completed successfully!');
      router.push(tenantUrl('/auth/access/teacher/login'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Academic Administration'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Teacher Account Setup
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {step === 1
              ? 'Verify your authorized campus email address to configure your login.'
              : `Welcome, ${name}. Complete your faculty profile credentials.`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-900 dark:text-white">Direct Verification:</strong> If you received an invitation email with a verification link, you may click that link directly. Otherwise, verify your registered institutional email below.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Registered Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="faculty@institution.edu"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-sm text-slate-900 dark:text-white outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
            >
              {loading ? 'Verifying...' : 'Verify Email Address →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCompleteSetup} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Email</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Contact</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Designation</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{designation}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Residential Address *
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Choose Login Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 text-center"
            >
              {loading ? 'Completing Setup...' : 'Complete Account Setup →'}
            </button>
          </form>
        )}

        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Already registered?{' '}
          <Link href={tenantUrl('/auth/access/teacher/login')} className="font-semibold text-primary hover:underline">
            Go to Teacher Login
          </Link>
        </div>

      </div>
    </div>
  );
}
