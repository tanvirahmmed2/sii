'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCreator } from '../layout';
import LoadingScreen from 'src/component/common/LoadingScreen';

function parseUserAgent(ua) {
  if (!ua || ua === 'Unknown') return { browser: 'Browser', os: 'Device', label: 'Web Browser' };
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

  const label = os ? `${browser} on ${os}` : browser;
  return { browser, os, label };
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

export default function CreatorSettingsPage() {
  const router = useRouter();
  const { creator, creatorId, refetch } = useCreator();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactor, setTwoFactor] = useState(Boolean(creator?.two_factor_enabled));

  const [changingPass, setChangingPass] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [tfaMsg, setTfaMsg] = useState('');

  // Active Sessions State
  const [sessionsList, setSessionsList] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [sessionMsg, setSessionMsg] = useState('');
  const [sessionErr, setSessionErr] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      setSessionErr('');
      const res = await fetch(`/api/marketing/creator/sessions?creatorId=${creatorId}`);
      if (res.status === 401) {
        router.replace('/creator/login');
        return;
      }
      const data = await res.json();
      const list = data.sessions || data.sessionsList;
      if (data.success && Array.isArray(list)) {
        setSessionsList(
          list.map((s) => ({
            ...s,
            isCurrent: Boolean(s.isCurrent || s.is_current),
          }))
        );
      } else {
        setSessionErr(data.error || 'Failed to load logged-in devices.');
      }
    } catch (_) {
      setSessionErr('Network error while checking active sessions.');
    } finally {
      setLoadingSessions(false);
    }
  }, [creatorId, router]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId, isCurrent) => {
    const promptMsg = isCurrent
      ? 'This is your current device. Revoking it will log you out immediately. Proceed?'
      : 'Revoke login session on this device?';
    if (!confirm(promptMsg)) return;

    setRevokingSessionId(sessionId);
    setSessionMsg('');
    setSessionErr('');

    try {
      const res = await fetch('/api/marketing/creator/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_session',
          sessionId,
          creatorId: Number(creatorId),
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.isCurrent) {
          router.replace('/creator/login');
          return;
        }
        setSessionMsg('Device logged out successfully.');
        await fetchSessions();
      } else {
        setSessionErr(data.error || 'Failed to log out device.');
      }
    } catch {
      setSessionErr('Network error revoking session.');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm('Log out all other active sessions and devices except this one?')) return;

    setRevokingAll(true);
    setSessionMsg('');
    setSessionErr('');

    try {
      const res = await fetch('/api/marketing/creator/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_all_others',
          creatorId: Number(creatorId),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSessionMsg(`Logged out ${data.revokedCount} other device(s) successfully.`);
        await fetchSessions();
      } else {
        setSessionErr(data.error || 'Failed to log out other devices.');
      }
    } catch {
      setSessionErr('Network error revoking other devices.');
    } finally {
      setRevokingAll(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg('');
    setPassErr('');

    if (newPassword.length < 6) {
      setPassErr('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErr('New password and confirmation do not match.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await fetch('/api/marketing/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          creatorId: Number(creatorId),
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPassMsg('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassErr(json.error || 'Failed to change password.');
      }
    } catch {
      setPassErr('Network error while updating password.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleToggle2FA = async () => {
    setToggling2fa(true);
    setTfaMsg('');

    try {
      const nextState = !twoFactor;
      const res = await fetch('/api/marketing/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_2fa',
          creatorId: Number(creatorId),
          enabled: nextState,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTwoFactor(nextState);
        setTfaMsg(`Two-factor authentication is now ${nextState ? 'enabled' : 'disabled'}.`);
        if (refetch) await refetch();
      } else {
        alert(json.error || 'Failed to toggle 2FA.');
      }
    } catch {
      alert('Network error updating 2FA.');
    } finally {
      setToggling2fa(false);
    }
  };

  const otherSessionsCount = sessionsList.filter((s) => !s.isCurrent && !s.is_current).length;

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4">
        <h1 className="text-base font-semibold text-slate-900">Security & Login Sessions</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Manage your account credentials, active device logins, and two-factor protection.
        </p>
      </div>

      {sessionMsg && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
          {sessionMsg}
        </div>
      )}
      {sessionErr && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {sessionErr}
        </div>
      )}

      {/* 1. ACTIVE SESSIONS TABLE */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Active Devices & Sessions</h2>
            <p className="text-[11px] text-slate-500">
              Verified active login sessions in your database.
            </p>
          </div>

          {otherSessionsCount > 0 && (
            <button
              type="button"
              disabled={revokingAll}
              onClick={handleRevokeAllOtherSessions}
              className="px-2.5 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium cursor-pointer disabled:opacity-50"
            >
              {revokingAll ? 'Logging Out...' : `Log Out Other Devices (${otherSessionsCount})`}
            </button>
          )}
        </div>

        {loadingSessions ? (
          <LoadingScreen fullScreen={false} size="sm" label="Checking device sessions..." />
        ) : sessionsList.length === 0 ? (
          <div className="py-6 text-center text-slate-400">No active login sessions recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Device & Browser</th>
                  <th className="pb-2">IP Address</th>
                  <th className="pb-2">Last Active</th>
                  <th className="pb-2">Expires</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {sessionsList.map((s) => {
                  const ua = parseUserAgent(s.user_agent);
                  const isRevokingThis = revokingSessionId === s.id;
                  const isCurrent = Boolean(s.isCurrent || s.is_current);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-900">
                        {ua.label}
                        {isCurrent && (
                          <span className="ml-2 text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Current Device
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 font-mono text-slate-500 text-[11px]">
                        {s.ip_address || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                        {formatDate(s.last_active_at || s.created_at)}
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                        {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          disabled={isRevokingThis}
                          onClick={() => handleRevokeSession(s.id, isCurrent)}
                          className="text-rose-600 hover:underline font-medium cursor-pointer disabled:opacity-50"
                        >
                          {isRevokingThis ? 'Revoking...' : isCurrent ? 'Sign Out' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. CHANGE PASSWORD */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="border-b border-slate-100 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">Change Password</h2>
        </div>

        {passMsg && (
          <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
            {passMsg}
          </div>
        )}
        {passErr && (
          <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
            {passErr}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Current Password *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              type="submit"
              disabled={changingPass}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
            >
              {changingPass ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. TWO FACTOR AUTH */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Two-Factor Authentication</h2>
            <p className="text-[11px] text-slate-500">
              Require a secondary verification code when signing in.
            </p>
          </div>

          <span
            className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
              twoFactor
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {twoFactor ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {tfaMsg && (
          <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
            {tfaMsg}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-slate-600 text-xs">
            {twoFactor
              ? '2FA is active on your account.'
              : 'Add an extra security layer to protect against unauthorized logins.'}
          </span>

          <button
            type="button"
            disabled={toggling2fa}
            onClick={handleToggle2FA}
            className={`px-3 py-1.5 rounded font-medium text-xs cursor-pointer ${
              twoFactor
                ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {toggling2fa ? 'Processing...' : twoFactor ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
}
