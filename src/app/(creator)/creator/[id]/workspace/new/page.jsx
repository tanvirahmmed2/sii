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
    subscriptions = [],
    activeSubscriptions = [],
    refetch,
  } = useCreator();

  const creatorId = routeParams?.id || contextCreatorId;

  const activeSubs = activeSubscriptions.length > 0
    ? activeSubscriptions
    : subscriptions.filter((s) => s.is_active || ['active', 'completed'].includes(String(s.status || '').toLowerCase()));

  const [currentStep, setCurrentStep] = useState(1);
  const [baseDomain, setBaseDomain] = useState(
    typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:3000'
  );

  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(querySubId || '');
  const [name, setName] = useState('');
  const [institutionType, setInstitutionType] = useState('school');
  const [eeinNumber, setEeinNumber] = useState('');
  const [tagline, setTagline] = useState('');
  const [contactEmail, setContactEmail] = useState(creator?.email || '');
  const [contactPhone, setContactPhone] = useState(creator?.phone || '');
  const [address, setAddress] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [secondaryColor, setSecondaryColor] = useState('#0ea5e9');
  const [theme, setTheme] = useState('default');
  const [currency, setCurrency] = useState('BDT');

  const [subdomain, setSubdomain] = useState('');
  const [isSubdomainClaimed, setIsSubdomainClaimed] = useState(false);
  const [domainStatus, setDomainStatus] = useState({
    state: 'idle',
    message: '',
    fullDomain: '',
  });

  const [customDomain, setCustomDomain] = useState('');
  const [customDomainStatus, setCustomDomainStatus] = useState({
    state: 'idle',
    message: '',
    dnsInstructions: null,
  });

  const [creatorNid, setCreatorNid] = useState('');
  const [creatorNidUrl, setCreatorNidUrl] = useState('');
  const [eiinCertificate, setEiinCertificate] = useState('');
  const [eiinCertificateUrl, setEiinCertificateUrl] = useState('');
  const [verificationAddress, setVerificationAddress] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [boardAffiliation, setBoardAffiliation] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    if (querySubId) {
      setSelectedSubscriptionId(querySubId);
    } else if (activeSubs.length > 0 && !selectedSubscriptionId) {
      const preferred = activeSubs.find((s) => {
        const allowed = Number(s.websitesAllowed ?? s.max_websites ?? 1);
        const used = Number(s.websitesUsed ?? s.websites_count ?? 0);
        return allowed - used > 0;
      });
      setSelectedSubscriptionId(String(preferred?.id || activeSubs[0].id));
    }
  }, [querySubId, activeSubs, selectedSubscriptionId]);

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

  useEffect(() => {
    if (creator?.email && !contactEmail) setContactEmail(creator.email);
    if (creator?.phone && !contactPhone) setContactPhone(creator.phone);
  }, [creator, contactEmail, contactPhone]);

  useEffect(() => {
    if (address && !verificationAddress) {
      setVerificationAddress(address);
    }
  }, [address, verificationAddress]);

  useEffect(() => {
    if (!subdomain) {
      setDomainStatus({ state: 'idle', message: '', fullDomain: '' });
      setIsSubdomainClaimed(false);
      return;
    }

    const clean = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    if (clean.length < 3) {
      setDomainStatus({
        state: 'invalid',
        message: 'Subdomain prefix must be at least 3 characters.',
        fullDomain: `${clean}.${baseDomain}`,
      });
      setIsSubdomainClaimed(false);
      return;
    }

    if (clean.startsWith('-') || clean.endsWith('-')) {
      setDomainStatus({
        state: 'invalid',
        message: 'Subdomain cannot begin or end with a hyphen.',
        fullDomain: `${clean}.${baseDomain}`,
      });
      setIsSubdomainClaimed(false);
      return;
    }

    setDomainStatus({
      state: 'checking',
      message: 'Checking availability...',
      fullDomain: `${clean}.${baseDomain}`,
    });

    const checkTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/marketing/creator/websites/check-domain?domain=${encodeURIComponent(clean)}`);
        const json = await res.json();

        if (json.available) {
          setDomainStatus({
            state: 'available',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: `Subdomain is available! Click claim to assign it.`,
          });
        } else {
          setDomainStatus({
            state: 'taken',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: json.error || `"${clean}.${baseDomain}" is already reserved.`,
          });
          setIsSubdomainClaimed(false);
        }
      } catch {
        setDomainStatus({
          state: 'error',
          fullDomain: `${clean}.${baseDomain}`,
          message: 'Network error checking subdomain availability.',
        });
        setIsSubdomainClaimed(false);
      }
    }, 250);

    return () => clearTimeout(checkTimer);
  }, [subdomain, baseDomain]);

  useEffect(() => {
    if (!customDomain.trim()) {
      setCustomDomainStatus({ state: 'idle', message: '', dnsInstructions: null });
      return;
    }

    const clean = customDomain.trim().toLowerCase();
    if (!clean.includes('.') || clean.length < 4) {
      setCustomDomainStatus({
        state: 'invalid',
        message: 'Enter a valid domain name (e.g. school.edu.bd)',
        dnsInstructions: null,
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/marketing/creator/websites/check-domain?type=custom&customDomain=${encodeURIComponent(clean)}`);
        const json = await res.json();
        if (json.available) {
          setCustomDomainStatus({
            state: 'available',
            message: `Custom domain "${clean}" is available to attach.`,
            dnsInstructions: json.dnsInstructions || {
              type: 'CNAME',
              host: '@',
              value: 'domains.hiesci.com',
            },
          });
        } else {
          setCustomDomainStatus({
            state: 'taken',
            message: json.error || 'Custom domain is already registered.',
            dnsInstructions: null,
          });
        }
      } catch {
        setCustomDomainStatus({
          state: 'error',
          message: 'Error verifying custom domain.',
          dnsInstructions: null,
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [customDomain]);

  const selectedSub = activeSubs.find((s) => String(s.id) === String(selectedSubscriptionId)) || (activeSubs.length > 0 ? activeSubs[0] : null);
  const selectedSubAllowed = Number(selectedSub?.websitesAllowed ?? selectedSub?.max_websites ?? selectedSub?.max_portfolios ?? 1);
  const selectedSubUsed = Number(selectedSub?.websitesUsed ?? selectedSub?.websites_count ?? 0);
  const isSelectedSubQuotaReached = selectedSub ? selectedSubUsed >= selectedSubAllowed : true;
  const noActiveSubs = activeSubs.length === 0;

  const handleStep1Next = (e) => {
    e.preventDefault();
    setCreateError('');

    if (noActiveSubs) {
      setCreateError('An active subscription is required before provisioning a website.');
      return;
    }

    if (!selectedSubscriptionId) {
      setCreateError('Please select a subscription package for this website.');
      return;
    }

    if (isSelectedSubQuotaReached) {
      setCreateError(`The selected package (${selectedSub?.package_name || 'plan'}) has reached its limit of ${selectedSubAllowed} website(s).`);
      return;
    }

    if (!name.trim()) {
      setCreateError('Institution or website name is required.');
      return;
    }

    if (!contactEmail.trim()) {
      setCreateError('Official contact email is required.');
      return;
    }

    if (!contactPhone.trim()) {
      setCreateError('Official contact phone number is required.');
      return;
    }

    if (!address.trim()) {
      setCreateError('Campus physical address is required.');
      return;
    }

    if (!subdomain) {
      const generated = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 32);
      setSubdomain(generated);
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClaimSubdomain = () => {
    if (domainStatus.state === 'available') {
      setIsSubdomainClaimed(true);
      setCreateError('');
    }
  };

  const handleStep2Next = (e) => {
    e.preventDefault();
    setCreateError('');

    if (!subdomain.trim() || subdomain.trim().length < 3) {
      setCreateError('Please provide a valid subdomain prefix (at least 3 characters).');
      return;
    }

    if (!isSubdomainClaimed) {
      setCreateError('Please check availability and click "Claim Subdomain" to claim your unique domain before proceeding.');
      return;
    }

    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    if (!creatorNid.trim()) {
      setCreateError('Creator National ID (NID) is required for verification.');
      setCreating(false);
      return;
    }

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

    const otherDetailsPayload = {
      principal_name: principalName.trim(),
      board_affiliation: boardAffiliation.trim(),
      notes: additionalNotes.trim(),
    };

    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_website',
          creatorId: Number(creatorId),
          subscriptionId: Number(selectedSubscriptionId),
          name: name.trim(),
          institutionType,
          institution_type: institutionType,
          eeinNumber: eeinNumber.trim(),
          eiinNumber: eeinNumber.trim(),
          subdomain: cleanSubdomain,
          customDomain: customDomain.trim().toLowerCase(),
          custom_domain: customDomain.trim().toLowerCase(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          address: address.trim(),
          tagline: tagline.trim(),
          primaryColor,
          secondaryColor,
          theme,
          currency,
          creatorNid: creatorNid.trim(),
          creator_nid: creatorNid.trim(),
          creatorNidUrl: creatorNidUrl.trim(),
          creator_nid_url: creatorNidUrl.trim(),
          eiinCertificate: eiinCertificate.trim(),
          eiin_certificate: eiinCertificate.trim(),
          eiinCertificateUrl: eiinCertificateUrl.trim(),
          eiin_certificate_url: eiinCertificateUrl.trim(),
          verificationAddress: (verificationAddress || address).trim(),
          verification_address: (verificationAddress || address).trim(),
          otherDetails: otherDetailsPayload,
          other_details: otherDetailsPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreateSuccess(`Website "${name}" and routing created successfully! Redirecting to workspace...`);
        if (refetch) await refetch();
        setTimeout(() => {
          router.push(`/creator/${creatorId}/workspace/${cleanSubdomain}`);
        }, 1200);
      } else {
        setCreateError(data.error || 'Failed to create website.');
        setCreating(false);
      }
    } catch {
      setCreateError('Network error while provisioning website. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
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
              Step {currentStep} of 3
            </span>
          </div>
          <h1 className="text-base font-semibold text-slate-900">
            Create Educational Website
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete the 3-step provisioning flow: institutional profile, domain routing, and verification documentation.
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

      <div className="bg-white border border-slate-200 rounded p-3">
        <div className="grid grid-cols-3 gap-2">
          <div
            onClick={() => setCurrentStep(1)}
            className={`p-2.5 rounded border text-center transition-all cursor-pointer ${
              currentStep === 1
                ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider">Step 1</div>
            <div className="text-xs font-medium">1. Website Data</div>
          </div>

          <div
            onClick={() => {
              if (name && contactEmail && contactPhone && address) setCurrentStep(2);
            }}
            className={`p-2.5 rounded border text-center transition-all ${
              currentStep === 2
                ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                : isSubdomainClaimed
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 cursor-pointer'
                : 'border-slate-200 bg-slate-50 text-slate-600 cursor-pointer'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider">Step 2</div>
            <div className="text-xs font-medium">2. Subdomain & Routing</div>
          </div>

          <div
            onClick={() => {
              if (name && isSubdomainClaimed) setCurrentStep(3);
            }}
            className={`p-2.5 rounded border text-center transition-all ${
              currentStep === 3
                ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                : 'border-slate-200 bg-slate-50 text-slate-600 cursor-pointer'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider">Step 3</div>
            <div className="text-xs font-medium">3. Verification Info</div>
          </div>
        </div>
      </div>

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

      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded p-5 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Step 1: Website Profile & Plan</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure basic institutional details, choose package plan, and set brand styling.
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">1 of 3</span>
          </div>

          <form onSubmit={handleStep1Next} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-900">
                A. Link to Subscription Package <span className="text-rose-500">*</span>
              </label>

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
                                Sub #{sub.id} &bull; {sub.billing_interval || sub.billing_cycle || 'Monthly'}
                              </span>
                            </div>
                          </div>

                          {isFull ? (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200">
                              Limit Full
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                              Available ({allowed - used} slots)
                            </span>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Sites: <strong className="text-slate-800 font-medium">{used} / {allowed}</strong></span>
                          <span>Students: <strong className="text-slate-800 font-medium">{sub.max_students ?? '500'}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs">
                  No active subscriptions found. Please purchase a package first.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                B. Institutional Identity
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Institution / Website Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    EIIN / Government Registration Number
                  </label>
                  <input
                    type="text"
                    value={eeinNumber}
                    onChange={(e) => setEeinNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Tagline / Motto</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                C. Official Contact & Campus Location
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Official Contact Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Official Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Campus Physical Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                D. Branding & Theme Colors
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">Primary Color</label>
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

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">Secondary Color</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Portal Theme Preset</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="default">Default Modern Hub</option>
                    <option value="academic">Academic Classic</option>
                    <option value="minimal">Minimal Clean</option>
                    <option value="vibrant">Vibrant Campus</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Operating Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <Link
                href={`/creator/${creatorId}/workspace`}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                Continue to Subdomain & Domains &rarr;
              </button>
            </div>
          </form>
        </div>
      )}

      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded p-5 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Step 2: Subdomain Check & Domain Routing</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Check subdomain availability and click Claim. You can also configure an optional custom domain with required DNS records.
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">2 of 3</span>
          </div>

          <form onSubmit={handleStep2Next} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                A. Live Subdomain Prefix Checker & Claim <span className="text-rose-500">*</span>
              </label>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    value={subdomain}
                    onChange={(e) => {
                      setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'));
                      setIsSubdomainClaimed(false);
                    }}
                    className={`flex-1 bg-white border rounded-l px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none ${
                      isSubdomainClaimed
                        ? 'border-emerald-500 bg-emerald-50/30'
                        : domainStatus.state === 'available'
                        ? 'border-blue-400 bg-blue-50/20'
                        : domainStatus.state === 'taken' || domainStatus.state === 'invalid'
                        ? 'border-rose-400 bg-rose-50/20'
                        : 'border-slate-300'
                    }`}
                  />
                  <span className="px-3 py-1.5 bg-slate-100 border border-l-0 border-slate-300 text-slate-600 font-mono text-xs rounded-r select-none">
                    .{baseDomain}
                  </span>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    {domainStatus.state === 'checking' && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Checking availability...
                      </span>
                    )}

                    {!isSubdomainClaimed && domainStatus.state === 'available' && (
                      <span className="text-[10px] text-emerald-700 font-medium">
                        {domainStatus.message}
                      </span>
                    )}

                    {domainStatus.state === 'taken' && (
                      <span className="text-[10px] text-rose-700 font-medium">
                        {domainStatus.message}
                      </span>
                    )}

                    {domainStatus.state === 'invalid' && (
                      <span className="text-[10px] text-amber-700 font-medium">
                        {domainStatus.message}
                      </span>
                    )}

                    {isSubdomainClaimed && (
                      <span className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Subdomain Claimed: {subdomain}.{baseDomain}
                      </span>
                    )}
                  </div>

                  {!isSubdomainClaimed && domainStatus.state === 'available' && (
                    <button
                      type="button"
                      onClick={handleClaimSubdomain}
                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition-colors inline-flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Claim This Subdomain
                    </button>
                  )}

                  {isSubdomainClaimed && (
                    <button
                      type="button"
                      onClick={() => setIsSubdomainClaimed(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Change Subdomain
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                B. Connect Custom Domain (Optional)
              </label>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Custom Domain Name
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                />

                {customDomainStatus.state === 'available' && (
                  <span className="text-[10px] text-emerald-700 font-medium block">
                    {customDomainStatus.message}
                  </span>
                )}

                {customDomainStatus.state === 'taken' && (
                  <span className="text-[10px] text-rose-700 font-medium block">
                    {customDomainStatus.message}
                  </span>
                )}

                {customDomain && (
                  <div className="p-3.5 rounded border border-slate-200 bg-slate-50 space-y-2.5">
                    <div className="font-semibold text-xs text-slate-900 flex items-center justify-between">
                      <span>Required DNS Records for {customDomain}</span>
                      <span className="text-[10px] text-slate-500 font-normal">Add these at your DNS provider</span>
                    </div>

                    <div className="border border-slate-200 rounded overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[10px] uppercase">
                          <tr>
                            <th className="px-2.5 py-1.5">Type</th>
                            <th className="px-2.5 py-1.5">Host / Name</th>
                            <th className="px-2.5 py-1.5">Target / Value</th>
                            <th className="px-2.5 py-1.5">TTL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                          <tr>
                            <td className="px-2.5 py-1.5 font-bold text-blue-600">CNAME</td>
                            <td className="px-2.5 py-1.5">@</td>
                            <td className="px-2.5 py-1.5">domains.hiesci.com</td>
                            <td className="px-2.5 py-1.5 text-slate-500">3600</td>
                          </tr>
                          <tr>
                            <td className="px-2.5 py-1.5 font-bold text-blue-600">CNAME</td>
                            <td className="px-2.5 py-1.5">www</td>
                            <td className="px-2.5 py-1.5">domains.hiesci.com</td>
                            <td className="px-2.5 py-1.5 text-slate-500">3600</td>
                          </tr>
                          <tr>
                            <td className="px-2.5 py-1.5 font-bold text-slate-600">A</td>
                            <td className="px-2.5 py-1.5">@</td>
                            <td className="px-2.5 py-1.5">76.76.21.21</td>
                            <td className="px-2.5 py-1.5 text-slate-500">3600</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      DNS propagation typically completes within 10 to 30 minutes after records are saved with your domain registrar.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
              >
                &larr; Back to Website Data
              </button>

              <button
                type="submit"
                disabled={!isSubdomainClaimed}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                Continue to Verification Details &rarr;
              </button>
            </div>
          </form>
        </div>
      )}

      {currentStep === 3 && (
        <div className="bg-white border border-slate-200 rounded p-5 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Step 3: Verification Information (website_information)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official institutional verification registry details. These credentials verify ownership and compliance.
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">3 of 3</span>
          </div>

          <div className="p-3 rounded border border-blue-200 bg-blue-50/50 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-blue-900 space-y-0.5">
              <span className="font-semibold block">Institutional Verification Notice</span>
              <p className="text-[11px] text-blue-800">
                Data provided here is stored in the website_information verification table. This ensures campus domain authentication and compliance with regional regulatory boards.
              </p>
            </div>
          </div>

          <form onSubmit={handleFinalSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                A. Creator & Representative Identification
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Creator National ID (NID) Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={creatorNid}
                    onChange={(e) => setCreatorNid(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Creator NID Document / Photo URL
                  </label>
                  <input
                    type="text"
                    value={creatorNidUrl}
                    onChange={(e) => setCreatorNidUrl(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Principal / Authorized Head Name
                  </label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                B. Institutional Government Accreditation
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    EIIN Certificate Registration No.
                  </label>
                  <input
                    type="text"
                    value={eiinCertificate}
                    onChange={(e) => setEiinCertificate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    EIIN Certificate Document URL
                  </label>
                  <input
                    type="text"
                    value={eiinCertificateUrl}
                    onChange={(e) => setEiinCertificateUrl(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Education Board / Ministry Affiliation
                  </label>
                  <input
                    type="text"
                    value={boardAffiliation}
                    onChange={(e) => setBoardAffiliation(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Registered Official Verification Address
                  </label>
                  <textarea
                    rows={2}
                    value={verificationAddress}
                    onChange={(e) => setVerificationAddress(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 resize-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Additional Verification Details & Regulatory Notes
                  </label>
                  <textarea
                    rows={2}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="font-semibold text-xs text-slate-900 border-b border-slate-200 pb-1">
                Provisioning Summary
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Institution</span>
                  <strong className="text-slate-900 font-medium">{name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Subdomain</span>
                  <strong className="text-emerald-700 font-mono font-medium">{subdomain}.{baseDomain}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Custom Domain</span>
                  <strong className="text-slate-900 font-mono font-medium">{customDomain || 'None'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Linked Plan</span>
                  <strong className="text-slate-900 font-medium">{selectedSub?.package_name || 'Active Plan'}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
              >
                &larr; Back to Subdomain Setup
              </button>

              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {creating ? 'Creating Website...' : 'Provision & Launch Website'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
