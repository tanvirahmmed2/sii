'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiUserCheck, FiUserPlus, FiLock, FiMail, FiPhone, FiCalendar, FiMapPin, FiUsers, FiAward, FiArrowRight, FiHome } from 'react-icons/fi';

const StudentRegistration = () => {
  const router = useRouter();
  const [regNo, setRegNo] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  // Setup fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [birthCert, setBirthCert] = useState('');
  const [password, setPassword] = useState('');

  const [step, setStep] = useState(1); // 1 = Verify registration, 2 = Complete setup
  const [verifiedClass, setVerifiedClass] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Verify Registration Credentials
  const handleVerifyRegistration = async (e) => {
    e.preventDefault();
    if (!regNo || !verificationCode) {
      toast.error('Registration number and verification code are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/student/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          registration_number: regNo, 
          verification_code: verificationCode 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify registration credentials.');
      }

      toast.success(data.message || 'Credentials verified. Confirm your details below.');
      
      // Autofill values from the student profile created on publish
      const s = data.paylod.student;
      setName(s.name || '');
      setEmail(s.email || '');
      setPhone(s.phone || '');
      setDob(s.date_of_birth || '');
      setAddress(s.address || '');
      setParentName(s.parent_name || '');
      setParentContact(s.parent_contact || '');
      setBirthCert(s.birth_certificate_number || '');
      setVerifiedClass(s.class_name);
      
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete registration details
  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    
    if (!regNo || !name || !email || !phone || !dob || !address || !parentName || !parentContact || !birthCert || !password) {
      toast.error('Please fill in all details.');
      return;
    }

    const parentsInfoStr = `Parent Name: ${parentName.trim()}, Contact: ${parentContact.trim()}`;

    setLoading(true);
    try {
      const response = await fetch('/api/student/registration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_number: regNo,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          date_of_birth: dob,
          address: address.trim(),
          parents_info: parentsInfoStr,
          parent_name: parentName.trim(),
          parent_contact: parentContact.trim(),
          birth_certificate_number: birthCert.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete profile setup.');
      }

      toast.success(data.message || 'Account setup completed successfully!');
      router.push('/auth/student/login');
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

      <div className="w-full max-w-160 animate-fade-up z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Student Account Setup</h1>
          <p className="text-sm text-slate-500 max-w-100">
            {step === 1 
              ? 'Complete your profile registration using the registration code issued by your administration.' 
              : `Verification successful. Welcome to class: ${verifiedClass}. Please input your personal details below.`}
          </p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          {step === 1 ? (
            <form onSubmit={handleVerifyRegistration} className="w-full max-w-110 mx-auto flex flex-col gap-5">
              {/* Registration Code Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiUserCheck className="text-sm" /> Enter Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              {/* Verification Code Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiLock className="text-sm" /> Enter Verification Code
                </label>
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
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
                    Verify Registration Code <FiArrowRight className="text-lg" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCompleteSetup} className="w-full flex flex-col gap-6">
              {/* Row 1: Student Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-450 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                    <FiUserCheck /> Student Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-450 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                    <FiMail /> Contact Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
                  />
                </div>
              </div>

              {/* Row 2: Phone & Date of Birth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                    <FiPhone /> Contact Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                    <FiCalendar /> Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
                  />
                </div>
              </div>

              {/* Row 3: Parents Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                    <FiUsers /> Father/Mother Name
                  </label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                    <FiPhone /> Parent Contact Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={parentContact}
                    onChange={(e) => setParentContact(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
                  />
                </div>
              </div>

              {/* Row 4: Birth Certificate Number & Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                    <FiAward /> Birth Certificate Number
                  </label>
                  <input
                    type="text"
                    required
                    value={birthCert}
                    onChange={(e) => setBirthCert(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
                  />
                </div>

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
              </div>

              {/* Text Area: Current Address */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider flex items-center gap-1 text-slate-500">
                  <FiMapPin /> Residential Address
                </label>
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-909 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 resize-none"
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
            href="/auth/student/login"
            className="text-xs font-semibold text-primary hover:text-primary transition-colors py-1.5 px-3 rounded-full hover:bg-primary-light"
          >
            Back to Student Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentRegistration;