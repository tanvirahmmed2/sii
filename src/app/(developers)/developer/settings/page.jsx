'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import {
  BiUser,
  BiEnvelope,
  BiPhone,
  BiBriefcase,
  BiLockAlt,
  BiKey,
  BiCheckCircle,
  BiXCircle,
  BiArrowBack,
  BiSave,
  BiCheckShield,
  BiLoaderAlt,
  BiDevices,
  BiLaptop,
  BiLogOutCircle,
  BiLogoGithub,
  BiLogoLinkedin,
  BiShieldQuarter,
  BiImage,
  BiInfoCircle,
} from 'react-icons/bi';

export default function DeveloperSettingsPage() {
  const { refetchUser, setUser } = useContext(Context) || {};
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    bio: '',
    github_profile: '',
    linkedin_profile: '',
    avatar_url: '',
    role: '',
    role_name: '',
    is_active: true,
    email_verified: false,
    two_factor_enabled: false,
    created_at: null,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [sessionsList, setSessionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [feedbackType, setFeedbackType] = useState('success');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/profile');
      const data = await res.json();
      if (data.success && data.developer) {
        const d = data.developer;
        setProfile({
          name: d.name || '',
          email: d.email || '',
          phone: d.phone || '',
          designation: d.designation || '',
          bio: d.bio || '',
          github_profile: d.github_profile || '',
          linkedin_profile: d.linkedin_profile || '',
          avatar_url: d.avatar_url || '',
          role: d.role || '',
          role_name: d.role_name || d.role || '',
          is_active: d.is_active !== false,
          email_verified: Boolean(d.email_verified),
          two_factor_enabled: Boolean(d.two_factor_enabled),
          created_at: d.created_at,
        });
        setSessionsList(data.sessionsList || []);
      }
    } catch (err) {
      console.error('Failed to load profile for settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const showNotification = (msg, type = 'success') => {
    setFeedback(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedback(null), 5000);
  };

  // 1. Update Profile Info
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch('/api/marketing/developer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          designation: profile.designation.trim(),
          bio: profile.bio.trim(),
          github_profile: profile.github_profile.trim(),
          linkedin_profile: profile.linkedin_profile.trim(),
          avatar_url: profile.avatar_url.trim(),
          two_factor_enabled: profile.two_factor_enabled,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (setUser && data.user) {
          setUser(data.user);
        } else if (refetchUser) {
          refetchUser();
        }

        showNotification('Profile details updated successfully!');
      } else {
        showNotification(data.error || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Network error updating profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      showNotification('Current password is required to update credentials.', 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('New password and confirmation do not match.', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showNotification('New password must be at least 6 characters long.', 'error');
      return;
    }

    setSavingSecurity(true);

    try {
      const res = await fetch('/api/marketing/developer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        showNotification('Account password updated successfully!');
      } else {
        showNotification(data.error || 'Failed to update password.', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Network error updating password.', 'error');
    } finally {
      setSavingSecurity(false);
    }
  };

  // 3. Revoke Session(s)
  const handleRevokeSession = async (sessionId = null, revokeOthers = false) => {
    try {
      setRevokingSessionId(revokeOthers ? 'others' : sessionId);
      const url = revokeOthers
        ? '/api/marketing/developer/profile?revokeOthers=true'
        : `/api/marketing/developer/profile?sessionId=${sessionId}`;

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Session revoked successfully.');
        fetchProfile();
      } else {
        showNotification(data.error || 'Failed to revoke session.', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Error revoking session.', 'error');
    } finally {
      setRevokingSessionId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-6xl mx-auto pb-12">
        <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl" />
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-fade-in ${
            feedbackType === 'error'
              ? 'bg-rose-900/95 text-rose-100 border-rose-700'
              : 'bg-slate-900/95 text-white border-slate-700'
          }`}
        >
          {feedbackType === 'error' ? (
            <BiXCircle className="text-rose-400 text-base shrink-0" />
          ) : (
            <BiCheckCircle className="text-emerald-400 text-base shrink-0" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Developer Settings &amp; Preferences
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              Account Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Configure personal information, authentication credentials, connected devices, and privacy.
          </p>
        </div>

        <Link
          href="/developer/profile"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors shrink-0"
        >
          <BiArrowBack className="text-base" />
          <span>View Profile</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Profile Information Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-2xl bg-secondary/10 text-secondary">
              <BiUser className="text-2xl" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Profile Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update your identity, contact details, and social links.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Your Full Name"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-secondary transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Job Designation
                </label>
                <div className="relative">
                  <BiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="text"
                    value={profile.designation}
                    onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                    placeholder="e.g. Lead Software Engineer"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-secondary transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="your.email@company.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-secondary transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <BiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-secondary transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  GitHub Profile Handle / URL
                </label>
                <div className="relative">
                  <BiLogoGithub className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="text"
                    value={profile.github_profile}
                    onChange={(e) => setProfile({ ...profile, github_profile: e.target.value })}
                    placeholder="https://github.com/username"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-secondary transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  LinkedIn Profile URL
                </label>
                <div className="relative">
                  <BiLogoLinkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="text"
                    value={profile.linkedin_profile}
                    onChange={(e) => setProfile({ ...profile, linkedin_profile: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-secondary transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Avatar Image URL
              </label>
              <div className="relative">
                <BiImage className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                <input
                  type="url"
                  value={profile.avatar_url}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-secondary transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Professional Bio &amp; Notes
              </label>
              <textarea
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Write a brief professional summary..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-secondary transition-all font-medium"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {savingProfile ? <BiLoaderAlt className="animate-spin text-base" /> : <BiSave className="text-base" />}
                <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Security Credentials & Sessions */}
        <div className="space-y-6">
          {/* Security & Password Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <BiLockAlt className="text-2xl" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Security &amp; Credentials
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update your secret login password and authentication keys.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BiKey className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-indigo-600 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password <span className="text-rose-500">*</span> (min 6 characters)
                </label>
                <div className="relative">
                  <BiLockAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-indigo-600 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BiLockAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-indigo-600 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSecurity}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingSecurity ? <BiLoaderAlt className="animate-spin text-base" /> : <BiCheckShield className="text-base" />}
                  <span>{savingSecurity ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Sessions & Connected Devices Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <BiDevices className="text-2xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Active Connected Sessions
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage logged-in devices and revoke unauthorized access.
                  </p>
                </div>
              </div>

              {sessionsList.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRevokeSession(null, true)}
                  disabled={revokingSessionId === 'others'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  {revokingSessionId === 'others' ? <BiLoaderAlt className="animate-spin text-sm" /> : <BiLogOutCircle className="text-sm" />}
                  <span>Revoke Other Sessions</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {sessionsList.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-2xl border transition-colors flex items-center justify-between text-xs ${
                    session.is_current
                      ? 'border-secondary/40 bg-secondary/5 dark:bg-secondary/10'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        session.is_current ? 'bg-secondary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <BiLaptop className="text-base" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {session.is_current ? 'Current Device' : 'Authorized Session'}
                        </span>
                        {session.is_current && (
                          <span className="px-1.5 py-0.5 rounded bg-secondary text-white text-[9px] font-bold uppercase">
                            This
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {session.ip_address || '127.0.0.1'}
                      </div>
                    </div>
                  </div>

                  {!session.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session.id, false)}
                      disabled={revokingSessionId === session.id}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {revokingSessionId === session.id ? <BiLoaderAlt className="animate-spin text-xs" /> : 'Revoke'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Account Status Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-2">
              <div className="flex items-center gap-2">
                <BiShieldQuarter className="text-xl text-slate-400" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-white capitalize">
                    {profile.role_name || profile.role || 'Developer'}
                  </span>
                  <p className="text-[10px] text-slate-400">Governance role is locked to superadmin policy.</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                  profile.email_verified
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {profile.email_verified ? 'Verified Email' : 'Pending Verification'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
