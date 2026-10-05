'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreator } from '../layout';
import Link from 'next/link';

function SubscriptionContent() {
  const {
    creatorId,
    creator,
    activeSubscription,
    websites = [],
    stats = {},
    refetch,
  } = useCreator();

  const searchParams = useSearchParams();
  const targetWebsiteId = searchParams.get('websiteId');

  // Website Settings Modal State
  const [selectedWebsiteForSettings, setSelectedWebsiteForSettings] = useState(null);
  const [siteSettings, setSiteSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsErr, setSettingsErr] = useState('');

  // Website Team Modal State
  const [selectedWebsiteForTeam, setSelectedWebsiteForTeam] = useState(null);
  const [teamData, setTeamData] = useState({ users: [], roles: [], modules: [], permissions: [] });
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [teamMsg, setTeamMsg] = useState('');
  const [teamErr, setTeamErr] = useState('');

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState([]);

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

  const handleOpenTeam = async (website) => {
    setSelectedWebsiteForTeam(website);
    setLoadingTeam(true);
    setTeamMsg('');
    setTeamErr('');

    try {
      const res = await fetch(`/api/marketing/creator/website-team?websiteId=${website.id}`);
      const data = await res.json();
      if (data.success) {
        setTeamData(data);
        if (data.roles && data.roles.length > 0) {
          setNewUserRole(data.roles[0].id);
        }
      } else {
        setTeamErr(data.error || 'Failed to load team data.');
      }
    } catch {
      setTeamErr('Network error loading team members.');
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!selectedWebsiteForTeam) return;
    setAddingUser(true);
    setTeamMsg('');
    setTeamErr('');

    try {
      const res = await fetch('/api/marketing/creator/website-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_user',
          websiteId: selectedWebsiteForTeam.id,
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword.trim() || undefined,
          roleId: Number(newUserRole),
          phone: newUserPhone.trim() || undefined,
          permissionIds: selectedPermIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTeamMsg('User created and role assigned successfully.');
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserPhone('');
        setSelectedPermIds([]);
        await handleOpenTeam(selectedWebsiteForTeam);
      } else {
        setTeamErr(data.error || 'Failed to create user.');
      }
    } catch {
      setTeamErr('Network error creating user.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user from this website?')) return;
    try {
      const res = await fetch('/api/marketing/creator/website-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_user',
          websiteId: selectedWebsiteForTeam.id,
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await handleOpenTeam(selectedWebsiteForTeam);
      } else {
        alert(data.error || 'Failed to delete user.');
      }
    } catch {
      alert('Network error deleting user.');
    }
  };

  const togglePermission = (permId) => {
    setSelectedPermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
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
            Review active tier terms, website limits, branding settings, and user role permissions.
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

      {/* Subscription KPI Card */}
      {isSubActive ? (
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Current Plan</span>
              <h2 className="text-sm font-semibold text-slate-900">{activeSubscription.package_name}</h2>
              <span className="text-[11px] text-slate-500 font-mono">
                ${(Number(activeSubscription.price_in_cents || 0) / 100).toFixed(2)} / {activeSubscription.billing_interval || 'monthly'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Websites Allowed</span>
              <div className="text-sm font-semibold text-slate-900 font-mono">
                {websites.length} / {maxWebsites}
              </div>
              <span className="text-[11px] text-slate-500">
                {maxWebsites - websites.length} slot(s) free
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Days Remaining</span>
              <div className="text-sm font-semibold text-slate-900 font-mono">
                {daysRemaining} Days
              </div>
              <span className="text-[11px] text-slate-500">
                Ends: {activeSubscription.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString() : '—'}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Link
                href={`/creator/${creatorId}/workspace`}
                className="w-full text-center py-1.5 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium"
              >
                Manage Websites
              </Link>
              <Link
                href={`/creator/${creatorId}/payments`}
                className="w-full text-center py-1.5 px-3 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
              >
                Billing Invoices
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded p-5 text-center space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">No Active Subscription Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not currently have an active plan. Purchase a package to activate website hosting capabilities.
          </p>
          <div className="pt-2">
            <Link
              href="/packages"
              className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium inline-block"
            >
              Explore Packages &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Provisioned Websites Section */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Provisioned Websites ({websites.length})</h2>
            <p className="text-[11px] text-slate-500">
              Configure branding and assign team roles for websites in your subscription.
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
                    <button
                      type="button"
                      onClick={() => handleOpenTeam(w)}
                      className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                    >
                      Team & Roles
                    </button>
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
              <div className="py-6 text-center text-slate-500">Loading settings...</div>
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

                <div className="grid grid-cols-2 gap-2">
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

      {/* Website Team Modal */}
      {selectedWebsiteForTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded border border-slate-200 max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Team & Roles: {selectedWebsiteForTeam.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedWebsiteForTeam(null)}
                className="text-slate-400 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>

            {teamErr && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {teamErr}
              </div>
            )}
            {teamMsg && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                {teamMsg}
              </div>
            )}

            {loadingTeam ? (
              <div className="py-6 text-center text-slate-500">Loading team...</div>
            ) : (
              <div className="space-y-4">
                {/* Team Members List */}
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Current Team Members ({teamData.users?.length || 0})
                  </h4>
                  {teamData.users?.length === 0 ? (
                    <p className="text-slate-400 italic">No additional team members assigned.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded">
                      {teamData.users.map((u) => (
                        <div key={u.id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-900 flex items-center gap-2">
                              <span>{u.name}</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                                {u.role_name || 'Member'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-rose-600 hover:underline font-medium cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add User Form */}
                <form onSubmit={handleAddUser} className="p-3 border border-slate-200 rounded space-y-3 bg-slate-50">
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Add New Team Member
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Sarah"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="sarah@example.com"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                      >
                        {teamData.roles?.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Leave blank for auto"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="submit"
                      disabled={addingUser}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                    >
                      {addingUser ? 'Adding...' : 'Add Team Member'}
                    </button>
                  </div>
                </form>
              </div>
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
      fallback={
        <div className="py-8 text-center text-xs text-slate-500 font-medium">
          Loading subscription details...
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}
