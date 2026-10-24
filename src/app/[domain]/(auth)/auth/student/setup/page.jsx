'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

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

  // Loading & Saving states
  const [submittingStep, setSubmittingStep] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [configuredFields, setConfiguredFields] = useState([]);
  const [dynamicValues, setDynamicValues] = useState({});

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
          if (data.payload.fields && Array.isArray(data.payload.fields)) {
            setConfiguredFields(data.payload.fields);
          }
          if (s.email) {
            setEmailInput(s.email);
            setEmail(s.email);
          }
          if (s.name) setName(s.name);
          if (s.number) setNumber(s.number);
          if (s.gender) setGender(s.gender);
          if (s.blood_group) setBloodGroup(s.blood_group);
          if (s.date_of_birth) setDob(s.date_of_birth.substring(0, 10));
          if (s.religion) setReligion(s.religion);
          if (s.is_verified) {
            setIsEmailVerified(true);
            setStep(2);
          }

          if (data.payload.address) {
            const a = data.payload.address;
            if (a.present_address) setPresentAddress(a.present_address);
            if (a.permanent_address) setPermanentAddress(a.permanent_address);
            if (a.city) setCity(a.city);
            if (a.district) setDistrict(a.district);
            if (a.upazila) setUpazila(a.upazila);
            if (a.postal_code) setPostalCode(a.postal_code);
          }

          if (data.payload.guardian) {
            const g = data.payload.guardian;
            if (g.father_name) setFatherName(g.father_name);
            if (g.father_phone) setFatherPhone(g.father_phone);
            if (g.mother_name) setMotherName(g.mother_name);
            if (g.mother_phone) setMotherPhone(g.mother_phone);
            if (g.guardian_name) setGuardianName(g.guardian_name);
          }
        }
      } catch (err) {
        console.error('Error fetching student setup:', err);
      }
    };

    fetchStudent();
  }, [activeToken, getApiEndpoint]);

  const handleDynamicChange = (fieldKey, value) => {
    setDynamicValues((prev) => ({ ...prev, [fieldKey]: value }));
  };

  // STEP 1: Dispatch OTP Code via Brevo
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error('Please enter your student email address.');
      return;
    }
    if (!tokenInput.trim()) {
      toast.error('Please enter your student registration number.');
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
          registration_no: tokenInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Verification code sent to your email.');
        setOtpSent(true);
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

  // STEP 2: Password setup
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

      toast.success(data.message || 'Account initialized! Enter personal details.');
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
      toast.error('Student full name is required.');
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
          custom_fields: dynamicValues,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save personal details.');
      }

      toast.success(data.message || 'Personal details saved! Proceed to guardian info.');
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
          custom_fields: dynamicValues,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save guardian information.');
      }

      toast.success(data.message || 'Guardian information saved! Proceed to address.');
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
          custom_fields: dynamicValues,
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

  const renderDynamicFieldsForScope = (targetScope) => {
    const fieldsToRender = configuredFields.filter(
      (f) => (f.target_scope || 'info') === targetScope
    );
    if (fieldsToRender.length === 0) return null;

    return (
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Additional Institutional Fields
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fieldsToRender.map((f) => {
            const val = dynamicValues[f.field_key] || '';
            const label = f.label_translations?.en || f.field_name || f.field_key;

            if (f.field_type === 'select') {
              const options = Array.isArray(f.options) ? f.options : [];
              return (
                <div key={f.id || f.field_key} className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {label} {f.is_required && '*'}
                  </label>
                  <select
                    required={Boolean(f.is_required)}
                    value={val}
                    onChange={(e) => handleDynamicChange(f.field_key, e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  >
                    <option value="">-- Select {label} --</option>
                    {options.map((opt, oIdx) => (
                      <option key={oIdx} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (f.field_type === 'textarea') {
              return (
                <div key={f.id || f.field_key} className="col-span-full space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {label} {f.is_required && '*'}
                  </label>
                  <textarea
                    rows={2}
                    required={Boolean(f.is_required)}
                    value={val}
                    onChange={(e) => handleDynamicChange(f.field_key, e.target.value)}
                    placeholder={f.placeholder || ''}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              );
            }

            return (
              <div key={f.id || f.field_key} className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {label} {f.is_required && '*'}
                </label>
                <input
                  type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                  required={Boolean(f.is_required)}
                  value={val}
                  onChange={(e) => handleDynamicChange(f.field_key, e.target.value)}
                  placeholder={f.placeholder || ''}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Page Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Student Account Setup Workstation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Initialize your student portal credentials and complete profile onboarding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={tenantUrl('/auth/student/login')}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Existing Student Login
          </Link>
        </div>
      </div>

      {/* Stepper Navigation */}
      {!submittedSuccess && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[
              { id: 1, label: '1. Email OTP' },
              { id: 2, label: '2. Password' },
              { id: 3, label: '3. Personal' },
              { id: 4, label: '4. Guardians' },
              { id: 5, label: '5. Address' },
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
                className={`py-1.5 px-2 rounded text-xs transition cursor-pointer disabled:cursor-not-allowed ${
                  step === s.id
                    ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                    : s.id < step
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium'
                    : 'text-slate-400 dark:text-slate-600 font-normal'
                }`}
              >
                {s.id < step ? `${s.label} [Done]` : s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SUCCESS COMPLETION VIEW */}
      {submittedSuccess && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 space-y-4">
          <div className="space-y-1">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase tracking-wider">
              Account Active &amp; Verified
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Account Setup Completed
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Welcome, <strong className="font-semibold text-slate-900 dark:text-white">{name || studentData?.name || 'Student'}</strong>! Your institutional account is active and verified.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1 text-slate-700 dark:text-slate-300">
            <div>Registration Number: <strong className="text-slate-900 dark:text-white">{studentData?.registration_no}</strong></div>
            <div>Registered Email: {email}</div>
            <div>Class: {studentData?.class_name || 'Assigned'} | Session: {studentData?.session_name || 'Academic'}</div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Link
              href={tenantUrl('/auth/student/login')}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
            >
              Sign In to Student Portal
            </Link>
            <Link
              href={tenantUrl('/')}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Campus Homepage
            </Link>
          </div>
        </div>
      )}

      {/* STEP 1: EMAIL OTP VERIFICATION */}
      {!submittedSuccess && step === 1 && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Step 1: Institutional Email OTP Verification
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter your student email and registration number to receive a 6-digit one-time verification code.
            </p>
          </div>

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Student Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                  placeholder="student@example.edu"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="e.g. 2026-1001"
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={sendingOtp}
                className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
              >
                {sendingOtp ? 'Sending Code...' : otpSent ? 'Resend Verification Code' : 'Send Verification Code'}
              </button>
            </div>
          </form>

          {otpSent && (
            <form onSubmit={handleVerifyOtp} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-900 dark:text-white">
                  Enter 6-Digit Code sent to {emailInput} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-48 px-3 py-1.5 text-center text-sm font-mono tracking-widest rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={verifyingOtp}
                className="px-3.5 py-1.5 rounded-md bg-secondary hover:bg-secondary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
              >
                {verifyingOtp ? 'Verifying Code...' : 'Verify OTP & Proceed to Password Setup'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* STEP 2: PASSWORD SETUP */}
      {!submittedSuccess && step === 2 && (
        <form onSubmit={handleStep2Password} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Step 2: Initialize Student Portal Password
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Create a secure password for student workstation authentication.
              </p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              Email Verified: {email}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                New Portal Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submittingStep}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
            >
              {submittingStep ? 'Setting Password...' : 'Save Password & Enter Personal Details'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: PERSONAL INFORMATION */}
      {!submittedSuccess && step === 3 && (
        <form onSubmit={handleStep3Personal} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Step 3: Personal Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter your legal student personal profile details.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Student Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
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

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Religion</label>
              <input
                type="text"
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                placeholder="e.g. Islam"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Dynamic Scoped Fields */}
          {renderDynamicFieldsForScope('info')}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Back to Password
            </button>
            <button
              type="submit"
              disabled={submittingStep}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
            >
              {submittingStep ? 'Saving...' : 'Save & Enter Guardian Information'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: GUARDIAN INFORMATION */}
      {!submittedSuccess && step === 4 && (
        <form onSubmit={handleStep4Guardian} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Step 4: Parents &amp; Guardian Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Provide father, mother, or legal guardian details for institutional records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Father Full Name</label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="Father name"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Father Contact Phone</label>
              <input
                type="text"
                value={fatherPhone}
                onChange={(e) => setFatherPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Mother Full Name</label>
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                placeholder="Mother name"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Mother Contact Phone</label>
              <input
                type="text"
                value={motherPhone}
                onChange={(e) => setMotherPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Legal Guardian Name</label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Guardian name (if not parent)"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Guardian Relation</label>
              <select
                value={guardianRelation}
                onChange={(e) => setGuardianRelation(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Uncle">Uncle</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Guardian Phone</label>
              <input
                type="text"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
              />
            </div>
          </div>

          {/* Dynamic Scoped Fields */}
          {renderDynamicFieldsForScope('guardians')}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Back to Personal
            </button>
            <button
              type="submit"
              disabled={submittingStep}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
            >
              {submittingStep ? 'Saving...' : 'Save & Enter Address Details'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 5: ADDRESS INFORMATION */}
      {!submittedSuccess && step === 5 && (
        <form onSubmit={handleStep5Address} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Step 5: Present &amp; Permanent Address
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter your residential address to complete student workstation setup.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Present Residential Address *
            </label>
            <textarea
              required
              rows={2}
              value={presentAddress}
              onChange={(e) => setPresentAddress(e.target.value)}
              placeholder="House, Road, Area, Ward"
              className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Permanent Address
            </label>
            <textarea
              rows={2}
              value={permanentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              placeholder="Leave blank if same as present address"
              className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Dhaka"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Dhaka"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Upazila</label>
              <input
                type="text"
                value={upazila}
                onChange={(e) => setUpazila(e.target.value)}
                placeholder="e.g. Mirpur"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 1216"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
              />
            </div>
          </div>

          {/* Dynamic Scoped Fields */}
          {renderDynamicFieldsForScope('addresses')}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Back to Guardians
            </button>
            <button
              type="submit"
              disabled={submittingStep}
              className="px-4 py-1.5 rounded-md bg-secondary hover:bg-secondary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
            >
              {submittingStep ? 'Finalizing Setup...' : 'Complete Student Setup'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function StudentSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full p-8 text-center text-xs text-slate-500">
          Loading student setup...
        </div>
      }
    >
      <StudentSetupContent />
    </Suspense>
  );
}
