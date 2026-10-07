'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';

function parseUserAgent(ua) {
  if (!ua || ua === 'Unknown') return { browser: 'Web Browser', os: 'Device', isMobile: false, label: 'Web Browser' };
  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  let os = '';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
  const label = os ? `${browser} on ${os}` : browser;

  return { browser, os, isMobile, label };
}

function formatDate(isoStr) {
  if (!isoStr) return 'Active just now';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return 'Recent';
  }
}

export default function DeveloperSettingsPage() {
  const router = useRouter();
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
      if (res.status === 401) {
        router.replace('/developer-auth/login');
        return;
      }
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

      if (res.status === 401) {
        router.replace('/developer-auth/login');
        return;
      }

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

      if (res.status === 401) {
        router.replace('/developer-auth/login');
        return;
      }

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
      if (res.status === 401) {
        router.replace('/developer-auth/login');
        return;
      }

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
    return <LoadingScreen fullScreen={false} label="Loading settings..." />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded border text-xs font-normal flex items-center justify-between ${
            feedbackType === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-medium text-slate-900 dark:text-white">Account Settings</h1>
          <p className="text-xs text-slate-500 font-normal">
            Manage your personal profile details, authentication password, and active devices.
          </p>
        </div>

        <Link
          href="/developer/profile"
          className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal shrink-0"
        >
          View Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Profile Information Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            Profile Information
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Full Name</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Phone</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Designation</label>
                <input
                  type="text"
                  value={profile.designation}
                  onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                  placeholder="Software Engineer"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Avatar Image URL</label>
              <input
                type="url"
                value={profile.avatar_url}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">GitHub Profile URL</label>
                <input
                  type="url"
                  value={profile.github_profile}
                  onChange={(e) => setProfile({ ...profile, github_profile: e.target.value })}
                  placeholder="https://github.com/..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={profile.linkedin_profile}
                  onChange={(e) => setProfile({ ...profile, linkedin_profile: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Bio</label>
              <textarea
                rows={2}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Brief professional summary..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Security (Password + Sessions) */}
        <div className="space-y-4">
          {/* Change Password Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4">
            <h2 className="text-sm font-medium text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              Change Password
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSecurity}
                  className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {savingSecurity ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Connected Sessions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                    Logged-in Sessions &amp; Devices
                  </h2>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {sessionsList.length} Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Devices currently authenticated to your developer console. You can log out sessions on devices you don&apos;t recognize.
                </p>
              </div>

              {sessionsList.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRevokeSession(null, true)}
                  disabled={revokingSessionId === 'others'}
                  className="inline-flex items-center px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-normal transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <span>{revokingSessionId === 'others' ? 'Logging out...' : 'Log Out Other Devices'}</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {sessionsList.length === 0 ? (
                <p className="text-xs text-slate-400 font-normal py-2 text-center">No active sessions found.</p>
              ) : (
                sessionsList.map((sess) => {
                  const uaInfo = parseUserAgent(sess.user_agent);

                  return (
                    <div
                      key={sess.id}
                      className={`p-3 rounded border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                        sess.is_current
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 shrink-0 self-start mt-0.5">
                          {uaInfo.isMobile ? 'Mobile' : 'Desktop'}
                        </span>

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-slate-900 dark:text-white truncate">
                              {uaInfo.label}
                            </span>
                            {sess.is_current && (
                              <span className="inline-flex items-center text-[10px] font-normal px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                This Device
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
                              {sess.ip_address || '127.0.0.1'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-normal">
                            <span>Last active: {formatDate(sess.last_active_at || sess.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {sess.is_current ? (
                          <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400">
                            Current Session
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={revokingSessionId === sess.id}
                            onClick={() => handleRevokeSession(sess.id)}
                            className="inline-flex items-center px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-normal transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <span>{revokingSessionId === sess.id ? 'Logging out...' : 'Log Out'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
