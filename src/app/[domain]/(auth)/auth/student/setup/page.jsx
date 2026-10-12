'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import {
  FiMail,
  FiShield,
  FiCheckCircle,
  FiLock,
  FiUser,
  FiMapPin,
  FiUsers,
  FiCamera,
  FiArrowRight,
  FiKey,
  FiAlertCircle
} from 'react-icons/fi';

function StudentSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  const urlToken = searchParams.get('token') || '';
  const urlEmail = searchParams.get('email') || '';

  const [tokenInput, setTokenInput] = useState(urlToken);
  const [activeToken, setActiveToken] = useState(urlToken);

  // Email verification state (Step 0)
  const [emailInput, setEmailInput] = useState(urlEmail);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [devCode, setDevCode] = useState(null);

  // Loading & Submitting states
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Multi-step form: 1 = Password & Personal, 2 = Addresses, 3 = Guardians, 4 = Media & Submit
  const [step, setStep] = useState(1);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState(urlEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [number, setNumber] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [dob, setDob] = useState('');
  const [religion, setReligion] = useState('Islam');

  // Address
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Bangladesh');

  // Guardian
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [fatherNid, setFatherNid] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');

  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [motherNid, setMotherNid] = useState('');
  const [motherOccupation, setMotherOccupation] = useState('');

  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Father');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');

  // Media
  const [imageUrl, setImageUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  // If token is in URL, attempt to preview candidate metadata
  useEffect(() => {
    if (!activeToken) return;

    const fetchStudent = async () => {
      setLoadingStudent(true);
      try {
        const endpoint = getApiEndpoint(`student/setup?token=${encodeURIComponent(activeToken)}`);
        const res = await fetch(endpoint);
        const data = await res.json();

        if (res.ok && data.success && data.payload?.student) {
          const s = data.payload.student;
          setStudentData(s);
          if (s.email) {
            setEmailInput(s.email);
            setEmail(s.email);
          }
          if (s.name) setName(s.name);
          if (s.is_verified) {
            setIsEmailVerified(true);
          }
          if (s.verification_status === 'submitted') {
            setSubmittedSuccess(true);
          }
        }
      } catch (err) {
        console.error('Error fetching student setup:', err);
      } finally {
        setLoadingStudent(false);
      }
    };

    fetchStudent();
  }, [activeToken, getApiEndpoint]);

  // Dispatch OTP Code via Brevo
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error('Please enter your institutional email address.');
      return;
    }

    setSendingOtp(true);
    try {
      const sendUrl = getApiEndpoint ? getApiEndpoint('student/setup/send-code') : '/api/student/setup/send-code';
      const res = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          registration_no: tokenInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Verification code dispatched to your email!');
        setOtpSent(true);
        if (data.payload?.dev_code) {
          setDevCode(data.payload.dev_code);
        }
      } else {
        toast.error(data.error || 'Failed to dispatch verification code.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error requesting verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify 6-digit OTP Code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const verifyUrl = getApiEndpoint ? getApiEndpoint('student/setup/verify-code') : '/api/student/setup/verify-code';
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          code: otpCode.trim(),
          registration_no: tokenInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.payload) {
        toast.success('Email verified successfully! Profile setup unlocked.');
        setIsEmailVerified(true);
        const s = data.payload.student;
        setStudentData(s);
        setEmail(s.email || emailInput.trim());
        if (s.name) setName(s.name);
        if (s.number) setNumber(s.number);
        if (s.gender) setGender(s.gender);
        if (s.blood_group) setBloodGroup(s.blood_group);
        if (s.date_of_birth) setDob(s.date_of_birth.substring(0, 10));
        if (s.religion) setReligion(s.religion);
        if (data.payload.setup_token) {
          setActiveToken(data.payload.setup_token);
        }

        // Prepopulate existing address & guardian if any
        const a = data.payload.address;
        if (a) {
          if (a.present_address) setPresentAddress(a.present_address);
          if (a.permanent_address) setPermanentAddress(a.permanent_address);
          if (a.city) setCity(a.city);
          if (a.district) setDistrict(a.district);
          if (a.upazila) setUpazila(a.upazila);
          if (a.postal_code) setPostalCode(a.postal_code);
        }

        const g = data.payload.guardian;
        if (g) {
          if (g.father_name) setFatherName(g.father_name);
          if (g.father_phone) setFatherPhone(g.father_phone);
          if (g.mother_name) setMotherName(g.mother_name);
          if (g.mother_phone) setMotherPhone(g.mother_phone);
          if (g.guardian_name) setGuardianName(g.guardian_name);
        }
      } else {
        toast.error(data.error || 'Invalid or expired verification code.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during code verification.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Final Setup Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEmailVerified) {
      toast.error('You must verify your email address via web mailer before submitting setup.');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      setStep(1);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      setStep(1);
      return;
    }

    if (!presentAddress.trim()) {
      toast.error('Present address is required.');
      setStep(2);
      return;
    }

    if (!fatherName.trim() && !motherName.trim() && !guardianName.trim()) {
      toast.error('Please provide at least one parent or guardian name.');
      setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(getApiEndpoint('student/setup'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeToken || studentData?.registration_no,
          email: email.trim(),
          password,
          name: name.trim(),
          number: number.trim(),
          gender,
          blood_group: bloodGroup,
          date_of_birth: dob,
          religion,
          present_address: presentAddress.trim(),
          permanent_address: permanentAddress.trim() || presentAddress.trim(),
          city: city.trim(),
          district: district.trim(),
          upazila: upazila.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
          father_name: fatherName.trim(),
          father_phone: fatherPhone.trim(),
          father_nid: fatherNid.trim(),
          father_occupation: fatherOccupation.trim(),
          mother_name: motherName.trim(),
          mother_phone: motherPhone.trim(),
          mother_nid: motherNid.trim(),
          mother_occupation: motherOccupation.trim(),
          guardian_name: guardianName.trim() || fatherName.trim() || motherName.trim(),
          guardian_relation: guardianRelation.trim(),
          guardian_phone: guardianPhone.trim() || fatherPhone.trim() || motherPhone.trim(),
          guardian_email: guardianEmail.trim(),
          guardian_address: guardianAddress.trim() || presentAddress.trim(),
          image_url: imageUrl.trim(),
          signature_url: signatureUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit profile setup.');
      }

      toast.success(data.message || 'Profile setup submitted successfully!');
      setSubmissionResult(data.payload || data);
      setSubmittedSuccess(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[85vh] flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 inline-block">
            {website?.name || 'Academic Institution'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Account Setup & Verification
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Verify your email via one-time code (OTP), set your password, and finalize your enrollment profile.
          </p>
        </div>

        {/* STEP 0: EMAIL OTP VERIFICATION (Enforced Before Form Access) */}
        {!isEmailVerified && !submittedSuccess && (
          <div className="space-y-5 max-w-md mx-auto py-2">
            <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800/60 space-y-3">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-xs">
                <FiShield className="w-4 h-4 text-sky-600" /> Security Step: Email OTP Verification
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Enter your institutional email address to receive a 6-digit verification code. If email was not added by school administration during admission, also enter your Registration Number to verify and link your email.
              </p>

              <form onSubmit={handleSendOtp} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Student Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Registration Number (Required if email was not added by staff)
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="e.g. REG-2026-1001"
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Found on your admission receipt or circular</span>
                </div>

                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <FiMail className="w-4 h-4" />
                  {sendingOtp ? 'Sending One-Time Code...' : otpSent ? 'Resend Verification Code' : 'Send Verification Code via Email'}
                </button>
              </form>
            </div>

            {/* OTP Verification Form */}
            {otpSent && (
              <form onSubmit={handleVerifyOtp} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 dark:text-white">
                    Enter 6-Digit Verification Code
                  </label>
                  {devCode && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-2 py-0.5 rounded font-bold">
                      Dev Code: {devCode}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Please enter the code sent to <strong>{emailInput}</strong>.
                </p>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2.5 text-center text-lg font-mono font-bold tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />

                <button
                  type="submit"
                  disabled={verifyingOtp}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  {verifyingOtp ? 'Validating Code...' : 'Verify Code & Unlock Profile Setup'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Dynamic Success Screen (Auto-Verified vs Sent to Staff) */}
        {submittedSuccess && (
          <div className="py-8 space-y-6 text-center">
            {submissionResult?.requires_staff_verification ? (
              // Case: Email was not pre-registered by staff, submitted for staff verification
              <>
                <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold">
                  ⏳
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Submitted for Staff Verification
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Profile Sent to Staff for Verification
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Thank you, <span className="font-semibold">{name || studentData?.name || 'Student'}</span>. Since your email address was not pre-registered by school administration, your profile has been submitted for staff review.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Staff can verify your account in the institution panel. Once approved, you will be able to log in to the Student Portal.
                  </p>
                </div>
              </>
            ) : (
              // Case: Email was pre-registered by staff, auto-verified immediately
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Account Verified &amp; Active
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Account Setup Complete!
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Congratulations, <span className="font-semibold">{name || studentData?.name || 'Student'}</span>. Your email was verified via one-time code and your student account is now fully active. No staff approval is needed!
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You can now log in immediately using your Registration Number / Email and your new password.
                  </p>
                </div>
              </>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href={tenantUrl('/auth/student/login')}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition"
              >
                Go to Student Login →
              </Link>
              <Link
                href={tenantUrl('/')}
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        )}

        {/* Student Setup Multi-Step Form (Active only when email is verified) */}
        {isEmailVerified && !submittedSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identity Banner */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{name || studentData?.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Reg No: <span className="text-slate-800 dark:text-slate-200">{studentData?.registration_no}</span>
                  {studentData?.roll_no ? ` • Roll: ${studentData.roll_no}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-700 dark:text-emerald-400 font-medium text-[10px] flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3" /> Email Verified
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-300 text-sky-700 dark:text-sky-300 font-medium text-[10px]">
                  {studentData?.class_name || 'Academic Class'}
                </span>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 text-xs">
              {[
                { id: 1, label: 'Password & Basic' },
                { id: 2, label: 'Addresses' },
                { id: 3, label: 'Parents / Guardians' },
                { id: 4, label: 'Photo & Review' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-1.5 pb-1 border-b-2 font-medium cursor-pointer transition-colors ${
                    step === s.id
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                    step === s.id ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {s.id}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </div>

            {/* STEP 1: PASSWORD & PERSONAL */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full legal name"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Verified Institutional Email (Locked)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      New Portal Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    Next: Addresses <FiArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ADDRESSES */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Present Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={presentAddress}
                    onChange={(e) => setPresentAddress(e.target.value)}
                    placeholder="House, Road, Area, Ward"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Permanent Address
                  </label>
                  <textarea
                    rows={2}
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    placeholder="Leave blank if same as present"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Dhaka"
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">District</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Dhaka"
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Upazila</label>
                    <input
                      type="text"
                      value={upazila}
                      onChange={(e) => setUpazila(e.target.value)}
                      placeholder="e.g. Mirpur"
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 1216"
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    Next: Guardians <FiArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: GUARDIANS */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Father&apos;s Full Name
                    </label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="Father's name"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Father&apos;s Phone Number
                    </label>
                    <input
                      type="text"
                      value={fatherPhone}
                      onChange={(e) => setFatherPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Mother&apos;s Full Name
                    </label>
                    <input
                      type="text"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      placeholder="Mother's name"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Mother&apos;s Phone Number
                    </label>
                    <input
                      type="text"
                      value={motherPhone}
                      onChange={(e) => setMotherPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    Next: Media & Submit <FiArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: MEDIA & FINAL SUBMIT */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="font-semibold text-slate-900 dark:text-white block text-xs">
                    Profile Media URLs (Optional / Prepopulated from Admission)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Student Photo URL
                      </label>
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Student Signature URL
                      </label>
                      <input
                        type="text"
                        value={signatureUrl}
                        onChange={(e) => setSignatureUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Final Confirmation:</strong> By clicking Submit, your profile credentials and verified email (<code>{email}</code>) will be recorded. Your account will await final approval by the administration desk before portal activation.
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting Setup...' : 'Finalize Profile Setup'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function StudentSetupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading student setup...</div>}>
      <StudentSetupContent />
    </Suspense>
  );
}
