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
    bio: '',
    github_profile: '',
    linkedin_profile: '',
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
  const [profileOtpRequired, setProfileOtpRequired] = useState(false);
  const [profileOtpCode, setProfileOtpCode] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);
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
          bio: d.bio || '',
          github_profile: d.github_profile || '',
          linkedin_profile: d.linkedin_profile || '',
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch('/api/marketing/developer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: (profile.name || '').trim(),
          email: (profile.email || '').trim(),
          phone: (profile.phone || '').trim(),
          bio: (profile.bio || '').trim(),
          github_profile: (profile.github_profile || '').trim(),
          linkedin_profile: (profile.linkedin_profile || '').trim(),
          two_factor_enabled: Boolean(profile.two_factor_enabled),
          otpCode: profileOtpRequired ? (profileOtpCode || '').trim() : undefined,
        }),
      });

      if (res.status === 401) {
        router.replace('/developer-auth/login');
        return;
      }

      const data = await res.json();
      if (data.otpRequired) {
        setProfileOtpRequired(true);
        showNotification(data.message || 'Verification code sent to your email to confirm contact update.', 'info');
      } else if (data.success) {
        setProfileOtpRequired(false);
        setProfileOtpCode('');
        if (data.developer) {
          const d = data.developer;
          setProfile((prev) => ({
            ...prev,
            name: d.name || '',
            email: d.email || '',
            phone: d.phone || '',
            bio: d.bio || '',
            github_profile: d.github_profile || '',
            linkedin_profile: d.linkedin_profile || '',
            role: d.role || prev.role,
            role_name: d.role_name || prev.role_name,
            is_active: d.is_active !== false,
            email_verified: Boolean(d.email_verified),
            two_factor_enabled: Boolean(d.two_factor_enabled),
          }));
        }
        if (setUser && data.user) {
          setUser(data.user);
        } else if (refetchUser) {
          refetchUser();
        }
        await fetchProfile();
        showNotification(data.message || 'Profile details updated successfully!');
      } else {
        showNotification(data.error || data.message || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Network error updating profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResendOtp = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/marketing/developer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: (profile.name || '').trim(),
          email: (profile.email || '').trim(),
          phone: (profile.phone || '').trim(),
          bio: (profile.bio || '').trim(),
          github_profile: (profile.github_profile || '').trim(),
          linkedin_profile: (profile.linkedin_profile || '').trim(),
          two_factor_enabled: Boolean(profile.two_factor_enabled),
        }),
      });

      const data = await res.json();
      if (data.otpRequired) {
        showNotification(data.message || 'A fresh verification code has been dispatched to your email.', 'info');
      } else if (data.error) {
        showNotification(data.error, 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Failed to resend verification code.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

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

  const handleToggle2FA = async () => {
    try {
      setToggling2fa(true);
      const nextState = !profile.two_factor_enabled;
      const res = await fetch('/api/marketing/developer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          two_factor_enabled: nextState,
        }),
      });

      if (res.status === 401) {
        router.replace('/developer-auth/login');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setProfile((prev) => ({ ...prev, two_factor_enabled: nextState }));
        if (setUser && data.user) {
          setUser(data.user);
        } else if (refetchUser) {
          refetchUser();
        }
        showNotification(nextState ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.');
      } else {
        showNotification(data.error || 'Failed to update two-factor settings.', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Network error updating two-factor settings.', 'error');
    } finally {
      setToggling2fa(false);
    }
  };

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
              <p className="text-[11px] text-slate-500 font-normal">
                Updating your email address requires a 6-digit OTP verification code sent to your registered email.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Phone</label>
              <input
                type="text"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
              />
              <p className="text-[11px] text-slate-500 font-normal">
                Updating your phone number requires a 6-digit OTP verification code sent to your registered email.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">GitHub Profile URL</label>
                <input
                  type="text"
                  value={profile.github_profile}
                  onChange={(e) => setProfile({ ...profile, github_profile: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">LinkedIn Profile URL</label>
                <input
                  type="text"
                  value={profile.linkedin_profile}
                  onChange={(e) => setProfile({ ...profile, linkedin_profile: e.target.value })}
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            {profileOtpRequired ? (
              <div className="p-3.5 rounded border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 text-xs space-y-2.5">
                <p className="font-medium">Verification Code Sent</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  A 6-digit security verification code has been dispatched to your registered email ({profile.email}) to confirm updating your contact details.
                </p>
                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Enter 6-Digit OTP Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={profileOtpCode}
                    onChange={(e) => setProfileOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-center text-base tracking-widest font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingProfile || profileOtpCode.length < 6}
                    className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                  >
                    {savingProfile ? 'Verifying...' : 'Verify OTP & Save Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={savingProfile}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOtpRequired(false);
                      setProfileOtpCode('');
                    }}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="space-y-4">
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

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                  Two-Factor Authentication (2FA)
                </h2>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Protect your developer console by requiring a one-time verification code sent to your registered email on login.
                </p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                profile.two_factor_enabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {profile.two_factor_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-700 dark:text-slate-300">
                Email verification code upon login
              </span>
              <button
                type="button"
                onClick={handleToggle2FA}
                disabled={toggling2fa}
                className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 ${
                  profile.two_factor_enabled
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/50'
                    : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
                }`}
              >
                {toggling2fa ? 'Updating...' : profile.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            </div>
          </div>

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
