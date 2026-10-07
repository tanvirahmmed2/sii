'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreator } from '../layout';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';

const INSTITUTION_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'university', label: 'University' },
  { value: 'high-school', label: 'High School' },
  { value: 'college', label: 'College' },
  { value: 'coaching academy', label: 'Coaching Academy' },
  { value: 'private isntitution', label: 'Private Institution' },
];

const PRESET_COLORS = [
  { name: 'Navy Blue', hex: '#1e40af' },
  { name: 'Indigo Accent', hex: '#4f46e5' },
  { name: 'Emerald Scholar', hex: '#059669' },
  { name: 'Crimson Pride', hex: '#be123c' },
  { name: 'Deep Violet', hex: '#7c3aed' },
  { name: 'Slate Modern', hex: '#0f172a' },
];

function WorkspaceContent() {
  const {
    creatorId,
    creator,
    websites = [],
    subscriptions = [],
    activeSubscription,
    activeSubscriptions = [],
    stats = {},
    refetch,
  } = useCreator();

  const searchParams = useSearchParams();
  const setupParam = searchParams.get('setup');
  const targetSubParam = searchParams.get('subscriptionId');

  const [baseDomain, setBaseDomain] = useState(
    typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:3000'
  );

  const activeSubs = activeSubscriptions.length > 0
    ? activeSubscriptions
    : subscriptions.filter((s) => s.is_active || ['active', 'completed'].includes(String(s.status || '').toLowerCase()));

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(targetSubParam || '');
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState(creator?.phone || '');
  const [mail, setMail] = useState(creator?.email || '');
  const [institutionType, setInstitutionType] = useState('school');
  const [eeinNumber, setEeinNumber] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [address, setAddress] = useState('');
  const [tagline, setTagline] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');

  // Realtime Domain Availability State
  const [domainTouched, setDomainTouched] = useState(false);
  const [domainStatus, setDomainStatus] = useState({ state: 'idle', message: '' }); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Auto-select valid subscription with available slots
  useEffect(() => {
    if (activeSubs.length > 0 && !selectedSubscriptionId) {
      const preferred = activeSubs.find((s) => {
        const allowed = Number(s.websitesAllowed ?? s.max_websites ?? 1);
        const used = Number(s.websitesUsed ?? s.websites_count ?? 0);
        return allowed - used > 0;
      });
      if (preferred) setSelectedSubscriptionId(String(preferred.id));
      else setSelectedSubscriptionId(String(activeSubs[0].id));
    }
  }, [activeSubs, selectedSubscriptionId]);

  // Edit Modal State
  const [editingWebsite, setEditingWebsite] = useState(null);
  const [editName, setEditName] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');
  const [editMail, setEditMail] = useState('');
  const [editInstitutionType, setEditInstitutionType] = useState('school');
  const [editEeinNumber, setEditEeinNumber] = useState('');
  const [editCustomDomain, setEditCustomDomain] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('#1e40af');
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editDomainStatus, setEditDomainStatus] = useState({ state: 'idle', message: '' });
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateErr, setUpdateErr] = useState('');

  const [deletingId, setDeletingId] = useState(null);
  const [copiedSubdomain, setCopiedSubdomain] = useState(null);

  // Fetch configured Base Domain from API
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/marketing/creator/websites?creatorId=${creatorId}`);
        const data = await res.json();
        if (data.baseDomain) {
          setBaseDomain(data.baseDomain);
        }
      } catch (err) {
        console.error('Error fetching websites config:', err);
      }
    }
    if (creatorId) {
      fetchConfig();
    }
  }, [creatorId]);

  // Open modal if setup query param is present
  useEffect(() => {
    if (setupParam === 'true') {
      const timer = setTimeout(() => setShowCreateModal(true), 0);
      return () => clearTimeout(timer);
    }
  }, [setupParam]);

  // Real-time letter-by-letter domain check for creation modal
  useEffect(() => {
    if (!showCreateModal) return;

    const clean = customDomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    if (!clean) {
      setDomainStatus({ state: 'idle', message: '' });
      return;
    }

    if (clean.length < 3) {
      setDomainStatus({
        state: 'invalid',
        message: 'Domain must be at least 3 characters.',
      });
      return;
    }

    if (clean.startsWith('-') || clean.endsWith('-')) {
      setDomainStatus({
        state: 'invalid',
        message: 'Domain cannot start or end with a hyphen.',
      });
      return;
    }

    setDomainStatus({ state: 'checking', message: 'Checking availability...' });

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/marketing/creator/websites/check-domain?domain=${encodeURIComponent(clean)}`);
        const json = await res.json();

        if (json.available) {
          setDomainStatus({
            state: 'available',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: `Available! ${json.fullDomain || `${clean}.${baseDomain}`}`,
          });
        } else {
          setDomainStatus({
            state: 'taken',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: json.error || 'This domain prefix is already in use.',
          });
        }
      } catch {
        setDomainStatus({
          state: 'error',
          message: 'Network error checking domain availability.',
        });
      }
    }, 220); // 220ms debounce for responsive feedback after every letter

    return () => clearTimeout(timeout);
  }, [customDomain, showCreateModal, baseDomain]);

  // Real-time domain check for edit modal
  useEffect(() => {
    if (!editingWebsite) return;

    const clean = editCustomDomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    if (!clean) {
      setEditDomainStatus({ state: 'idle', message: '' });
      return;
    }

    if (clean.length < 3) {
      setEditDomainStatus({ state: 'invalid', message: 'Must be at least 3 characters.' });
      return;
    }

    setEditDomainStatus({ state: 'checking', message: 'Checking availability...' });

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/marketing/creator/websites/check-domain?domain=${encodeURIComponent(clean)}&websiteId=${editingWebsite.id}`
        );
        const json = await res.json();
        if (json.available) {
          setEditDomainStatus({
            state: 'available',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: `Available! ${json.fullDomain || `${clean}.${baseDomain}`}`,
          });
        } else {
          setEditDomainStatus({
            state: 'taken',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: json.error || 'This domain is already registered.',
          });
        }
      } catch {
        setEditDomainStatus({ state: 'error', message: 'Error checking domain.' });
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [editCustomDomain, editingWebsite, baseDomain]);

  const maxWebsites = stats?.maxWebsites || activeSubscription?.max_websites || activeSubscription?.max_portfolios || 1;
  const hasActivePackage = Boolean(
    activeSubscription &&
      (stats?.daysRemaining > 0 || !activeSubscription.expires_at || new Date(activeSubscription.expires_at) > new Date())
  );

  const handleNameChange = (val) => {
    setName(val);
    if (!domainTouched) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 32);
      setCustomDomain(generated);
    }
  };

  const handleOpenEdit = (w) => {
    setEditingWebsite(w);
    setEditName(w.name || '');

    // Extract prefix if full domain is stored
    let domainPrefix = w.slug || w.subdomain || '';
    if (domainPrefix.includes('.')) {
      domainPrefix = domainPrefix.split('.')[0];
    }
    setEditCustomDomain(domainPrefix);

    setEditContactNumber(w.contact_phone || '');
    setEditMail(w.contact_email || '');

    const normType = (w.institution_type || 'school').toLowerCase();
    const matchedType = INSTITUTION_TYPES.find((t) => t.value === normType || t.label.toLowerCase() === normType);
    setEditInstitutionType(matchedType ? matchedType.value : 'school');

    setEditEeinNumber(w.eiin_number || '');
    setEditAddress(w.address || '');
    setEditPrimaryColor(w.primary_color || '#1e40af');
    setEditIsPublished(w.status === 'active' && !w.is_maintenance_mode);
    setUpdateMsg('');
    setUpdateErr('');
    setEditDomainStatus({ state: 'available', message: 'Current active domain' });
  };

  const handleCopyUrl = (url, id) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedSubdomain(id);
      setTimeout(() => setCopiedSubdomain(null), 2000);
    }
  };

  const handleCreateWebsite = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    if (activeSubs.length === 0) {
      setCreateError('An active package subscription is required to create a website. Please purchase a package first.');
      setCreating(false);
      return;
    }

    if (!selectedSubscriptionId) {
      setCreateError('Please select a subscription package for this website.');
      setCreating(false);
      return;
    }

    const chosenSub = activeSubs.find((s) => String(s.id) === String(selectedSubscriptionId));
    if (chosenSub) {
      const allowed = Number(chosenSub.websitesAllowed ?? chosenSub.max_websites ?? 1);
      const used = Number(chosenSub.websitesUsed ?? chosenSub.websites_count ?? 0);
      if (used >= allowed) {
        setCreateError(
          `Your subscription for "${chosenSub.package_name}" allows up to ${allowed} website(s). You have already created ${used} website(s) for this subscription.`
        );
        setCreating(false);
        return;
      }
    }

    const cleanDomain = customDomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    if (!cleanDomain || cleanDomain.length < 3) {
      setCreateError('Custom domain is required and must be at least 3 characters.');
      setCreating(false);
      return;
    }

    if (domainStatus.state === 'taken' || domainStatus.state === 'invalid') {
      setCreateError(domainStatus.message || 'Please choose an available custom domain.');
      setCreating(false);
      return;
    }

    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_website',
          creatorId: Number(creatorId),
          subscriptionId: Number(selectedSubscriptionId),
          name: name.trim(),
          contactNumber: contactNumber.trim(),
          contactPhone: contactNumber.trim(),
          mail: mail.trim(),
          contactEmail: mail.trim(),
          institutionType: institutionType,
          institution_type: institutionType,
          eeinNumber: eeinNumber.trim(),
          eiinNumber: eeinNumber.trim(),
          customDomain: cleanDomain,
          subdomain: cleanDomain,
          address: address.trim(),
          tagline: tagline.trim(),
          primaryColor: primaryColor,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreateSuccess(`Website "${name}" created successfully!`);
        if (refetch) await refetch();
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateSuccess('');
          setName('');
          setCustomDomain('');
          setDomainTouched(false);
          setEeinNumber('');
          setAddress('');
          setTagline('');
        }, 1200);
      } else {
        setCreateError(data.error || 'Failed to create website.');
      }
    } catch {
      setCreateError('Network error while creating website.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveWebsite = async (e) => {
    e.preventDefault();
    if (!editingWebsite) return;
    setUpdating(true);
    setUpdateMsg('');
    setUpdateErr('');

    const cleanDomain = editCustomDomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    if (!cleanDomain || cleanDomain.length < 3) {
      setUpdateErr('Custom domain prefix must be at least 3 characters.');
      setUpdating(false);
      return;
    }

    if (editDomainStatus.state === 'taken' || editDomainStatus.state === 'invalid') {
      setUpdateErr(editDomainStatus.message || 'Custom domain is invalid or already taken.');
      setUpdating(false);
      return;
    }

    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_website',
          id: editingWebsite.id,
          creatorId: Number(creatorId),
          name: editName.trim(),
          contact_phone: editContactNumber.trim(),
          contact_email: editMail.trim(),
          institution_type: editInstitutionType,
          eiin_number: editEeinNumber.trim(),
          custom_domain: cleanDomain,
          subdomain: cleanDomain,
          address: editAddress.trim(),
          primary_color: editPrimaryColor,
          is_published: editIsPublished,
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
    if (!confirm(`Are you sure you want to permanently delete "${websiteName}"? This action cannot be undone.`)) {
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
    <div className="w-full space-y-5 text-xs text-slate-800">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Institutional Workspace
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {websites.length} of {maxWebsites} Websites Provisioned
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Websites & Educational Campuses
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 max-w-2xl">
            Create, launch, and manage custom branded educational institutions with live subdomain routing, EIIN registry, and multi-tenant portals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/creator/${creatorId}/workspace/new`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Website
          </Link>
          <Link
            href={`/creator/${creatorId}/subscription`}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            Subscription Details
          </Link>
        </div>
      </div>

      {/* Purchased Subscriptions & Quota Allocations */}
      {activeSubs.length > 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Purchased Subscriptions & Quotas ({activeSubs.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Websites can be created under each active package tier according to its provisioned website limits.
              </p>
            </div>
            <Link
              href={`/creator/${creatorId}/subscription`}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              View All Subscriptions &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSubs.map((sub) => {
              const allowed = Number(sub.websitesAllowed ?? sub.max_websites ?? 1);
              const used = Number(sub.websitesUsed ?? sub.websites_count ?? 0);
              const remaining = Math.max(0, allowed - used);
              const isFull = remaining <= 0;

              return (
                <div
                  key={sub.id}
                  className={`border rounded-lg p-3.5 space-y-2.5 transition-all ${
                    String(selectedSubscriptionId) === String(sub.id)
                      ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">{sub.package_name}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          Active
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 capitalize">
                        {sub.billing_interval || 'monthly'} tier
                      </span>
                    </div>

                    <span className="text-[11px] font-mono font-bold text-slate-800">
                      {used} / {allowed} Sites
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${isFull ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(100, Math.round((used / allowed) * 100))}%` }}
                    />
                  </div>

                  {/* Quota details */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 pt-0.5">
                    <div>Teachers: <strong>{sub.max_teachers ? `${sub.max_teachers} Max` : 'Unlimited'}</strong></div>
                    <div>Students: <strong>{sub.max_students ? `${sub.max_students} Max` : 'Unlimited'}</strong></div>
                  </div>

                  {/* Creation button */}
                  <div className="pt-1">
                    {!isFull ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubscriptionId(String(sub.id));
                          setShowCreateModal(true);
                        }}
                        className="w-full py-1.5 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create Website for this Plan
                      </button>
                    ) : (
                      <div className="w-full py-1.5 px-3 rounded-md bg-slate-100 border border-slate-200 text-slate-500 font-medium text-xs text-center">
                        Quota Reached ({allowed}/{allowed})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-xs">No Active Subscription Package Found</h3>
            <p className="text-[11px] text-amber-700 mt-0.5">
              You need an active subscription package to launch and host educational websites.
            </p>
          </div>
          <Link
            href="/packages"
            className="px-3.5 py-1.5 rounded-lg bg-amber-900 text-white font-semibold text-xs whitespace-nowrap hover:bg-amber-800 transition-colors inline-block"
          >
            Browse Packages &rarr;
          </Link>
        </div>
      )}

      {/* Websites Directory */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Provisioned Websites ({websites.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Direct access links, live institutional subdomains, and management portals.
            </p>
          </div>
          <Link
            href={`/creator/${creatorId}/workspace/new`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            + New Website
          </Link>
        </div>

        {websites.length === 0 ? (
          <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">No Websites Created Yet</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Launch your educational institution with instant domain routing, student portals, and notice boards.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={`/creator/${creatorId}/workspace/new`}
                className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
              >
                Create First Website
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="pb-3 px-2">Institution / Name</th>
                  <th className="pb-3 px-2">Type</th>
                  <th className="pb-3 px-2">EIIN No.</th>
                  <th className="pb-3 px-2">Domain & Link</th>
                  <th className="pb-3 px-2">Contact & Address</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {websites.map((w) => {
                  const rawSub = (w.subdomain || w.slug || '').toLowerCase();
                  const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;
                  const livePath = `/${cleanSub}`;
                  const fullDomainDisplay = `${cleanSub}.${baseDomain}`;
                  const manageUrl = `/creator/${creatorId}/workspace/${cleanSub}`;
                  const liveUrl = w.custom_domain && w.custom_domain_verified
                    ? `https://${w.custom_domain}`
                    : `https://${fullDomainDisplay}`;

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Tagline */}
                      <td className="py-3 px-2">
                        <Link href={manageUrl} className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 hover:text-blue-600">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: w.primary_color || '#1e40af' }}
                          />
                          {w.name}
                        </Link>
                        {w.tagline && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                            {w.tagline}
                          </div>
                        )}
                        {w.package_name && (
                          <div className="mt-1">
                            <span className="inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Plan: {w.package_name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Institution Type */}
                      <td className="py-3 px-2">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                          {w.institution_type || 'School'}
                        </span>
                      </td>

                      {/* EIIN Number */}
                      <td className="py-3 px-2 font-mono text-[11px] text-slate-600">
                        {w.eiin_number || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Subdomain & Custom Domain */}
                      <td className="py-3 px-2 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {fullDomainDisplay}
                          </a>
                          <button
                            type="button"
                            title="Copy Domain URL"
                            onClick={() => handleCopyUrl(liveUrl, w.id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            {copiedSubdomain === w.id ? (
                              <span className="text-[9px] text-emerald-600 font-sans font-bold">Copied</span>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>

                        {/* Custom Domain indicator */}
                        {w.custom_domain ? (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-slate-900 font-semibold text-[10px]">
                              {w.custom_domain}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${
                                w.custom_domain_verified
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                  : 'text-amber-700 bg-amber-50 border border-amber-200'
                              }`}
                            >
                              {w.custom_domain_verified ? 'Verified' : 'Pending DNS'}
                            </span>
                          </div>
                        ) : (
                          <Link
                            href={manageUrl}
                            className="text-[10px] text-slate-400 hover:text-blue-600 hover:underline inline-block mt-0.5"
                          >
                            + Custom Domain
                          </Link>
                        )}
                      </td>

                      {/* Contact & Address */}
                      <td className="py-3 px-2 text-[11px] text-slate-600">
                        <div className="truncate max-w-[180px]" title={w.contact_email || ''}>
                          {w.contact_email || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={w.contact_phone || ''}>
                          {w.contact_phone || '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                            w.status === 'active' && !w.is_maintenance_mode
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              w.status === 'active' && !w.is_maintenance_mode ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {w.status === 'active' && !w.is_maintenance_mode ? 'Live' : 'Draft / Maint'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={manageUrl}
                          className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold inline-block transition-colors border border-blue-200"
                        >
                          Manage
                        </Link>
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-block transition-colors"
                        >
                          Live Site
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(w)}
                          className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium cursor-pointer transition-colors"
                        >
                          Quick Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === w.id}
                          onClick={() => handleDeleteWebsite(w.id, w.name)}
                          className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium cursor-pointer transition-colors disabled:opacity-50"
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

      {/* CREATE WEBSITE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 text-xs text-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Provision New Educational Website
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure institution credentials, real-time custom domain, and contact profiles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error & Success Messages */}
            {createError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {createSuccess}
              </div>
            )}

            <form onSubmit={handleCreateWebsite} className="space-y-4">
              {/* Field 0: Subscription Package Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Subscription Package <span className="text-rose-500">*</span>
                </label>
                {activeSubs.length === 0 ? (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    No active subscriptions available. Please purchase a package first.
                  </div>
                ) : (
                  <select
                    value={selectedSubscriptionId}
                    onChange={(e) => setSelectedSubscriptionId(e.target.value)}
                    required
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                  >
                    <option value="">-- Select Subscription Package --</option>
                    {activeSubs.map((s) => {
                      const allowed = Number(s.websitesAllowed ?? s.max_websites ?? 1);
                      const used = Number(s.websitesUsed ?? s.websites_count ?? 0);
                      const remaining = Math.max(0, allowed - used);
                      return (
                        <option key={s.id} value={s.id} disabled={remaining <= 0}>
                          {s.package_name} — {used}/{allowed} websites used {remaining <= 0 ? '(Quota Full)' : `(${remaining} free slot(s))`}
                        </option>
                      );
                    })}
                  </select>
                )}

                {/* Display info about the selected package */}
                {(() => {
                  const currentPlan = activeSubs.find((s) => String(s.id) === String(selectedSubscriptionId));
                  if (!currentPlan) return null;
                  const allowed = Number(currentPlan.websitesAllowed ?? currentPlan.max_websites ?? 1);
                  const used = Number(currentPlan.websitesUsed ?? currentPlan.websites_count ?? 0);
                  const remaining = Math.max(0, allowed - used);
                  return (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-[10px] text-slate-600">
                      <div>
                        Quota: <strong className={remaining <= 0 ? 'text-rose-600' : 'text-slate-900'}>{used}/{allowed} Used</strong>
                      </div>
                      <div>
                        Teachers: <strong>{currentPlan.max_teachers ? `${currentPlan.max_teachers} Max` : 'Unlimited'}</strong>
                      </div>
                      <div>
                        Students: <strong>{currentPlan.max_students ? `${currentPlan.max_students} Max` : 'Unlimited'}</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Field 1: Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Institution / Website Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oxford Model High School & College"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                />
              </div>

              {/* Field 2: Custom Domain with Realtime letter-by-letter check */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Custom Domain Prefix <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Base: <code className="font-bold text-slate-600">.{baseDomain}</code>
                  </span>
                </div>

                <div
                  className={`flex items-center border rounded-lg overflow-hidden transition-all focus-within:ring-2 ${
                    domainStatus.state === 'available'
                      ? 'border-emerald-500 focus-within:ring-emerald-500/20'
                      : domainStatus.state === 'taken' || domainStatus.state === 'invalid'
                      ? 'border-rose-500 focus-within:ring-rose-500/20'
                      : 'border-slate-300 focus-within:ring-blue-500/20 focus-within:border-blue-600'
                  }`}
                >
                  <span className="px-3 py-2 bg-slate-100 text-slate-500 font-mono text-[11px] border-r border-slate-200 select-none">
                    https://
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="oxford-high"
                    value={customDomain}
                    onChange={(e) => {
                      setDomainTouched(true);
                      setCustomDomain(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
                      );
                    }}
                    className="flex-1 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                  />
                  <span className="px-3 py-2 bg-slate-100 text-blue-700 font-mono text-[11px] font-semibold border-l border-slate-200 select-none">
                    .{baseDomain}
                  </span>
                </div>

                {/* Live letter-by-letter availability badge */}
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                  {domainStatus.state === 'checking' && (
                    <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Checking availability after keystroke...</span>
                    </div>
                  )}

                  {domainStatus.state === 'available' && (
                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>
                        Domain is available: <strong className="font-mono">{customDomain}.{baseDomain}</strong>
                      </span>
                    </div>
                  )}

                  {domainStatus.state === 'taken' && (
                    <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{domainStatus.message}</span>
                    </div>
                  )}

                  {domainStatus.state === 'invalid' && (
                    <span className="text-amber-600 font-medium">{domainStatus.message}</span>
                  )}

                  {domainStatus.state === 'idle' && (
                    <span className="text-slate-400">
                      Type domain prefix. Availability is verified live on every letter.
                    </span>
                  )}
                </div>
              </div>

              {/* Field 3: Institution Type */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Institution Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INSTITUTION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setInstitutionType(t.value)}
                      className={`px-3 py-2 rounded-lg border text-left font-medium text-xs transition-all cursor-pointer ${
                        institutionType === t.value
                          ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600/30'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 4: EEIN / EIIN Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  EIIN Number (Educational Institute Identification No.)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 132456"
                  value={eeinNumber}
                  onChange={(e) => setEeinNumber(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              {/* Field 5 & 6: Contact Number & Mail in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Contact Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +880 1812-345678"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Official Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. contact@oxford.edu"
                    value={mail}
                    onChange={(e) => setMail(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Field 7: Physical Address */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Campus / Institution Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. 45 College Road, Dhanmondi, Dhaka - 1209"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                />
              </div>

              {/* Theme & Brand Color */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Institutional Brand Theme Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setPrimaryColor(c.hex)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-all cursor-pointer ${
                        primaryColor === c.hex
                          ? 'border-slate-800 bg-slate-900 text-white font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    creating ||
                    domainStatus.state === 'checking' ||
                    domainStatus.state === 'taken' ||
                    domainStatus.state === 'invalid' ||
                    !customDomain ||
                    !name
                  }
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Creating Website...</span>
                    </>
                  ) : (
                    <span>Create Website</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WEBSITE MODAL */}
      {editingWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 text-xs text-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Website: {editingWebsite.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Update institution credentials, contact lines, domain binding and status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingWebsite(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {updateErr && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {updateErr}
              </div>
            )}
            {updateMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                {updateMsg}
              </div>
            )}

            <form onSubmit={handleSaveWebsite} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Website Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Custom Domain Prefix *
                </label>
                <div
                  className={`flex items-center border rounded-lg overflow-hidden ${
                    editDomainStatus.state === 'available'
                      ? 'border-emerald-500'
                      : editDomainStatus.state === 'taken' || editDomainStatus.state === 'invalid'
                      ? 'border-rose-500'
                      : 'border-slate-300'
                  }`}
                >
                  <span className="px-3 py-2 bg-slate-100 text-slate-500 font-mono text-[11px]">
                    https://
                  </span>
                  <input
                    type="text"
                    required
                    value={editCustomDomain}
                    onChange={(e) =>
                      setEditCustomDomain(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
                      )
                    }
                    className="flex-1 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                  />
                  <span className="px-3 py-2 bg-slate-100 text-blue-700 font-mono text-[11px] font-semibold">
                    .{baseDomain}
                  </span>
                </div>
                {editDomainStatus.message && (
                  <p
                    className={`text-[11px] mt-1 font-medium ${
                      editDomainStatus.state === 'available' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {editDomainStatus.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Institution Type *
                </label>
                <select
                  value={editInstitutionType}
                  onChange={(e) => setEditInstitutionType(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  EIIN Number
                </label>
                <input
                  type="text"
                  value={editEeinNumber}
                  onChange={(e) => setEditEeinNumber(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editContactNumber}
                    onChange={(e) => setEditContactNumber(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editMail}
                    onChange={(e) => setEditMail(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsPublished"
                  checked={editIsPublished}
                  onChange={(e) => setEditIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 cursor-pointer"
                />
                <label htmlFor="editIsPublished" className="text-slate-800 font-medium cursor-pointer">
                  Publish Website (Public Live Access)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingWebsite(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || editDomainStatus.state === 'taken'}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {updating ? 'Saving Changes...' : 'Save Changes'}
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
      fallback={<LoadingScreen fullScreen={false} label="Loading workspace..." />}
    >
      <WorkspaceContent />
    </Suspense>
  );
}
