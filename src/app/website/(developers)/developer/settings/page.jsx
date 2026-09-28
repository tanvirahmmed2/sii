'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from '@/components/helper/Context';
import {
  BiUser,
  BiEnvelope,
  BiLockAlt,
  BiKey,
  BiCheckCircle,
  BiXCircle,
  BiArrowBack,
  BiSave,
  BiCheckShield,
  BiLoaderAlt,
} from 'react-icons/bi';

export default function DeveloperSettingsPage() {
  const { refetchUser, setUser } = useContext(Context) || {};
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    two_factor_enabled: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackType, setFeedbackType] = useState('success');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/profile');
      const data = await res.json();
      if (data.success && data.developer) {
        setProfile({
          name: data.developer.name || '',
          email: data.developer.email || '',
          role: data.developer.role || '',
          two_factor_enabled: Boolean(data.developer.two_factor_enabled),
        });
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

  // 1. Update Profile Info (Name, Email, 2FA)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch('/api/developer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim(),
          two_factor_enabled: profile.two_factor_enabled,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProfile((prev) => ({
          ...prev,
          name: data.developer.name,
          email: data.developer.email,
          two_factor_enabled: Boolean(data.developer.two_factor_enabled),
        }));

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
      const res = await fetch('/api/developer/profile', {
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl" />
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
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
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Account Settings
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              Settings
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your developer personal profile, security credentials, and authentication preferences.
          </p>
        </div>

        <Link
          href="/developer/profile"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
        >
          <BiArrowBack className="text-base" />
          <span>View Profile</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-2xl bg-secondary/10 text-secondary">
              <BiUser className="text-2xl" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Profile Information</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your name, email address, and 2FA.</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Platform Role</label>
              <input
                type="text"
                disabled
                value={profile.role?.toUpperCase() || 'DEVELOPER'}
                className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed uppercase"
              />
              <p className="text-[10px] text-slate-400 mt-1">Role assignments can only be changed by Super Administrators.</p>
            </div>

            {/* 2FA Toggle */}
            <div className="pt-2">
              <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Require email code during login verification</div>
                </div>
                <input
                  type="checkbox"
                  checked={profile.two_factor_enabled}
                  onChange={(e) => setProfile({ ...profile, two_factor_enabled: e.target.checked })}
                  className="w-4 h-4 text-secondary rounded border-slate-300 dark:border-slate-600 focus:ring-secondary cursor-pointer"
                />
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {savingProfile ? <BiLoaderAlt className="animate-spin text-base" /> : <BiSave className="text-base" />}
                <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <BiLockAlt className="text-2xl" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Security &amp; Password</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your secret credentials for login.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
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

            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300">
              <span className="font-bold">Security Notice:</span> Updating your password will require signing in with your new credentials on your next session.
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingSecurity}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {savingSecurity ? <BiLoaderAlt className="animate-spin text-base" /> : <BiCheckShield className="text-base" />}
                <span>{savingSecurity ? 'Updating Password...' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
