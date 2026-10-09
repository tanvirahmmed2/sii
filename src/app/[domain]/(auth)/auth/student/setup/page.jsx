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
  const [tokenInput, setTokenInput] = useState(urlToken);
  const [activeToken, setActiveToken] = useState(urlToken);

  // Loading states
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Step state: 1 = Password & Personal, 2 = Addresses, 3 = Guardians, 4 = Media & Submit
  const [step, setStep] = useState(1);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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

  // Load student info on token change
  useEffect(() => {
    if (!activeToken) return;

    const fetchStudent = async () => {
      setLoadingStudent(true);
      try {
        const endpoint = getApiEndpoint(`student/setup?token=${encodeURIComponent(activeToken)}`);
        const res = await fetch(endpoint);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to validate setup token.');
        }

        const s = data.payload?.student;
        setStudentData(s);
        if (s.name) setName(s.name);
        if (s.email) setEmail(s.email);
        if (s.number) setNumber(s.number);
        if (s.gender) setGender(s.gender);
        if (s.blood_group) setBloodGroup(s.blood_group);
        if (s.date_of_birth) setDob(s.date_of_birth.substring(0, 10));
        if (s.religion) setReligion(s.religion);

        // Prepopulate address if exists
        const a = data.payload?.address;
        if (a) {
          if (a.present_address) setPresentAddress(a.present_address);
          if (a.permanent_address) setPermanentAddress(a.permanent_address);
          if (a.city) setCity(a.city);
          if (a.district) setDistrict(a.district);
          if (a.upazila) setUpazila(a.upazila);
          if (a.postal_code) setPostalCode(a.postal_code);
          if (a.country) setCountry(a.country);
        }

        // Prepopulate guardian if exists
        const g = data.payload?.guardian;
        if (g) {
          if (g.father_name) setFatherName(g.father_name);
          if (g.father_phone) setFatherPhone(g.father_phone);
          if (g.father_nid) setFatherNid(g.father_nid);
          if (g.father_occupation) setFatherOccupation(g.father_occupation);
          if (g.mother_name) setMotherName(g.mother_name);
          if (g.mother_phone) setMotherPhone(g.mother_phone);
          if (g.mother_nid) setMotherNid(g.mother_nid);
          if (g.mother_occupation) setMotherOccupation(g.mother_occupation);
          if (g.guardian_name) setGuardianName(g.guardian_name);
          if (g.guardian_relation) setGuardianRelation(g.guardian_relation);
          if (g.guardian_phone) setGuardianPhone(g.guardian_phone);
          if (g.guardian_email) setGuardianEmail(g.guardian_email);
          if (g.guardian_address) setGuardianAddress(g.guardian_address);
        }

        const p = data.payload?.picture;
        if (p?.image_url) setImageUrl(p.image_url);

        const sig = data.payload?.signature;
        if (sig?.signature_url) setSignatureUrl(sig.signature_url);

        if (s.verification_status === 'submitted') {
          setSubmittedSuccess(true);
        }
      } catch (err) {
        toast.error(err.message);
        setStudentData(null);
      } finally {
        setLoadingStudent(false);
      }
    };

    fetchStudent();
  }, [activeToken, getApiEndpoint]);

  const handleApplyToken = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      toast.error('Please enter your setup token.');
      return;
    }
    setActiveToken(tokenInput.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password) {
      toast.error('Password is required.');
      setStep(1);
      return;
    }

    if (password.length < 6) {
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
      const endpoint = getApiEndpoint('student/setup');
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeToken,
          name: name.trim(),
          email: email.trim(),
          password,
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

      toast.success('Profile setup submitted successfully!');
      setSubmittedSuccess(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[85vh] flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 inline-block">
            {website?.name || 'Academic Institution'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Account Setup
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Initialize your student credentials, complete your personal record, and submit your profile for institutional verification.
          </p>
        </div>

        {/* Token Input Bar (if token not loaded or invalid) */}
        {!studentData && !loadingStudent && (
          <form onSubmit={handleApplyToken} className="space-y-4 max-w-md mx-auto py-4">
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Registration Number or Setup Token
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Enter your Registration Number or the setup token provided by school administration to begin setup.
              </p>
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. REG-10023 or token code"
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Load Student Profile →
              </button>
            </div>
          </form>
        )}

        {loadingStudent && (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Validating setup token and retrieving student profile...</p>
          </div>
        )}

        {/* Submitted Success Screen */}
        {submittedSuccess && studentData && (
          <div className="py-8 space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Profile Submitted for Verification!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Thank you, <span className="font-semibold">{studentData.name}</span>. Your student profile, password, addresses, and guardian details have been successfully submitted.
              </p>
            </div>

            {/* Verification Status Timeline */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-4 max-w-lg mx-auto text-left space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Enrollment Journey
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                  <div className="font-semibold">Step 1</div>
                  <div>Account Setup</div>
                  <div className="text-[10px] text-emerald-600 font-mono mt-1">Completed</div>
                </div>
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold animate-pulse">
                  <div>Step 2</div>
                  <div>Staff Review</div>
                  <div className="text-[10px] text-amber-600 font-mono mt-1">In Review</div>
                </div>
                <div className="p-2 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
                  <div className="font-semibold">Step 3</div>
                  <div>Portal Access</div>
                  <div className="text-[10px] font-mono mt-1">Pending</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                School administration will review your submitted credentials at the verification desk. Once approved, you will be able to log in to the Student Portal.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href={tenantUrl('/auth/student/login')}
                className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition"
              >
                Go to Student Login
              </Link>
              <Link
                href={tenantUrl('/')}
                className="px-4 py-2 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        )}

        {/* Student Setup Form */}
        {studentData && !submittedSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Student Identity Badge */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{studentData.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Reg No: <span className="text-slate-800 dark:text-slate-200">{studentData.registration_no}</span>
                  {studentData.roll_no ? ` • Roll: ${studentData.roll_no}` : ''}
                </p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium text-[11px]">
                  {studentData.class_name || 'Enrolled Class'} {studentData.section_name ? `(${studentData.section_name})` : ''}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">{studentData.session_name || 'Academic Session'}</p>
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
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                    step === s.id ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {s.id}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </div>

            {/* STEP 1: PASSWORD & PERSONAL */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
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
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
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
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Religion
                    </label>
                    <select
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    >
                      <option value="Islam">Islam</option>
                      <option value="Hinduism">Hinduism</option>
                      <option value="Christianity">Christianity</option>
                      <option value="Buddhism">Buddhism</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!password || password.length < 6) {
                        toast.error('Please enter a valid password (min 6 characters).');
                        return;
                      }
                      if (password !== confirmPassword) {
                        toast.error('Passwords do not match.');
                        return;
                      }
                      setStep(2);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded text-xs font-semibold cursor-pointer hover:bg-primary-dark transition"
                  >
                    Next: Address Information →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ADDRESSES */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Present Address *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={presentAddress}
                    onChange={(e) => setPresentAddress(e.target.value)}
                    placeholder="House/Village, Road, Area"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Permanent Address
                    </label>
                    <button
                      type="button"
                      onClick={() => setPermanentAddress(presentAddress)}
                      className="text-[10px] text-primary hover:underline cursor-pointer"
                    >
                      Same as Present Address
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    placeholder="Permanent village / street"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-medium text-slate-700 dark:text-slate-300 mb-1">
                      District / City
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Dhaka"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Upazila / Thana
                    </label>
                    <input
                      type="text"
                      value={upazila}
                      onChange={(e) => setUpazila(e.target.value)}
                      placeholder="e.g. Mirpur"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="1216"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!presentAddress.trim()) {
                        toast.error('Present address is required.');
                        return;
                      }
                      setStep(3);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded text-xs font-semibold cursor-pointer hover:bg-primary-dark transition"
                  >
                    Next: Guardian Details →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: GUARDIANS */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Father */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded space-y-3">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Father's Information
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="Father's Full Name"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={fatherPhone}
                      onChange={(e) => setFatherPhone(e.target.value)}
                      placeholder="Father's Phone Number"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={fatherNid}
                      onChange={(e) => setFatherNid(e.target.value)}
                      placeholder="Father's NID Number"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={fatherOccupation}
                      onChange={(e) => setFatherOccupation(e.target.value)}
                      placeholder="Father's Occupation"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Mother */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded space-y-3">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Mother's Information
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      placeholder="Mother's Full Name"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={motherPhone}
                      onChange={(e) => setMotherPhone(e.target.value)}
                      placeholder="Mother's Phone Number"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={motherNid}
                      onChange={(e) => setMotherNid(e.target.value)}
                      placeholder="Mother's NID Number"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={motherOccupation}
                      onChange={(e) => setMotherOccupation(e.target.value)}
                      placeholder="Mother's Occupation"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Local Guardian */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded space-y-3">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Local Guardian / Emergency Contact
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="Guardian Name"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={guardianRelation}
                      onChange={(e) => setGuardianRelation(e.target.value)}
                      placeholder="Relationship (e.g. Uncle)"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="Guardian Phone"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!fatherName.trim() && !motherName.trim() && !guardianName.trim()) {
                        toast.error('Please provide at least one parent or guardian name.');
                        return;
                      }
                      setStep(4);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded text-xs font-semibold cursor-pointer hover:bg-primary-dark transition"
                  >
                    Next: Media & Review →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: MEDIA & REVIEW */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Photo */}
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Student Passport Photo (URL)
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/student-photo.jpg"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    {imageUrl && (
                      <div className="w-20 h-24 rounded border border-slate-200 overflow-hidden mt-2 bg-slate-100 flex items-center justify-center">
                        <img
                          src={imageUrl}
                          alt="Student Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Signature */}
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Digital Signature (URL)
                    </label>
                    <input
                      type="url"
                      value={signatureUrl}
                      onChange={(e) => setSignatureUrl(e.target.value)}
                      placeholder="https://example.com/student-sign.png"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    {signatureUrl && (
                      <div className="w-32 h-16 rounded border border-slate-200 overflow-hidden mt-2 bg-white flex items-center justify-center p-1">
                        <img
                          src={signatureUrl}
                          alt="Signature Preview"
                          className="max-h-full object-contain"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms notice */}
                <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
                  By submitting this form, you confirm that all educational, address, and guardian information provided is accurate. Once submitted, your profile will be sent to the school administration for review and verification before student portal access is enabled.
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-60 transition shadow-xs"
                  >
                    {submitting ? 'Submitting Profile...' : 'Submit Profile for Verification ✓'}
                  </button>
                </div>
              </div>
            )}

          </form>
        )}

        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <Link href={tenantUrl('/auth/student/login')} className="hover:underline font-medium text-primary">
            ← Back to Student Login
          </Link>
          <Link href={tenantUrl('/')} className="hover:text-slate-800 dark:hover:text-slate-200">
            Homepage
          </Link>
        </div>

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
