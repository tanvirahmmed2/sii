'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreator } from '../layout';
import Link from 'next/link';

function WorkspaceContent() {
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
  const [setupName, setSetupName] = useState('My School');
  const [setupSubdomain, setSetupSubdomain] = useState(`creator-${creatorId}`);
  const [setupTagline, setSetupTagline] = useState('Modern Educational Platform');
  const [setupContactEmail, setSetupContactEmail] = useState(creator?.email || '');
  const [setupContactPhone, setSetupContactPhone] = useState(creator?.phone || '');
  const [setupPrimaryColor, setSetupPrimaryColor] = useState('#2563eb');
  const [setupSecondaryColor, setSetupSecondaryColor] = useState('#1e40af');
  const [setupFontFamily, setSetupFontFamily] = useState('Inter');
  const [setupCurrency, setSetupCurrency] = useState('BDT');
  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');

  // Edit website state
  const [editingWebsite, setEditingWebsite] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSubdomain, setEditSubdomain] = useState('');
  const [editCustomDomain, setEditCustomDomain] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('#2563eb');
  const [editFontFamily, setEditFontFamily] = useState('Inter');
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateErr, setUpdateErr] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [copiedSubdomain, setCopiedSubdomain] = useState(null);

  useEffect(() => {
    if (setupParam === 'true') {
      const timer = setTimeout(() => setShowSetupModal(true), 0);
      return () => clearTimeout(timer);
    }
  }, [setupParam]);

  const maxWebsites = stats?.maxWebsites || activeSubscription?.max_websites || activeSubscription?.max_portfolios || 1;
  const hasActivePackage = Boolean(activeSubscription && (stats?.daysRemaining > 0 || !activeSubscription.expires_at || new Date(activeSubscription.expires_at) > new Date()));

  const handleOpenEdit = (w) => {
    setEditingWebsite(w);
    setEditName(w.name);
    setEditSubdomain(w.subdomain);
    setEditCustomDomain(w.custom_domain || '');
    setEditPrimaryColor(w.primary_color || w.theme_config?.primaryColor || '#2563eb');
    setEditFontFamily(w.theme_config?.fontFamily || 'Inter');
    setEditIsPublished(w.is_published !== false);
    setUpdateMsg('');
    setUpdateErr('');
  };

  const handleCopyUrl = (url, id) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedSubdomain(id);
      setTimeout(() => setCopiedSubdomain(null), 2000);
    }
  };

  const handleSetupWebsite = async (e) => {
    e.preventDefault();
    setSettingUp(true);
    setSetupError('');
    setSetupSuccess('');

    const cleanSub = (setupSubdomain || '').trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
    if (!cleanSub || cleanSub.length < 3) {
      setSetupError('Subdomain is required and must be at least 3 characters.');
      setSettingUp(false);
      return;
    }

    try {
      const res = await fetch('/api/marketing/creator/websites', {
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
        setSetupSuccess('Website created successfully.');
        if (refetch) await refetch();
        setTimeout(() => {
          setShowSetupModal(false);
          setSetupSuccess('');
        }, 1000);
      } else {
        setSetupError(data.error || 'Failed to setup website.');
      }
    } catch {
      setSetupError('Network error setting up website.');
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
      const res = await fetch('/api/marketing/creator/websites', {
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
            mode: 'light',
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setUpdateMsg('Website updated successfully.');
        if (refetch) await refetch();
        setTimeout(() => {
          setEditingWebsite(null);
          setUpdateMsg('');
        }, 1000);
      } else {
        setUpdateErr(json.error || 'Failed to update website.');
      }
    } catch {
      setUpdateErr('Network error updating website.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteWebsite = async (websiteId, websiteName) => {
    if (!confirm(`Are you sure you want to delete website "${websiteName}"?`)) {
      return;
    }

    setDeletingId(websiteId);
    try {
      const res = await fetch('/api/marketing/creator/websites', {
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
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400">
              Websites Workspace
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {websites.length} of {maxWebsites} provisioned
            </span>
          </div>
          <h1 className="text-base font-semibold text-slate-900">
            Portfolio Websites
          </h1>
          <p className="text-slate-500 text-xs">
            Manage your deployed educational websites, custom domains, and branding settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasActivePackage && websites.length < maxWebsites && (
            <button
              type="button"
              onClick={() => {
                setShowSetupModal(true);
                setSetupError('');
                setSetupSuccess('');
              }}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors cursor-pointer"
            >
              New Website
            </button>
          )}
          <Link
            href={`/creator/${creatorId}/subscription`}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            Subscription Details
          </Link>
        </div>
      </div>

      {/* Websites Table */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">
            All Websites ({websites.length})
          </h2>
          <span className="text-[11px] text-slate-500">
            Quota: {websites.length}/{maxWebsites}
          </span>
        </div>

        {websites.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <p className="font-medium">No websites created yet.</p>
            <p className="text-[11px] text-slate-400">
              Create your first educational website instance to start publishing.
            </p>
            {hasActivePackage && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(true)}
                  className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium cursor-pointer"
                >
                  Create First Website
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Website Name</th>
                  <th className="pb-2">Subdomain</th>
                  <th className="pb-2">Custom Domain</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {websites.map((w) => {
                  const rawSub = (w.subdomain || '').toLowerCase();
                  const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;
                  const liveUrl = `/website/${cleanSub}`;

                  return (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-900">
                        {w.name}
                        {w.tagline && (
                          <span className="block text-[11px] text-slate-400 truncate max-w-xs">
                            {w.tagline}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 font-mono text-slate-600">
                        {w.subdomain}
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                        {w.custom_domain || '—'}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                            w.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {w.is_published ? 'Live' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px] font-mono">
                        {w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 text-right space-x-2">
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-800 hover:underline font-medium"
                        >
                          Live Site
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(w)}
                          className="text-slate-800 hover:underline font-medium cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(liveUrl, w.id)}
                          className="text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          {copiedSubdomain === w.id ? 'Copied' : 'Copy URL'}
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === w.id}
                          onClick={() => handleDeleteWebsite(w.id, w.name)}
                          className="text-rose-600 hover:underline font-medium cursor-pointer"
                        >
                          {deletingId === w.id ? 'Deleting...' : 'Delete'}
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

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full p-5 space-y-4 text-xs text-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">Provision New Website</h3>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>

            {setupError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {setupError}
              </div>
            )}
            {setupSuccess && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                {setupSuccess}
              </div>
            )}

            <form onSubmit={handleSetupWebsite} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Website Name *
                </label>
                <input
                  type="text"
                  required
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Subdomain Prefix *
                </label>
                <div className="flex items-center border border-slate-300 rounded overflow-hidden">
                  <input
                    type="text"
                    required
                    value={setupSubdomain}
                    onChange={(e) => setSetupSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                  />
                  <span className="px-2.5 py-1.5 text-[11px] text-slate-500 bg-slate-50 border-l border-slate-200 font-mono">
                    .platform.com
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={setupTagline}
                  onChange={(e) => setSetupTagline(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={setupContactEmail}
                    onChange={(e) => setSetupContactEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={setupContactPhone}
                    onChange={(e) => setSetupContactPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingUp}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                >
                  {settingUp ? 'Setting up...' : 'Create Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full p-5 space-y-4 text-xs text-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Edit Website: {editingWebsite.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingWebsite(null)}
                className="text-slate-400 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>

            {updateErr && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {updateErr}
              </div>
            )}
            {updateMsg && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                {updateMsg}
              </div>
            )}

            <form onSubmit={handleSaveWebsite} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Website Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Subdomain *
                </label>
                <input
                  type="text"
                  required
                  value={editSubdomain}
                  onChange={(e) => setEditSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Custom Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. www.myschool.edu"
                  value={editCustomDomain}
                  onChange={(e) => setEditCustomDomain(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsPublished"
                  checked={editIsPublished}
                  onChange={(e) => setEditIsPublished(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <label htmlFor="editIsPublished" className="text-slate-700 font-medium cursor-pointer">
                  Publish Website (Make Live)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingWebsite(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatorWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-xs text-slate-500 font-medium">
          Loading websites workspace...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
