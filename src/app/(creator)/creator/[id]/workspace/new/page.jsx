'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCreator } from '../../layout';

const INSTITUTION_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'university', label: 'University' },
  { value: 'high-school', label: 'High School' },
  { value: 'college', label: 'College' },
  { value: 'coaching academy', label: 'Coaching Academy' },
  { value: 'madrasah', label: 'Madrasah / Religious Institute' },
  { value: 'private institution', label: 'Private Institution' },
  { value: 'training institute', label: 'Vocational & Training Institute' },
];

const PRESET_COLORS = [
  { name: 'Navy Blue', hex: '#1e40af' },
  { name: 'Sky Cyan', hex: '#0ea5e9' },
  { name: 'Indigo Royal', hex: '#4338ca' },
  { name: 'Emerald Scholar', hex: '#047857' },
  { name: 'Crimson Pride', hex: '#b91c1c' },
  { name: 'Deep Violet', hex: '#6d28d9' },
  { name: 'Slate Modern', hex: '#0f172a' },
];

export default function CreateWebsitePage() {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const querySubId = searchParams.get('subscriptionId');

  const {
    creatorId: contextCreatorId,
    creator,
    websites = [],
    subscriptions = [],
    activeSubscription,
    activeSubscriptions = [],
    refetch,
  } = useCreator();

  const creatorId = routeParams?.id || contextCreatorId;

  const activeSubs = activeSubscriptions.length > 0
    ? activeSubscriptions
    : subscriptions.filter((s) => s.is_active || ['active', 'completed'].includes(String(s.status || '').toLowerCase()));

  const [baseDomain, setBaseDomain] = useState(
    typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:3000'
  );

  // Form states
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(querySubId || '');
  const [name, setName] = useState('');
  const [institutionType, setInstitutionType] = useState('school');
  const [eeinNumber, setEeinNumber] = useState('');
  const [tagline, setTagline] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [contactPhone, setContactPhone] = useState(creator?.phone || '');
  const [contactEmail, setContactEmail] = useState(creator?.email || '');
  const [address, setAddress] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [secondaryColor, setSecondaryColor] = useState('#0ea5e9');
  const [theme, setTheme] = useState('default');

  // Real-time Subdomain Verification
  const [domainStatus, setDomainStatus] = useState({
    state: 'idle', // 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'
    message: '',
    fullDomain: '',
  });

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Auto-select subscription from query param or first available with slots
  useEffect(() => {
    if (querySubId) {
      const timer = setTimeout(() => setSelectedSubscriptionId(querySubId), 0);
      return () => clearTimeout(timer);
    } else if (activeSubs.length > 0 && !selectedSubscriptionId) {
      const preferred = activeSubs.find((s) => {
        const allowed = Number(s.websitesAllowed ?? s.max_websites ?? 1);
        const used = Number(s.websitesUsed ?? s.websites_count ?? 0);
        return allowed - used > 0;
      });
      const timer = setTimeout(() => {
        setSelectedSubscriptionId(String(preferred?.id || activeSubs[0].id));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [querySubId, activeSubs, selectedSubscriptionId]);

  // Fetch configured base domain from server
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

  // Sync creator email/phone if initially empty
  useEffect(() => {
    if ((creator?.email && !contactEmail) || (creator?.phone && !contactPhone)) {
      const timer = setTimeout(() => {
        if (creator?.email && !contactEmail) setContactEmail(creator.email);
        if (creator?.phone && !contactPhone) setContactPhone(creator.phone);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [creator, contactEmail, contactPhone]);

  // Auto-generate subdomain from institution name until user manually alters it
  const handleNameChange = (val) => {
    setName(val);
    if (!subdomainTouched) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 32);
      setSubdomain(generated);
    }
  };

  // Real-time debounce check for subdomain
  useEffect(() => {
    const clean = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    if (!clean) {
      const timer = setTimeout(() => {
        setDomainStatus({ state: 'idle', message: '', fullDomain: '' });
      }, 0);
      return () => clearTimeout(timer);
    }

    if (clean.length < 3) {
      const timer = setTimeout(() => {
        setDomainStatus({
          state: 'invalid',
          message: 'Subdomain prefix must be at least 3 characters.',
          fullDomain: `${clean}.${baseDomain}`,
        });
      }, 0);
      return () => clearTimeout(timer);
    }

    if (clean.startsWith('-') || clean.endsWith('-')) {
      const timer = setTimeout(() => {
        setDomainStatus({
          state: 'invalid',
          message: 'Subdomain prefix cannot start or end with a hyphen.',
          fullDomain: `${clean}.${baseDomain}`,
        });
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setDomainStatus({
        state: 'checking',
        message: 'Checking availability...',
        fullDomain: `${clean}.${baseDomain}`,
      });
    }, 0);

    const checkTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/marketing/creator/websites/check-domain?domain=${encodeURIComponent(clean)}`);
        const json = await res.json();

        if (json.available) {
          setDomainStatus({
            state: 'available',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: `Available (${json.fullDomain || `${clean}.${baseDomain}`})`,
          });
        } else {
          setDomainStatus({
            state: 'taken',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: json.error || `"${clean}.${baseDomain}" is already registered.`,
          });
        }
      } catch {
        setDomainStatus({
          state: 'error',
          fullDomain: `${clean}.${baseDomain}`,
          message: 'Network error checking subdomain availability.',
        });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      clearTimeout(checkTimeout);
    };
  }, [subdomain, baseDomain]);

  const selectedSub = activeSubs.find((s) => String(s.id) === String(selectedSubscriptionId)) || (activeSubs.length > 0 ? activeSubs[0] : null);
  const selectedSubAllowed = Number(selectedSub?.websitesAllowed ?? selectedSub?.max_websites ?? selectedSub?.max_portfolios ?? 1);
  const selectedSubUsed = Number(selectedSub?.websitesUsed ?? selectedSub?.websites_count ?? 0);
  const isSelectedSubQuotaReached = selectedSub ? selectedSubUsed >= selectedSubAllowed : true;
  const noActiveSubs = activeSubs.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    if (noActiveSubs) {
      setCreateError('You do not have an active subscription. Please purchase a package plan first.');
      setCreating(false);
      return;
    }

    const currentSubId = selectedSubscriptionId || selectedSub?.id;
    if (!currentSubId) {
      setCreateError('Please select a subscription for this website.');
      setCreating(false);
      return;
    }

    if (isSelectedSubQuotaReached) {
      setCreateError(`The selected package (${selectedSub?.package_name || 'plan'}) has reached its limit of ${selectedSubAllowed} website(s). Please choose another subscription or upgrade.`);
      setCreating(false);
      return;
    }

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    if (!cleanSubdomain || cleanSubdomain.length < 3) {
      setCreateError('Subdomain prefix is required and must be at least 3 characters.');
      setCreating(false);
      return;
    }

    if (domainStatus.state === 'taken' || domainStatus.state === 'invalid') {
      setCreateError(domainStatus.message || 'Please choose an available subdomain prefix.');
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
          subscriptionId: Number(currentSubId),
          name: name.trim(),
          institutionType,
          institution_type: institutionType,
          eeinNumber: eeinNumber.trim(),
          eiinNumber: eeinNumber.trim(),
          subdomain: cleanSubdomain,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          address: address.trim(),
          tagline: tagline.trim(),
          primaryColor,
          secondaryColor,
          theme,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreateSuccess(`Website "${name}" created successfully. Redirecting to workspace...`);
        if (refetch) await refetch();
        setTimeout(() => {
          router.push(`/creator/${creatorId}/workspace/${cleanSubdomain}`);
        }, 1000);
      } else {
        setCreateError(data.error || 'Failed to create website.');
      }
    } catch {
      setCreateError('Network error while creating website. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/creator/${creatorId}/workspace`}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium underline"
            >
              Websites
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-900">Provision New Institution</span>
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200">
              New Site
            </span>
          </div>
          <h1 className="text-base font-semibold text-slate-900">
            Create Educational Website
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure institutional identity, live subdomain routing, brand colors, and attach to an active subscription package.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/creator/${creatorId}/workspace`}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Cancel & Return
          </Link>
        </div>
      </div>

      {/* Warning if No Active Subscriptions */}
      {noActiveSubs && (
        <div className="p-3.5 rounded border bg-rose-50 border-rose-200 text-rose-700 space-y-1">
          <div className="font-semibold text-xs">No Active Subscription Found</div>
          <p className="text-xs">
            An active package subscription is required before provisioning an institution website.
          </p>
          <div className="pt-1">
            <Link
              href={`/creator/${creatorId}/subscription`}
              className="font-medium text-xs text-rose-800 underline hover:text-rose-900"
            >
              Browse and purchase subscription plans &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Quota Warning if Selected Subscription is Full */}
      {!noActiveSubs && isSelectedSubQuotaReached && (
        <div className="p-3.5 rounded border bg-amber-50 border-amber-200 text-amber-700 space-y-1">
          <div className="font-semibold text-xs">Package Website Limit Reached</div>
          <p className="text-xs">
            The selected subscription ({selectedSub?.package_name || selectedSub?.name || 'Selected Plan'}) has reached its maximum quota of {selectedSubAllowed} website(s). Select another package below or upgrade.
          </p>
          <div className="pt-1">
            <Link
              href={`/creator/${creatorId}/subscription`}
              className="font-medium text-xs text-amber-800 underline hover:text-amber-900"
            >
              Upgrade or purchase an additional package &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-5">
        {/* Feedback Messages */}
        {createError && (
          <div className="p-3 rounded border bg-rose-50 border-rose-200 text-rose-700 text-xs font-medium">
            {createError}
          </div>
        )}

        {createSuccess && (
          <div className="p-3 rounded border bg-emerald-50 border-emerald-200 text-emerald-700 text-xs font-medium">
            {createSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Subscription Selection */}
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">1. Select Subscription Package</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which active package subscription this website will be linked to.
                </p>
              </div>
              <Link
                href={`/creator/${creatorId}/subscription`}
                className="text-xs font-medium text-slate-700 hover:underline"
              >
                Manage Plans
              </Link>
            </div>

            {activeSubs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeSubs.map((sub) => {
                  const allowed = Number(sub.websitesAllowed ?? sub.max_websites ?? sub.max_portfolios ?? 1);
                  const used = Number(sub.websitesUsed ?? sub.websites_count ?? 0);
                  const isFull = used >= allowed;
                  const isSelected = String(selectedSubscriptionId) === String(sub.id);

                  return (
                    <div
                      key={sub.id}
                      onClick={() => {
                        if (!isFull) {
                          setSelectedSubscriptionId(String(sub.id));
                        }
                      }}
                      className={`p-3 rounded border text-left transition-colors ${
                        isFull
                          ? 'border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-slate-900 bg-slate-50/60 cursor-pointer'
                          : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="subscriptionSelect"
                            value={sub.id}
                            checked={isSelected}
                            disabled={isFull}
                            onChange={() => setSelectedSubscriptionId(String(sub.id))}
                            className="cursor-pointer"
                          />
                          <div>
                            <h3 className="font-semibold text-slate-900 text-xs">
                              {sub.package_name || sub.name || `Package #${sub.package_id}`}
                            </h3>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Sub #{sub.id} &bull; {sub.billing_cycle || sub.interval || 'Monthly'}
                            </span>
                          </div>
                        </div>

                        {isFull ? (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200">
                            Limit Reached
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Available ({allowed - used} slots left)
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>Websites Quota: <strong className="text-slate-800 font-medium">{used} / {allowed}</strong></span>
                        <span>Teachers: <strong className="text-slate-800 font-medium">{sub.max_teachers ?? 'Unlimited'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded border border-slate-200 text-center text-slate-500 text-xs">
                No active subscriptions available to link.
              </div>
            )}
          </div>

          {/* Section 2: Institution Identity */}
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">2. Institution Identity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Provide official educational institution details.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Institution / Website Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oxford Cambridge International School"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Institution Type</label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  EIIN / Registration No. <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 102938"
                  value={eeinNumber}
                  onChange={(e) => setEeinNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Tagline / Motto <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inspiring Excellence, Cultivating Character"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Subdomain Routing */}
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">3. Live Subdomain Routing</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose an available subdomain. You can also attach a verified custom domain later.
                </p>
              </div>
              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200">
                Live Verification
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Subdomain Prefix <span className="text-rose-500">*</span>
              </label>

              <div className="flex items-center">
                <input
                  type="text"
                  required
                  placeholder="oxford-academy"
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomainTouched(true);
                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'));
                  }}
                  className={`flex-1 bg-white border rounded-l px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none ${
                    domainStatus.state === 'available'
                      ? 'border-emerald-400 focus:border-emerald-600 bg-emerald-50/20'
                      : domainStatus.state === 'taken' || domainStatus.state === 'invalid'
                      ? 'border-rose-400 focus:border-rose-600 bg-rose-50/20'
                      : 'border-slate-300 focus:border-slate-800'
                  }`}
                />
                <span className="px-3 py-1.5 bg-slate-100 border border-l-0 border-slate-300 text-slate-600 font-mono text-xs rounded-r select-none">
                  .{baseDomain}
                </span>
              </div>

              {/* Status Indicator Badge */}
              <div className="min-h-[22px] flex items-center gap-2 pt-0.5">
                {domainStatus.state === 'checking' && (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200 font-mono">
                    Checking availability...
                  </span>
                )}

                {domainStatus.state === 'available' && (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 font-mono">
                    {domainStatus.message}
                  </span>
                )}

                {domainStatus.state === 'taken' && (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-rose-50 text-rose-700 border-rose-200 font-mono">
                    {domainStatus.message}
                  </span>
                )}

                {domainStatus.state === 'invalid' && (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200 font-mono">
                    {domainStatus.message}
                  </span>
                )}

                {domainStatus.state === 'idle' && (
                  <span className="text-slate-400 text-[11px]">
                    Enter 3-32 characters (letters, numbers, hyphens). Verified live.
                  </span>
                )}
              </div>

              {/* Live Preview Bar */}
              {subdomain && (
                <div className="p-2.5 rounded border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Public URL:</span>
                  <span className="font-mono font-medium text-slate-900">
                    https://{subdomain}.{baseDomain}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Contact & Campus Location */}
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">4. Contact & Campus Location</h2>
              <p className="text-xs text-slate-500 mt-0.5">Official contact credentials for institutional notices and enquiries.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Official Contact Email</label>
                <input
                  type="email"
                  placeholder="contact@school.edu"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Official Contact Phone</label>
                <input
                  type="text"
                  placeholder="+880 1812-345678"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-slate-700">Campus Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Academic Boulevard, Suite 400"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Branding & Visual Theme */}
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">5. Branding & Visual Theme</h2>
              <p className="text-xs text-slate-500 mt-0.5">Configure institutional primary and secondary brand colors.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary Color */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">Primary Brand Color</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={`pri-${c.hex}`}
                      type="button"
                      onClick={() => setPrimaryColor(c.hex)}
                      className={`px-2 py-1 rounded border text-[11px] font-medium cursor-pointer transition-colors ${
                        primaryColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="inline-block w-2.5 h-2.5 rounded mr-1.5 align-middle" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-300 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-28 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">Secondary Brand Color</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={`sec-${c.hex}`}
                      type="button"
                      onClick={() => setSecondaryColor(c.hex)}
                      className={`px-2 py-1 rounded border text-[11px] font-medium cursor-pointer transition-colors ${
                        secondaryColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="inline-block w-2.5 h-2.5 rounded mr-1.5 align-middle" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-300 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-28 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Portal Theme Mode */}
            <div className="space-y-1 pt-2">
              <label className="block text-xs font-medium text-slate-700">Portal Theme Preset</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full sm:w-64 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              >
                <option value="default">Default Modern Hub</option>
                <option value="academic">Academic Classic</option>
                <option value="minimal">Minimal Dark</option>
                <option value="vibrant">Vibrant Campus</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <Link
              href={`/creator/${creatorId}/workspace`}
              className="w-full sm:w-auto px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs text-center transition-colors cursor-pointer"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={creating || noActiveSubs || isSelectedSubQuotaReached || domainStatus.state === 'taken' || domainStatus.state === 'invalid'}
              className="w-full sm:w-auto px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Provisioning Website...' : 'Provision Website'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
