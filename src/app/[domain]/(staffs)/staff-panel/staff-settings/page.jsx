'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { toast } from 'react-hot-toast';

export default function StaffSettingsPage() {
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'experiences'

  // Personal Profile Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');
  const [username, setUsername] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [nationality, setNationality] = useState('');
  const [nidNumber, setNidNumber] = useState('');
  const [image, setImage] = useState('');

  // Security & Password Fields
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Experiences List
  const [experiences, setExperiences] = useState([]);

  // Fetch current staff profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiEndpoint('staff/me'));
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to load staff profile.');
      }

      const s = data.payload?.staff || data.paylod?.staff || data.staff;
      if (s) {
        setName(s.name || '');
        setEmail(s.email || '');
        setNumber(s.number || s.phone || '');
        setUsername(s.username || '');
        setAddress(s.address || '');
        setBio(s.bio || '');
        setDateOfBirth(s.date_of_birth ? s.date_of_birth.split('T')[0] : '');
        setGender(s.gender || '');
        setBloodGroup(s.blood_group || '');
        setNationality(s.nationality || '');
        setNidNumber(s.nid_number || '');
        setImage(s.image || '');
        setIsTwoFactorEnabled(Boolean(s.isTwoFactorEnabled ?? s.is_two_factor_enabled));
        setExperiences(s.experiences || []);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Save changes
  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      toast.error('Staff name is required.');
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        toast.error('Current password is required to set a new password.');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('New password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        number: number.trim(),
        username: username.trim() || null,
        address: address.trim(),
        bio: bio.trim(),
        date_of_birth: dateOfBirth || null,
        gender: gender.trim() || null,
        blood_group: bloodGroup.trim() || null,
        nationality: nationality.trim() || null,
        nid_number: nidNumber.trim() || null,
        image: image.trim() || null,
        is_two_factor_enabled: Boolean(isTwoFactorEnabled),
        experiences,
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch(getApiEndpoint('staff/me'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update staff settings.');
      }

      toast.success(data.message || 'Staff data updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchProfile();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Experience handlers
  const handleAddExperience = () => {
    setExperiences((prev) => [
      ...prev,
      {
        title: '',
        organization: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
      },
    ]);
  };

  const handleUpdateExperience = (idx, field, value) => {
    setExperiences((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleRemoveExperience = (idx) => {
    setExperiences((prev) => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-700 border-t-primary rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading settings workstation...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Staff Settings &amp; Profile Management
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Personal Configuration
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Update your personal identification, security credentials, contact details, and work experience dossier.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/staff-panel/staff-profile"
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition"
          >
            ← View Profile
          </Link>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={submitting}
            className="px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {submitting ? 'Saving All Changes...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-0 overflow-x-auto text-xs font-medium">
        {[
          { key: 'profile', label: 'Personal & Contact Details' },
          { key: 'security', label: 'Password & Security' },
          { key: 'experiences', label: `Work Experiences (${experiences.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-t text-xs font-medium transition cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSaveAll} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-2xs space-y-6">

        {/* TAB 1: Personal Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Personal Identification &amp; Contact Records
              </h2>
              <p className="text-[11px] text-slate-500">Edit legal identification information and contact numbers.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Robert Smith"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Official Email (Read-Only)
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed font-mono text-[11px]"
                />
                <span className="text-[10px] text-slate-400">Official emails are managed by institutional administrators.</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Contact Telephone / Mobile *
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Username Handle
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rsmith"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g. Bangladeshi / American"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  National ID (NID) / Passport No.
                </label>
                <input
                  type="text"
                  value={nidNumber}
                  onChange={(e) => setNidNumber(e.target.value)}
                  placeholder="e.g. 19948291048"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Avatar / Photo URL
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://.../photo.jpg"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Residential Street Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete permanent or present address..."
                className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary resize-none text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Professional Bio &amp; Role Summary
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief summary of your institutional role, experience, and background..."
                className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary resize-none text-xs"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Security & Password */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Account Security &amp; Credential Management
              </h2>
              <p className="text-[11px] text-slate-500">Update your access password and configure multi-factor protection.</p>
            </div>

            {/* 2FA Toggle Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Two-Factor Authentication (2FA) via Email
                </span>
                <p className="text-[11px] text-slate-500 max-w-lg leading-relaxed">
                  When enabled, signing into your staff desk will require a 6-digit one-time passcode sent directly to your registered email address ({email}).
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isTwoFactorEnabled}
                  onChange={(e) => setIsTwoFactorEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Password Change Subform */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Change Password
              </h3>
              <p className="text-[11px] text-slate-500">Leave these fields blank if you do not wish to change your password.</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Work Experiences */}
        {activeTab === 'experiences' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Professional Work Experiences
                </h2>
                <p className="text-[11px] text-slate-500">Chronological employment and institutional experience history.</p>
              </div>

              <button
                type="button"
                onClick={handleAddExperience}
                className="px-3 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold cursor-pointer hover:opacity-90 transition"
              >
                + Add Experience
              </button>
            </div>

            {experiences.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-500 space-y-2">
                <p>No previous work experience entries found.</p>
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="px-3 py-1.5 rounded bg-primary text-white text-xs font-semibold"
                >
                  + Add First Experience Record
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {experiences.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded space-y-3 text-xs relative"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        Record #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(idx)}
                        className="text-rose-600 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                      >
                        Remove Record
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Role Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={exp.title || ''}
                          onChange={(e) => handleUpdateExperience(idx, 'title', e.target.value)}
                          placeholder="e.g. Accounts Officer / Registrar"
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Organization / Institution *
                        </label>
                        <input
                          type="text"
                          required
                          value={exp.organization || ''}
                          onChange={(e) => handleUpdateExperience(idx, 'organization', e.target.value)}
                          placeholder="e.g. Cambridge International School"
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={exp.start_date ? exp.start_date.split('T')[0] : ''}
                          onChange={(e) => handleUpdateExperience(idx, 'start_date', e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          disabled={exp.is_current}
                          value={exp.is_current ? '' : (exp.end_date ? exp.end_date.split('T')[0] : '')}
                          onChange={(e) => handleUpdateExperience(idx, 'end_date', e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary text-xs disabled:opacity-50"
                        />
                        <label className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(exp.is_current)}
                            onChange={(e) => handleUpdateExperience(idx, 'is_current', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          <span>Currently employed in this role</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Responsibilities &amp; Achievements
                      </label>
                      <textarea
                        rows={2}
                        value={exp.description || ''}
                        onChange={(e) => handleUpdateExperience(idx, 'description', e.target.value)}
                        placeholder="Key responsibilities held in this post..."
                        className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary text-xs resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom Save Action Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link
            href="/staff-panel/staff-profile"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            ← Discard and back to profile
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {submitting ? 'Updating Profile...' : 'Save All Settings Changes →'}
          </button>
        </div>

      </form>
    </div>
  );
}
