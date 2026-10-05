'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  { name: 'Navy Blue', hex: '#1e40af', bg: 'bg-blue-700' },
  { name: 'Indigo Royal', hex: '#4338ca', bg: 'bg-indigo-700' },
  { name: 'Emerald Scholar', hex: '#047857', bg: 'bg-emerald-700' },
  { name: 'Crimson Pride', hex: '#b91c1c', bg: 'bg-red-700' },
  { name: 'Deep Violet', hex: '#6d28d9', bg: 'bg-purple-700' },
  { name: 'Slate Modern', hex: '#0f172a', bg: 'bg-slate-900' },
];

export default function CreateWebsitePage() {
  const router = useRouter();
  const routeParams = useParams();
  const {
    creatorId: contextCreatorId,
    creator,
    websites = [],
    activeSubscription,
    stats = {},
    refetch,
  } = useCreator();

  const creatorId = routeParams?.id || contextCreatorId;

  const [baseDomain, setBaseDomain] = useState(
    typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:3000'
  );

  // Form states
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
    if (creator?.email && !contactEmail) setContactEmail(creator.email);
    if (creator?.phone && !contactPhone) setContactPhone(creator.phone);
  }, [creator, contactEmail, contactPhone]);

  // Auto-generate subdomain from institution name until touched
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

  // Real-time letter-by-letter live availability check
  useEffect(() => {
    const clean = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    if (!clean) {
      setDomainStatus({ state: 'idle', message: '', fullDomain: '' });
      return;
    }

    if (clean.length < 3) {
      setDomainStatus({
        state: 'invalid',
        message: 'Subdomain prefix must be at least 3 characters.',
        fullDomain: `${clean}.${baseDomain}`,
      });
      return;
    }

    if (clean.startsWith('-') || clean.endsWith('-')) {
      setDomainStatus({
        state: 'invalid',
        message: 'Subdomain prefix cannot start or end with a hyphen.',
        fullDomain: `${clean}.${baseDomain}`,
      });
      return;
    }

    setDomainStatus({
      state: 'checking',
      message: 'Checking availability...',
      fullDomain: `${clean}.${baseDomain}`,
    });

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
    }, 220); // 220ms debounce for responsive feedback

    return () => clearTimeout(timeout);
  }, [subdomain, baseDomain]);

  const maxWebsites = stats?.maxWebsites || activeSubscription?.max_websites || activeSubscription?.max_portfolios || 1;
  const isQuotaReached = websites.length >= maxWebsites && activeSubscription;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

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
          name: name.trim(),
          institutionType: institutionType,
          eeinNumber: eeinNumber.trim(),
          subdomain: cleanSubdomain,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          address: address.trim(),
          tagline: tagline.trim(),
          primaryColor: primaryColor,
          theme: theme,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreateSuccess(`Website "${name}" created successfully! Redirecting to workspace...`);
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
    <div className="w-full max-w-4xl mx-auto space-y-6 text-slate-800 text-xs pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/creator/${creatorId}/workspace`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Websites Workspace
        </Link>
        <span className="text-[11px] font-mono text-slate-500">
          Provisioned: {websites.length} / {maxWebsites}
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-8">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white/15 border border-white/20">
            Provision New Institution
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-2">
            Create Educational Website
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm mt-1 max-w-xl">
            Choose an available institution subdomain, set up campus identity, and launch student, teacher & admin portals instantly.
          </p>
        </div>

        {/* Quota Warning if Exceeded */}
        {isQuotaReached && (
          <div className="m-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs">
              <p className="font-bold">Subscription Allocation Limit Reached</p>
              <p className="mt-0.5">
                Your current plan allows up to {maxWebsites} website(s). You may upgrade your package to create more websites.
              </p>
              <Link
                href={`/creator/${creatorId}/subscription`}
                className="mt-2 inline-block font-semibold text-blue-700 hover:underline"
              >
                Upgrade Package Plan &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          {/* Feedback Messages */}
          {createError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{createError}</span>
            </div>
          )}

          {createSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{createSuccess}</span>
            </div>
          )}

          {/* Section 1: Institution Identity */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900">1. Institution Identity</h2>
              <p className="text-[11px] text-slate-500">Provide official educational institution details.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Institution / Website Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oxford Cambridge International School"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution Type</label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  EIIN / Registration No. <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 102938"
                  value={eeinNumber}
                  onChange={(e) => setEeinNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Tagline / Motto <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inspiring Excellence, Cultivating Character"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Subdomain Selection (CORE USER FEATURE) */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                2. Live Subdomain Routing
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  Live Check
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Choose an available subdomain. You can also attach your own custom domain (e.g. school.edu) later.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">
                Subdomain Prefix <span className="text-red-500">*</span>
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
                  className={`flex-1 px-3.5 py-2.5 rounded-l-lg border text-xs font-mono focus:outline-none focus:ring-2 ${
                    domainStatus.state === 'available'
                      ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/20'
                      : domainStatus.state === 'taken' || domainStatus.state === 'invalid'
                      ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                <span className="px-3.5 py-2.5 rounded-r-lg bg-slate-100 border border-l-0 border-slate-300 text-slate-600 font-mono text-xs select-none">
                  .{baseDomain}
                </span>
              </div>

              {/* Status Indicator Pill */}
              <div className="min-h-[22px] flex items-center gap-2 pt-1 text-[11px]">
                {domainStatus.state === 'checking' && (
                  <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Checking availability...
                  </span>
                )}

                {domainStatus.state === 'available' && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    {domainStatus.message}
                  </span>
                )}

                {domainStatus.state === 'taken' && (
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-semibold">
                    <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {domainStatus.message}
                  </span>
                )}

                {domainStatus.state === 'invalid' && (
                  <span className="text-amber-700 font-medium">
                    &bull; {domainStatus.message}
                  </span>
                )}

                {domainStatus.state === 'idle' && (
                  <span className="text-slate-400">
                    Enter letters, numbers, and single hyphens (e.g. cambridge-high).
                  </span>
                )}
              </div>

              {/* Live Preview Card */}
              {subdomain && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-500 text-[11px]">Tenant Public URL:</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px]">
                      https://{subdomain}.{baseDomain}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    App Router: app/[domain]
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Contact & Campus Info */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900">3. Contact & Campus Location</h2>
              <p className="text-[11px] text-slate-500">Official contact credentials for institutional notices and enquiries.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Contact Email</label>
                <input
                  type="email"
                  placeholder="contact@school.edu"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Contact Phone</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2834"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Campus Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Academic Boulevard, Suite 400"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Visual Branding & Presets */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900">4. Branding & Visual Theme</h2>
              <p className="text-[11px] text-slate-500">Select institutional colors and styling palette.</p>
            </div>

            <div className="space-y-3">
              <label className="block font-semibold text-slate-700">Primary Brand Accent</label>
              <div className="flex flex-wrap items-center gap-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPrimaryColor(c.hex)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                      primaryColor.toLowerCase() === c.hex.toLowerCase()
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                  </button>
                ))}

                <div className="flex items-center gap-2 pl-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
                    title="Choose custom color"
                  />
                  <span className="font-mono text-[11px] text-slate-500">{primaryColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Link
              href={`/creator/${creatorId}/workspace`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-center transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={creating || isQuotaReached || domainStatus.state === 'taken' || domainStatus.state === 'invalid'}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Provisioning Website...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Create & Launch Website</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
