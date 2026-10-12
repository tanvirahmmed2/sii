'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiMail, FiLock, FiArrowRight, FiShield, FiKey, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';

const AdminLoginForm = () => {
  const router = useRouter();
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to authenticate.');
      }

      if (data.requires2FA || data.paylod?.requires2FA) {
        toast.success(data.message || '2FA code sent to your email!');
        setStep('2fa');
      } else {
        toast.success(data.message || 'Logged in successfully!');
        router.push('/admin');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit 2FA Code
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Please enter the valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Verification failed.');
      }

      toast.success(data.message || 'Verification successful! Redirecting...');
      router.push('/admin');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend 2FA Code
  const handleResendCode = async () => {
    if (resending) return;
    setResending(true);
    try {
      const response = await fetch('/api/admin/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to resend code.');
      }

      toast.success(data.message || 'New verification code sent!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  if (step === '2fa') {
    return (
      <form onSubmit={handleOtpSubmit} className="w-full flex flex-col gap-5 animate-fade-up">
        <div className="flex flex-col items-center text-center gap-2 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
          
          <h3 className="text-base font-bold text-slate-800">Two-Factor Authentication</h3>
          <p className="text-xs text-slate-500 max-w-64">
            We sent a 6-digit verification code to <span className="font-semibold text-slate-700">{email}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FiShield className="text-sm" /> 6-Digit Security Code
          </label>
          <input
            type="text"
            required
            maxLength={6}
            autoFocus
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
            disabled={loading}
            placeholder="• • • • • •"
            className="w-full text-center px-4 py-3 bg-white border border-slate-300 rounded-xl text-xl font-bold tracking-[0.4em] text-slate-900 placeholder:text-slate-300 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <button
          type="submit"
          disabled={loading || otpCode.length !== 6}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="loader loader-sm loader-white" />
          ) : (
            <>
              Verify & Log In <FiArrowRight className="text-lg" />
            </>
          )}
        </button>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setStep('credentials')}
            className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <FiArrowLeft className="text-sm" /> Back to credentials
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            className="flex items-center gap-1.5 font-semibold text-primary hover:text-primary-dark transition-colors disabled:opacity-50 cursor-pointer"
          >
            <FiRefreshCw className={`text-xs ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleCredentialsSubmit} className="w-full flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <FiMail className="text-sm" /> Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="admin@school.com"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FiLock className="text-sm" /> Password
          </label>
          <Link
            href="/auth/access/admin/recovery"
            className="text-xs font-medium text-primary hover:text-primary transition-colors"
          >
            Forgot Password?
          </Link>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <div className="loader loader-sm loader-white" />
        ) : (
          <>
            <FiShield className="text-lg" /> Access Portal <FiArrowRight className="text-lg" />
          </>
        )}
      </button>
    </form>
  );
};

export default AdminLoginForm;