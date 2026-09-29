'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiMail, FiLock, FiMapPin, FiArrowRight, FiUserPlus } from 'react-icons/fi';

const TeacherRegistration = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');

  const [step, setStep] = useState(1); // 1 = Verify email, 2 = Complete setup
  const [loading, setLoading] = useState(false);

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email address is required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/teachers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email address.');
      }

      toast.success(data.message || 'Email verified. Complete your profile details below.');
      setName(data.paylod.teacher.name);
      setPhone(data.paylod.teacher.number);
      setDesignation(data.paylod.teacher.designation);
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    
    if (!email || !address || !password) {
      toast.error('Address and Password are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/teachers/register', {
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
      router.push('/auth/access/teacher/login');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 relative px-4 py-12 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-140 animate-fade-up z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Teacher Account Setup</h1>
          <p className="text-sm text-slate-500 max-w-100">
            {step === 1 
              ? 'Use the secure verification link emailed to you by administration to set up your account.' 
              : `Verification successful. Welcome, ${name}. Complete your credentials details below.`}
          </p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          {step === 1 ? (
            <form onSubmit={handleVerifyEmail} className="w-full max-w-110 mx-auto flex flex-col gap-5">
              {/* Primary flow notice */}
              <div className="flex items-start gap-3 p-3.5 bg-primary-light border border-primary-light rounded-2xl">
                <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                  <FiMail className="text-primary text-xs" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">Check Your Email First</p>
                  <p className="text-[11px] text-primary mt-0.5 leading-relaxed">
                    The administration sent a verification link to your email. Use that link to set up your profile securely. This form is a manual fallback.
                  </p>
                </div>
              </div>

              {/* Email Address Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiMail className="text-sm" /> Enter Registered Email
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

              {/* Submit Verification Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Verify Email Address <FiArrowRight className="text-lg" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCompleteSetup} className="w-full flex flex-col gap-5">
              {/* Pre-filled read-only details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                  <p className="text-xs font-bold text-slate-750 mt-0.5">{email}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{phone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation</span>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{designation}</p>
                </div>
              </div>

              {/* Text Area: Current Address */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                  <FiMapPin /> Residential Address
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 resize-none"
                />
              </div>

              {/* Password Select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                  <FiLock /> Choose Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
                />
              </div>

              {/* Setup Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FiUserPlus className="text-lg" /> Complete Account Setup
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="w-full text-center mt-6">
          <Link
            href="/auth/access/teacher/login"
            className="text-xs font-semibold text-indigo-555 hover:text-primary transition-colors py-1.5 px-3 rounded-full hover:bg-primary-light text-indigo-650 text-primary"
          >
            Back to Teacher Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeacherRegistration;
