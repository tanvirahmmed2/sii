'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiLayers,
  FiAward, FiHeart, FiFileText, FiLock, FiCheckCircle, FiSend, FiKey,
  FiSearch, FiAlertCircle, FiArrowRight
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const AdmissionApplyForm = ({ 
  circulars, 
  selectedCircular, 
  onCircularChange, 
  onSubmit, 
  submitting, 
  admissionIdParam,
  onResumeExisting,
  onGoBack
}) => {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  // Email check & verification state
  const [emailToVerify, setEmailToVerify] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const [form, setForm] = useState({
    applicant_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: '',
    address: '',
    applied_class_id: '',
    father_name: '',
    father_occupation: '',
    father_phone: '',
    mother_name: '',
    mother_occupation: '',
    mother_phone: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_relation: 'Father',
    past_school_name: '',
    past_school_class: '',
    past_school_result: '',
    special_note: '',
    birth_regi_number: ''
  });

  useEffect(() => {
    if (selectedCircular) {
      setForm((prev) => ({
        ...prev,
        applied_class_id: selectedCircular.class_id ? selectedCircular.class_id.toString() : ''
      }));
    }
  }, [selectedCircular]);

  const isCircularLocked = selectedCircular && (
    selectedCircular.status === 'closed' ||
    selectedCircular.is_result_published ||
    (selectedCircular.end_date && new Date() > new Date(selectedCircular.end_date))
  );

  const isMeritBased = selectedCircular?.selection_method === 'merit';
  const isExamBased = selectedCircular?.selection_method === 'exam';

  // Step 1: Check if applicant already exists for this circular
  const handleCheckEmail = async () => {
    if (!emailToVerify.trim() || !emailToVerify.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!selectedCircular?.id) {
      toast.error('Please select an admission circular target first.');
      return;
    }

    setCheckingEmail(true);
    setHasLookedUp(true);

    try {
      const res = await fetch(`${apiBase}/admissions/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admission_id: selectedCircular.id,
          email: emailToVerify.trim().toLowerCase()
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.exists && data.applicant) {
        const app = data.applicant;
        setIsEmailVerified(true);
        setVerifiedEmail(app.email);
        setForm((prev) => ({
          ...prev,
          applicant_name: app.applicant_name || prev.applicant_name,
          email: app.email,
          phone: app.phone || prev.phone,
          gender: app.gender || prev.gender,
          date_of_birth: app.date_of_birth ? new Date(app.date_of_birth).toISOString().split('T')[0] : prev.date_of_birth,
          address: app.present_address || prev.address,
          father_name: app.father_name || prev.father_name,
          father_phone: app.father_phone || prev.father_phone,
          mother_name: app.mother_name || prev.mother_name,
          mother_phone: app.mother_phone || prev.mother_phone,
          past_school_name: app.last_institution || prev.past_school_name,
          past_school_class: app.last_class || prev.past_school_class,
          past_school_result: app.last_class_grade ? String(app.last_class_grade) : prev.past_school_result
        }));

        toast.success(`Found your application in '${app.status}' status! Resuming...`);

        // If status requires next step, notify parent to resume at exact stage
        if (onResumeExisting) {
          if (app.status === 'unpaid') {
            onResumeExisting({ step: 'payment', applicant: app });
            return;
          } else if (app.status === 'paid') {
            onResumeExisting({ step: 'upload', applicant: app });
            return;
          } else if (['completed', 'selected', 'rejected', 'enrolled', 'accepted'].includes(app.status)) {
            onResumeExisting({ step: 'completed', applicant: app });
            return;
          }
        }
      } else {
        // Applicant doesn't exist yet, proceed with OTP dispatch
        toast.info('No existing application found for this circular. Please verify your email with OTP.');
        await handleSendOtp();
      }
    } catch {
      toast.error('Network error checking email status.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSendOtp = async () => {
    if (!emailToVerify.trim() || !emailToVerify.includes('@')) {
      toast.error('Please enter a valid candidate email address.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch(`${apiBase}/admissions/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
        toast.success(data.message || 'Verification code dispatched to your email.');
      } else {
        toast.error(data.error || 'Failed to dispatch verification code.');
      }
    } catch {
      toast.error('Network error sending verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch(`${apiBase}/admissions/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToVerify.trim(),
          code: otpCode.trim(),
          admission_id: selectedCircular?.id || null,
          applicant_name: form.applicant_name || 'Candidate',
          phone: form.phone || ''
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEmailVerified(true);
        setVerifiedEmail(emailToVerify.trim());
        setForm((prev) => ({ ...prev, email: emailToVerify.trim() }));
        toast.success('Email verified successfully! Application form is now unlocked.');
      } else {
        toast.error(data.error || 'Invalid verification code.');
      }
    } catch {
      toast.error('Network error verifying code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEmailVerified) {
      toast.error('You must verify your email address before submitting the application.');
      return;
    }
    if (isCircularLocked) {
      toast.error('Applications for this admission circular are closed because the deadline has passed.');
      return;
    }

    // Merit-based circular validation
    if (isMeritBased) {
      if (!form.past_school_class?.trim()) {
        toast.error('Previous Class is required for merit-based admission circulars.');
        return;
      }
      if (!form.past_school_result?.trim()) {
        toast.error('Previous GPA / Grade is required for merit-based admission circulars.');
        return;
      }
      if (selectedCircular.last_class_grade) {
        const minGrade = parseFloat(selectedCircular.last_class_grade);
        const enteredGrade = parseFloat(form.past_school_result);
        if (!isNaN(minGrade) && !isNaN(enteredGrade) && enteredGrade < minGrade) {
          toast.error(`Your GPA (${enteredGrade}) is below the required minimum GPA (${minGrade}) for this circular.`);
          return;
        }
      }
    }

    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
      {/* Target Circular Selector */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <FiLayers className="text-secondary" /> Target Admission Circular *
        </label>
        {admissionIdParam && selectedCircular ? (
          <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold">
            {selectedCircular.title} (Department: {selectedCircular.department_name || 'General'} • Class: {selectedCircular.class_name})
          </div>
        ) : (
          <select
            required
            value={selectedCircular ? selectedCircular.id : ''}
            onChange={(e) => onCircularChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="">Choose an open circular drive...</option>
            {circulars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.department_name ? `${c.department_name} • ` : ''}Class: {c.class_name} ({c.selection_method ? `${c.selection_method.toUpperCase()} BASED` : 'DIRECT'})
              </option>
            ))}
          </select>
        )}

        {selectedCircular && (
          <div className="flex flex-col gap-2.5 mt-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex flex-wrap gap-x-4 gap-y-1">
              <div>
                • Type: <span className="uppercase text-purple-600 dark:text-purple-400 font-bold">{selectedCircular.selection_method || 'manual'} based</span>
              </div>
              {selectedCircular.min_age !== null && <div>• Min Age: <strong>{selectedCircular.min_age} years</strong></div>}
              {selectedCircular.max_age !== null && <div>• Max Age: <strong>{selectedCircular.max_age} years</strong></div>}
              <div>• Deadline: <strong>{selectedCircular.end_date ? new Date(selectedCircular.end_date).toLocaleDateString() : 'N/A'}</strong></div>
              {selectedCircular.result_date && <div>• Result Date: <strong>{new Date(selectedCircular.result_date).toLocaleDateString()}</strong></div>}
              <div>• Admission Fee: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">BDT {parseFloat(selectedCircular.fee_amount || selectedCircular.fees || 0).toFixed(2)}</strong></div>
            </div>

            {/* Exam Based Info */}
            {isExamBased && (
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 p-3 rounded-xl text-xs text-purple-900 dark:text-purple-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FiCalendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Admission Test Required</span>
                </div>
                <p className="text-[11px] text-purple-800/90 dark:text-purple-300/90">
                  Exam Date: {selectedCircular.exam_date || selectedCircular.admission_exam_date ? new Date(selectedCircular.exam_date || selectedCircular.admission_exam_date).toLocaleDateString() : 'Will be notified'} | Venue: {selectedCircular.exam_venue || 'Main Campus'}
                </p>
                {selectedCircular.exam_subjects?.length > 0 && (
                  <p className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
                    Subjects: {selectedCircular.exam_subjects.map(s => `${s.title} (${s.mark} marks)`).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Merit Based Info */}
            {isMeritBased && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FiAward className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Merit-Based Selection (Past Academic Ranking)</span>
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                  Applicants are ranked and selected strictly by previous academic GPA/marks.
                  {selectedCircular.last_class_grade ? ` Minimum required GPA: ${selectedCircular.last_class_grade}` : ''}
                </p>
              </div>
            )}

            {isCircularLocked && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <FiLock className="text-rose-600 shrink-0 text-sm" />
                <span>Notice: Applications for this circular are closed as the deadline has passed.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 1: Email Verification & Smart Lookup Gate */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FiMail className="text-blue-600" /> Step 1: Candidate Email Verification &amp; Resume *
          </h3>
          {isEmailVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <FiCheckCircle className="text-sm" /> Verified
            </span>
          )}
        </div>

        {!isEmailVerified ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your email address. If you have already applied for this circular, the system will instantly retrieve your application and resume at your exact progress stage.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="email"
                placeholder="candidate@example.com"
                value={emailToVerify}
                onChange={(e) => {
                  setEmailToVerify(e.target.value);
                  setHasLookedUp(false);
                  setOtpSent(false);
                }}
                className="w-full sm:flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-mono"
              />

              <button
                type="button"
                onClick={handleCheckEmail}
                disabled={checkingEmail || !emailToVerify.trim() || !selectedCircular}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs"
              >
                {checkingEmail ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <FiSearch className="w-3.5 h-3.5" />
                    <span>Check / Verify Email</span>
                  </>
                )}
              </button>
            </div>

            {/* OTP Code Entry if Sent */}
            {otpSent && (
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl space-y-3">
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-200 block">
                  Enter 6-Digit Email Verification Code:
                </span>
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full sm:w-48 text-center text-sm font-mono tracking-[0.3em] font-bold px-3 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otpCode.trim().length !== 6}
                    className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {verifyingOtp ? 'Verifying...' : 'Confirm OTP & Unlock Form'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-auto"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
            <span>Verified Candidate Email: <strong>{verifiedEmail}</strong></span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Ready to complete application</span>
          </div>
        )}
      </div>

      {/* FORM SECTIONS (Unlocked when email is verified) */}
      <div className={!isEmailVerified ? 'opacity-40 pointer-events-none transition-opacity' : 'transition-opacity'}>
        {/* 1. Basic Candidate Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4 mb-6">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FiUser className="text-blue-600" /> 2. Candidate Personal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FiUser /> Full Legal Candidate Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tanvir Ahmmed"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.applicant_name}
                onChange={(e) => setForm((p) => ({ ...p, applicant_name: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FiCalendar /> Date of Birth *
              </label>
              <input
                type="date"
                required
                disabled={!isEmailVerified || isCircularLocked}
                value={form.date_of_birth}
                onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender *</label>
              <select
                required
                disabled={!isEmailVerified || isCircularLocked}
                value={form.gender}
                onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FiPhone /> Contact Number *
              </label>
              <input
                type="tel"
                required
                placeholder="01XXXXXXXXX"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FiHeart /> Blood Group
              </label>
              <select
                disabled={!isEmailVerified || isCircularLocked}
                value={form.blood_group}
                onChange={(e) => setForm((p) => ({ ...p, blood_group: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="">Select blood group...</option>
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
          </div>
        </div>

        {/* 2. Guardian Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4 mb-6">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FiUser className="text-purple-600" /> 3. Parents &amp; Guardian Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Father Name *</label>
              <input
                type="text"
                required
                disabled={!isEmailVerified || isCircularLocked}
                value={form.father_name}
                onChange={(e) => setForm((p) => ({ ...p, father_name: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Father Occupation</label>
              <input
                type="text"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.father_occupation}
                onChange={(e) => setForm((p) => ({ ...p, father_occupation: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Father Phone</label>
              <input
                type="tel"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.father_phone}
                onChange={(e) => setForm((p) => ({ ...p, father_phone: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mother Name *</label>
              <input
                type="text"
                required
                disabled={!isEmailVerified || isCircularLocked}
                value={form.mother_name}
                onChange={(e) => setForm((p) => ({ ...p, mother_name: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mother Occupation</label>
              <input
                type="text"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.mother_occupation}
                onChange={(e) => setForm((p) => ({ ...p, mother_occupation: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mother Phone</label>
              <input
                type="tel"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.mother_phone}
                onChange={(e) => setForm((p) => ({ ...p, mother_phone: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* 3. Academic Background (Conditional logic for Merit, Exam, Manual) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FiAward className="text-emerald-600" /> 4. Academic Background &amp; Address
            </h3>
            {isMeritBased && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full uppercase">
                Required for Merit Evaluation
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 sm:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Residential Address *</label>
              <textarea
                rows={2}
                required
                placeholder="House, Road, City, District"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* Previous Class */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Previous Class / Level {isMeritBased ? '*' : '(Optional)'}
              </label>
              <input
                type="text"
                required={isMeritBased}
                placeholder="e.g. Class 5, Class 8, SSC"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.past_school_class}
                onChange={(e) => setForm((p) => ({ ...p, past_school_class: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* Previous GPA / Grade */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Previous GPA / Marks {isMeritBased ? '*' : '(Optional)'}
              </label>
              <input
                type="text"
                required={isMeritBased}
                placeholder="e.g. 5.00 or 4.50"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.past_school_result}
                onChange={(e) => setForm((p) => ({ ...p, past_school_result: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>

            {/* Previous Institution */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Previous Institution {isMeritBased ? '*' : '(Optional)'}
              </label>
              <input
                type="text"
                required={isMeritBased}
                placeholder="e.g. Recognized High School"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.past_school_name}
                onChange={(e) => setForm((p) => ({ ...p, past_school_name: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!isEmailVerified || submitting || isCircularLocked}
            className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 text-xs flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="loader loader-xs loader-white" />
                <span>Saving Profile &amp; Preparing Payment...</span>
              </>
            ) : (
              <span>Proceed to Application Fee Payment &rarr;</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default AdmissionApplyForm;
