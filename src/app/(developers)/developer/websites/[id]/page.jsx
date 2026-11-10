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
  FiMapPin,
  FiFileText,
  FiShare2,
  FiToggleLeft,
  FiToggleRight
} from 'react-icons/fi';

export default function WebsiteDetailsPage({ params }) {
  const router = useRouter();
  const routeParams = useParams();
  const websiteId = routeParams?.id || (params ? (typeof params.then === 'function' ? use(params)?.id : params.id) : null);
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isOwner = Number(user?.id) === 1 || String(user?.email).toLowerCase() === 'tanvir004006@gmail.com' || permissions.includes('*');
  const isAuthorized = isOwner || permissions.includes('websites') || permissions.includes('website');
  const canDelete = isOwner || permissions.includes('websites_delete') || permissions.includes('websites') || permissions.includes('website');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [saving, setSaving] = useState(false);
  const [quickStatusLoading, setQuickStatusLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [websiteForm, setWebsiteForm] = useState({
    name: '',
    slug: '',
    subdomain: '',
    custom_domain: '',
    custom_domain_verified: false,
    institution_type: 'School',
    eiin_number: '',
    currency: 'BDT',
    status: 'active',
    is_published: true,
    is_maintenance_mode: false,
    maintenance_message: '',
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
    facebook_url: '',
    twitter_url: '',
    instagram_url: '',
    youtube_url: '',
    linkedin_url: '',
    storage_used_mb: 0,
    subscription_expires_at: '',
  });

  const [verificationForm, setVerificationForm] = useState({
    verification_status: 'pending',
    creator_nid: '',
    creator_nid_url: '',
    eiin_certificate: '',
    eiin_certificate_url: '',
    address: '',
    other_details_text: '{}',
  });

  const [creatorForm, setCreatorForm] = useState({
    name: '',
    phone: '',
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

  const syncStateFromData = (json) => {
    setData(json);
    const w = json.website;
    const c = json.creator;
    const vi = json.website_information || w.website_information;

    setWebsiteForm({
      name: w.name || '',
      slug: w.slug || '',
      subdomain: w.subdomain || '',
      custom_domain: w.custom_domain || '',
      custom_domain_verified: Boolean(w.custom_domain_verified),
      institution_type: w.institution_type || 'School',
      eiin_number: w.eiin_number || '',
      currency: w.currency || 'BDT',
      status: w.status || 'active',
      is_published: Boolean(w.is_published),
      is_maintenance_mode: Boolean(w.is_maintenance_mode),
      maintenance_message: w.maintenance_message || '',
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
      facebook_url: w.facebook_url || '',
      twitter_url: w.twitter_url || '',
      instagram_url: w.instagram_url || '',
      youtube_url: w.youtube_url || '',
      linkedin_url: w.linkedin_url || '',
      storage_used_mb: w.storage_used_mb || 0,
      subscription_expires_at: w.subscription_expires_at
        ? new Date(w.subscription_expires_at).toISOString().split('T')[0]
        : '',
    });

    if (vi) {
      setVerificationForm({
        verification_status: vi.verification_status || 'pending',
        creator_nid: vi.creator_nid || '',
        creator_nid_url: vi.creator_nid_url || '',
        eiin_certificate: vi.eiin_certificate || '',
        eiin_certificate_url: vi.eiin_certificate_url || '',
        address: vi.address || '',
        other_details_text: typeof vi.other_details === 'object' && vi.other_details !== null
          ? JSON.stringify(vi.other_details, null, 2)
          : '{}',
      });
    }

    if (c) {
      setCreatorForm({
        name: c.name || '',
        phone: c.phone || '',
        country: c.country || '',
        city: c.city || '',
        address: c.address || '',
        is_active: c.is_active !== undefined ? Boolean(c.is_active) : true,
      });
    }
  };

  const fetchWebsite = async () => {
    if (!websiteId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`);
      const json = await res.json();
      if (json.success) {
        syncStateFromData(json);
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
            syncStateFromData(json);
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

  const handleQuickStatusChange = async (newStatus) => {
    setQuickStatusLoading(true);
    try {
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            status: newStatus,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(`Website status updated to ${newStatus.toUpperCase()}`, 'success');
        fetchWebsite();
      } else {
        showFeedback(json.error || 'Failed to update status', 'error');
      }
    } catch (e) {
      showFeedback('Network error updating status', 'error');
    } finally {
      setQuickStatusLoading(false);
    }
  };

  const handleQuickModeToggle = async () => {
    setQuickStatusLoading(true);
    const nextMaintenance = !websiteForm.is_maintenance_mode;
    try {
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            is_maintenance_mode: nextMaintenance,
            is_published: !nextMaintenance,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(
          nextMaintenance ? 'Website placed into Maintenance Mode' : 'Website published and brought live',
          'success'
        );
        fetchWebsite();
      } else {
        showFeedback(json.error || 'Failed to toggle mode', 'error');
      }
    } catch (e) {
      showFeedback('Network error toggling mode', 'error');
    } finally {
      setQuickStatusLoading(false);
    }
  };

  const handleQuickDomainVerifyToggle = async () => {
    if (!websiteForm.custom_domain) return;
    setQuickStatusLoading(true);
    const nextVerified = !websiteForm.custom_domain_verified;
    try {
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            custom_domain: websiteForm.custom_domain,
            custom_domain_verified: nextVerified,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(
          nextVerified ? 'Custom domain marked as verified' : 'Custom domain marked as unverified',
          'success'
        );
        fetchWebsite();
      } else {
        showFeedback(json.error || 'Failed to update domain verification', 'error');
      }
    } catch (e) {
      showFeedback('Network error updating domain verification', 'error');
    } finally {
      setQuickStatusLoading(false);
    }
  };

  const handleSaveWebsite = async (e) => {
    if (e) e.preventDefault();
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
        showFeedback('Website data and configuration saved successfully!', 'success');
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

  const handleSaveVerification = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    let parsedDetails = {};
    try {
      parsedDetails = JSON.parse(verificationForm.other_details_text || '{}');
    } catch (err) {
      parsedDetails = { raw: verificationForm.other_details_text };
    }

    try {
      const res = await fetch(`/api/marketing/developer/websites/${websiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_information: {
            verification_status: verificationForm.verification_status,
            creator_nid: verificationForm.creator_nid,
            creator_nid_url: verificationForm.creator_nid_url,
            eiin_certificate: verificationForm.eiin_certificate,
            eiin_certificate_url: verificationForm.eiin_certificate_url,
            address: verificationForm.address,
            other_details: parsedDetails,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback('Institutional verification data updated successfully!', 'success');
        fetchWebsite();
      } else {
        showFeedback(json.error || 'Failed to update verification data', 'error');
      }
    } catch (err) {
      showFeedback('Network error updating verification data', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCreator = async (e) => {
    if (e) e.preventDefault();
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

  const handleDeleteWebsite = async () => {
    if (!canDelete) {
      alert('You do not have permission to delete websites.');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete website "${data?.website?.name}"? All hosted subdomain data and module links will be permanently removed.`
      )
    ) {
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
          <p className="text-xs text-slate-500 mb-4">You require website control permissions to access this page.</p>
          <Link
            href="/developer/websites"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
          >
            <FiArrowLeft /> Return to Websites Directory
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24">
        <LoadingScreen fullScreen={false} size="sm" label="Loading website details and controls..." />
      </div>
    );
  }

  if (error || !data?.website) {
    return (
      <div className="w-full space-y-4 py-12">
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
            <FiArrowLeft /> Back to Websites Directory
          </Link>
        </div>
      </div>
    );
  }

  const {
    website,
    creator,
    package: pkg,
    subscription,
    control_modules = [],
    home_modules = [],
    all_control_modules = [],
    all_home_modules = [],
    purchases = [],
    creators = [],
    creator_subscriptions = [],
    domains = [],
    website_information: wiData
  } = data;

  const isOnline = website.is_published;
  const isMaintenance = Boolean(website.is_maintenance_mode);

  const visitUrl =
    website.custom_domain && website.custom_domain_verified
      ? `https://${website.custom_domain}`
      : baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+/.test(baseDomain) || baseDomain.includes(':')
      ? `http://${website.subdomain}.${baseDomain}`
      : `https://${website.subdomain}.${baseDomain}`;

  return (
    <div className="w-full space-y-5 pb-12">
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
            <FiRefreshCw className="text-xs" /> Refresh Data
          </button>
        </div>
      </div>

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
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="cursor-pointer opacity-70 hover:opacity-100"
          >
            <FiX />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                Container #{website.id}
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                  website.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                    : website.status === 'suspended'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {website.status}
              </span>

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

              {wiData?.verification_status && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border uppercase font-semibold ${
                    wiData.verification_status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40'
                      : wiData.verification_status === 'rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40'
                  }`}
                >
                  Verification: {wiData.verification_status}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{website.name}</h1>
              <div className="flex items-center gap-1.5">
                {website.primary_color && (
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-xs inline-block"
                    style={{ backgroundColor: website.primary_color }}
                    title={`Primary: ${website.primary_color}`}
                  />
                )}
                {website.secondary_color && (
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-xs inline-block"
                    style={{ backgroundColor: website.secondary_color }}
                    title={`Secondary: ${website.secondary_color}`}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <FiGlobe className="text-slate-400" />
                {website.subdomain}.{baseDomain}
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={visitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors"
            >
              <FiEye />
              <span>Visit Portal</span>
              <FiExternalLink className="text-[11px]" />
            </a>

            {canDelete && (
              <button
                type="button"
                onClick={handleDeleteWebsite}
                className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer transition-colors"
                title="Delete Website Container"
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        </div>

        <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Quick Controls:
            </span>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Direct Status Selector"
                disabled={quickStatusLoading}
                value={website.status}
                onChange={(e) => handleQuickStatusChange(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {website.status === 'active' ? (
              <button
                type="button"
                disabled={quickStatusLoading}
                onClick={() => handleQuickStatusChange('suspended')}
                className="px-2.5 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
              >
                Suspend Website
              </button>
            ) : (
              <button
                type="button"
                disabled={quickStatusLoading}
                onClick={() => handleQuickStatusChange('active')}
                className="px-2.5 py-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
              >
                Activate Website
              </button>
            )}

            <button
              type="button"
              disabled={quickStatusLoading}
              onClick={handleQuickModeToggle}
              className={`px-2.5 py-1 rounded border text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 ${
                isMaintenance
                  ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                  : 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
              }`}
            >
              {isMaintenance ? 'Publish & Go Live' : 'Put In Maintenance'}
            </button>

            {websiteForm.custom_domain && (
              <button
                type="button"
                disabled={quickStatusLoading}
                onClick={handleQuickDomainVerifyToggle}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
              >
                {websiteForm.custom_domain_verified ? 'Unverify Domain' : 'Verify Custom Domain'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
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
          Control Website Data &amp; Status
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('verification')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'verification'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Institutional Verification Data
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
          Owner &amp; Ownership Transfer
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
          Modules &amp; Entitlements ({control_modules.length + home_modules.length})
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
          Billing &amp; Purchases
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                  <FiSettings /> Control Data
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
                  <div className="font-mono text-slate-800 dark:text-slate-200">{website.subdomain}.{baseDomain}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Custom Domain Mapping</span>
                  <div className="font-mono text-slate-800 dark:text-slate-200">
                    {website.custom_domain || 'Not configured'}
                    {website.custom_domain && (
                      <span className={`ml-1 text-[10px] uppercase font-bold ${website.custom_domain_verified ? 'text-emerald-600' : 'text-amber-600'}`}>
                        ({website.custom_domain_verified ? 'Verified' : 'Unverified'})
                      </span>
                    )}
                  </div>
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

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Branding Assets</span>
                <div className="flex flex-wrap items-center gap-4">
                  {website.logo ? (
                    <div className="flex items-center gap-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                      <img src={website.logo} alt="Website Logo" className="w-8 h-8 object-contain rounded" />
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">Custom Logo</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Default Brand Logo</div>
                  )}

                  {website.favicon && (
                    <div className="flex items-center gap-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
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

          <div className="space-y-5">
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
                      Manage Owner &amp; Transfer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-rose-600">No creator associated with this website container.</div>
              )}
            </div>

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
                    <span className="font-mono">
                      {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'edit_website' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs max-w-5xl space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Control Website Data &amp; Status</h3>
              <p className="text-xs text-slate-500">
                Directly configure institutional data, domains, status, maintenance lock, and limits.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveWebsite}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <FiSave />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

          <form onSubmit={handleSaveWebsite} className="space-y-5 text-xs">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
                1. Status &amp; Maintenance Controls
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Container Status</label>
                  <select
                    value={websiteForm.status}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="active">Active (Fully operational)</option>
                    <option value="pending">Pending (Awaiting setup)</option>
                    <option value="suspended">Suspended (Admin disabled)</option>
                    <option value="expired">Expired (Term ended)</option>
                    <option value="archived">Archived (Cold storage)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Public Online Mode</label>
                  <select
                    value={websiteForm.is_maintenance_mode ? 'false' : 'true'}
                    onChange={(e) =>
                      setWebsiteForm({
                        ...websiteForm,
                        is_maintenance_mode: e.target.value === 'false',
                        is_published: e.target.value === 'true',
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="true">Online (Publicly accessible)</option>
                    <option value="false">Maintenance Mode (Draft / Locked)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Default Currency</label>
                  <select
                    value={websiteForm.currency}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, currency: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                  </select>
                </div>
              </div>

              {websiteForm.is_maintenance_mode && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Maintenance Notice Message
                  </label>
                  <textarea
                    rows={2}
                    value={websiteForm.maintenance_message}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, maintenance_message: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
                2. Institutional Identity &amp; Domains
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Institution Name *</label>
                  <input
                    type="text"
                    required
                    value={websiteForm.name}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Institution Type</label>
                  <select
                    value={websiteForm.institution_type}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, institution_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="School">School</option>
                    <option value="High School">High School</option>
                    <option value="College">College</option>
                    <option value="University">University</option>
                    <option value="Madrasah">Madrasah</option>
                    <option value="Training Academy">Training Academy</option>
                    <option value="Polytechnic Institute">Polytechnic Institute</option>
                    <option value="Coaching Center">Coaching Center</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Subdomain *</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      required
                      value={websiteForm.subdomain}
                      onChange={(e) =>
                        setWebsiteForm({
                          ...websiteForm,
                          subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''),
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-l px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="bg-slate-100 dark:bg-slate-800/80 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r px-2.5 py-2 text-xs font-mono text-slate-500">
                      .{baseDomain}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Domain</label>
                  <input
                    type="text"
                    aria-label="Custom Domain"
                    value={websiteForm.custom_domain}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, custom_domain: e.target.value.toLowerCase().trim() })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Domain Verification</label>
                  <select
                    value={websiteForm.custom_domain_verified ? 'true' : 'false'}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, custom_domain_verified: e.target.value === 'true' })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="true">Verified (Active DNS mapping)</option>
                    <option value="false">Unverified (Pending DNS verification)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">EIIN / Government Code</label>
                  <input
                    type="text"
                    value={websiteForm.eiin_number}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, eiin_number: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Container Slug</label>
                  <input
                    type="text"
                    value={websiteForm.slug}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '') })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
                3. Subscription &amp; Quota Allocations
              </h4>

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
                      const selectedSub = (creator_subscriptions || []).find((s) => String(s.id) === String(chosenId));
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
                    {(creator_subscriptions.length > 0 ? creator_subscriptions : subscription ? [subscription] : []).map(
                      (s) => (
                        <option key={s.id} value={s.id}>
                          Sub #{s.id} &bull; {s.package_name || 'Plan #' + s.package_id} ({String(s.status).toUpperCase()})
                        </option>
                      )
                    )}
                  </select>
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
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
                4. Visual Branding &amp; Color Scheme
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Theme Template</label>
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
                      aria-label="Primary Brand Color Picker"
                      value={websiteForm.primary_color || '#1e40af'}
                      onChange={(e) => setWebsiteForm({ ...websiteForm, primary_color: e.target.value })}
                      className="w-9 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      aria-label="Primary Brand Color Hex"
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
                      aria-label="Secondary Brand Color Picker"
                      value={websiteForm.secondary_color || '#0ea5e9'}
                      onChange={(e) => setWebsiteForm({ ...websiteForm, secondary_color: e.target.value })}
                      className="w-9 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      aria-label="Secondary Brand Color Hex"
                      value={websiteForm.secondary_color}
                      onChange={(e) => setWebsiteForm({ ...websiteForm, secondary_color: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Logo Image URL</label>
                  <input
                    type="text"
                    value={websiteForm.logo}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, logo: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Favicon URL</label>
                  <input
                    type="text"
                    value={websiteForm.favicon}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, favicon: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
                5. Contact Information &amp; Social Links
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Official Contact Email</label>
                  <input
                    type="email"
                    value={websiteForm.contact_email}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, contact_email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Official Contact Phone</label>
                  <input
                    type="text"
                    value={websiteForm.contact_phone}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, contact_phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Campus Physical Address</label>
                <textarea
                  rows={2}
                  value={websiteForm.address}
                  onChange={(e) => setWebsiteForm({ ...websiteForm, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Facebook URL</label>
                  <input
                    type="text"
                    value={websiteForm.facebook_url}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, facebook_url: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Twitter / X URL</label>
                  <input
                    type="text"
                    value={websiteForm.twitter_url}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, twitter_url: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Instagram URL</label>
                  <input
                    type="text"
                    value={websiteForm.instagram_url}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, instagram_url: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">YouTube URL</label>
                  <input
                    type="text"
                    value={websiteForm.youtube_url}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, youtube_url: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">LinkedIn URL</label>
                  <input
                    type="text"
                    value={websiteForm.linkedin_url}
                    onChange={(e) => setWebsiteForm({ ...websiteForm, linkedin_url: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 transition-colors min-w-[170px]"
              >
                {saving ? (
                  <div className="loader loader-sm loader-white" />
                ) : (
                  <>
                    <FiSave />
                    <span>Save All Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs max-w-4xl space-y-5">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Institutional Verification Data</h3>
              <p className="text-xs text-slate-500">
                Review and control KYC/EIIN verification documents received for this website container.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVerificationForm({ ...verificationForm, verification_status: 'approved' });
                }}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                Set Approved
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerificationForm({ ...verificationForm, verification_status: 'rejected' });
                }}
                className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Set Rejected
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveVerification} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Verification Status
                </label>
                <select
                  value={verificationForm.verification_status}
                  onChange={(e) => setVerificationForm({ ...verificationForm, verification_status: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved / Verified</option>
                  <option value="rejected">Rejected / Needs Correction</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Creator NID Number
                </label>
                <input
                  type="text"
                  value={verificationForm.creator_nid}
                  onChange={(e) => setVerificationForm({ ...verificationForm, creator_nid: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Creator NID Document URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={verificationForm.creator_nid_url}
                    onChange={(e) => setVerificationForm({ ...verificationForm, creator_nid_url: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  {verificationForm.creator_nid_url && (
                    <a
                      href={verificationForm.creator_nid_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-2 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-700 shrink-0 inline-flex items-center gap-1"
                    >
                      <FiExternalLink /> View
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  EIIN Certificate Number
                </label>
                <input
                  type="text"
                  value={verificationForm.eiin_certificate}
                  onChange={(e) => setVerificationForm({ ...verificationForm, eiin_certificate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                EIIN Certificate Document URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={verificationForm.eiin_certificate_url}
                  onChange={(e) => setVerificationForm({ ...verificationForm, eiin_certificate_url: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
                {verificationForm.eiin_certificate_url && (
                  <a
                    href={verificationForm.eiin_certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-2 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-700 shrink-0 inline-flex items-center gap-1"
                  >
                    <FiExternalLink /> View
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Official Registered Institutional Address
              </label>
              <textarea
                rows={2}
                value={verificationForm.address}
                onChange={(e) => setVerificationForm({ ...verificationForm, address: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Other Details &amp; Metadata (JSON format)
              </label>
              <textarea
                rows={3}
                value={verificationForm.other_details_text}
                onChange={(e) => setVerificationForm({ ...verificationForm, other_details_text: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <FiSave />
                <span>{saving ? 'Saving...' : 'Save Verification Information'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'edit_creator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Current Owner Profile</h3>
              <p className="text-xs text-slate-500">Edit account details for current client: &ldquo;{creator?.name}&rdquo;</p>
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
                  className="w-full py-2 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 transition-colors min-h-[34px]"
                >
                  {saving ? (
                    <div className="loader loader-sm loader-white" />
                  ) : (
                    <>
                      <FiSave />
                      <span>Save Creator Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

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
                      #{c.id} {c.name} &bull; {c.email} ({c.city || 'Creator'})
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

      {activeTab === 'modules' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Backoffice Control Modules ({control_modules.length} Included)
                </h3>
                <p className="text-xs text-slate-500">
                  Administrative and operational modules granted through the active package subscription.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {control_modules.length === 0 ? (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                  No control modules attached. Link an active package subscription to entitle modules.
                </div>
              ) : (
                control_modules.map((cm) => (
                  <div
                    key={cm.id}
                    className="p-3.5 rounded border border-emerald-200 dark:border-emerald-900/50 bg-slate-50/60 dark:bg-slate-800/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{cm.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Entitled
                      </span>
                    </div>
                    {cm.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{cm.description}</p>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 block">Path: {cm.path || cm.slug}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Front Public Home Modules ({home_modules.length} Included)
                </h3>
                <p className="text-xs text-slate-500">
                  Public landing page sections and visitor modules granted through the active package.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {home_modules.length === 0 ? (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                  No home modules attached. Link an active package subscription to entitle modules.
                </div>
              ) : (
                home_modules.map((hm) => (
                  <div
                    key={hm.id}
                    className="p-3.5 rounded border border-blue-200 dark:border-blue-900/50 bg-slate-50/60 dark:bg-slate-800/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{hm.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        Active
                      </span>
                    </div>
                    {hm.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{hm.description}</p>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 block">Path: {hm.path || hm.slug}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
