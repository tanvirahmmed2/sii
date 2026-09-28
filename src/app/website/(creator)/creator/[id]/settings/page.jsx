'use client';

import { useState } from 'react';
import { useCreator } from '../layout';
import {
  BiCog,
  BiCheckShield,
  BiKey,
  BiCheckCircle,
  BiLoaderAlt,
  BiLockAlt,
  BiErrorCircle,
} from 'react-icons/bi';

export default function CreatorSettingsPage() {
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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg('');
    setPassErr('');

    if (newPassword !== confirmPassword) {
      setPassErr('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPassErr('Password must be at least 6 characters long.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await fetch('/api/creator', {
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
        setPassMsg('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassErr(json.error || 'Failed to update password.');
      }
    } catch (err) {
      setPassErr('Network error while changing password.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleToggle2FA = async () => {
    const nextState = !twoFactor;
    setToggling2fa(true);
    setTfaMsg('');

    try {
      const res = await fetch('/api/creator', {
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
        setTfaMsg(
          nextState
            ? 'Two-factor authentication is now active on your creator account.'
            : 'Two-factor authentication has been disabled.'
        );
        await refetch();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setToggling2fa(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Settings</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Security
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Configure authentication credentials, two-factor protection, and session controls.
          </p>
        </div>
      </div>

      {/* Two-Factor Authentication Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BiCheckShield className="text-slate-700 text-xl" />
              <span>Two-Factor Authentication (2FA)</span>
            </h3>
            <p className="text-xs text-slate-500 max-w-lg">
              Protect your creator account by requiring a secondary verification confirmation during sensitive actions.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggle2FA}
            disabled={toggling2fa}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              twoFactor
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {toggling2fa ? <BiLoaderAlt className="animate-spin text-sm" /> : null}
            <span>{twoFactor ? '● 2FA Enabled (Disable)' : 'Enable 2FA'}</span>
          </button>
        </div>

        {tfaMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <BiCheckCircle className="text-base text-emerald-600 shrink-0" />
            <span>{tfaMsg}</span>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BiKey className="text-slate-700 text-lg" />
            <span>Change Account Password</span>
          </h3>
          <p className="text-xs text-slate-500">Ensure password is at least 6 characters and unique.</p>
        </div>

        {passMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <BiCheckCircle className="text-base text-emerald-600 shrink-0" />
            <span>{passMsg}</span>
          </div>
        )}

        {passErr && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <BiErrorCircle className="text-base text-rose-600 shrink-0" />
            <span>{passErr}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={changingPass}
            className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            {changingPass ? <BiLoaderAlt className="animate-spin text-sm" /> : null}
            <span>Update Password</span>
          </button>
        </form>
      </div>

      {/* Safety & Sessions */}
      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-base font-bold text-slate-900">Active Sessions & Sign Out</h3>
        <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
          If you are working from a shared computer or suspect unauthorized access, you can terminate your session.
        </p>
        <div className="pt-2">
          <a
            href="/creator/login"
            className="inline-flex px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors shadow-xs"
          >
            Sign Out of Creator Account
          </a>
        </div>
      </div>
    </div>
  );
}
