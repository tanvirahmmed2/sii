'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiLayers,
  FiAward, FiBook, FiHeart, FiFileText, FiLock, FiCheckCircle, FiSend, FiKey
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const AdmissionApplyForm = ({ 
  circulars, 
  selectedCircular, 
  onCircularChange, 
  onSubmit, 
  submitting, 
  admissionIdParam,
  onGoBack
}) => {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  // Email verification state
  const [emailToVerify, setEmailToVerify] = useState('');
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
    guardian_relation: '',
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
        toast.success(data.message || 'Verification code sent to your email.');
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
                {c.title} — {c.department_name ? `${c.department_name} • ` : ''}Class: {c.class_name}
              </option>
            ))}
          </select>
        )}

        {selectedCircular && (
          <div className="flex flex-col gap-2.5 mt-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex flex-wrap gap-x-4 gap-y-1">
              {selectedCircular.min_age !== null && <div>• Min Age: <strong>{selectedCircular.min_age} years</strong></div>}
              {selectedCircular.max_age !== null && <div>• Max Age: <strong>{selectedCircular.max_age} years</strong></div>}
              <div>• Deadline: <strong>{selectedCircular.end_date ? new Date(selectedCircular.end_date).toLocaleDateString() : 'N/A'}</strong></div>
              {selectedCircular.result_date && <div>• Result Date: <strong>{new Date(selectedCircular.result_date).toLocaleDateString()}</strong></div>}
              <div>• Admission Fee: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">BDT {parseFloat(selectedCircular.fee_amount || selectedCircular.fees || 0).toFixed(2)}</strong></div>
            </div>

            {isCircularLocked && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <FiLock className="text-rose-600 shrink-0 text-sm" />
                <span>Notice: Applications for this circular are closed as the deadline has passed.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 1: Email Verification Gate */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FiMail className="text-blue-600" /> Step 1: Candidate Email Verification *
          </h3>
          {isEmailVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <FiCheckCircle className="text-sm" /> Verified
            </span>
          )}
        </div>

        {!isEmailVerified ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              To prevent fraudulent registrations, candidates must verify their email address before accessing the admission application form. A 6-digit verification code will be sent to your email.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  Candidate Email Address *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="e.g. applicant@example.com"
                    value={emailToVerify}
                    onChange={(e) => setEmailToVerify(e.target.value)}
                    disabled={otpSent}
                    className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  />
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || !emailToVerify.trim()}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {sendingOtp ? <span className="loader loader-xs loader-white" /> : <FiSend />}
                      <span>Send OTP</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>

              {otpSent && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    Enter 6-Digit OTP *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono tracking-widest outline-none focus:border-blue-600 text-center"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp || otpCode.length !== 6}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {verifyingOtp ? <span className="loader loader-xs loader-white" /> : <FiKey />}
                      <span>Verify</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
            <div>
              <span>Verified candidate contact email: <strong>{verifiedEmail}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEmailVerified(false);
                setOtpSent(false);
                setOtpCode('');
              }}
              className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Verify Different Email
            </button>
          </div>
        )}
      </div>

      {/* STEP 2: Candidate Details (Locked until email verified) */}
      <div className={`transition-opacity duration-300 ${!isEmailVerified ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        {!isEmailVerified && (
          <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <FiLock className="shrink-0" />
            <span>Complete Email Verification in Step 1 above to fill out candidate details.</span>
          </div>
        )}

        {/* 1. Candidate Personal Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4 mb-6">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FiUser className="text-emerald-600" /> 2. Candidate Personal Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FiUser /> Student Full Name *
              </label>
              <input
                type="text"
                required
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

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FiMail /> Verified Email
              </label>
              <input
                type="email"
                disabled
                value={form.email}
                className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2. Guardian Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4 mb-6">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FiUser className="text-purple-600" /> 3. Parents & Guardian Details
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

        {/* 3. Address & Academic Record */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4 mb-6">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FiMapPin className="text-rose-600" /> 4. Address & Academic Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Residential Address *</label>
              <textarea
                rows={2}
                required
                disabled={!isEmailVerified || isCircularLocked}
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Previous School / Institution</label>
              <input
                type="text"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.past_school_name}
                onChange={(e) => setForm((p) => ({ ...p, past_school_name: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Previous GPA / Grade</label>
              <input
                type="text"
                placeholder="e.g. 5.00"
                disabled={!isEmailVerified || isCircularLocked}
                value={form.past_school_result}
                onChange={(e) => setForm((p) => ({ ...p, past_school_result: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-mono"
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
                <span>Transmitting Application...</span>
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
