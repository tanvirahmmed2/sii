'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreator } from '../layout';
import Link from 'next/link';
import {
  BiDesktop,
  BiPlus,
  BiLinkExternal,
  BiPalette,
  BiTrash,
  BiEdit,
  BiCheckCircle,
  BiGlobe,
  BiHdd,
  BiLoaderAlt,
  BiX,
  BiCog,
  BiGroup,
  BiRocket,
  BiCube,
} from 'react-icons/bi';

function WebsitesContent() {
  const {
    creatorId,
    creator,
    websites = [],
    activeSubscription,
    stats = {},
    refetch,
  } = useCreator();

  const searchParams = useSearchParams();
  const setupParam = searchParams.get('setup');

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupName, setSetupName] = useState('My Portfolio & Store');
  const [setupSubdomain, setSetupSubdomain] = useState(`creator-${creatorId}`);
  const [setupTagline, setSetupTagline] = useState('Modern Creative Showcase & Digital Store');
  const [setupContactEmail, setSetupContactEmail] = useState(creator?.email || '');
  const [setupContactPhone, setSetupContactPhone] = useState(creator?.phone || '');
  const [setupPrimaryColor, setSetupPrimaryColor] = useState('#6366f1');
  const [setupSecondaryColor, setSetupSecondaryColor] = useState('#4f46e5');
  const [setupFontFamily, setSetupFontFamily] = useState('Inter');
  const [setupCurrency, setSetupCurrency] = useState('USD');
  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');

  // Edit website state
  const [editingWebsite, setEditingWebsite] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSubdomain, setEditSubdomain] = useState('');
  const [editCustomDomain, setEditCustomDomain] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('#6366f1');
  const [editFontFamily, setEditFontFamily] = useState('Inter');
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateErr, setUpdateErr] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [hostDomain, setHostDomain] = useState(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      return host.includes(':') ? host.split(':')[0] : host;
    }
    return 'localhost:3000';
  });

  useEffect(() => {
    if (setupParam === 'true') {
      const timer = setTimeout(() => setShowSetupModal(true), 0);
      return () => clearTimeout(timer);
    }
  }, [setupParam]);

  const maxWebsites = stats?.maxWebsites || activeSubscription?.max_websites || activeSubscription?.max_portfolios || 1;
  const hasActivePackage = Boolean(activeSubscription && stats?.daysRemaining > 0);

  const handleOpenEdit = (w) => {
    setEditingWebsite(w);
    setEditName(w.name);
    setEditSubdomain(w.subdomain);
    setEditCustomDomain(w.custom_domain || '');
    setEditPrimaryColor(w.theme_config?.primaryColor || '#6366f1');
    setEditFontFamily(w.theme_config?.fontFamily || 'Inter');
    setEditIsPublished(w.is_published !== false);
    setUpdateMsg('');
    setUpdateErr('');
  };

  const handleSetupWebsite = async (e) => {
    e.preventDefault();
    setSettingUp(true);
    setSetupError('');
    setSetupSuccess('');

    const cleanSub = (setupSubdomain || '').trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
    if (!cleanSub || cleanSub.length < 3) {
      setSetupError('Subdomain prefix is required and must be at least 3 characters.');
      setSettingUp(false);
      return;
    }

    try {
      const res = await fetch('/api/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup_website',
          creatorId: Number(creatorId),
          name: setupName.trim(),
          subdomain: cleanSub,
          tagline: setupTagline.trim(),
          contactEmail: setupContactEmail.trim() || null,
          contactPhone: setupContactPhone.trim() || null,
          primaryColor: setupPrimaryColor,
          secondaryColor: setupSecondaryColor,
          fontFamily: setupFontFamily,
          currency: setupCurrency,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSetupSuccess('Website provisioned successfully with settings and modules!');
        if (refetch) await refetch();
        setTimeout(() => {
          setShowSetupModal(false);
          setSetupSuccess('');
        }, 1200);
      } else {
        setSetupError(data.error || 'Failed to setup website.');
      }
    } catch {
      setSetupError('Network error setting up subscription website.');
    } finally {
      setSettingUp(false);
    }
  };

  const handleSaveWebsite = async (e) => {
    e.preventDefault();
    if (!editingWebsite) return;
    setUpdating(true);
    setUpdateMsg('');
    setUpdateErr('');

    try {
      const res = await fetch('/api/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_website',
          id: editingWebsite.id,
          creatorId: Number(creatorId),
          name: editName,
          subdomain: editSubdomain,
          custom_domain: editCustomDomain || null,
          is_published: editIsPublished,
          theme_config: {
            primaryColor: editPrimaryColor,
            fontFamily: editFontFamily,
            mode: 'dark',
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setUpdateMsg('Website updated successfully!');
        if (refetch) await refetch();
        setTimeout(() => {
          setEditingWebsite(null);
          setUpdateMsg('');
        }, 1000);
      } else {
        setUpdateErr(json.error || 'Failed to update website.');
      }
    } catch {
      setUpdateErr('Network error.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteWebsite = async (websiteId, websiteName) => {
    if (!confirm(`Are you sure you want to delete website "${websiteName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(websiteId);
    try {
      const res = await fetch('/api/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_website',
          id: websiteId,
          creatorId: Number(creatorId),
        }),
      });
      const json = await res.json();
      if (json.success) {
        if (refetch) await refetch();
      } else {
        alert(json.error || 'Failed to delete website');
      }
    } catch {
      alert('Network error deleting website.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Website Architecture</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Websites
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Manage your provisioned websites, domain routing, theme visual styles, and website team configurations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasActivePackage && websites.length < maxWebsites && (
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <BiRocket className="text-base" />
              <span>Setup Subscription Website</span>
            </button>
          )}

          {!hasActivePackage && (
            <Link
              href="/creator/checkout"
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
            >
              <BiCube className="text-base" />
              <span>Purchase Package First</span>
            </Link>
          )}
        </div>
      </div>

      {/* Subscription Status Bar */}
      {hasActivePackage ? (
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-700">
              Active Package: <strong className="text-slate-900 font-bold">{activeSubscription?.package_name}</strong> • Allowed Websites:{' '}
              <strong className="text-indigo-700">{websites.length} of {maxWebsites} used</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/creator/${creatorId}/subscription`}
              className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View Subscription Details & Team Settings →</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-amber-800">
            You do not currently have an active package subscription. Purchase or activate a plan to provision and publish websites.
          </span>
          <Link
            href="/creator/checkout"
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 text-center"
          >
            Browse Packages & Plans →
          </Link>
        </div>
      )}

      {/* Websites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {websites.length === 0 ? (
          <div className="md:col-span-2 p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-3xl">
              <BiDesktop />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No Websites Provisioned Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {hasActivePackage
                  ? 'Your package subscription is active! Click below to setup your first portfolio website with complete settings and modules.'
                  : 'Purchase a package subscription to unlock website provisioning on your claimed subdomain.'}
              </p>
            </div>
            {hasActivePackage && (
              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <BiRocket className="text-base" />
                <span>Setup Your Subscription Website Now</span>
              </button>
            )}
          </div>
        ) : (
          websites.map((w) => {
            const rawSub = (w.subdomain || '').toLowerCase();
            const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;
            const fullDomainPreview = rawSub.includes('.') ? rawSub : `${rawSub}.${hostDomain}`;

            return (
              <div
                key={w.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{w.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-mono mt-0.5">
                        <BiGlobe className="text-slate-400" />
                        <span>{fullDomainPreview}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        w.is_published
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {w.is_published ? 'Live' : 'Draft'}
                    </span>
                  </div>

                  {w.tagline && (
                    <p className="text-xs text-slate-500 italic line-clamp-1">&ldquo;{w.tagline}&rdquo;</p>
                  )}

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Storage</span>
                      <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                        <BiHdd className="text-slate-400" />
                        <span>{w.storage_used_mb || 15} MB</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Primary Color</span>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 mt-0.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-xs"
                          style={{ backgroundColor: w.primary_color || w.theme_config?.primaryColor || '#6366f1' }}
                        />
                        <span className="font-mono text-[11px]">{w.primary_color || w.theme_config?.primaryColor || '#6366f1'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/website/${cleanSub}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Visit live website"
                    >
                      <BiLinkExternal />
                      <span>Live Site</span>
                    </a>
                    <a
                      href={`/website/${cleanSub}/dashboard`}
                      className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Open admin dashboard"
                    >
                      <BiDesktop />
                      <span>CMS Dash</span>
                    </a>
                    <Link
                      href={`/creator/${creatorId}/subscription?websiteId=${w.id}`}
                      className="p-2 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Manage Website Settings & Team"
                    >
                      <BiCog />
                      <span>Settings & Team</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(w)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Edit website basic info"
                    >
                      <BiEdit className="text-base" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === w.id}
                      onClick={() => handleDeleteWebsite(w.id, w.name)}
                      className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete website"
                    >
                      {deletingId === w.id ? <BiLoaderAlt className="animate-spin text-base" /> : <BiTrash className="text-base" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Setup Subscription Website Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-base">
                  <BiRocket />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Setup Subscription Website</h3>
                  <p className="text-[11px] text-slate-500">Claim your subdomain and configure initial website settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {setupError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {setupError}
              </div>
            )}
            {setupSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                {setupSuccess}
              </div>
            )}

            <form onSubmit={handleSetupWebsite} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Website Name</label>
                <input
                  type="text"
                  required
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="e.g. Tanvir Creative Studio"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              {/* Subdomain Input with full format preview */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Subdomain Prefix</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    value={setupSubdomain}
                    onChange={(e) => setSetupSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-portfolio"
                    className="w-1/2 bg-slate-50 border border-slate-300 rounded-l-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                  />
                  <div className="w-1/2 bg-slate-100 border border-l-0 border-slate-300 rounded-r-xl px-3.5 py-2 text-slate-500 font-mono text-[11px] truncate">
                    .{hostDomain}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Primary full format stored: <strong className="text-indigo-600 font-mono">{setupSubdomain || 'subdomain'}.{hostDomain}</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Tagline / Mission</label>
                <input
                  type="text"
                  value={setupTagline}
                  onChange={(e) => setSetupTagline(e.target.value)}
                  placeholder="e.g. Modern Full-Stack Design & Architecture"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Contact Email</label>
                  <input
                    type="email"
                    value={setupContactEmail}
                    onChange={(e) => setSetupContactEmail(e.target.value)}
                    placeholder="contact@studio.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Contact Phone</label>
                  <input
                    type="text"
                    value={setupContactPhone}
                    onChange={(e) => setSetupContactPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={setupPrimaryColor}
                      onChange={(e) => setSetupPrimaryColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-[11px] text-slate-600">{setupPrimaryColor}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={setupSecondaryColor}
                      onChange={(e) => setSetupSecondaryColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-[11px] text-slate-600">{setupSecondaryColor}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Font Family</label>
                  <select
                    value={setupFontFamily}
                    onChange={(e) => setSetupFontFamily(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Outfit">Outfit</option>
                    <option value="Poppins">Poppins</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingUp}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {settingUp ? (
                    <>
                      <BiLoaderAlt className="animate-spin text-base" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Provision Website Now →</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Website Modal */}
      {editingWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Website Basic Info</h3>
              <button
                type="button"
                onClick={() => setEditingWebsite(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {updateErr && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {updateErr}
              </div>
            )}
            {updateMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                {updateMsg}
              </div>
            )}

            <form onSubmit={handleSaveWebsite} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Website Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Subdomain</label>
                <input
                  type="text"
                  required
                  value={editSubdomain}
                  onChange={(e) => setEditSubdomain(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Custom Domain (Optional)</label>
                <input
                  type="text"
                  value={editCustomDomain}
                  onChange={(e) => setEditCustomDomain(e.target.value)}
                  placeholder="e.g. www.mysite.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsPublished"
                  checked={editIsPublished}
                  onChange={(e) => setEditIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="editIsPublished" className="font-semibold text-slate-700 cursor-pointer">
                  Publish Website (Publicly Accessible)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingWebsite(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updating ? <BiLoaderAlt className="animate-spin text-base" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatorWebsitesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <BiLoaderAlt className="animate-spin text-3xl text-indigo-600" />
        </div>
      }
    >
      <WebsitesContent />
    </Suspense>
  );
}
