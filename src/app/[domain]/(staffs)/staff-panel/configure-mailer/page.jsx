'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FiMail,
  FiKey,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
  FiSend,
  FiSave,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiRefreshCw
} from 'react-icons/fi';

export default function ConfigureMailerPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form State matching exact keys
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('');
  const [brevoSenderName, setBrevoSenderName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Test Email State
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchMailerConfig();
  }, [domain]);

  const fetchMailerConfig = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/mailer`);
      const data = await res.json();
      if (data.success && data.mailer) {
        setBrevoApiKey(data.mailer.brevo_api_key || '');
        setBrevoSenderEmail(data.mailer.brevo_sender_email || '');
        setBrevoSenderName(data.mailer.brevo_sender_name || '');
        setIsActive(Boolean(data.mailer.is_active));
        setIsConfigured(Boolean(data.configured));
        setUpdatedAt(data.mailer.updated_at);
      } else {
        setIsConfigured(false);
      }
    } catch (err) {
      console.error('Failed to load Brevo mailer config:', err);
      setErrorMessage('Failed to connect to mailer configuration service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/mailer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brevo_api_key: brevoApiKey,
          brevo_sender_email: brevoSenderEmail,
          brevo_sender_name: brevoSenderName,
          is_active: isActive
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save Brevo mailer configuration.');
      }

      setStatusMessage('Brevo mailer configuration saved successfully.');
      setIsConfigured(true);
      if (data.mailer) {
        setBrevoApiKey(data.mailer.brevo_api_key);
        setUpdatedAt(data.mailer.updated_at);
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestMail = async (e) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      setErrorMessage('Please enter a valid recipient email address for testing.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/mailer/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_email: testEmail,
          brevo_api_key: brevoApiKey,
          brevo_sender_email: brevoSenderEmail,
          brevo_sender_name: brevoSenderName
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch test email.');
      }

      setTestResult({
        success: true,
        message: data.message || `Test email dispatched to ${testEmail}!`
      });
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear this website’s Brevo mailer configuration? Emails will fall back to platform default settings.')) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/mailer`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setBrevoApiKey('');
        setBrevoSenderEmail('');
        setBrevoSenderName('');
        setIsConfigured(false);
        setStatusMessage('Mailer configuration removed.');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* KPI Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Gateway Status</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-base font-semibold ${isConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isConfigured ? (isActive ? 'Active & Configured' : 'Inactive') : 'Not Configured'}
            </span>
            <span className="text-[10px] font-mono text-slate-400">Brevo v3</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Authorized Sender</p>
          <div className="flex items-baseline justify-between mt-1 truncate">
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {brevoSenderEmail || 'Not configured'}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400">SMTP API</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Display Sender Name</p>
          <div className="flex items-baseline justify-between mt-1 truncate">
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {brevoSenderName || 'Not configured'}
            </span>
            <span className="text-[10px] text-slate-400">From Header</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Last Updated</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
              {updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Never'}
            </span>
            <button
              onClick={fetchMailerConfig}
              className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <FiCheckCircle className="shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <FiAlertCircle className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Settings & Test Mailer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Form: Brevo Mailer Keys */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiMail className="text-blue-600" /> Brevo Mailer Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set transactional email credentials for this institution. When active, all automated emails (admission confirmations, recovery, notifications) will be sent via this Brevo account.
              </p>
            </div>
            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <FiTrash2 /> Clear Config
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* BREVO_API_KEY */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                BREVO_API_KEY <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={brevoApiKey}
                  onChange={(e) => setBrevoApiKey(e.target.value)}
                  required={!isConfigured}
                  className="w-full text-xs font-mono px-3 py-2 pr-10 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showKey ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Found in your Brevo Dashboard &rarr; SMTP &amp; API &rarr; API Keys.
              </p>
            </div>

            {/* BREVO_SENDER_EMAIL */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                BREVO_SENDER_EMAIL <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="e.g. notifications@institution.edu"
                  value={brevoSenderEmail}
                  onChange={(e) => setBrevoSenderEmail(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Must be an authorized and verified sender email address in your Brevo account.
              </p>
            </div>

            {/* BREVO_SENDER_NAME */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                BREVO_SENDER_NAME <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Oxford Grammar School Administration"
                value={brevoSenderName}
                onChange={(e) => setBrevoSenderName(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                The organization name displayed in recipients' inbox headers.
              </p>
            </div>

            {/* Active Toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">Enable Custom Gateway</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  When enabled, all outgoing emails use these credentials instead of platform defaults.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving || loading}
                className="px-4 py-2 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FiSave /> {saving ? 'Saving Changes...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: Live Test Mailer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiSend className="text-emerald-600" /> Send Test Email
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verify Brevo API credentials and authorized sender domain before deploying.
              </p>
            </div>

            <form onSubmit={handleTestMail} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Test Email
                </label>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>

              <button
                type="submit"
                disabled={testing || (!brevoApiKey && !isConfigured)}
                className="w-full py-2 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FiSend /> {testing ? 'Sending Test...' : 'Dispatch Test Email'}
              </button>
            </form>

            {testResult && (
              <div
                className={`p-3 rounded text-xs border ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                <p className="font-semibold">{testResult.success ? '✓ Delivery Successful' : '✗ Dispatch Failed'}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {testResult.success ? testResult.message : testResult.error}
                </p>
              </div>
            )}
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Need a Brevo Account?</p>
            <p>1. Sign up at brevo.com</p>
            <p>2. Verify your institution sending domain (SPF &amp; DKIM records)</p>
            <p>3. Generate an API key under SMTP &amp; API keys</p>
          </div>
        </div>
      </div>
    </div>
  );
}
