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
  FiArrowRight,
  FiArrowLeft,
  FiKey
} from 'react-icons/fi';

function StudentSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();

  const urlToken = searchParams.get('token') || '';
  const urlEmail = searchParams.get('email') || '';

  const [tokenInput, setTokenInput] = useState(urlToken);
  const [activeToken, setActiveToken] = useState(urlToken);

  // Stepper: 1: Email OTP, 2: Password Setup, 3: Personal Info, 4: Guardian Info, 5: Address
  const [step, setStep] = useState(1);

  // Email verification state (Step 1)
  const [emailInput, setEmailInput] = useState(urlEmail);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [devCode, setDevCode] = useState(null);

  // Loading & Saving states
  const [submittingStep, setSubmittingStep] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Step 2: Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3: Personal Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState(urlEmail);
  const [number, setNumber] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [dob, setDob] = useState('');
  const [religion, setReligion] = useState('Islam');

  // Step 4: Guardian Info
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

  // Step 5: Address Info & Media
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [imageUrl, setImageUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  // Auto-fetch if token provided in URL
  useEffect(() => {
    if (!activeToken) return;

    const fetchStudent = async () => {
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
            setStep(2);
          }
        }
      } catch (err) {
        console.error('Error fetching student setup:', err);
      }
    };

    fetchStudent();
  }, [activeToken, getApiEndpoint]);

  // STEP 1: Dispatch OTP Code via Brevo
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error('Please enter your student email address.');
      return;
    }

    setSendingOtp(true);
    try {
      const sendUrl = getApiEndpoint('student/setup/send-code');
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
        toast.success(data.message || 'Verification code sent to your email!');
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

  // STEP 1: Verify OTP Code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const verifyUrl = getApiEndpoint('student/setup/verify-code');
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
        toast.success('Email verified successfully! You may now create your password.');
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

        // Advance to Step 2 (Password setup)
        setStep(2);
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

  // STEP 2: Password setup -> Creates account in website_student_info
  const handleStep2Password = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmittingStep(true);
    try {
      const res = await fetch(getApiEndpoint('student/setup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 2,
          token: activeToken || studentData?.registration_no,
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to setup password.');
      }

      toast.success(data.message || 'Account created! Now enter your personal details.');
      setStep(3);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingStep(false);
    }
  };

  // STEP 3: Personal Information
  const handleStep3Personal = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Student full legal name is required.');
      return;
    }

    setSubmittingStep(true);
    try {
      const res = await fetch(getApiEndpoint('student/setup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 3,
          token: activeToken || studentData?.registration_no,
          email: email.trim(),
          name: name.trim(),
          number: number.trim(),
          gender,
          blood_group: bloodGroup,
          date_of_birth: dob || null,
          religion,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save personal details.');
      }

      toast.success(data.message || 'Personal details saved! Now enter guardian information.');
      setStep(4);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingStep(false);
    }
  };

  // STEP 4: Guardian Information
  const handleStep4Guardian = async (e) => {
    e.preventDefault();
    if (!fatherName.trim() && !motherName.trim() && !guardianName.trim()) {
      toast.error('Please provide at least one parent or guardian name.');
      return;
    }

    setSubmittingStep(true);
    try {
      const res = await fetch(getApiEndpoint('student/setup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 4,
          token: activeToken || studentData?.registration_no,
          email: email.trim(),
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
          guardian_address: guardianAddress.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save guardian information.');
      }

      toast.success(data.message || 'Guardian information saved! Now enter your address.');
      setStep(5);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingStep(false);
    }
  };

  // STEP 5: Address Information & Finalization
  const handleStep5Address = async (e) => {
    e.preventDefault();
    if (!presentAddress.trim()) {
      toast.error('Present Address is required.');
      return;
    }

    setSubmittingStep(true);
    try {
      const res = await fetch(getApiEndpoint('student/setup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 5,
          token: activeToken || studentData?.registration_no,
          email: email.trim(),
          present_address: presentAddress.trim(),
          permanent_address: permanentAddress.trim() || presentAddress.trim(),
          city: city.trim(),
          district: district.trim(),
          upazila: upazila.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
          image_url: imageUrl.trim(),
          signature_url: signatureUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete profile setup.');
      }

      toast.success(data.message || 'Student setup completed successfully!');
      setSubmittedSuccess(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingStep(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
          
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Account Setup Workstation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            5-step onboarding: Verify email via Brevo OTP, set password, and enter personal, guardian, and address information.
          </p>
        </div>

        {/* Stepper Header (Steps 1 to 5) */}
        {!submittedSuccess && (
          <div className="grid grid-cols-5 gap-1 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs">
            {[
              { id: 1, label: 'Email OTP', icon: FiMail },
              { id: 2, label: 'Password', icon: FiLock },
              { id: 3, label: 'Personal', icon: FiUser },
              { id: 4, label: 'Guardians', icon: FiUsers },
              { id: 5, label: 'Address', icon: FiMapPin },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < step || (s.id === 2 && isEmailVerified)) {
                    setStep(s.id);
                  }
                }}
                disabled={s.id > step && !isEmailVerified}
                className={`flex flex-col items-center text-center pb-1 transition cursor-pointer disabled:cursor-not-allowed ${
                  step === s.id
                    ? 'border-b-2 border-sky-600 text-sky-600 font-bold'
                    : s.id < step
                    ? 'text-emerald-600 font-semibold'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center mb-1 font-bold ${
                    step === s.id
                      ? 'bg-sky-600 text-white'
                      : s.id < step
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {s.id < step ? '✓' : s.id}
                </span>
                <span className="text-[10px] hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* SUCCESS CELEBRATION SCREEN */}
        {submittedSuccess && (
          <div className="py-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl font-bold">
              ✓
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <div className="inline-block px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                Account Active &amp; Ready
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Account Setup Completed!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Congratulations, <strong className="text-slate-900 dark:text-white">{name || studentData?.name || 'Student'}</strong>! Your account in <code>website_student_info</code> has been created and verified.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-left text-xs font-mono space-y-1">
                <div><span className="text-slate-400">Reg No:</span> {studentData?.registration_no}</div>
                <div><span className="text-slate-400">Email:</span> {email}</div>
                <div><span className="text-slate-400">Class:</span> {studentData?.class_name || 'N/A'}</div>
                <div><span className="text-slate-400">Department:</span> {studentData?.department_name || 'N/A'}</div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href={tenantUrl('/auth/student/login')}
                className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-sm"
              >
                Proceed to Student Login →
              </Link>
              <Link
                href={tenantUrl('/')}
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Homepage
              </Link>
            </div>
          </div>
        )}

        {/* STEP 1: EMAIL OTP VERIFICATION */}
        {!submittedSuccess && step === 1 && (
          <div className="space-y-5 max-w-md mx-auto py-2">
            <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800/60 space-y-3">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-xs">
                <FiShield className="w-4 h-4 text-sky-600" /> Step 1: Verify Email with Brevo OTP
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Enter your institutional email address and registration number to receive a 6-digit one-time code via Brevo.
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
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Registration Number (Optional / Recommended)
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="e.g. REG-2026-1001"
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
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
                  {verifyingOtp ? 'Validating Code...' : 'Verify Email & Proceed to Password Setup →'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: CREATE ACCOUNT / SETUP PASSWORD */}
        {!submittedSuccess && step === 2 && (
          <form onSubmit={handleStep2Password} className="space-y-4">
            <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-lg border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-sky-900 dark:text-sky-200">Email Verified:</span>{' '}
                <span className="font-mono text-sky-800 dark:text-sky-300">{email}</span>
              </div>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <FiCheckCircle /> Verified
              </span>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Step 2: Create Account &amp; Set Password
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure your student portal password to initialize your <code>website_student_info</code> account.
              </p>
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500"
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={submittingStep}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingStep ? 'Creating Account...' : 'Create Account & Enter Personal Info →'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PERSONAL INFORMATION */}
        {!submittedSuccess && step === 3 && (
          <form onSubmit={handleStep3Personal} className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Step 3: Personal Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fill in your legal personal details for your student institutional record.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Student Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmmed"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
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
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
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
                  className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Religion</label>
                <input
                  type="text"
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  placeholder="e.g. Islam"
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <FiArrowLeft /> Back
              </button>
              <button
                type="submit"
                disabled={submittingStep}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingStep ? 'Saving...' : 'Save & Enter Guardian Details →'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: GUARDIAN INFORMATION */}
        {!submittedSuccess && step === 4 && (
          <form onSubmit={handleStep4Guardian} className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Step 4: Parents &amp; Guardian Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Provide father, mother, or legal guardian details for institutional contact.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Father&apos;s Full Name
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Father's full name"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Father&apos;s Contact Phone
                </label>
                <input
                  type="text"
                  value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none font-mono"
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
                  placeholder="Mother's full name"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mother&apos;s Contact Phone
                </label>
                <input
                  type="text"
                  value={motherPhone}
                  onChange={(e) => setMotherPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Legal Guardian Name</label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Guardian's name (if not parent)"
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Guardian Relation</label>
                <select
                  value={guardianRelation}
                  onChange={(e) => setGuardianRelation(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Guardian Phone</label>
                <input
                  type="text"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <FiArrowLeft /> Back
              </button>
              <button
                type="submit"
                disabled={submittingStep}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingStep ? 'Saving...' : 'Save & Enter Address Details →'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: ADDRESS INFORMATION */}
        {!submittedSuccess && step === 5 && (
          <form onSubmit={handleStep5Address} className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Step 5: Present &amp; Permanent Address
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your present and permanent address details to complete your student profile setup.
              </p>
            </div>

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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500"
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
                placeholder="Leave blank if same as present address"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500"
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
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Dhaka"
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Upazila</label>
                <input
                  type="text"
                  value={upazila}
                  onChange={(e) => setUpazila(e.target.value)}
                  placeholder="e.g. Mirpur"
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 1216"
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <FiArrowLeft /> Back
              </button>
              <button
                type="submit"
                disabled={submittingStep}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {submittingStep ? 'Finalizing Setup...' : '✓ Complete Student Setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function StudentSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex justify-center items-center">
          <div className="loader loader-md" />
        </div>
      }
    >
      <StudentSetupContent />
    </Suspense>
  );
}
