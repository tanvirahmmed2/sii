'use client';
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
function OfficerForgetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenParam = searchParams.get('token');
    const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();
    const [email, setEmail] = useState<any>('');
    const [step, setStep] = useState<any>(tokenParam ? 'reset' : 'request');
    const [token, setToken] = useState<any>(tokenParam || '');
    const [requestLoading, setRequestLoading] = useState<any>(false);
    const [newPassword, setNewPassword] = useState<any>('');
    const [confirmPassword, setConfirmPassword] = useState<any>('');
    const [resetLoading, setResetLoading] = useState<any>(false);
    const handleRequestSubmit = async (e: any) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.error('Officer email is required.');
            return;
        }
        setRequestLoading(true);
        try {
            const endpoint = getApiEndpoint('officer/recovery');
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to dispatch password recovery email.');
            }
            setStep('reset');
            toast.success(data.message || 'Recovery code dispatched. Please check your inbox.');
        }
        catch (err: any) {
            toast.error(err.message);
        }
        finally {
            setRequestLoading(false);
        }
    };
    const handleResetSubmit = async (e: any) => {
        e.preventDefault();
        const cleanToken = (token || tokenParam || '').trim();
        if (!cleanToken) {
            toast.error('Password recovery passcode is required.');
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            toast.error('New password must be at least 6 characters in length.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }
        setResetLoading(true);
        try {
            const endpoint = getApiEndpoint('officer/recovery');
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: cleanToken,
                    password: newPassword,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to reset password.');
            }
            toast.success(data.message || 'Password reset successfully! You can now login.');
            router.push(tenantUrl('/auth/access/officer/login'));
        }
        catch (err: any) {
            toast.error(err.message);
        }
        finally {
            setResetLoading(false);
        }
    };
    return (<div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 shadow-2xs space-y-6">

        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block">
            {website?.name || 'Campus Portal'}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {step === 'reset' ? 'Reset Officer Password' : 'Officer Password Recovery'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {step === 'reset'
            ? 'Enter your recovery code and establish a new secure password.'
            : 'Enter your registered officer email to receive a secure recovery code.'}
          </p>
        </div>

        {step === 'reset' ? (<form onSubmit={handleResetSubmit} className="space-y-4">
            {!tokenParam && (<div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Recovery Passcode *
                </label>
                <input type="text" required value={token} onChange={(e: any) => setToken(e.target.value)} className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"/>
              </div>)}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                New Password *
              </label>
              <input type="password" required minLength={6} value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"/>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Confirm New Password *
              </label>
              <input type="password" required minLength={6} value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"/>
            </div>

            <button type="submit" disabled={resetLoading} className="w-full py-2 px-4 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-50">
              {resetLoading ? 'Saving New Password...' : 'Update Password & Return to Login'}
            </button>
          </form>) : (<form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Registered Officer Email *
              </label>
              <input type="email" required value={email} onChange={(e: any) => setEmail(e.target.value)} className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"/>
            </div>

            <button type="submit" disabled={requestLoading} className="w-full py-2 px-4 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-50">
              {requestLoading ? 'Dispatching Recovery Code...' : 'Send Password Recovery Code'}
            </button>
          </form>)}

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
          <Link href={tenantUrl('/auth/access/officer/login')} className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium">
            ← Back to Officer Portal Login
          </Link>
        </div>

      </div>
    </div>);
}
export default function OfficerForgetPasswordPage() {
    return (<Suspense fallback={<div className="w-full min-h-[60vh] flex items-center justify-center">
          <div className="loader loader-md"/>
        </div>}>
      <OfficerForgetPasswordContent />
    </Suspense>);
}
