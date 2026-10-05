'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';

export default function DeveloperProfilePage() {
  const { refetchUser, setUser } = useContext(Context) || {};
  const [profile, setProfile] = useState(null);
  const [activeSessions, setActiveSessions] = useState(1);
  const [sessionsList, setSessionsList] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <div className="p-4 text-xs font-normal text-slate-500">
        Loading profile data...
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Toast Notification */}
      {feedback.message && (
        <div
          className={`p-3 rounded border text-xs font-normal flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="w-14 h-14 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center text-sm font-medium border border-slate-200 dark:border-slate-700 shrink-0">
              {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'DV'}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-medium text-slate-900 dark:text-white">
                {profile?.name || 'Developer'}
              </h1>
              <span className="text-[10px] font-normal uppercase px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                {profile?.role_name || profile?.role || 'Developer'}
              </span>
              <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
                {profile?.email_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">{profile?.designation || 'Software Engineer'}</p>
            <p className="text-xs text-slate-400 font-mono font-normal">{profile?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenEdit}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium cursor-pointer"
          >
            Edit Profile
          </button>
          <Link
            href="/developer/settings"
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal"
          >
            Account Settings
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
          <div className="text-xs font-normal text-slate-500">Active Sessions</div>
          <div className="text-xl font-medium text-slate-900 dark:text-white mt-1">{activeSessions}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
          <div className="text-xs font-normal text-slate-500">Assigned Tickets</div>
          <div className="text-xl font-medium text-slate-900 dark:text-white mt-1">
            {profile?.stats?.assigned_tickets ?? 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
          <div className="text-xs font-normal text-slate-500">Ticket Replies</div>
          <div className="text-xl font-medium text-slate-900 dark:text-white mt-1">
            {profile?.stats?.ticket_replies_count ?? 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
          <div className="text-xs font-normal text-slate-500">Permissions</div>
          <div className="text-xl font-medium text-slate-900 dark:text-white mt-1">
            {profile?.permissions?.length ?? 0}
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            Account Information
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Full Name</span>
              <span className="font-normal text-slate-900 dark:text-white">{profile?.name || '—'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Email Address</span>
              <span className="font-mono text-slate-900 dark:text-white">{profile?.email || '—'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Phone</span>
              <span className="font-normal text-slate-900 dark:text-white">{profile?.phone || 'Not set'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Designation</span>
              <span className="font-normal text-slate-900 dark:text-white">{profile?.designation || 'Software Engineer'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">GitHub</span>
              <span className="font-normal text-slate-900 dark:text-white">{profile?.github_profile || 'Not linked'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">LinkedIn</span>
              <span className="font-normal text-slate-900 dark:text-white">{profile?.linkedin_profile || 'Not linked'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Member Since</span>
              <span className="font-normal text-slate-900 dark:text-white">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500">Last Login</span>
              <span className="font-normal text-slate-900 dark:text-white">
                {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : '—'}
              </span>
            </div>

            {profile?.bio && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">Biography</span>
                <p className="text-slate-700 dark:text-slate-300 font-normal leading-relaxed">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sessions & Audit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">
              Active Sessions ({sessionsList.length})
            </h2>
            {sessionsList.length > 1 && (
              <button
                type="button"
                onClick={() => handleRevokeSession(null, true)}
                disabled={revokingSessionId === 'others'}
                className="text-xs font-normal text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50 cursor-pointer"
              >
                {revokingSessionId === 'others' ? 'Revoking...' : 'Revoke Other Sessions'}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {sessionsList.length === 0 ? (
              <p className="text-xs text-slate-400 font-normal">No active sessions found.</p>
            ) : (
              sessionsList.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {sess.ip_address || '127.0.0.1'}
                      </span>
                      {sess.is_current && (
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal line-clamp-1">
                      {sess.user_agent || 'Unknown Client'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      Last active: {sess.last_active_at ? new Date(sess.last_active_at).toLocaleString() : 'Just now'}
                    </p>
                  </div>

                  {!sess.is_current && (
                    <button
                      type="button"
                      disabled={revokingSessionId === sess.id}
                      onClick={() => handleRevokeSession(sess.id)}
                      className="text-xs font-normal text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {revokingSessionId === sess.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Recent Logins */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300">Recent Login Activity</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-normal">
                    <th className="py-1.5">Status</th>
                    <th className="py-1.5">IP Address</th>
                    <th className="py-1.5">Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                  {recentLogins.slice(0, 5).map((log) => (
                    <tr key={log.id}>
                      <td className="py-1.5">
                        <span
                          className={
                            log.status === 'Success'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-1.5 font-mono">{log.ip_address || '—'}</td>
                      <td className="py-1.5">{log.login_time ? new Date(log.login_time).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 max-w-lg w-full p-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Edit Profile Details</h3>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="text-xs font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            {modalFeedback.message && (
              <div
                className={`p-2.5 rounded text-xs font-normal ${
                  modalFeedback.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {modalFeedback.message}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Designation</label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    placeholder="Staff Engineer"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Avatar Image URL</label>
                <input
                  type="url"
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">GitHub Profile URL</label>
                  <input
                    type="url"
                    value={editForm.github_profile}
                    onChange={(e) => setEditForm({ ...editForm, github_profile: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={editForm.linkedin_profile}
                    onChange={(e) => setEditForm({ ...editForm, linkedin_profile: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Bio</label>
                <textarea
                  rows={2}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell your team about yourself..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              {/* Password Toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="inline-flex items-center gap-2 text-xs font-normal text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.changePassword}
                    onChange={(e) => setEditForm({ ...editForm, changePassword: e.target.checked })}
                    className="rounded"
                  />
                  <span>Change Password</span>
                </label>

                {editForm.changePassword && (
                  <div className="mt-3 space-y-3 p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div className="space-y-1">
                      <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Current Password</label>
                      <input
                        type="password"
                        required={editForm.changePassword}
                        value={editForm.currentPassword}
                        onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">New Password</label>
                        <input
                          type="password"
                          required={editForm.changePassword}
                          value={editForm.newPassword}
                          onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                          placeholder="Min 6 chars"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Confirm Password</label>
                        <input
                          type="password"
                          required={editForm.changePassword}
                          value={editForm.confirmPassword}
                          onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                          placeholder="Repeat new password"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
