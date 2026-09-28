'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreator } from '../layout';
import Link from 'next/link';
import {
  BiCheckShield,
  BiDesktop,
  BiCube,
  BiCog,
  BiGroup,
  BiCheckCircle,
  BiCalendar,
  BiTimeFive,
  BiPlus,
  BiTrash,
  BiLinkExternal,
  BiLoaderAlt,
  BiX,
  BiGlobe,
  BiSave,
} from 'react-icons/bi';

function SubscriptionContent() {
  const {
    creatorId,
    creator,
    activeSubscription,
    subscriptions = [],
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

  // Auto-open settings if websiteId query param is provided
  useEffect(() => {
    if (targetWebsiteId && websites.length > 0) {
      const matched = websites.find((w) => String(w.id) === String(targetWebsiteId));
      if (matched) {
        setTimeout(() => {
          setSelectedWebsiteForSettings(matched);
          setLoadingSettings(true);
          fetch(`/api/creator/website-settings?websiteId=${matched.id}`)
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
                  primary_color: matched.primary_color || '#6366f1',
                  secondary_color: matched.secondary_color || '#4f46e5',
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

  // Open & Fetch Website Settings
  const handleOpenSettings = async (website) => {
    setSelectedWebsiteForSettings(website);
    setLoadingSettings(true);
    setSettingsMsg('');
    setSettingsErr('');

    try {
      const res = await fetch(`/api/creator/website-settings?websiteId=${website.id}`);
      const data = await res.json();
      if (data.success && data.settings) {
        setSiteSettings(data.settings);
      } else {
        // Default template
        setSiteSettings({
          site_title: website.name || '',
          tagline: website.tagline || '',
          contact_email: website.contact_email || creator?.email || '',
          contact_phone: website.contact_phone || creator?.phone || '',
          primary_color: website.primary_color || '#6366f1',
          secondary_color: website.secondary_color || '#4f46e5',
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
      const res = await fetch('/api/creator/website-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: selectedWebsiteForSettings.id,
          ...siteSettings,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMsg('Website settings saved successfully!');
        if (refetch) await refetch();
        setTimeout(() => {
          setSelectedWebsiteForSettings(null);
          setSettingsMsg('');
        }, 1200);
      } else {
        setSettingsErr(data.error || 'Failed to save settings.');
      }
    } catch {
      setSettingsErr('Network error saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Open & Fetch Website Team
  const handleOpenTeam = async (website) => {
    setSelectedWebsiteForTeam(website);
    setLoadingTeam(true);
    setTeamMsg('');
    setTeamErr('');

    try {
      const res = await fetch(`/api/creator/website-team?websiteId=${website.id}`);
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
      const res = await fetch('/api/creator/website-team', {
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
        setTeamMsg('Team user created and role assigned successfully!');
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserPhone('');
        setSelectedPermIds([]);
        // Refresh team list
        await handleOpenTeam(selectedWebsiteForTeam);
      } else {
        setTeamErr(data.error || 'Failed to create user.');
      }
    } catch {
      setTeamErr('Network error creating team user.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user from this website?')) return;
    try {
      const res = await fetch('/api/creator/website-team', {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription & Website Ecosystem</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Active Plan
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Review your active package tier, website quotas, manage branding settings, and configure website users and role permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/creator/checkout"
            className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <BiCube className="text-base" />
            <span>Upgrade / Switch Plan</span>
          </Link>
        </div>
      </div>

      {/* Subscription KPI Card */}
      {isSubActive ? (
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-800/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Current Plan</span>
              <h2 className="text-2xl font-black text-white">{activeSubscription.package_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Active Subscription
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ${(Number(activeSubscription.price_in_cents || 0) / 100).toFixed(2)} / {activeSubscription.billing_interval}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Allowed Websites</span>
              <div className="text-2xl font-bold text-white font-mono">
                {websites.length} <span className="text-xs text-slate-400 font-normal">of {maxWebsites} used</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {maxWebsites - websites.length > 0
                  ? `${maxWebsites - websites.length} slot(s) available for new sites`
                  : 'Full quota utilized'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Remaining</span>
              <div className="text-2xl font-bold text-white font-mono flex items-center gap-2">
                <BiTimeFive className="text-indigo-400" />
                <span>{daysRemaining} Days</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Renews on {activeSubscription.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString() : '—'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href={`/creator/${creatorId}/webites`}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <BiDesktop />
                <span>Manage All Websites</span>
              </Link>
              <Link
                href={`/creator/${creatorId}/payments`}
                className="w-full py-2 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all text-center"
              >
                View Invoices & Receipts
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-amber-50 border border-amber-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl">
            <BiCube />
          </div>
          <h3 className="text-base font-bold text-amber-900">No Active Subscription Found</h3>
          <p className="text-xs text-amber-700 max-w-md mx-auto">
            You do not have an active package subscription. Select a package and complete your payment to activate unlimited site capabilities.
          </p>
          <Link
            href="/creator/checkout"
            className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs"
          >
            <span>Explore Packages & Subscribe Now →</span>
          </Link>
        </div>
      )}

      {/* Websites Under This Subscription */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Provisioned Subscription Websites</h2>
            <p className="text-xs text-slate-500">
              Configure branding settings and assign team user roles for each website under your account.
            </p>
          </div>
          <Link
            href={`/creator/${creatorId}/webites?setup=true`}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all shrink-0"
          >
            <BiPlus className="text-base" />
            <span>Setup New Website</span>
          </Link>
        </div>

        {websites.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-3">
            <BiDesktop className="text-4xl mx-auto text-slate-300" />
            <p>No websites provisioned under this subscription yet.</p>
            <Link
              href={`/creator/${creatorId}/webites?setup=true`}
              className="inline-block py-2 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Setup First Website Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {websites.map((w) => {
              const rawSub = (w.subdomain || '').toLowerCase();
              const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;

              return (
                <div
                  key={w.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{w.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-indigo-600 font-mono mt-0.5">
                          <BiGlobe className="text-slate-400" />
                          <span>{w.subdomain}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          w.is_published
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {w.is_published ? 'Live' : 'Draft'}
                      </span>
                    </div>

                    {w.tagline && <p className="text-xs text-slate-500 italic line-clamp-1">&ldquo;{w.tagline}&rdquo;</p>}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    {/* Management Links */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSettings(w)}
                        className="py-1.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <BiCog className="text-slate-500 text-sm" />
                        <span>Website Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenTeam(w)}
                        className="py-1.5 px-3 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <BiGroup className="text-indigo-600 text-sm" />
                        <span>Team & Roles</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/website/${cleanSub}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
                        title="View Live Website"
                      >
                        <BiLinkExternal className="text-base" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Website Settings Modal */}
      {selectedWebsiteForSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-base">
                  <BiCog />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage Website Settings</h3>
                  <p className="text-[11px] text-slate-500">Website: {selectedWebsiteForSettings.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWebsiteForSettings(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {settingsErr && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {settingsErr}
              </div>
            )}
            {settingsMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                {settingsMsg}
              </div>
            )}

            {loadingSettings ? (
              <div className="py-12 flex justify-center">
                <BiLoaderAlt className="animate-spin text-2xl text-indigo-600" />
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Site Title</label>
                  <input
                    type="text"
                    required
                    value={siteSettings?.site_title || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, site_title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Tagline / Mission</label>
                  <input
                    type="text"
                    value={siteSettings?.tagline || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, tagline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Contact Email</label>
                    <input
                      type="email"
                      value={siteSettings?.contact_email || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, contact_email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Contact Phone</label>
                    <input
                      type="text"
                      value={siteSettings?.contact_phone || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, contact_phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={siteSettings?.primary_color || '#6366f1'}
                        onChange={(e) => setSiteSettings({ ...siteSettings, primary_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer"
                      />
                      <span className="font-mono text-[11px]">{siteSettings?.primary_color}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={siteSettings?.secondary_color || '#4f46e5'}
                        onChange={(e) => setSiteSettings({ ...siteSettings, secondary_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer"
                      />
                      <span className="font-mono text-[11px]">{siteSettings?.secondary_color}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Font Family</label>
                    <select
                      value={siteSettings?.font_family || 'Inter'}
                      onChange={(e) => setSiteSettings({ ...siteSettings, font_family: e.target.value })}
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
                    onClick={() => setSelectedWebsiteForSettings(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingSettings ? <BiLoaderAlt className="animate-spin text-base" /> : <BiSave className="text-base" />}
                    <span>Save Settings</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Website Team & Permissions Modal */}
      {selectedWebsiteForTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-base">
                  <BiGroup />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Website Team & Module Permissions</h3>
                  <p className="text-[11px] text-slate-500">Website: {selectedWebsiteForTeam.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWebsiteForTeam(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {teamErr && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {teamErr}
              </div>
            )}
            {teamMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                {teamMsg}
              </div>
            )}

            {loadingTeam ? (
              <div className="py-12 flex justify-center">
                <BiLoaderAlt className="animate-spin text-2xl text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Current Team Users List */}
                <div className="space-y-2.5">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Current Team Members ({teamData.users?.length || 0})
                  </h4>
                  {teamData.users?.length === 0 ? (
                    <p className="text-slate-400 italic">No additional team members assigned to this website yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                      {teamData.users.map((u) => (
                        <div key={u.id} className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span>{u.name}</span>
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase">
                                {u.role_name || 'Member'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove user"
                          >
                            <BiTrash className="text-base" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New User Form */}
                <form onSubmit={handleAddUser} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <BiPlus className="text-indigo-600 text-base" />
                    <span>Invite & Create New Website User</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Sarah Jenkins"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Email Address</label>
                      <input
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="sarah@studio.com"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Initial Password</label>
                      <input
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Leave blank for auto-generated"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Assign Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-indigo-600"
                      >
                        {teamData.roles?.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.slug})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Module Permissions Checkboxes */}
                  <div className="space-y-1.5 pt-1">
                    <label className="font-bold text-slate-700">Grant Module Permissions (Optional)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2.5 bg-white border border-slate-200 rounded-xl">
                      {teamData.permissions?.map((p) => {
                        const checked = selectedPermIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all ${
                              checked ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <span className="truncate">{p.name || p.slug}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={addingUser}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {addingUser ? <BiLoaderAlt className="animate-spin text-base" /> : <BiPlus className="text-base" />}
                    <span>Create User & Assign Role</span>
                  </button>
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
        <div className="min-h-[40vh] flex items-center justify-center">
          <BiLoaderAlt className="animate-spin text-3xl text-indigo-600" />
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}
