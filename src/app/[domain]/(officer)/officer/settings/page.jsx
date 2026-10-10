'use client';

import React, { useContext, useState } from 'react';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function OfficerSettingsPage() {
  const { website } = useTenantWebsite();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('7');
  const [saving, setSaving] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Officer panel preferences saved.');
    }, 400);
  };

  return (
    <div className="w-full space-y-6">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">
          Officer Workstation Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure operational desk notifications and security session preferences.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs max-w-2xl space-y-5">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-900 dark:text-white">
              System Notification Alerts
            </label>
            <p className="text-[11px] text-slate-500">
              Receive institutional updates and duty notices to your registered officer email.
            </p>
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span>Enable transactional email notifications</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <label className="text-xs font-semibold text-slate-900 dark:text-white">
              Multi-Device Session Lifespan
            </label>
            <p className="text-[11px] text-slate-500">
              Duration before inactive officer portal sessions require re-authentication.
            </p>
            <div className="pt-2">
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="1">1 Day</option>
                <option value="7">7 Days (Default Institutional Standard)</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Desk Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
