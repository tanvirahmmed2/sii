'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiMail, FiKey, FiLock, FiArrowLeft, FiRefreshCw, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';

const AdminRecovery = () => {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = Request, 2 = Reset
  const [email, setEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send token.');
      }

      toast.success(data.message || 'Recovery token sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!recoveryToken || !newPassword || !confirmPassword) {
      toast.error('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          recovery_token: recoveryToken,
          new_password: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      toast.success(data.message || 'Password reset successfully!');
      
      setTimeout(() => {
        router.push('/auth/access/admin/login');
      }, 1500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-55 text-slate-900 relative px-4 py-12 overflow-hidden bg-slate-55 bg-slate-50">
      {/* Subtle light background decorations */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[440px] z-10">
        
        {step === 1 ? (
          <>
            {/* Step 1 Header */}
            <div className="flex flex-col items-center mb-8 text-center">
              
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Account Recovery</h1>
              <p className="text-sm text-slate-500 max-w-[320px]">Enter your administrative email to request a secure 6-digit recovery token.</p>
            </div>

            {/* Step 1 Form */}
            <div className="w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
              <form onSubmit={handleRequestToken} className="w-full flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FiMail className="text-sm" /> Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Request Recovery Token <FiArrowRight className="text-lg" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Return Link */}
            <div className="w-full text-center mt-6">
              <Link
                href="/auth/access/admin/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-655 transition-colors py-1.5 px-3 rounded-full hover:bg-slate-100"
              >
                <FiArrowLeft className="text-sm" /> Return to Login
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Step 2 Header */}
            <div className="flex flex-col items-center mb-8 text-center">
             
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Reset Password</h1>
              <p className="text-sm text-slate-500 max-w-[320px]">Enter the 6-digit token sent to {email} and set your new password.</p>
            </div>

            {/* Step 2 Form */}
            <div className="w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
              <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FiKey className="text-sm" /> 6-Digit Token
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={recoveryToken}
                    onChange={(e) => setRecoveryToken(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-center tracking-[0.2em] font-bold text-lg text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FiLock className="text-sm" /> New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FiLock className="text-sm" /> Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FiRefreshCw className="text-lg" /> Reset Password
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Back to Step 1 */}
            <div className="w-full text-center mt-6 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-455 hover:text-slate-600 transition-colors py-1.5 px-3 rounded-full hover:bg-slate-100"
              >
                <FiArrowLeft className="text-sm" /> Request New Token
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminRecovery;
