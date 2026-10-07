'use client';

import { useState, useEffect, useContext, use } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import LoadingScreen from 'src/component/common/LoadingScreen';
import { Context } from 'src/component/helper/Context';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiGlobe,
  FiUser,
  FiPackage,
  FiCreditCard,
  FiLayers,
  FiCheckCircle,
  FiAlertCircle,
  FiExternalLink,
  FiCopy,
  FiSave,
  FiX,
  FiTrash2,
  FiShield,
  FiCheck,
  FiEye,
  FiSettings,
  FiActivity,
  FiHardDrive,
  FiMail,
  FiPhone,
  FiMapPin
} from 'react-icons/fi';

export default function WebsiteDetailsPage({ params }) {
  const router = useRouter();
  const routeParams = useParams();
  const websiteId = routeParams?.id || (params ? (typeof params.then === 'function' ? use(params)?.id : params.id) : null);

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAuthorized = permissions.includes('websites');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'edit_website' | 'edit_creator' | 'modules' | 'billing'

  const [saving, setSaving] = useState(false);
  const [moduleToggling, setModuleToggling] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Website Edit Form State
  const [websiteForm, setWebsiteForm] = useState({
    name: '',
    subdomain: '',
    custom_domain: '',
    custom_domain_verified: false,
    institution_type: 'School',
    eiin_number: '',
    status: 'active',
    is_published: true,
    subscription_id: '',
    creator_id: '',
    theme: 'default',
    primary_color: '#1e40af',
    secondary_color: '#0ea5e9',
    logo: '',
    favicon: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    storage_used_mb: 0,
    subscription_expires_at: '',
  });

  // Creator Edit Form State
  const [creatorForm, setCreatorForm] = useState({
    name: '',
    phone: '',
    institution: '',
    country: '',
    city: '',
    address: '',
    is_active: true,
  });

  const showFeedback = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchWebsite = async () => {
    if (!websiteId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        const w = json.website;
        const c = json.creator;

        // Initialize website edit form
        setWebsiteForm({
          name: w.name || '',
          subdomain: w.subdomain || '',
          custom_domain: w.custom_domain || '',
          custom_domain_verified: Boolean(w.custom_domain_verified),
          institution_type: w.institution_type || 'School',
          eiin_number: w.eiin_number || '',
          status: w.status || 'active',
          is_published: Boolean(w.is_published),
          subscription_id: w.subscription_id || '',
          creator_id: w.creator_id || '',
          theme: w.theme || 'default',
          primary_color: w.primary_color || '#1e40af',
          secondary_color: w.secondary_color || '#0ea5e9',
          logo: w.logo || '',
          favicon: w.favicon || '',
          contact_email: w.contact_email || '',
          contact_phone: w.contact_phone || '',
          address: w.address || '',
          storage_used_mb: w.storage_used_mb || 0,
          subscription_expires_at: w.subscription_expires_at
            ? new Date(w.subscription_expires_at).toISOString().split('T')[0]
            : '',
        });

        // Initialize creator edit form
        if (c) {
          setCreatorForm({
            name: c.name || '',
            phone: c.phone || '',
            institution: c.institution || '',
            country: c.country || '',
            city: c.city || '',
            address: c.address || '',
            is_active: c.is_active !== undefined ? Boolean(c.is_active) : true,
          });
        }
      } else {
        setError(json.error || 'Website not found');
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading website details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (!isAuthorized || !websiteId) return;

    fetch(`/api/marketing/developer/websites/${websiteId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          if (json.success) {
            setData(json);
            const w = json.website;
            const c = json.creator;

            setWebsiteForm({
              name: w.name || '',
              subdomain: w.subdomain || '',
              custom_domain: w.custom_domain || '',
              custom_domain_verified: Boolean(w.custom_domain_verified),
              institution_type: w.institution_type || 'School',
              eiin_number: w.eiin_number || '',
              status: w.status || 'active',
              is_published: Boolean(w.is_published),
              subscription_id: w.subscription_id || '',
              creator_id: w.creator_id || '',
              theme: w.theme || 'default',
              primary_color: w.primary_color || '#1e40af',
              secondary_color: w.secondary_color || '#0ea5e9',
              logo: w.logo || '',
              favicon: w.favicon || '',
              contact_email: w.contact_email || '',
              contact_phone: w.contact_phone || '',
              address: w.address || '',
              storage_used_mb: w.storage_used_mb || 0,
              subscription_expires_at: w.subscription_expires_at
                ? new Date(w.subscription_expires_at).toISOString().split('T')[0]
                : '',
            });

            if (c) {
              setCreatorForm({
                name: c.name || '',
                phone: c.phone || '',
                institution: c.institution || '',
                country: c.country || '',
                city: c.city || '',
                address: c.address || '',
                is_active: c.is_active !== undefined ? Boolean(c.is_active) : true,
              });
            }
          } else {
            setError(json.error || 'Website not found');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error(err);
          setError('Network error loading website details');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isAuthorized, websiteId]);

  // Handle Save Website Updates
  const handleSaveWebsite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            ...websiteForm,
            creator_id: Number(websiteForm.creator_id),
            subscription_id: websiteForm.subscription_id ? Number(websiteForm.subscription_id) : null,
            storage_used_mb: Number(websiteForm.storage_used_mb),
            subscription_expires_at: websiteForm.subscription_expires_at || null,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback('Website updated successfully!', 'success');
        fetchWebsite();
      } else {
        showFeedback(json.error || 'Failed to update website', 'error');
      }
    } catch (err) {
      showFeedback('Network error updating website', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Save Creator Updates
  const handleSaveCreator = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: Number(websiteForm.creator_id),
          creator_data: {
            ...creatorForm,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback('Creator details updated successfully!', 'success');
        fetchWebsite();
      } else {
        showFeedback(json.error || 'Failed to update creator', 'error');
      }
    } catch (err) {
      showFeedback('Network error updating creator', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Toggle Tenant Module for this website
  const handleToggleModule = async (moduleId, currentEnabled) => {
    setModuleToggling((prev) => ({ ...prev, [moduleId]: true }));
    try {
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toggle_module_id: moduleId,
          is_enabled: !currentEnabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(`Module ${!currentEnabled ? 'enabled' : 'disabled'} for website`, 'success');
        fetchWebsite();
      } else {
        showFeedback(json.error || 'Failed to toggle module', 'error');
      }
    } catch (err) {
      showFeedback('Network error toggling module', 'error');
    } finally {
      setModuleToggling((prev) => ({ ...prev, [moduleId]: false }));
    }
  };

  // Handle Delete Website Container
  const handleDeleteWebsite = async () => {
    if (!confirm(`Are you sure you want to delete website "${data?.website?.name}"? All hosted subdomain data and module links will be permanently removed.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        alert('Website deleted successfully.');
        router.push('/developer/websites');
      } else {
        alert(json.error || 'Failed to delete website.');
      }
    } catch (err) {
      alert('Error deleting website.');
    }
  };

  if (!isAuthorized && user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xl">
            <FiShield />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-4">You require websites management permissions to access this page.</p>
          <Link
            href="/developer/websites"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
          >
            <FiArrowLeft /> Return to Websites
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24">
        <LoadingScreen fullScreen={false} size="sm" label="Loading website details..." />
      </div>
    );
  }

  if (error || !data?.website) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-12">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xl">
            <FiAlertCircle />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Website Not Found</h3>
            <p className="text-xs text-slate-500 mt-1">{error || `No website instance found matching ID #${websiteId}`}</p>
          </div>
          <Link
            href="/developer/websites"
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
          >
            <FiArrowLeft /> Back to Websites
          </Link>
        </div>
      </div>
    );
  }

  const { website, creator, package: pkg, subscription, enabled_modules = [], all_tenant_modules = [], purchases = [], creators = [] } = data;
  const isOnline = website.is_published;
  const enabledModuleIds = new Set(enabled_modules.filter((m) => m.is_enabled).map((m) => m.tenant_module_id));

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Top Breadcrumbs & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/developer/websites"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <FiArrowLeft className="text-sm" /> Back to Hosted Websites
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchWebsite}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <FiRefreshCw className="text-xs" /> Refresh
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded text-xs font-medium border flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <FiX />
          </button>
        </div>
      )}

      {/* Header Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                Site #{website.id}
              </span>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                  website.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {website.status || 'Active'}
              </span>

              {/* Publish State */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                }`}
              >
                {isOnline ? 'Online / Public' : 'Maintenance Mode'}
              </span>

              {website.theme && (
                <span className="text-[10px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Theme: {website.theme}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{website.name}</h1>
              <div className="flex items-center gap-1.5">
                {website.primary_color && (
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-xs inline-block"
                    style={{ backgroundColor: website.primary_color }}
                    title={`Primary color: ${website.primary_color}`}
                  />
                )}
                {website.secondary_color && (
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-xs inline-block"
                    style={{ backgroundColor: website.secondary_color }}
                    title={`Secondary color: ${website.secondary_color}`}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <FiGlobe className="text-slate-400" />
                {website.subdomain}.educraft.io
              </span>
              {website.custom_domain && (
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  &bull; {website.custom_domain}
                  {website.custom_domain_verified ? (
                    <span className="text-[9px] text-emerald-600 uppercase font-bold">(Verified)</span>
                  ) : (
                    <span className="text-[9px] text-amber-600 uppercase font-bold">(Unverified)</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Quick External Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`http://${website.subdomain}.localhost:3000`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors"
            >
              <FiEye /> Visit Website <FiExternalLink className="text-[11px]" />
            </a>

            <button
              type="button"
              onClick={handleDeleteWebsite}
              className="p-2 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer transition-colors"
              title="Delete Website Container"
            >
              <FiTrash2 />
            </button>
          </div>
        </div>

        {/* Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Package Plan</span>
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {pkg?.name || 'No Plan Linked'}
            </div>
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Owner / Creator</span>
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {creator?.name || `ID: #${website.creator_id}`}
            </div>
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Storage Allocation</span>
            <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-1">
              <FiHardDrive className="text-slate-400" />
              {website.storage_used_mb ?? 0} MB / {pkg?.max_storage_mb || '5120'} MB
            </div>
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Subscription Validity</span>
            <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
              {website.subscription_expires_at ? new Date(website.subscription_expires_at).toLocaleDateString() : 'Active'}
              {website.days_remaining !== null && (
                <span
                  className={`ml-1 text-[10px] ${
                    website.days_remaining < 0
                      ? 'text-rose-600'
                      : website.days_remaining < 10
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  ({website.days_remaining > 0 ? `${website.days_remaining}d left` : 'Expired'})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'overview'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Overview &amp; Entities
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('edit_website')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'edit_website'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Update Website Data
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('edit_creator')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'edit_creator'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Manage Creator / Owner
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('modules')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'modules'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Tenant Modules ({enabled_modules.filter((m) => m.is_enabled).length} Active)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'billing'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Purchases &amp; Subscription
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & ENTITIES */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Website Summary Card */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-sm font-semibold">
                    <FiGlobe />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Container Specification</h3>
                    <p className="text-[11px] text-slate-400">Core parameters and institutional identity</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit_website')}
                  className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1 font-medium cursor-pointer"
                >
                  <FiSettings /> Edit Website Data
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Institution Name</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{website.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Type: {website.institution_type || 'School'}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">EIIN / Government Code</span>
                  <div className="font-mono text-slate-800 dark:text-slate-200">{website.eiin_number || 'None specified'}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Subdomain URL</span>
                  <div className="font-mono text-slate-800 dark:text-slate-200">{website.subdomain}.educraft.io</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Custom Domain Mapping</span>
                  <div className="font-mono text-slate-800 dark:text-slate-200">{website.custom_domain || 'Not configured'}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Contact Email &amp; Phone</span>
                  <div className="text-slate-700 dark:text-slate-300">
                    {website.contact_email || '—'} &bull; {website.contact_phone || '—'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Campus Address</span>
                  <div className="text-slate-700 dark:text-slate-300 truncate">{website.address || '—'}</div>
                </div>
              </div>

              {/* Branding and Visual Assets */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Branding Assets</span>
                <div className="flex flex-wrap items-center gap-4">
                  {website.logo ? (
                    <div className="flex items-center gap-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={website.logo} alt="Website Logo" className="w-8 h-8 object-contain rounded" />
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">Custom Logo</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Default Brand Logo</div>
                  )}

                  {website.favicon && (
                    <div className="flex items-center gap-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={website.favicon} alt="Favicon" className="w-5 h-5 object-contain" />
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">Favicon</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40" title="Primary Brand Color">
                    <span
                      className="w-4 h-4 rounded-full border border-white shadow-xs"
                      style={{ backgroundColor: website.primary_color || '#1e40af' }}
                    />
                    <span className="text-xs font-mono">{website.primary_color || '#1e40af'}</span>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40" title="Secondary Brand Color">
                    <span
                      className="w-4 h-4 rounded-full border border-white shadow-xs"
                      style={{ backgroundColor: website.secondary_color || '#0ea5e9' }}
                    />
                    <span className="text-xs font-mono">{website.secondary_color || '#0ea5e9'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Package Plan Quotas Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-sm font-semibold">
                    <FiPackage />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Assigned Package Plan</h3>
                    <p className="text-[11px] text-slate-400">{pkg?.name || 'No Plan Tier Assigned'}</p>
                  </div>
                </div>

                {pkg && (
                  <Link
                    href={`/developer/packages/${pkg.slug || ''}`}
                    className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1 font-medium"
                  >
                    View Package <FiExternalLink />
                  </Link>
                )}
              </div>

              {pkg ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Max Students</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{pkg.max_students ?? 500}</span>
                  </div>
                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Max Teachers</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{pkg.max_teachers ?? 30}</span>
                  </div>
                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Max Staff</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{pkg.max_staff ?? 20}</span>
                  </div>
                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Storage Quota</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{pkg.max_storage_mb ?? 5120} MB</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                  No package plan currently mapped. Update website data to assign an active package tier.
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Column 3: Creator Details & Subscription Link */}
          <div className="space-y-5">
            {/* Creator / Owner Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-sm font-semibold">
                    <FiUser />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Website Owner (Creator)</h3>
                    <p className="text-[11px] text-slate-400">Registered SaaS tenant</p>
                  </div>
                </div>

                {creator && (
                  <Link
                    href={`/developer/creators/${creator.id}`}
                    className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1 font-medium"
                  >
                    Profile <FiExternalLink />
                  </Link>
                )}
              </div>

              {creator ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Name</span>
                    <div className="font-semibold text-slate-900 dark:text-white">{creator.name}</div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Email Address</span>
                    <div className="font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>{creator.email}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(creator.email, 'c_email')}
                        className="cursor-pointer opacity-60 hover:opacity-100"
                      >
                        <FiCopy className="text-[10px]" />
                      </button>
                      {copiedKey === 'c_email' && <span className="text-[9px] text-emerald-600">Copied</span>}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Phone</span>
                    <div className="font-mono text-slate-700 dark:text-slate-300">{creator.phone || 'Not provided'}</div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Institution</span>
                    <div className="text-slate-700 dark:text-slate-300">{creator.institution || 'Unassigned'}</div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Location</span>
                    <div className="text-slate-700 dark:text-slate-300">
                      {[creator.city, creator.country].filter(Boolean).join(', ') || 'Global'}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Account Active:</span>
                    <span className={`font-semibold ${creator.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {creator.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('edit_creator')}
                      className="w-full text-center px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors"
                    >
                      Edit Creator or Transfer Ownership
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-rose-600">No creator associated with this website container.</div>
              )}
            </div>

            {/* Subscription Quick Link */}
            {subscription && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FiCreditCard /> Active Subscription
                  </h3>
                  <Link
                    href={`/developer/subscriptions/${subscription.id}`}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
                  >
                    Inspect Plan <FiExternalLink />
                  </Link>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold uppercase text-emerald-600">{subscription.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Billing Cycle:</span>
                    <span className="font-medium capitalize">{subscription.billing_cycle || 'Monthly'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Expires:</span>
                    <span className="font-mono">{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UPDATE WEBSITE DATA */}
      {/* ========================================================================= */}
      {activeTab === 'edit_website' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs max-w-4xl space-y-5">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Update Website Configuration</h3>
            <p className="text-xs text-slate-500">Edit hosted container properties, domains, status, branding, and quotas.</p>
          </div>

          <form onSubmit={handleSaveWebsite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Website Name</label>
                <input
                  type="text"
                  required
                  value={websiteForm.name}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Subdomain</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    value={websiteForm.subdomain}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '') })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-l px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                  <span className="bg-slate-100 dark:bg-slate-800/80 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r px-2.5 py-2 text-xs font-mono text-slate-500">
                    .educraft.io
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Domain</label>
                <input
                  type="text"
                  placeholder="e.g. campus.example.edu"
                  value={websiteForm.custom_domain}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, custom_domain: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Domain Verification</label>
                <select
                  value={websiteForm.custom_domain_verified ? 'true' : 'false'}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, custom_domain_verified: e.target.value === 'true' })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="true">Verified (Active DNS mapping)</option>
                  <option value="false">Unverified (Pending verification)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={websiteForm.status}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, status: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Published Mode</label>
                <select
                  value={websiteForm.is_published ? 'true' : 'false'}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, is_published: e.target.value === 'true' })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="true">Online (Publicly accessible)</option>
                  <option value="false">Maintenance Mode (Draft / Locked)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Institution Type</label>
                <input
                  type="text"
                  placeholder="e.g. School, College, University"
                  value={websiteForm.institution_type}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, institution_type: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Linked Subscription
                  </label>
                  {websiteForm.subscription_id && (
                    <Link
                      href={`/developer/subscriptions/${websiteForm.subscription_id}`}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      Sub #{websiteForm.subscription_id} <FiExternalLink />
                    </Link>
                  )}
                </div>
                <select
                  value={websiteForm.subscription_id}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    const selectedSub = (data?.creator_subscriptions || []).find((s) => String(s.id) === String(chosenId));
                    setWebsiteForm({
                      ...websiteForm,
                      subscription_id: chosenId,
                      subscription_expires_at: selectedSub?.current_period_end
                        ? new Date(selectedSub.current_period_end).toISOString().split('T')[0]
                        : websiteForm.subscription_expires_at,
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">-- No Subscription Attached (Unlinked) --</option>
                  {(data?.creator_subscriptions || (data?.subscription ? [data.subscription] : [])).map((s) => (
                    <option key={s.id} value={s.id}>
                      Sub #{s.id} &bull; {s.package_name || 'Plan #' + s.package_id} ({s.status.toUpperCase()})
                    </option>
                  ))}
                </select>
                {data?.package && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Package derived: <strong className="text-slate-700 dark:text-slate-300">{data.package.name}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Storage Used (MB)</label>
                <input
                  type="number"
                  min="0"
                  value={websiteForm.storage_used_mb}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, storage_used_mb: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Subscription Expiration</label>
                <input
                  type="date"
                  value={websiteForm.subscription_expires_at}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, subscription_expires_at: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Branding Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Theme</label>
                <select
                  value={websiteForm.theme}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, theme: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="default">Default Modern</option>
                  <option value="academic">Academic Classic</option>
                  <option value="minimal">Minimal Dark</option>
                  <option value="vibrant">Vibrant Campus</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={websiteForm.primary_color || '#1e40af'}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, primary_color: e.target.value })}
                    className="w-9 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={websiteForm.primary_color}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, primary_color: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Secondary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={websiteForm.secondary_color || '#0ea5e9'}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, secondary_color: e.target.value })}
                    className="w-9 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={websiteForm.secondary_color}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, secondary_color: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">EIIN Number</label>
                <input
                  type="text"
                  placeholder="e.g. 132456"
                  value={websiteForm.eiin_number}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, eiin_number: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Contact Email</label>
                <input
                  type="email"
                  value={websiteForm.contact_email}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, contact_email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Contact Phone</label>
                <input
                  type="text"
                  value={websiteForm.contact_phone}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, contact_phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Physical Address</label>
              <textarea
                rows={2}
                value={websiteForm.address}
                onChange={(e) => setWebsiteForm({ ...websiteForm, address: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                <span>Save Website Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MANAGE CREATOR / OWNER */}
      {/* ========================================================================= */}
      {activeTab === 'edit_creator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* Card 1: Edit Current Creator Profile */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Update Owner Account Information</h3>
              <p className="text-xs text-slate-500">Edit client record details for &ldquo;{creator?.name}&rdquo;</p>
            </div>

            <form onSubmit={handleSaveCreator} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={creatorForm.name}
                  onChange={(e) => setCreatorForm({ ...creatorForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                <input
                  type="text"
                  value={creatorForm.phone}
                  onChange={(e) => setCreatorForm({ ...creatorForm, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Institution</label>
                <input
                  type="text"
                  value={creatorForm.institution}
                  onChange={(e) => setCreatorForm({ ...creatorForm, institution: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">City</label>
                  <input
                    type="text"
                    value={creatorForm.city}
                    onChange={(e) => setCreatorForm({ ...creatorForm, city: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Country</label>
                  <input
                    type="text"
                    value={creatorForm.country}
                    onChange={(e) => setCreatorForm({ ...creatorForm, country: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Address</label>
                <textarea
                  rows={2}
                  value={creatorForm.address}
                  onChange={(e) => setCreatorForm({ ...creatorForm, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Account Active</label>
                <select
                  value={creatorForm.is_active ? 'true' : 'false'}
                  onChange={(e) => setCreatorForm({ ...creatorForm, is_active: e.target.value === 'true' })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="true">Active Account</option>
                  <option value="false">Suspended / Inactive</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                  <span>Save Creator Details</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Reassign Website Ownership */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transfer Website Ownership</h3>
              <p className="text-xs text-slate-500">Reassign this hosted website container to a different client</p>
            </div>

            <div className="p-3.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <span className="font-semibold block">Important Notice:</span>
              <p className="text-[11px] leading-relaxed">
                Reassigning ownership moves website management permissions to the new creator account. The previous creator will no longer have access to this portal in their client dashboard.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select New Owner
                </label>
                <select
                  value={websiteForm.creator_id}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, creator_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  {creators.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} {c.name} &bull; {c.email} ({c.institution || 'No org'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={saving || Number(websiteForm.creator_id) === Number(creator?.id)}
                  onClick={handleSaveWebsite}
                  className="w-full py-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FiCheckCircle />
                  <span>Transfer Ownership to Selected Creator</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TENANT MODULES */}
      {/* ========================================================================= */}
      {activeTab === 'modules' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tenant Features &amp; Modules</h3>
              <p className="text-xs text-slate-500">Enable or disable educational modules activated for this school website container.</p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-500">
              {enabled_modules.filter((m) => m.is_enabled).length} of {all_tenant_modules.length} Modules Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {all_tenant_modules.map((tm) => {
              const isEnabled = enabledModuleIds.has(tm.id);
              const isToggling = Boolean(moduleToggling[tm.id]);

              return (
                <div
                  key={tm.id}
                  className={`p-4 rounded border transition-colors flex items-start justify-between gap-3 ${
                    isEnabled
                      ? 'bg-slate-50/70 border-emerald-300 dark:bg-slate-800/40 dark:border-emerald-800/60'
                      : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 opacity-80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{tm.name}</span>
                      {isEnabled && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Active
                        </span>
                      )}
                    </div>
                    {tm.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{tm.description}</p>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 block">Slug: {tm.slug}</span>
                  </div>

                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggleModule(tm.id, isEnabled)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
                      isEnabled
                        ? 'border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40'
                        : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900'
                    }`}
                  >
                    {isToggling ? '...' : isEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BILLING & PURCHASES */}
      {/* ========================================================================= */}
      {activeTab === 'billing' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Financial &amp; Contract Ledger</h3>
              <p className="text-xs text-slate-500">Subscription cycles, orders, and payment records tied to this container</p>
            </div>
            {subscription && (
              <Link
                href={`/developer/subscriptions/${subscription.id}`}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span>Manage / Renew Subscription</span>
                <FiExternalLink />
              </Link>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Order ID</th>
                  <th className="pb-2">Purchase Code</th>
                  <th className="pb-2">Package Tier</th>
                  <th className="pb-2">Billing Term</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Order Status</th>
                  <th className="pb-2">Period Dates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No purchase orders recorded for this container.
                    </td>
                  </tr>
                ) : (
                  purchases.map((pu) => (
                    <tr key={pu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-mono font-medium text-slate-400">#{pu.id}</td>
                      <td className="py-2.5 font-mono text-[11px] font-medium text-slate-900 dark:text-white">
                        {pu.purchase_code}
                      </td>
                      <td className="py-2.5 font-medium">{pu.package_name || 'Standard Plan'}</td>
                      <td className="py-2.5 capitalize">{pu.billing_cycle || 'Monthly'}</td>
                      <td className="py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                        ${Number(pu.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border ${
                            pu.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {pu.status}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        {pu.period_start ? new Date(pu.period_start).toLocaleDateString() : '—'}
                        {' → '}
                        {pu.period_end ? new Date(pu.period_end).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
