'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from '@/components/helper/Context';
import {
  BiUser,
  BiCheckShield,
  BiShieldQuarter,
  BiCheckCircle,
  BiXCircle,
  BiEnvelope,
  BiKey,
  BiDevices,
  BiEdit,
  BiRefresh,
  BiCopy,
  BiCheck,
  BiX,
  BiLoaderAlt,
  BiLockAlt,
  BiCog,
} from 'react-icons/bi';

export default function DeveloperProfilePage() {
  const { user, refetchUser, setUser } = useContext(Context) || {};
  const [profile, setProfile] = useState(null);
  const [activeSessions, setActiveSessions] = useState(1);
  const [recentLogins, setRecentLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Edit Profile Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    two_factor_enabled: false,
    changePassword: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [modalFeedback, setModalFeedback] = useState({ type: '', message: '' });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/profile');
      const data = await res.json();
      if (data.success && data.developer) {
        setProfile(data.developer);
        setActiveSessions(data.activeSessions || 1);
        setRecentLogins(data.recentLogins || []);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleOpenEdit = () => {
    if (!profile) return;
    setEditForm({
      name: profile.name || '',
      email: profile.email || '',
      two_factor_enabled: Boolean(profile.two_factor_enabled),
      changePassword: false,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setModalFeedback({ type: '', message: '' });
    setEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setModalFeedback({ type: '', message: '' });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setModalFeedback({ type: '', message: '' });

    if (!editForm.name.trim()) {
      setModalFeedback({ type: 'error', message: 'Full name cannot be empty.' });
      return;
    }

    if (!editForm.email.trim()) {
      setModalFeedback({ type: 'error', message: 'Email address cannot be empty.' });
      return;
    }

    if (editForm.changePassword) {
      if (!editForm.currentPassword) {
        setModalFeedback({ type: 'error', message: 'Current password is required to change password.' });
        return;
      }
      if (editForm.newPassword.length < 6) {
        setModalFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
        return;
      }
      if (editForm.newPassword !== editForm.confirmPassword) {
        setModalFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        two_factor_enabled: editForm.two_factor_enabled,
      };

      if (editForm.changePassword) {
        payload.currentPassword = editForm.currentPassword;
        payload.newPassword = editForm.newPassword;
      }

      const res = await fetch('/api/developer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.developer) {
        setProfile(data.developer);
        if (setUser && data.user) {
          setUser(data.user);
        } else if (refetchUser) {
          refetchUser();
        }

        setModalFeedback({
          type: 'success',
          message: 'Profile updated successfully!',
        });

        setTimeout(() => {
          handleCloseEdit();
        }, 800);
      } else {
        setModalFeedback({
          type: 'error',
          message: data.error || 'Failed to update profile.',
        });
      }
    } catch (err) {
      setModalFeedback({
        type: 'error',
        message: err.message || 'Network error updating profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyEmail = () => {
    if (profile?.email) {
      navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleBadgeStyle = (role) => {
    const r = (role || '').toLowerCase();
    switch (r) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'manager':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'developer':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'support':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'marketer':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DV';

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6" />
          <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-br from-secondary/10 via-primary/5 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex items-center gap-5 z-10">
          {/* Avatar Initial */}
          <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-secondary via-indigo-600 to-primary text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0 ring-4 ring-slate-50 dark:ring-slate-800">
            {initials}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {profile?.name || 'Developer'}
              </h1>

              {/* Role badge */}
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border ${getRoleBadgeStyle(
                  profile?.role
                )}`}
              >
                {profile?.role || 'Developer'}
              </span>

              {/* Verified badge */}
              {profile?.is_verified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <BiCheckCircle className="text-xs" />
                  <span>Verified</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <BiEnvelope className="text-slate-400 text-sm" />
              <span>{profile?.email}</span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="p-1 hover:text-slate-800 dark:hover:text-white text-slate-400 transition-colors cursor-pointer"
                title="Copy Email"
              >
                {copied ? <BiCheck className="text-emerald-600 dark:text-emerald-400" /> : <BiCopy />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <button
            type="button"
            onClick={fetchProfile}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh profile data"
          >
            <BiRefresh className={`text-xl ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Quick Edit Profile Button */}
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <BiEdit className="text-base" />
            <span>Edit Profile</span>
          </button>

          <Link
            href="/developer/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <BiCog className="text-base" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Platform Role</span>
            <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
              <BiShieldQuarter className="text-xl" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white capitalize">{profile?.role || 'Developer'}</div>
          <p className="text-[11px] text-slate-400 mt-1">Access permission level</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Account Status</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <BiCheckCircle className="text-xl" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {profile?.is_active !== false ? 'Active' : 'Deactivated'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ready for administrative tasks</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Two-Factor 2FA</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <BiKey className="text-xl" />
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {profile?.two_factor_enabled ? 'Enabled' : 'Disabled'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {profile?.two_factor_enabled ? 'Two-step verification active' : 'Standard credentials only'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Sessions</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <BiDevices className="text-xl" />
            </div>
          </div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{activeSessions} Device{activeSessions === 1 ? '' : 's'}</div>
          <p className="text-[11px] text-slate-400 mt-1">Authenticated tokens</p>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Details Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-secondary/10 text-secondary">
                <BiUser className="text-2xl" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Personal &amp; Account Details</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Overview of your registered operator credentials.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
            >
              <BiEdit className="text-sm" />
              <span>Edit</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Developer ID</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{profile?.id}</span>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Full Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{profile?.name}</span>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{profile?.email}</span>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Governance Role</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border ${getRoleBadgeStyle(profile?.role)}`}>
                {profile?.role}
              </span>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Email Verification</span>
              <span className={`inline-flex items-center gap-1 font-bold ${profile?.is_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {profile?.is_verified ? <BiCheckCircle /> : <BiXCircle />}
                <span>{profile?.is_verified ? 'Verified Email' : 'Pending Verification'}</span>
              </span>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Registration Date</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleString() : '—'}
              </span>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Last Profile Update</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Activity Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <BiCheckShield className="text-2xl" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Security &amp; Device Activity</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Audit logs and access metadata for this account.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Last Sign In</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">
                {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : 'Never logged in'}
              </span>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Last IP Address</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {profile?.last_login_ip || '127.0.0.1'}
              </span>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Two-Factor Authentication (2FA)</span>
              <span className={`font-bold ${profile?.two_factor_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {profile?.two_factor_enabled ? 'Protected' : 'Not configured'}
              </span>
            </div>
          </div>

          {/* Recent Login History */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Recent Login Activity</h3>
            {recentLogins.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No recent login activity logs found.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {recentLogins.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          entry.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">{entry.status}</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px]">{entry.ip_address || '—'}</span>
                    </div>
                    <span className="text-slate-400">
                      {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center text-lg">
                  <BiEdit />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Update Developer Profile
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {modalFeedback.message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {modalFeedback.type === 'success' ? (
                  <BiCheckCircle className="text-base shrink-0" />
                ) : (
                  <BiXCircle className="text-base shrink-0" />
                )}
                <span>{modalFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Your Full Name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="developer@platform.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
                  />
                </div>
              </div>

              {/* 2FA Toggle */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Two-Factor Authentication</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Require 2FA verification code on account login.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, two_factor_enabled: !editForm.two_factor_enabled })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    editForm.two_factor_enabled ? 'bg-secondary' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      editForm.two_factor_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Password toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, changePassword: !editForm.changePassword })}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline cursor-pointer"
                >
                  <BiKey className="text-sm" />
                  <span>{editForm.changePassword ? 'Cancel Password Change' : 'Change Account Password'}</span>
                </button>

                {editForm.changePassword && (
                  <div className="mt-3 space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Current Password <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        required={editForm.changePassword}
                        value={editForm.currentPassword}
                        onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        New Password <span className="text-rose-500">*</span> (min 6 characters)
                      </label>
                      <input
                        type="password"
                        required={editForm.changePassword}
                        value={editForm.newPassword}
                        onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm New Password <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        required={editForm.changePassword}
                        value={editForm.confirmPassword}
                        onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {saving && <BiLoaderAlt className="animate-spin text-sm" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
