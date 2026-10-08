'use client';

import React, { useState } from 'react';

export default function Page() {
  const [provider, setProvider] = useState('mimsms');
  const [senderId, setSenderId] = useState('INSTITUTION');
  const [apiKey, setApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [senderType, setSenderType] = useState('masking');
  const [testNumber, setTestNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }, 600);
  };

  const handleTestSms = (e) => {
    e.preventDefault();
    if (!testNumber) return;
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3500);
  };

  return (
    <div className="w-full space-y-4">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">SMS Gateway Balance</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">৳ 4,820.50</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">~9,641 Credits</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Messages Sent Today</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">684</span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Attendance &amp; Fees</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Masking Status</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">APPROVED</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">BTRC Operator Mask</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Delivery Rate</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">99.4%</span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Realtime DLR</span>
          </div>
        </div>
      </div>

      {/* Main Configuration Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gateway Credentials Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">SMS API Provider Setup</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connect local and international SMS gateway credentials for automated parent SMS alerts, student absence notices, and OTP verification.
            </p>
          </div>

          {submitted && (
            <div className="p-2.5 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span>SMS gateway credentials updated and verified successfully.</span>
              <span className="text-[10px] font-mono">OK</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Supported Gateway Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="mimsms">MiMSMS (Bangladesh / Operator Direct)</option>
                  <option value="greenweb">Greenweb SMS Gateway</option>
                  <option value="onnorokom">Onnorokom SMS</option>
                  <option value="twilio">Twilio Global</option>
                  <option value="custom">Custom HTTP GET / POST Endpoint</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sender Masking / Sender ID
                </label>
                <input
                  type="text"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                  placeholder="INSTITUTION"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Routing Channel
                </label>
                <select
                  value={senderType}
                  onChange={(e) => setSenderType(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="masking">Masking (Brand Name / Alphanumeric)</option>
                  <option value="non-masking">Non-Masking (Numeric Longcode)</option>
                  <option value="voice">Automated Voice Broadcast</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default Language / Encoding
                </label>
                <select
                  defaultValue="unicode"
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="unicode">Unicode UTF-8 (Bengali / English / Symbols)</option>
                  <option value="gsm">GSM 7-bit (English Only / 160 Chars)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  API Key / Token
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Account Client ID / Username
                </label>
                <input
                  type="text"
                  defaultValue="campus_sms_portal"
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                API Base Endpoint URL
              </label>
              <input
                type="text"
                defaultValue="https://api.mimsms.com/api/v3/send-sms"
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Gateway Settings...' : 'Save SMS Configuration'}
              </button>
            </div>
          </form>
        </div>

        {/* Realtime SMS Dispatch Test */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Live SMS Test Dispatch</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Send a test SMS to check delivery latency and sender mask display on handset.
            </p>
          </div>

          <form onSubmit={handleTestSms} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recipient Mobile Number
              </label>
              <input
                type="tel"
                placeholder="01700000000"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Test Message Copy
              </label>
              <textarea
                rows={2}
                defaultValue="[INSTITUTION] Test verification alert: Your campus SMS gateway is active and synchronized."
                className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Dispatch Test SMS
            </button>
          </form>

          {testSent && (
            <div className="p-2.5 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
              Message dispatched to <span className="font-mono font-medium">{testNumber}</span>. Delivery receipt acknowledged.
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between items-center text-[11px]">
              <span>Latency:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">1.2s avg</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span>Encoding:</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono">Unicode / 70 Char Units</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span>Operator Route:</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono">Premium Direct SS7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
