'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiShield, FiCheckCircle, FiAlertTriangle, FiClock, FiLock, FiMapPin, FiArrowRight } from 'react-icons/fi';

const VerifyInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [teacher, setTeacher] = useState(null);

  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMessage('No verification token found in the URL. Please use the link from your email.');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch('/api/teachers/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await response.json();

        if (response.status === 410) {
          setStatus('expired');
          setErrorMessage(data.message);
          return;
        }

        if (response.status === 400 && data.error === 'Already Registered') {
          setStatus('used');
          setErrorMessage(data.message);
          return;
        }

        if (!response.ok) {
          setStatus('invalid');
          setErrorMessage(data.message || 'Invalid verification link.');
          return;
        }

        setTeacher(data.paylod.teacher);
        setStatus('valid');
      } catch {
        setStatus('invalid');
        setErrorMessage('An unexpected error occurred while validating your link. Please try again.');
      }
    };

    validateToken();
  }, [token]);

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
      const response = await fetch('/api/teachers/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, address: address.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete account setup.');
      }

      setStatus('success');
      toast.success('Account setup complete! Redirecting to login...');
      setTimeout(() => router.push('/auth/access/teacher/login'), 2500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-5 min-h-[280px]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary-light"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FiShield className="text-primary text-xl" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-base font-bold text-slate-800">Validating Your Link</h2>
          <p className="text-sm text-slate-400 mt-1">Please wait while we verify your identity…</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid' || status === 'expired' || status === 'used') {
    const isExpired = status === 'expired';
    const isUsed = status === 'used';

    return (
      <div className="w-full flex flex-col items-center gap-6 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
          isExpired ? 'bg-amber-50 border border-amber-100' : 
          isUsed ? 'bg-primary-light border border-primary-light' :
          'bg-red-50 border border-red-100'
        }`}>
          {isExpired ? (
            <FiClock className="text-amber-500 text-2xl" />
          ) : isUsed ? (
            <FiCheckCircle className="text-primary text-2xl" />
          ) : (
            <FiAlertTriangle className="text-red-500 text-2xl" />
          )}
        </div>

        <div>
          <h2 className={`text-lg font-bold ${
            isExpired ? 'text-amber-700' : isUsed ? 'text-primary' : 'text-red-700'
          }`}>
            {isExpired ? 'Verification Link Expired' : isUsed ? 'Account Already Set Up' : 'Invalid Verification Link'}
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">{errorMessage}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          {isUsed ? (
            <Link
              href="/auth/access/teacher/login"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-all"
            >
              Go to Login <FiArrowRight />
            </Link>
          ) : (
            <div className="flex-1 py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 text-center leading-relaxed">
              Please contact your <strong>school administrator</strong> to resend your verification link.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="w-full flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-light border border-primary-light flex items-center justify-center">
          <FiCheckCircle className="text-primary text-2xl" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Account Setup Complete!</h2>
          <p className="text-sm text-slate-500 mt-2">Redirecting you to the Teacher Login page…</p>
        </div>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3 p-3.5 bg-primary-light border border-primary-light rounded-2xl">
        <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center shrink-0">
          <FiCheckCircle className="text-primary text-sm" />
        </div>
        <div>
          <p className="text-xs font-bold text-primary">Identity Verified</p>
          <p className="text-[11px] text-primary">
            Welcome, <strong>{teacher?.name}</strong>. Complete your credentials details below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
          <p className="text-xs font-bold text-slate-700 mt-0.5">{teacher?.name}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</span>
          <p className="text-xs font-bold text-slate-700 mt-0.5">{teacher?.email}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone</span>
          <p className="text-xs font-bold text-slate-700 mt-0.5">{teacher?.number}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation</span>
          <p className="text-xs font-bold text-slate-700 mt-0.5">{teacher?.designation}</p>
        </div>
      </div>

      <form onSubmit={handleCompleteSetup} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiMapPin className="text-slate-400" /> Residential Address
          </label>
          <textarea
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiLock className="text-slate-400" /> Choose Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiLock className="text-slate-400" /> Confirm Password
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            className={`w-full px-3.5 py-2.5 bg-slate-55 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:ring-4 ${
              confirmPassword && password !== confirmPassword 
                ? 'border-red-300 focus:border-red-400 focus:ring-red-400/10' 
                : 'border-slate-200 focus:border-primary focus:ring-primary/5'
            }`}
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[11px] text-red-500 font-semibold">Passwords do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || (confirmPassword !== '' && password !== confirmPassword)}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-1"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <FiCheckCircle className="text-lg" /> Complete Account Setup
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const TeacherVerifyPage = () => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-55 bg-slate-50 text-slate-900 relative px-4 py-12 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[520px] animate-fade-up z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-[0_10px_30px_rgba(79,70,229,0.3)]">
            <FiShield className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Teacher Profile Verification</h1>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            You&apos;ve been invited to set up your teacher account. Verify your identity using the secure link sent to your email.
          </p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <Suspense fallback={
            <div className="w-full flex flex-col items-center justify-center gap-5 min-h-[280px]">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">Loading verification page…</p>
            </div>
          }>
            <VerifyInner />
          </Suspense>
        </div>

        <div className="w-full text-center mt-6">
          <Link
            href="/auth/access/teacher/login"
            className="text-xs font-semibold hover:text-indigo-605 transition-colors py-1.5 px-3 rounded-full hover:bg-primary-light text-primary"
          >
            Already have an account? Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeacherVerifyPage;
