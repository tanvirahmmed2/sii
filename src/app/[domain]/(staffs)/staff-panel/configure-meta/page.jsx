'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiCheckCircle,
  FiAlertCircle,
  FiSave,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiMessageSquare
} from 'react-icons/fi';
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa';

export default function ConfigureMetaPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Exact fields specified by user:
  // Inbound Webhooks:
  const [metaWebhookVerifyToken, setMetaWebhookVerifyToken] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [metaAppId, setMetaAppId] = useState('');
  // Outbound / Reply:
  const [metaPageAccessToken, setMetaPageAccessToken] = useState('');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');

  const [isActive, setIsActive] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [webhookCallbackUrl, setWebhookCallbackUrl] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    fetchMetaConfig();
  }, [domain]);

  const fetchMetaConfig = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/meta`);
      const data = await res.json();
      if (data.success) {
        setWebhookCallbackUrl(data.webhookCallbackUrl || '');
        if (data.meta) {
          setMetaWebhookVerifyToken(data.meta.meta_webhook_verify_token || '');
          setMetaAppSecret(data.meta.meta_app_secret || '');
          setMetaAppId(data.meta.meta_app_id || '');
          setMetaPageAccessToken(data.meta.meta_page_access_token || '');
          setWhatsappPhoneNumberId(data.meta.whatsapp_phone_number_id || '');
          setIsActive(Boolean(data.meta.is_active));
          setIsConfigured(Boolean(data.configured));
          setUpdatedAt(data.meta.updated_at);
        } else {
          setIsConfigured(false);
        }
      }
    } catch (err) {
      console.error('Failed to load Meta configuration:', err);
      setErrorMessage('Failed to connect to Meta configuration service.');
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
      const res = await fetch(`/api/${domain}/staff/panel/configure/meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta_webhook_verify_token: metaWebhookVerifyToken,
          meta_app_secret: metaAppSecret,
          meta_app_id: metaAppId,
          meta_page_access_token: metaPageAccessToken,
          whatsapp_phone_number_id: whatsappPhoneNumberId,
          is_active: isActive
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save Meta configuration.');
      }

      setStatusMessage('Meta integration keys saved successfully.');
      setIsConfigured(true);
      if (data.meta) {
        setMetaAppSecret(data.meta.meta_app_secret);
        setMetaPageAccessToken(data.meta.meta_page_access_token);
        setUpdatedAt(data.meta.updated_at);
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear this website’s Meta integration keys?')) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/configure/meta`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setMetaWebhookVerifyToken('');
        setMetaAppSecret('');
        setMetaAppId('');
        setMetaPageAccessToken('');
        setWhatsappPhoneNumberId('');
        setIsConfigured(false);
        setStatusMessage('Meta configuration removed.');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const generateRandomVerifyToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = 'meta_verify_';
    for (let i = 0; i < 24; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMetaWebhookVerifyToken(token);
  };

  const copyWebhookUrl = () => {
    if (!webhookCallbackUrl) return;
    navigator.clipboard.writeText(webhookCallbackUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="w-full space-y-4">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Facebook Messenger</p>
            <FaFacebook className="text-blue-600" size={16} />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-sm font-semibold ${metaPageAccessToken ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {metaPageAccessToken ? 'Outbound Ready' : 'Token Required'}
            </span>
            <Link href="/staff-panel/message-facebook" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
              Open <FiExternalLink />
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Instagram Direct</p>
            <FaInstagram className="text-pink-600" size={16} />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-sm font-semibold ${metaPageAccessToken ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {metaPageAccessToken ? 'Outbound Ready' : 'Token Required'}
            </span>
            <Link href="/staff-panel/message-instagram" className="text-[10px] text-pink-600 hover:underline flex items-center gap-0.5">
              Open <FiExternalLink />
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">WhatsApp Cloud</p>
            <FaWhatsapp className="text-emerald-600" size={16} />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-sm font-semibold ${whatsappPhoneNumberId && metaPageAccessToken ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {whatsappPhoneNumberId && metaPageAccessToken ? 'Connected' : 'Phone ID Required'}
            </span>
            <Link href="/staff-panel/message-whatsapp" className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5">
              Open <FiExternalLink />
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Inbound Webhook</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-sm font-semibold ${metaWebhookVerifyToken && metaAppSecret ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
              {metaWebhookVerifyToken && metaAppSecret ? 'Verified' : 'Incomplete'}
            </span>
            <button
              onClick={fetchMetaConfig}
              className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
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

      {/* Main Form Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Form: Inbound & Outbound Keys */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiMessageSquare className="text-blue-600" /> Meta Platform Credentials
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure your Meta App environment keys to receive customer messages and send automated or staff replies via Facebook, Instagram, and WhatsApp.
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

          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Inbound Webhooks */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                Meta Message Receiver (Inbound Webhooks)
              </h3>

              {/* META_APP_ID */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  META_APP_ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104829103948572"
                  value={metaAppId}
                  onChange={(e) => setMetaAppId(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Found in your Meta App Dashboard under App Settings &rarr; Basic.
                </p>
              </div>

              {/* META_APP_SECRET */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  META_APP_SECRET
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="e.g. 9b7a4c2f1e8d0a3b..."
                    value={metaAppSecret}
                    onChange={(e) => setMetaAppSecret(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 pr-10 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showSecret ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Used for HMAC SHA256 signature verification (X-Hub-Signature-256) of incoming webhook payloads.
                </p>
              </div>

              {/* META_WEBHOOK_VERIFY_TOKEN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    META_WEBHOOK_VERIFY_TOKEN
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomVerifyToken}
                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Generate Random Token
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. campus_verify_token_secure_2026"
                  value={metaWebhookVerifyToken}
                  onChange={(e) => setMetaWebhookVerifyToken(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  The secret verification handshake string entered into your Meta App Webhook subscription.
                </p>
              </div>
            </div>

            {/* Section 2: Outbound / Reply */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                Meta Message Reply / Outbound (Optional)
              </h3>

              {/* META_PAGE_ACCESS_TOKEN */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  META_PAGE_ACCESS_TOKEN
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="EAAB... (Facebook Page & Instagram Direct Access Token)"
                    value={metaPageAccessToken}
                    onChange={(e) => setMetaPageAccessToken(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 pr-10 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showToken ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Permanent Page Access Token with <span className="font-mono text-slate-600 dark:text-slate-400">pages_messaging</span> &amp; <span className="font-mono text-slate-600 dark:text-slate-400">instagram_manage_messages</span> permissions.
                </p>
              </div>

              {/* WHATSAPP_PHONE_NUMBER_ID */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  WHATSAPP_PHONE_NUMBER_ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 109283746501928"
                  value={whatsappPhoneNumberId}
                  onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Found in Meta Developer Portal &rarr; WhatsApp &rarr; API Setup &rarr; Phone Number ID.
                </p>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">Active Meta Messaging Service</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Enable or temporarily deactivate message handling and automated replies for this portal.
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

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving || loading}
                className="px-4 py-2 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FiSave /> {saving ? 'Saving...' : 'Save Meta Configuration'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Card: Webhook Callback Guide */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Webhook Setup Guide</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste this Callback URL and your <span className="font-semibold text-slate-700 dark:text-slate-300">META_WEBHOOK_VERIFY_TOKEN</span> into the Meta Developer Console:
            </p>

            <div>
              <label className="block text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-1">
                Callback URL
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  readOnly
                  value={webhookCallbackUrl || `https://${domain}/api/marketing/meta/webhook`}
                  className="w-full text-[11px] font-mono px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 select-all"
                />
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="p-2 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Copy URL"
                >
                  {copiedWebhook ? <FiCheck className="text-emerald-600" /> : <FiCopy />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
              <p className="font-semibold">Subscribed Webhook Fields:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-400">
                <li><span className="font-mono">messages</span> (Facebook Messenger)</li>
                <li><span className="font-mono">messaging_postbacks</span></li>
                <li><span className="font-mono">messages</span> (WhatsApp Cloud API)</li>
              </ul>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-2">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Staff Messaging Inboxes</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Direct access to live channel workstations:
            </p>
            <div className="pt-2 space-y-1.5">
              <Link
                href="/staff-panel/message-facebook"
                className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 transition"
              >
                <span className="flex items-center gap-2">
                  <FaFacebook className="text-blue-600" /> Facebook Messenger
                </span>
                <FiExternalLink className="text-slate-400" />
              </Link>
              <Link
                href="/staff-panel/message-instagram"
                className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 transition"
              >
                <span className="flex items-center gap-2">
                  <FaInstagram className="text-pink-600" /> Instagram Direct
                </span>
                <FiExternalLink className="text-slate-400" />
              </Link>
              <Link
                href="/staff-panel/message-whatsapp"
                className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 transition"
              >
                <span className="flex items-center gap-2">
                  <FaWhatsapp className="text-emerald-600" /> WhatsApp Cloud
                </span>
                <FiExternalLink className="text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
