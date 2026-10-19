'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FiMessageSquare,
  FiSend,
  FiSave,
  FiTrash2,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiRadio,
  FiCpu,
  FiShield
} from 'react-icons/fi';

export default function ConfigureSmsPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Configuration Form State
  const [provider, setProvider] = useState('mimsms');
  const [senderId, setSenderId] = useState('CAMPUS');
  const [senderType, setSenderType] = useState('masking');
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('https://api.mimsms.com/api/v3/send-sms');
  const [defaultEncoding, setDefaultEncoding] = useState('unicode');
  const [isActive, setIsActive] = useState(true);

  const [showKey, setShowKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [balance, setBalance] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Test SMS State
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState(null);

  const PROVIDER_DEFAULT_URLS = {
    mimsms: 'https://api.mimsms.com/api/v3/send-sms',
    greenweb: 'https://api.greenweb.com.bd/api.php',
    onnorokom: 'https://api2.onnorokomsms.com/HttpSendSms.ashx',
    twilio: 'https://api.twilio.com/2010-04-01',
    custom: ''
  };

  useEffect(() => {
    fetchSmsConfig();
  }, [domain]);

  const fetchSmsConfig = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/sms`);
      const data = await res.json();
      if (data.success && data.gateway) {
        const gw = data.gateway;
        setProvider(gw.provider || 'mimsms');
        setSenderId(gw.sender_id || '');
        setSenderType(gw.sender_type || 'masking');
        setApiKey(gw.api_key || '');
        setClientId(gw.client_id || '');
        setEndpointUrl(gw.endpoint_url || PROVIDER_DEFAULT_URLS[gw.provider] || '');
        setDefaultEncoding(gw.default_encoding || 'unicode');
        setIsActive(Boolean(gw.is_active));
        setIsConfigured(Boolean(data.configured));
        setBalance(gw.balance || 0);
        setUpdatedAt(gw.updated_at);
      } else {
        setIsConfigured(false);
      }
    } catch (err) {
      console.error('Failed to load SMS configuration:', err);
      setErrorMessage('Failed to connect to SMS configuration service.');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    // If the endpoint is empty or matching another provider's default, update it
    setEndpointUrl(PROVIDER_DEFAULT_URLS[newProvider] || '');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          sender_id: senderId,
          sender_type: senderType,
          api_key: apiKey,
          client_id: clientId,
          endpoint_url: endpointUrl,
          default_encoding: defaultEncoding,
          is_active: isActive
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save SMS configuration.');
      }

      setStatusMessage('SMS Gateway credentials saved and synchronized successfully.');
      setIsConfigured(true);
      if (data.gateway) {
        setApiKey(data.gateway.api_key);
        setUpdatedAt(data.gateway.updated_at);
        setBalance(data.gateway.balance || 0);
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async (e) => {
    e.preventDefault();
    if (!testNumber) {
      setErrorMessage('Please enter a recipient mobile number for the test.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/sms/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_number: testNumber,
          message: testMessage,
          provider,
          api_key: apiKey,
          client_id: clientId,
          sender_id: senderId,
          sender_type: senderType,
          endpoint_url: endpointUrl
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch test SMS.');
      }

      setTestResult({
        success: true,
        message: data.message || `Test SMS dispatched successfully to ${testNumber}!`,
        latencyMs: data.dispatch?.latencyMs
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
    if (!window.confirm('Are you sure you want to delete this SMS gateway configuration? Automated SMS notifications will be paused.')) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/sms`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSenderId('');
        setApiKey('');
        setClientId('');
        setIsConfigured(false);
        setStatusMessage('SMS gateway configuration removed.');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-10">
      {/* Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-2xl text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="text-base text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-2xl text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="text-base text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FiMessageSquare /> System Configuration
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            SMS Gateway Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Connect institutional SMS gateways (MiMSMS, Greenweb, Onnorokom, Twilio) for student attendance alerts, dues notices, circulars, and OTPs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSmsConfig}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh Status
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Gateway Status</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-lg font-bold ${isConfigured ? (isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500') : 'text-slate-400'}`}>
              {isConfigured ? (isActive ? 'Connected' : 'Paused') : 'Unconfigured'}
            </span>
            <span className="text-xs font-mono uppercase text-slate-500 font-semibold">{provider}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{isConfigured ? 'Ready for bulk dispatch' : 'Action required'}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Sender ID / Masking</p>
          <div className="flex items-baseline justify-between mt-2 truncate">
            <span className="text-sm font-bold font-mono uppercase text-slate-900 dark:text-white truncate">
              {senderId || 'UNSET'}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-medium">{senderType}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Authorized telecom mask</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Gateway Balance</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              ৳ {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400">Credits</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Vendor account pool</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Last Synced</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
              {updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Never'}
            </span>
            <span className="text-xs text-emerald-600">Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Database record</p>
        </div>
      </div>

      {/* Main Grid: Settings & Test Dispatch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: SMS Provider Setup */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiMessageSquare className="text-indigo-600 dark:text-indigo-400" /> SMS Provider Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure vendor credentials for student absence notices, fee receipts, circulars, and SMS OTPs.
              </p>
            </div>
            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-medium px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <FiTrash2 /> Clear Config
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supported Gateway Provider <span className="text-rose-500">*</span>
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer transition"
                >
                  <option value="mimsms">MiMSMS (Bangladesh / Operator Direct)</option>
                  <option value="greenweb">Greenweb SMS Gateway</option>
                  <option value="onnorokom">Onnorokom SMS Gateway</option>
                  <option value="twilio">Twilio Global SMS</option>
                  <option value="custom">Custom HTTP GET / POST Endpoint</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sender Masking / Sender ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CAMPUS_NAME or 88017..."
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  required
                  className="w-full text-xs font-mono uppercase px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Alphanumeric mask approved by operator or assigned longcode number.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Routing Channel
                </label>
                <select
                  value={senderType}
                  onChange={(e) => setSenderType(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer transition"
                >
                  <option value="masking">Masking (Brand Name / Alphanumeric)</option>
                  <option value="non-masking">Non-Masking (Numeric Longcode)</option>
                  <option value="voice">Automated Voice Broadcast</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Language / Encoding
                </label>
                <select
                  value={defaultEncoding}
                  onChange={(e) => setDefaultEncoding(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer transition"
                >
                  <option value="unicode">Unicode UTF-8 (Bengali / English / Symbols)</option>
                  <option value="gsm">GSM 7-bit (Standard English / 160 Chars)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  API Key / Secret Token <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="Enter API Secret or Token"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required={!isConfigured}
                    className="w-full text-xs font-mono px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showKey ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Client ID / Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. campus_sms_portal (Required for Twilio/Onnorokom)"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API Base Endpoint URL
              </label>
              <input
                type="text"
                placeholder="https://api.provider.com/send"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Leave default or enter custom vendor API endpoint URL.
              </p>
            </div>

            {/* Active Toggle */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Enable Institution SMS Service</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  When enabled, all student absence, fee, and admission notifications will be dispatched through this gateway.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving || loading}
                className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FiSave /> {saving ? 'Saving...' : 'Save SMS Configuration'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: Live SMS Dispatch Test */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiSend className="text-emerald-600" /> Live SMS Test Dispatch
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Send a real test message to verify gateway connectivity, balance, and sender masking.
              </p>
            </div>

            <form onSubmit={handleTestSms} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="01712345678"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  required
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Message Content (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder={`[${senderId || 'CAMPUS'}] Test alert: SMS gateway verified successfully.`}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={testing || (!apiKey && !isConfigured)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FiSend /> {testing ? 'Sending Test SMS...' : 'Dispatch Test SMS'}
              </button>
            </form>

            {testResult && (
              <div
                className={`p-4 rounded-2xl text-xs border ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                <p className="font-bold">{testResult.success ? '✓ Delivery Successful' : '✗ Dispatch Failed'}</p>
                <p className="mt-1 text-xs leading-relaxed">
                  {testResult.success ? testResult.message : testResult.error}
                </p>
                {testResult.latencyMs && (
                  <p className="mt-1 font-mono text-[10px] text-slate-500">
                    Latency: {testResult.latencyMs}ms
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
            <p className="font-bold text-slate-700 dark:text-slate-300">Supported SMS Routing:</p>
            <p>• MiMSMS: Operator direct SS7 routes in Bangladesh</p>
            <p>• Greenweb &amp; Onnorokom: BTRC approved masking</p>
            <p>• Twilio: Global international SMS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
