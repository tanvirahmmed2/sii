'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreator } from '../layout';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';

function SubscriptionContent() {
  const {
    creatorId,
    creator,
    subscriptions = [],
    activeSubscription,
    activeSubscriptions = [],
    websites = [],
    stats = {},
    refetch,
  } = useCreator();

  const displaySubscriptions = subscriptions.length > 0
    ? subscriptions
    : activeSubscriptions.length > 0
    ? activeSubscriptions
    : activeSubscription
    ? [activeSubscription]
    : [];

  const searchParams = useSearchParams();
  const targetWebsiteId = searchParams.get('websiteId');

  // Website Settings Modal State
  const [selectedWebsiteForSettings, setSelectedWebsiteForSettings] = useState(null);
  const [siteSettings, setSiteSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsErr, setSettingsErr] = useState('');



  useEffect(() => {
    if (targetWebsiteId && websites.length > 0) {
      const matched = websites.find((w) => String(w.id) === String(targetWebsiteId));
      if (matched) {
        setTimeout(() => {
          setSelectedWebsiteForSettings(matched);
          setLoadingSettings(true);
          fetch(`/api/marketing/creator/website-settings?websiteId=${matched.id}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.success && data.settings) {
                setSiteSettings(data.settings);
              } else {
                setSiteSettings({
                  site_title: matched.name || '',
                  tagline: matched.tagline || '',
                  contact_email: matched.contact_email || creator?.email || '',
                  contact_phone: matched.contact_phone || creator?.phone || '',
                  primary_color: matched.primary_color || '#2563eb',
                  secondary_color: matched.secondary_color || '#1e40af',
                  font_family: matched.font_family || 'Inter',
                  currency: matched.setting_currency || 'USD',
                });
              }
            })
            .catch(() => setSettingsErr('Failed to load website settings.'))
            .finally(() => setLoadingSettings(false));
        }, 0);
      }
    }
  }, [targetWebsiteId, websites, creator]);

  const daysRemaining = stats?.daysRemaining ?? (activeSubscription?.current_period_end ? 30 : 0);
  const maxWebsites = stats?.maxWebsites || activeSubscription?.max_websites || activeSubscription?.max_portfolios || 1;
  const isSubActive = Boolean(activeSubscription && stats?.hasActivePackage);

  const handleOpenSettings = async (website) => {
    setSelectedWebsiteForSettings(website);
    setLoadingSettings(true);
    setSettingsMsg('');
    setSettingsErr('');

    try {
      const res = await fetch(`/api/marketing/creator/website-settings?websiteId=${website.id}`);
      const data = await res.json();
      if (data.success && data.settings) {
        setSiteSettings(data.settings);
      } else {
        setSiteSettings({
          site_title: website.name || '',
          tagline: website.tagline || '',
          contact_email: website.contact_email || creator?.email || '',
          contact_phone: website.contact_phone || creator?.phone || '',
          primary_color: website.primary_color || '#2563eb',
          secondary_color: website.secondary_color || '#1e40af',
          font_family: website.font_family || 'Inter',
          currency: website.setting_currency || 'USD',
        });
      }
    } catch {
      setSettingsErr('Failed to load website settings.');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedWebsiteForSettings) return;
    setSavingSettings(true);
    setSettingsMsg('');
    setSettingsErr('');

    try {
      const res = await fetch('/api/marketing/creator/website-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: selectedWebsiteForSettings.id,
          ...siteSettings,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMsg('Website settings saved successfully.');
        if (refetch) await refetch();
        setTimeout(() => {
          setSelectedWebsiteForSettings(null);
          setSettingsMsg('');
        }, 1000);
      } else {
        setSettingsErr(data.error || 'Failed to save settings.');
      }
    } catch {
      setSettingsErr('Network error saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };



  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-base font-semibold text-slate-900">
              Subscription & Website Ecosystem
            </h1>
            <span
              className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                isSubActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {isSubActive ? 'Active Plan' : 'Inactive'}
            </span>
          </div>
          <p className="text-slate-500 text-xs">
            Review active tier terms, website limits, branding settings, and staff module permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/creator/${creatorId}/purchases`}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
          >
            Upgrade / Renew Plan
          </Link>
        </div>
      </div>

      {/* All Purchased Subscriptions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Purchased Subscriptions & Plans ({displaySubscriptions.length})
          </h2>
          <span className="text-[11px] text-slate-500">
            {stats.activeSubscriptionsCount || (activeSubscription ? 1 : 0)} Active Tier(s)
          </span>
        </div>

        {displaySubscriptions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded p-6 text-center space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">No Purchased Subscriptions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You do not currently have any purchased subscription plans. Purchase a package to activate website hosting and campus capabilities.
            </p>
            <div className="pt-2">
              <Link
                href="/packages"
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium inline-block transition-colors"
              >
                Explore Subscription Packages &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {displaySubscriptions.map((sub) => {
              const isActive = sub.is_active || ['active', 'completed'].includes(String(sub.status || '').toLowerCase());
              const websitesAllowed = Number(sub.websitesAllowed ?? sub.max_websites ?? 1);
              const websitesUsed = Number(sub.websitesUsed ?? sub.websites_count ?? 0);
              const websitesRemaining = Math.max(0, websitesAllowed - websitesUsed);
              const canCreate = isActive && websitesRemaining > 0;
              const subWebsites = sub.provisioned_websites || websites.filter((w) => String(w.subscription_id) === String(sub.id));

              return (
                <div
                  key={sub.id}
                  className={`bg-white border rounded-lg p-4 transition-all shadow-sm ${
                    isActive ? 'border-slate-300 ring-1 ring-slate-100' : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{sub.package_name}</h3>
                        <span
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : sub.status === 'past_due'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {sub.status || 'Active'}
                        </span>
                        <span className="text-[10px] text-slate-500 capitalize bg-slate-100 px-2 py-0.5 rounded font-mono">
                          {sub.billing_interval || sub.billing_cycle || 'monthly'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {sub.package_tagline || sub.package_description || 'Full Educational SaaS Multi-Tenant Platform'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {sub.payment_id && (
                        <Link
                          href={`/creator/${creatorId}/payments/${sub.payment_id}`}
                          className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors"
                        >
                          View Receipt
                        </Link>
                      )}
                      {canCreate && (
                        <Link
                          href={`/creator/${creatorId}/workspace/new?subscriptionId=${sub.id}`}
                          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Create Website
                        </Link>
                      )}
                      {!canCreate && isActive && (
                        <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-medium">
                          Websites Limit Full ({websitesUsed}/{websitesAllowed})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quota & Capacity Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Websites Quota</span>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {websitesUsed} / {websitesAllowed}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {websitesRemaining} slot(s) free
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Teachers Limit</span>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {sub.max_teachers ? `${sub.max_teachers} Max` : 'Unlimited'}
                      </div>
                      <span className="text-[10px] text-slate-500">Faculty accounts</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Students Limit</span>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {sub.max_students ? `${sub.max_students} Max` : 'Unlimited'}
                      </div>
                      <span className="text-[10px] text-slate-500">Enrolled capacity</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cloud Storage</span>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {sub.max_storage_mb || 5120} MB
                      </div>
                      <span className="text-[10px] text-slate-500">Document storage</span>
                    </div>

                    <div className="space-y-0.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Subscription Period</span>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {sub.daysRemaining !== undefined ? `${sub.daysRemaining} Days Left` : 'Active'}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Ends: {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'Continuous'}
                      </span>
                    </div>
                  </div>

                  {/* Provisioned Websites under this Subscription */}
                  <div className="pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Websites Attached to this Plan ({subWebsites.length})
                      </span>
                      {canCreate && (
                        <Link
                          href={`/creator/${creatorId}/workspace/new?subscriptionId=${sub.id}`}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Provision new website for this plan
                        </Link>
                      )}
                    </div>

                    {subWebsites.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">
                        No websites created under this subscription package yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {subWebsites.map((w) => (
                          <div
                            key={w.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs"
                          >
                            <span className="font-semibold text-slate-800">{w.name}</span>
                            <span className="text-slate-400 font-mono text-[10px]">({w.subdomain})</span>
                            <Link
                              href={`/creator/${creatorId}/workspace/${w.subdomain || w.slug}`}
                              className="text-blue-600 hover:underline font-medium text-[10px] ml-1"
                            >
                              Workspace &rarr;
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Provisioned Websites Section */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Provisioned Websites ({websites.length})</h2>
            <p className="text-[11px] text-slate-500">
              Configure branding and manage staff module permissions for websites in your subscription.
            </p>
          </div>
          <Link
            href={`/creator/${creatorId}/workspace?setup=true`}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-medium text-xs"
          >
            New Website
          </Link>
        </div>

        {websites.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No websites provisioned under this subscription yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {websites.map((w) => {
              const rawSub = (w.subdomain || '').toLowerCase();
              const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;

              return (
                <div key={w.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-xs">{w.name}</span>
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                          w.is_published
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {w.is_published ? 'Live' : 'Draft'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {w.subdomain}.platform.com
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSettings(w)}
                      className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                    >
                      Website Settings
                    </button>
                    <Link
                      href={`/creator/${creatorId}/workspace/${w.subdomain || w.slug}?tab=staffs`}
                      className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Staff &amp; Permissions
                    </Link>
                    <a
                      href={`/website/${cleanSub}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
                    >
                      Live
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Website Settings Modal */}
      {selectedWebsiteForSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded border border-slate-200 max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Website Settings: {selectedWebsiteForSettings.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedWebsiteForSettings(null)}
                className="text-slate-400 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>

            {settingsErr && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {settingsErr}
              </div>
            )}
            {settingsMsg && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                {settingsMsg}
              </div>
            )}

            {loadingSettings ? (
              <LoadingScreen fullScreen={false} size="sm" label="Loading settings..." />
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Site Title</label>
                  <input
                    type="text"
                    required
                    value={siteSettings?.site_title || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, site_title: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={siteSettings?.tagline || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, tagline: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={siteSettings?.contact_email || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, contact_email: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={siteSettings?.contact_phone || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, contact_phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={siteSettings?.primary_color || '#2563eb'}
                        onChange={(e) => setSiteSettings({ ...siteSettings, primary_color: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer"
                      />
                      <span className="font-mono text-[11px]">{siteSettings?.primary_color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={siteSettings?.secondary_color || '#0ea5e9'}
                        onChange={(e) => setSiteSettings({ ...siteSettings, secondary_color: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer"
                      />
                      <span className="font-mono text-[11px]">{siteSettings?.secondary_color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Font Family</label>
                    <select
                      value={siteSettings?.font_family || 'Inter'}
                      onChange={(e) => setSiteSettings({ ...siteSettings, font_family: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Poppins">Poppins</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedWebsiteForSettings(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}


    </div>
  );
}

export default function CreatorSubscriptionPage() {
  return (
    <Suspense
      fallback={<LoadingScreen fullScreen={false} label="Loading subscription details..." />}
    >
      <SubscriptionContent />
    </Suspense>
  );
}
