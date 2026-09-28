'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiBookOpen,
  FiAward, FiHeart, FiLock, FiCheckCircle, FiShield, FiFileText, FiSave
} from 'react-icons/fi';

const StudentProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    // Read-only fields
    registration_number: '',
    roll: '',
    class_name: '',
    section_name: '',
    email: '',
    birth_certificate_number: '',

    // Editable fields
    name: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: '',
    address: '',
    father_name: '',
    father_occupation: '',
    father_phone: '',
    mother_name: '',
    mother_occupation: '',
    mother_phone: '',
    past_school_name: '',
    past_school_class: '',
    past_school_result: '',
    special_note: '',

    // Password fields
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/me');
      const data = await res.json();
      if (res.ok && data.success && data.paylod?.student) {
        const s = data.paylod.student;
        setForm({
          registration_number: s.registration_number || '',
          roll: s.roll ? String(s.roll) : '',
          class_name: s.class_name || 'N/A',
          section_name: s.section_name || 'N/A',
          email: s.email || '',
          birth_certificate_number: s.birth_certificate_number || '',
          image: s.image || '',
          name: s.name || '',
          phone: s.phone || '',
          date_of_birth: s.date_of_birth ? new Date(s.date_of_birth).toISOString().split('T')[0] : '',
          gender: s.gender || 'Male',
          blood_group: s.blood_group || '',
          address: s.address || '',
          father_name: s.father_name || '',
          father_occupation: s.father_occupation || '',
          father_phone: s.father_phone || '',
          mother_name: s.mother_name || '',
          mother_occupation: s.mother_occupation || '',
          mother_phone: s.mother_phone || '',
          past_school_name: s.past_school_name || '',
          past_school_class: s.past_school_class || '',
          past_school_result: s.past_school_result || '',
          special_note: s.special_note || '',
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        toast.error('Failed to load profile details.');
      }
    } catch (err) {
      toast.error('Failed to connect to profile service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, JPEG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: reader.result }));
      toast.success('New profile photo selected! Click "Save Profile Changes" to save.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.new_password) {
      if (!form.current_password) {
        toast.error('Please enter your current password to change password.');
        return;
      }
      if (form.new_password !== form.confirm_password) {
        toast.error('New password and confirm password do not match.');
        return;
      }
      if (form.new_password.length < 6) {
        toast.error('New password must be at least 6 characters long.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/student/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          date_of_birth: form.date_of_birth,
          gender: form.gender,
          blood_group: form.blood_group,
          address: form.address,
          father_name: form.father_name,
          father_occupation: form.father_occupation,
          father_phone: form.father_phone,
          mother_name: form.mother_name,
          mother_occupation: form.mother_occupation,
          mother_phone: form.mother_phone,
          past_school_name: form.past_school_name,
          past_school_class: form.past_school_class,
          past_school_result: form.past_school_result,
          special_note: form.special_note,
          image: form.image,
          current_password: form.current_password || undefined,
          new_password: form.new_password || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Profile updated successfully!');
        setForm((prev) => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: ''
        }));
        fetchProfile();
      } else {
        throw new Error(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-400">Loading student profile...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-10">
      
      {/* Top Banner Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row items-center gap-6">
        <div className="relative group w-24 h-24 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center text-3xl font-bold shrink-0 overflow-hidden shadow-xs">
          {form.image ? (
            <img src={form.image} alt={form.name} className="w-full h-full object-cover" />
          ) : form.name ? (
            form.name.charAt(0).toUpperCase()
          ) : (
            <FiUser />
          )}
          <label className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-semibold gap-1">
            <span className="text-lg">📷</span>
            <span>Change Photo</span>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-xl font-bold text-slate-800">{form.name}</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Registration No: <span className="font-mono font-bold text-emerald-700">{form.registration_number}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Class: {form.class_name} ({form.section_name})
            </span>
            {form.roll && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60 font-mono">
                Roll: #{form.roll}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <FiCheckCircle className="text-xs" /> Verified Account
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 self-center md:self-auto"
        >
          <FiSave className="text-sm" />
          <span>{submitting ? 'Saving Changes...' : 'Save Profile Changes'}</span>
        </button>
      </div>

      {/* Read-Only Academic & Identity Box */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
          <FiLock className="text-slate-400" /> Read-Only Credentials (Cannot be modified by student)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Assigned Class</span>
            <input
              type="text"
              disabled
              value={form.class_name}
              className="w-full px-3 py-1.5 bg-white/70 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold cursor-not-allowed"
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Assigned Roll</span>
            <input
              type="text"
              disabled
              value={form.roll ? `#${form.roll}` : 'N/A'}
              className="w-full px-3 py-1.5 bg-white/70 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold cursor-not-allowed font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Registration Number</span>
            <input
              type="text"
              disabled
              value={form.registration_number}
              className="w-full px-3 py-1.5 bg-white/70 border border-slate-200 rounded-xl text-xs text-slate-500 font-bold cursor-not-allowed font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Student Email Address</span>
            <input
              type="email"
              disabled
              value={form.email}
              className="w-full px-3 py-1.5 bg-white/70 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold cursor-not-allowed"
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Birth Reg / Certificate No</span>
            <input
              type="text"
              disabled
              value={form.birth_certificate_number || 'N/A'}
              className="w-full px-3 py-1.5 bg-white/70 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Editable Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Section 1: Candidate Personal Details */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <FiUser className="text-emerald-600" /> 1. Personal Profile (Editable)
          </h3>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={form.date_of_birth}
                  onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gender *</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Blood Group</label>
                <select
                  value={form.blood_group}
                  onChange={(e) => setForm((p) => ({ ...p, blood_group: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="">-- Select Blood Group --</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Residential Address *</label>
              <textarea
                rows={2}
                required
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Parents Details */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <FiUser className="text-emerald-600" /> 2. Parents Details (Editable)
          </h3>

          <div className="flex flex-col gap-3">
            {/* Father */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Father Information</div>
              <input
                type="text"
                placeholder="Father Name"
                value={form.father_name}
                onChange={(e) => setForm((p) => ({ ...p, father_name: e.target.value }))}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600"
              />
              <input
                type="text"
                placeholder="Father Occupation"
                value={form.father_occupation}
                onChange={(e) => setForm((p) => ({ ...p, father_occupation: e.target.value }))}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600"
              />
              <input
                type="tel"
                placeholder="Father Contact Phone"
                value={form.father_phone}
                onChange={(e) => setForm((p) => ({ ...p, father_phone: e.target.value }))}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600"
              />
            </div>

            {/* Mother */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mother Information</div>
              <input
                type="text"
                placeholder="Mother Name"
                value={form.mother_name}
                onChange={(e) => setForm((p) => ({ ...p, mother_name: e.target.value }))}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600"
              />
              <input
                type="text"
                placeholder="Mother Occupation"
                value={form.mother_occupation}
                onChange={(e) => setForm((p) => ({ ...p, mother_occupation: e.target.value }))}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600"
              />
              <input
                type="tel"
                placeholder="Mother Contact Phone"
                value={form.mother_phone}
                onChange={(e) => setForm((p) => ({ ...p, mother_phone: e.target.value }))}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Past School & Special Notes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <FiBookOpen className="text-emerald-600" /> 3. Past School &amp; Special Note
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Past School Name</label>
              <input
                type="text"
                value={form.past_school_name}
                onChange={(e) => setForm((p) => ({ ...p, past_school_name: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Past Class Passed</label>
              <input
                type="text"
                value={form.past_school_class}
                onChange={(e) => setForm((p) => ({ ...p, past_school_class: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Past Result / GPA</label>
              <input
                type="text"
                value={form.past_school_result}
                onChange={(e) => setForm((p) => ({ ...p, past_school_result: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Special Note / Medical Instructions</label>
            <textarea
              rows={2}
              value={form.special_note}
              onChange={(e) => setForm((p) => ({ ...p, special_note: e.target.value }))}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 resize-none"
              placeholder="Any medical conditions or instructions..."
            />
          </div>
        </div>

        {/* Section 4: Security & Password Update */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <FiShield className="text-emerald-600" /> 4. Security &amp; Password Update
          </h3>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Password</label>
              <input
                type="password"
                placeholder="Enter current password to make changes..."
                value={form.current_password}
                onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters..."
                  value={form.new_password}
                  onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password..."
                  value={form.confirm_password}
                  onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Save Button Footer */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          <FiSave className="text-sm" />
          <span>{submitting ? 'Saving Profile...' : 'Save Profile Changes'}</span>
        </button>
      </div>

    </form>
  );
};

export default StudentProfilePage;
