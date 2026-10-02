'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import {
  BiUser,
  BiEnvelope,
  BiPhone,
  BiBriefcase,
  BiCheckShield,
  BiShieldQuarter,
  BiCheckCircle,
  BiXCircle,
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
  BiGlobe,
  BiCalendar,
  BiTime,
  BiLayer,
  BiSupport,
  BiLogOutCircle,
  BiLogoGithub,
  BiLogoLinkedin,
  BiLaptop,
} from 'react-icons/bi';

export default function DeveloperProfilePage() {
  const { refetchUser, setUser } = useContext(Context) || {};
  const [profile, setProfile] = useState(null);
  const [activeSessions, setActiveSessions] = useState(1);
  const [sessionsList, setSessionsList] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState('');
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Edit Profile Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    bio: '',
    github_profile: '',
    linkedin_profile: '',
    avatar_url: '',
    changePassword: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [modalFeedback, setModalFeedback] = useState({ type: '', message: '' });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/profile');
      const data = await res.json();
      if (data.success && data.developer) {
        setProfile(data.developer);
        setActiveSessions(data.activeSessions || 1);
        setSessionsList(data.sessionsList || []);
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

  const showNotification = (message, type = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

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

  const handleOpenEdit = () => {
    if (!profile) return;
    setEditForm({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      designation: profile.designation || '',
      bio: profile.bio || '',
      github_profile: profile.github_profile || '',
      linkedin_profile: profile.linkedin_profile || '',
      avatar_url: profile.avatar_url || '',
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
        phone: editForm.phone.trim(),
        designation: editForm.designation.trim(),
        bio: editForm.bio.trim(),
        github_profile: editForm.github_profile.trim(),
        linkedin_profile: editForm.linkedin_profile.trim(),
        avatar_url: editForm.avatar_url.trim(),
      };

      if (editForm.changePassword) {
        payload.currentPassword = editForm.currentPassword;
        payload.newPassword = editForm.newPassword;
      }

      const res = await fetch('/api/marketing/developer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.developer) {
        setProfile((prev) => ({
          ...prev,
          ...data.developer,
        }));
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
          fetchProfile();
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

  const getRoleBadgeStyle = (role) => {
    const r = (role || '').toLowerCase();
    switch (r) {
      case 'admin':
      case 'superadmin':
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
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DV';

  // Group permissions by module if available
  const permissionsByModule = (profile?.rolePermissions || []).reduce((acc, perm) => {
    const mod = perm.module_name || 'General';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6" />
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {feedback.message && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-fade-in ${
            feedback.type === 'error'
              ? 'bg-rose-900/95 text-rose-100 border-rose-700'
              : 'bg-slate-900/95 text-white border-slate-700'
          }`}
        >
          {feedback.type === 'error' ? (
            <BiXCircle className="text-rose-400 text-base shrink-0" />
          ) : (
            <BiCheckCircle className="text-emerald-400 text-base shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-secondary/15 via-primary/10 to-transparent rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 z-10">
          {/* Avatar display: image or initials */}
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow-md shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-linear-to-br from-secondary via-indigo-600 to-primary text-white flex items-center justify-center text-3xl font-extrabold shadow-md shrink-0 ring-4 ring-slate-50 dark:ring-slate-800">
              {initials}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {profile?.name || 'Developer'}
              </h1>

              {/* Role badge */}
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${getRoleBadgeStyle(
                  profile?.role
                )}`}
              >
                {profile?.role_name || profile?.role || 'Developer'}
              </span>

              {/* Verified badge */}
              {profile?.email_verified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <BiCheckCircle className="text-sm" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <BiXCircle className="text-sm" />
                  <span>Pending Verification</span>
                </span>
              )}

              {/* Active status */}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  profile?.is_active !== false
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {profile?.is_active !== false ? 'Active Account' : 'Suspended'}
              </span>
            </div>

            {/* Designation & Contact Row */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <BiBriefcase className="text-secondary text-sm" />
                <span>{profile?.designation || 'Software Engineer'}</span>
              </span>

              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <BiEnvelope className="text-slate-400" />
                <span>{profile?.email}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(profile?.email, 'email')}
                  className="p-1 hover:text-slate-900 dark:hover:text-white text-slate-400 transition-colors cursor-pointer"
                  title="Copy Email"
                >
                  {copiedField === 'email' ? <BiCheck className="text-emerald-500 text-sm" /> : <BiCopy className="text-sm" />}
                </button>
              </div>

              {profile?.phone && (
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <BiPhone className="text-slate-400" />
                  <span>{profile.phone}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(profile.phone, 'phone')}
                    className="p-1 hover:text-slate-900 dark:hover:text-white text-slate-400 transition-colors cursor-pointer"
                    title="Copy Phone"
                  >
                    {copiedField === 'phone' ? <BiCheck className="text-emerald-500 text-sm" /> : <BiCopy className="text-sm" />}
                  </button>
                </div>
              )}
            </div>

            {/* Social links row */}
            <div className="flex items-center gap-3 pt-1">
              {profile?.github_profile && (
                <a
                  href={profile.github_profile.startsWith('http') ? profile.github_profile : `https://github.com/${profile.github_profile}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <BiLogoGithub className="text-base" />
                  <span>GitHub</span>
                </a>
              )}

              {profile?.linkedin_profile && (
                <a
                  href={profile.linkedin_profile.startsWith('http') ? profile.linkedin_profile : `https://linkedin.com/in/${profile.linkedin_profile}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  <BiLogoLinkedin className="text-base" />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 z-10 self-start md:self-center">
          <button
            type="button"
            onClick={fetchProfile}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh profile data"
          >
            <BiRefresh className={`text-xl ${loading ? 'animate-spin' : ''}`} />
          </button>

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
        {/* Role & Access */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role &amp; Tier</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <BiShieldQuarter className="text-xl" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white capitalize">
            {profile?.role_name || profile?.role || 'Developer'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {profile?.isAdmin ? 'Full Superadmin Clearance' : 'Scoped Module Clearance'}
          </p>
        </div>

        {/* Verification Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Verification</span>
            <div
              className={`p-2 rounded-xl ${
                profile?.email_verified
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              }`}
            >
              {profile?.email_verified ? <BiCheckCircle className="text-xl" /> : <BiXCircle className="text-xl" />}
            </div>
          </div>
          <div
            className={`text-xl font-extrabold ${
              profile?.email_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {profile?.email_verified ? 'Email Verified' : 'Unverified'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {profile?.email_verified ? 'Identity confirmed via activation link' : 'Action required on email'}
          </p>
        </div>

        {/* Active Sessions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Devices</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <BiDevices className="text-xl" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
            {activeSessions} {activeSessions === 1 ? 'Device' : 'Devices'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Authenticated JWT sessions</p>
        </div>

        {/* Operational Stats */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Platform Tasks</span>
            <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
              <BiSupport className="text-xl" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {profile?.stats?.assigned_tickets || 0} Tickets
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {profile?.stats?.ticket_replies_count || 0} customer replies posted
          </p>
        </div>
      </div>

      {/* Main Details Grid: Left (Identity & Governance) + Right (Security, Sessions, Audit) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Personal Identity & Bio */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-secondary/10 text-secondary">
                  <BiUser className="text-2xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Developer Identity &amp; Contact
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Personal specifications and contact details.</p>
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
              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Developer Account ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  #{profile?.id}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Full Legal Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{profile?.name}</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Job Designation</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.designation || 'Software Engineer'}</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{profile?.email}</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Phone Number</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{profile?.phone || 'Not specified'}</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">GitHub Handle</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {profile?.github_profile ? (
                    <a
                      href={profile.github_profile.startsWith('http') ? profile.github_profile : `https://github.com/${profile.github_profile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      <BiLogoGithub className="text-sm" />
                      <span>{profile.github_profile}</span>
                    </a>
                  ) : (
                    'Not connected'
                  )}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">LinkedIn Profile</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {profile?.linkedin_profile ? (
                    <a
                      href={profile.linkedin_profile.startsWith('http') ? profile.linkedin_profile : `https://linkedin.com/in/${profile.linkedin_profile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      <BiLogoLinkedin className="text-sm" />
                      <span>{profile.linkedin_profile}</span>
                    </a>
                  ) : (
                    'Not connected'
                  )}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Account Created</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleString() : '—'}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Last Profile Update</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : '—'}
                </span>
              </div>
            </div>

            {/* Bio Narrative Section */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">
                Professional Bio &amp; Notes
              </h3>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                {profile?.bio || 'No personal bio added yet. Click "Edit Profile" to write a bio.'}
              </div>
            </div>
          </div>

          {/* Role & Permissions Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <BiLayer className="text-2xl" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Assigned Role &amp; Module Permissions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Granular authorization matrix assigned to this developer.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                  {profile?.role_name || profile?.role}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Slug: {profile?.role} (Role ID: #{profile?.role_id || 'N/A'})
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getRoleBadgeStyle(profile?.role)}`}>
                {profile?.role}
              </span>
            </div>

            {/* Granular Permissions List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Accessible Modules ({profile?.permissions?.length || 0})
              </h3>

              {Object.keys(permissionsByModule).length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {Object.entries(permissionsByModule).map(([modName, perms]) => (
                    <div key={modName} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/20">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                        <span>{modName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{perms.length} perms</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map((p, idx) => (
                          <span
                            key={idx}
                            title={p.description || p.permission_key}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                          >
                            {p.permission_name || p.permission_key}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
                  {(profile?.permissions || []).map((perm, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Security, Sessions & Login Audit */}
        <div className="space-y-6">
          {/* Security & Authenticated Sessions Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <BiCheckShield className="text-2xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Security &amp; Active Sessions
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Devices currently signed into this developer profile.
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

            {/* Security Quick Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Last Login Timestamp</span>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : 'Never logged in'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Email Verification Status</span>
                <p
                  className={`font-semibold mt-0.5 ${
                    profile?.email_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {profile?.email_verified ? 'Verified Active' : 'Activation Pending'}
                </p>
              </div>
            </div>

            {/* Active Sessions List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Current Connected Devices ({sessionsList.length})
              </h3>

              {sessionsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No recorded active device sessions.</p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {sessionsList.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3.5 rounded-2xl border transition-colors flex items-center justify-between text-xs ${
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
                          <BiLaptop className="text-lg" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {session.is_current ? 'This Device (Current Session)' : 'Active Session'}
                            </span>
                            {session.is_current && (
                              <span className="px-2 py-0.5 rounded-md bg-secondary text-white text-[9px] font-bold uppercase">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{session.ip_address || '127.0.0.1'}</span>
                            <span>•</span>
                            <span>Active: {session.last_active_at ? new Date(session.last_active_at).toLocaleTimeString() : 'Recently'}</span>
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
              )}
            </div>
          </div>

          {/* Recent Login Audit Trail Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <BiTime className="text-2xl" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Login Activity Audit Log
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive audit trail of recent sign-in attempts.
                </p>
              </div>
            </div>

            {recentLogins.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No recent authentication logs found.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recentLogins.map((entry) => {
                  const isSuccess = (entry.status || '').toUpperCase() === 'SUCCESS';
                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isSuccess ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-rose-500'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {entry.status || (isSuccess ? 'SUCCESS' : 'FAILED')}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                              {entry.ip_address || '—'}
                            </span>
                          </div>
                          {entry.failure_reason && (
                            <p className="text-[10px] text-rose-500 mt-0.5">{entry.failure_reason}</p>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400 font-medium">
                        {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center text-lg">
                  <BiEdit />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Update Developer Profile Information
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    Job Designation
                  </label>
                  <div className="relative">
                    <BiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                    <input
                      type="text"
                      value={editForm.designation}
                      onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                      placeholder="e.g. Lead Full-Stack Engineer"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <BiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GitHub Profile or Handle
                  </label>
                  <div className="relative">
                    <BiLogoGithub className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                    <input
                      type="text"
                      value={editForm.github_profile}
                      onChange={(e) => setEditForm({ ...editForm, github_profile: e.target.value })}
                      placeholder="https://github.com/username"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    LinkedIn Profile or Handle
                  </label>
                  <div className="relative">
                    <BiLogoLinkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                    <input
                      type="text"
                      value={editForm.linkedin_profile}
                      onChange={(e) => setEditForm({ ...editForm, linkedin_profile: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Professional Bio
                </label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Write a brief professional overview..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
                />
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
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
