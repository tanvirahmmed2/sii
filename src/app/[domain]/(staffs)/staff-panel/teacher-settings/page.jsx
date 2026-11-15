'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiAward,
  FiLayers,
  FiSave,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiShield,
  FiClock,
  FiCreditCard,
  FiSettings
} from 'react-icons/fi';

export default function TeacherSettingsPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState({
    total_teachers: 0,
    active_teachers: 0,
    inactive_teachers: 0,
    registered_teachers: 0,
    total_designations: 0,
    total_departments: 0
  });

  const [settings, setSettings] = useState({
    require_verification: true,
    enable_two_factor: false,
    allow_password_recovery: true,
    max_daily_periods: 6,
    check_in_grace_minutes: 15,
    default_probation_months: 6,
    id_card_prefix: 'FAC-'
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!domain) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/settings`);
      const data = await res.json();

      if (data.success) {
        if (data.settings) {
          setSettings({
            require_verification: Boolean(data.settings.require_verification),
            enable_two_factor: Boolean(data.settings.enable_two_factor),
            allow_password_recovery: Boolean(data.settings.allow_password_recovery),
            max_daily_periods: Number(data.settings.max_daily_periods) || 6,
            check_in_grace_minutes: Number(data.settings.check_in_grace_minutes) || 15,
            default_probation_months: Number(data.settings.default_probation_months) || 6,
            id_card_prefix: data.settings.id_card_prefix || 'FAC-'
          });
        }
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        showToast(data.error || 'Failed to load teacher settings.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to settings server.', true);
    } finally {
      setLoading(false);
    }
  }, [domain, showToast]);

  useEffect(() => {
    let active = true;
    if (!domain) return;
    fetch(`/api/${domain}/staff/panel/teacher/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          if (data.settings) {
            setSettings({
              require_verification: Boolean(data.settings.require_verification),
              enable_two_factor: Boolean(data.settings.enable_two_factor),
              allow_password_recovery: Boolean(data.settings.allow_password_recovery),
              max_daily_periods: Number(data.settings.max_daily_periods) || 6,
              check_in_grace_minutes: Number(data.settings.check_in_grace_minutes) || 15,
              default_probation_months: Number(data.settings.default_probation_months) || 6,
              id_card_prefix: data.settings.id_card_prefix || 'FAC-'
            });
          }
          if (data.stats) {
            setStats(data.stats);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [domain]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!domain) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || 'Settings saved successfully.');
        if (data.settings) {
          setSettings({
            require_verification: Boolean(data.settings.require_verification),
            enable_two_factor: Boolean(data.settings.enable_two_factor),
            allow_password_recovery: Boolean(data.settings.allow_password_recovery),
            max_daily_periods: Number(data.settings.max_daily_periods) || 6,
            check_in_grace_minutes: Number(data.settings.check_in_grace_minutes) || 15,
            default_probation_months: Number(data.settings.default_probation_months) || 6,
            id_card_prefix: data.settings.id_card_prefix || 'FAC-'
          });
        }
      } else {
        showToast(data.error || 'Failed to save settings.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving teacher settings.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings({
      require_verification: true,
      enable_two_factor: false,
      allow_password_recovery: true,
      max_daily_periods: 6,
      check_in_grace_minutes: 15,
      default_probation_months: 6,
      id_card_prefix: 'FAC-'
    });
    showToast('Reset to system default recommendations.');
  };

  return (
    <div className="w-full space-y-4">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiCheck className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiX className="w-4 h-4" />
          <span>{toastError}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiSettings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Teacher Management Settings</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional policies, security controls, workload limits, and ID card formatting for faculty.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer disabled:opacity-50"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Teachers</p>
            <FiUsers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{stats.total_teachers}</span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Institutional Faculty</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Teachers</p>
            <FiUserCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{stats.active_teachers}</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Verified &amp; Operational</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Pending Verification</p>
            <FiUserX className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{stats.inactive_teachers}</span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Awaiting Activation</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Designations / Depts</p>
            <FiAward className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{stats.total_designations} / {stats.total_departments}</span>
            <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">Academic Hierarchy</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <FiShield className="w-4 h-4 text-blue-500" />
            <div>
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Authentication &amp; Security Controls
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure credential management, verification gates, and security policies for teacher access.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <input
                type="checkbox"
                checked={settings.require_verification}
                onChange={(e) => setSettings({ ...settings, require_verification: e.target.checked })}
                className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="block text-xs font-medium text-slate-900 dark:text-white">
                  Mandatory Verification Link on New Teacher Registration
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  When enabled, newly created teacher profiles remain inactive until the teacher opens their secure verification link dispatched to their registered email and sets a personal password.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <input
                type="checkbox"
                checked={settings.allow_password_recovery}
                onChange={(e) => setSettings({ ...settings, allow_password_recovery: e.target.checked })}
                className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="block text-xs font-medium text-slate-900 dark:text-white">
                  Allow Self-Service Password Recovery
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Enables teachers to reset forgotten credentials via email token without requiring manual intervention from school staff administrators.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <input
                type="checkbox"
                checked={settings.enable_two_factor}
                onChange={(e) => setSettings({ ...settings, enable_two_factor: e.target.checked })}
                className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="block text-xs font-medium text-slate-900 dark:text-white">
                  Enforce Two-Factor Authentication (2FA) for Faculty Portal
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Requires teachers to enter a time-sensitive verification code dispatched to their email or phone during every web portal session login.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <FiClock className="w-4 h-4 text-emerald-500" />
            <div>
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Workload Limits &amp; Attendance Rules
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Institutional limits for routine periods, check-in thresholds, and contract probation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Daily Periods Per Teacher
              </label>
              <input
                type="number"
                min="1"
                max="24"
                required
                aria-label="Max Daily Periods Per Teacher"
                value={settings.max_daily_periods}
                onChange={(e) => setSettings({ ...settings, max_daily_periods: parseInt(e.target.value, 10) || 1 })}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 font-mono"
              />
              <span className="block text-[10px] text-slate-400 mt-1">
                Warns administrators if routine assignments exceed this threshold on any day.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Check-in Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="180"
                required
                aria-label="Check-in Grace Period in Minutes"
                value={settings.check_in_grace_minutes}
                onChange={(e) => setSettings({ ...settings, check_in_grace_minutes: parseInt(e.target.value, 10) || 0 })}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 font-mono"
              />
              <span className="block text-[10px] text-slate-400 mt-1">
                Arrivals within this window past scheduled period start are marked on-time rather than late.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Probation Period (Months)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                required
                aria-label="Default Probation Period in Months"
                value={settings.default_probation_months}
                onChange={(e) => setSettings({ ...settings, default_probation_months: parseInt(e.target.value, 10) || 0 })}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 font-mono"
              />
              <span className="block text-[10px] text-slate-400 mt-1">
                Standard probationary evaluation duration applied to newly onboarded academic staff.
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <FiCreditCard className="w-4 h-4 text-purple-500" />
            <div>
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Faculty Identification Card Standards
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Prefix format and identification conventions for physical and digital faculty credentials.
              </p>
            </div>
          </div>

          <div className="max-w-sm pt-1">
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Faculty ID Number Prefix
            </label>
            <input
              type="text"
              required
              aria-label="Faculty ID Number Prefix"
              value={settings.id_card_prefix}
              onChange={(e) => setSettings({ ...settings, id_card_prefix: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 font-mono"
            />
            <span className="block text-[10px] text-slate-400 mt-1">
              Example output format: <code className="text-slate-700 dark:text-slate-200 font-mono font-semibold">{settings.id_card_prefix || 'FAC-'}1024</code>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Reset to Recommended Defaults
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <FiSave className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
