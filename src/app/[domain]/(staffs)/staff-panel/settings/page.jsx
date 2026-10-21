'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { toast } from 'react-hot-toast';
import { FiSettings } from 'react-icons/fi';

const CURRENCIES = [
  { code: 'BDT', symbol: '৳', label: 'BDT (৳) - Bangladeshi Taka' },
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD ($) - Canadian Dollar' },
  { code: 'AUD', symbol: 'AU$', label: 'AUD ($) - Australian Dollar' },
  { code: 'AED', symbol: 'AED', label: 'AED (د.إ) - UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', label: 'SAR (﷼) - Saudi Riyal' },
  { code: 'MYR', symbol: 'RM', label: 'MYR (RM) - Malaysian Ringgit' },
  { code: 'SGD', symbol: 'S$', label: 'SGD ($) - Singapore Dollar' },
];

const KNOWN_GATEWAYS = [
  { code: 'bkash', name: 'bKash Tokenized Checkout', category: 'mobile_banking', supported_currencies: ['BDT'] },
  { code: 'nagad', name: 'Nagad Direct Gateway', category: 'mobile_banking', supported_currencies: ['BDT'] },
  { code: 'stripe', name: 'Stripe Payments', category: 'card_international', supported_currencies: ['USD', 'EUR', 'BDT', 'GBP', 'CAD', 'AUD', 'SGD'] },
  { code: 'paypal', name: 'PayPal', category: 'card_international', supported_currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD'] },
  { code: 'sslcommerz', name: 'SSLCommerz Payment Gateway', category: 'aggregator', supported_currencies: ['BDT', 'USD', 'EUR', 'GBP'] },
  { code: 'paddle', name: 'Paddle Billing', category: 'card_international', supported_currencies: ['USD', 'EUR', 'GBP'] },
  { code: 'sonali_gateway', name: 'Sonali Bank e-Payment Gateway', category: 'banking_portal', supported_currencies: ['BDT'] },
  { code: 'eps', name: 'Easy Payment System (EPS)', category: 'banking_portal', supported_currencies: ['BDT'] },
  { code: 'surjopay', 'name': 'Shurjopay (SurjoPay)', category: 'aggregator', supported_currencies: ['BDT'] },
  { code: 'razorpay', name: 'Razorpay', category: 'card_international', supported_currencies: ['INR', 'USD', 'EUR', 'GBP', 'BDT', 'AED', 'SGD'] },
];

export default function WebsiteSettingsPage() {
  const { website, getApiEndpoint, fetchWebsiteSettings } = useTenantWebsite();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'contact' | 'mission' | 'social' | 'branding' | 'system'

  // General Fields
  const [name, setName] = useState('');
  const [institutionType, setInstitutionType] = useState('School');
  const [eiinNumber, setEiinNumber] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [allGatewaysList, setAllGatewaysList] = useState(KNOWN_GATEWAYS);

  const selectedCleanCurrency = useMemo(() => {
    return String(currency || 'BDT').toUpperCase().trim();
  }, [currency]);

  const compatibleGateways = useMemo(() => {
    return allGatewaysList.filter((g) => {
      const supported = Array.isArray(g.supported_currencies) ? g.supported_currencies : ['BDT'];
      return supported.includes(selectedCleanCurrency);
    });
  }, [allGatewaysList, selectedCleanCurrency]);

  const incompatibleGateways = useMemo(() => {
    return allGatewaysList.filter((g) => {
      const supported = Array.isArray(g.supported_currencies) ? g.supported_currencies : ['BDT'];
      return !supported.includes(selectedCleanCurrency);
    });
  }, [allGatewaysList, selectedCleanCurrency]);

  // Cloudinary Logo & Favicon states
  const [logoPreview, setLogoPreview] = useState('');
  const [logoDataUri, setLogoDataUri] = useState(''); // New base64 image data to upload
  const [removeLogo, setRemoveLogo] = useState(false);
  const logoInputRef = useRef(null);

  const [faviconPreview, setFaviconPreview] = useState('');
  const [faviconDataUri, setFaviconDataUri] = useState(''); // New base64 image data to upload
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const faviconInputRef = useRef(null);

  // Contact Fields
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');

  // Mission / Identity Fields
  const [motto, setMotto] = useState('');
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [history, setHistory] = useState('');

  // Social Links
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Branding / Theme
  const [theme, setTheme] = useState('default');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [secondaryColor, setSecondaryColor] = useState('#0ea5e9');

  // System & Maintenance
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.'
  );

  // Refresh website settings after updates
  const refreshSettings = async () => {
    try {
      const res = await fetch(getApiEndpoint('staff/settings'));
      const data = await res.json();
      if (!res.ok) return;

      const s = data.payload?.settings || data.paylod?.settings || data.settings || {};

      setName(s.name || website?.name || '');
      setInstitutionType(s.institution_type || website?.institution_type || 'School');
      setEiinNumber(s.eiin_number || website?.eiin_number || '');
      setCurrency(s.currency || website?.currency || 'BDT');
      if (data.all_gateways && Array.isArray(data.all_gateways) && data.all_gateways.length > 0) {
        setAllGatewaysList(data.all_gateways);
      }

      setLogoPreview(s.logo || website?.logo || '');
      setLogoDataUri('');
      setRemoveLogo(false);

      setFaviconPreview(s.favicon || website?.favicon || '');
      setFaviconDataUri('');
      setRemoveFavicon(false);

      setContactPhone(s.contact_phone || '');
      setContactEmail(s.contact_email || '');
      setAddress(s.address || '');
      setMapUrl(s.map_url || '');

      setMotto(s.motto || '');
      setMission(s.mission || '');
      setVision(s.vision || '');
      setHistory(s.history || '');

      setFacebookUrl(s.facebook_url || '');
      setTwitterUrl(s.twitter_url || '');
      setInstagramUrl(s.instagram_url || '');
      setYoutubeUrl(s.youtube_url || '');
      setLinkedinUrl(s.linkedin_url || '');

      setTheme(s.theme || 'default');
      setPrimaryColor(s.primary_color || '#1e40af');
      setSecondaryColor(s.secondary_color || '#0ea5e9');

      setIsMaintenanceMode(Boolean(s.is_maintenance_mode));
      setMaintenanceMessage(
        s.maintenance_message ||
          'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.'
      );
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const res = await fetch(getApiEndpoint('staff/settings'));
        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load website settings.');
        }

        const s = data.payload?.settings || data.paylod?.settings || data.settings || {};

        setName(s.name || website?.name || '');
        setInstitutionType(s.institution_type || website?.institution_type || 'School');
        setEiinNumber(s.eiin_number || website?.eiin_number || '');
        setCurrency(s.currency || website?.currency || 'BDT');
        if (data.all_gateways && Array.isArray(data.all_gateways) && data.all_gateways.length > 0) {
          setAllGatewaysList(data.all_gateways);
        }

        setLogoPreview(s.logo || website?.logo || '');
        setLogoDataUri('');
        setRemoveLogo(false);

        setFaviconPreview(s.favicon || website?.favicon || '');
        setFaviconDataUri('');
        setRemoveFavicon(false);

        setContactPhone(s.contact_phone || '');
        setContactEmail(s.contact_email || '');
        setAddress(s.address || '');
        setMapUrl(s.map_url || '');

        setMotto(s.motto || '');
        setMission(s.mission || '');
        setVision(s.vision || '');
        setHistory(s.history || '');

        setFacebookUrl(s.facebook_url || '');
        setTwitterUrl(s.twitter_url || '');
        setInstagramUrl(s.instagram_url || '');
        setYoutubeUrl(s.youtube_url || '');
        setLinkedinUrl(s.linkedin_url || '');

        setTheme(s.theme || 'default');
        setPrimaryColor(s.primary_color || '#1e40af');
        setSecondaryColor(s.secondary_color || '#0ea5e9');

        setIsMaintenanceMode(Boolean(s.is_maintenance_mode));
        setMaintenanceMessage(
          s.maintenance_message ||
            'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.'
        );
      } catch (err) {
        if (!ignore) toast.error(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      ignore = true;
    };
  }, [getApiEndpoint, website]);

  // Handle Logo File selection
  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, SVG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setLogoPreview(result);
      setLogoDataUri(result);
      setRemoveLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setLogoPreview('');
    setLogoDataUri('');
    setRemoveLogo(true);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // Handle Favicon File selection
  const handleFaviconSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.endsWith('.ico')) {
      toast.error('Please select an icon file (ICO, PNG, or SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Favicon size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setFaviconPreview(result);
      setFaviconDataUri(result);
      setRemoveFavicon(false);
    };
    reader.readAsDataURL(file);
  };

  const handleClearFavicon = () => {
    setFaviconPreview('');
    setFaviconDataUri('');
    setRemoveFavicon(true);
    if (faviconInputRef.current) faviconInputRef.current.value = '';
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      toast.error('Institution name is required.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Uploading assets & updating settings...');

    try {
      const payload = {
        name: name.trim(),
        institution_type: institutionType.trim(),
        eiin_number: eiinNumber.trim() || null,
        currency: currency.trim().toUpperCase() || 'BDT',
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        address: address.trim() || null,
        map_url: mapUrl.trim() || null,
        motto: motto.trim() || null,
        mission: mission.trim() || null,
        vision: vision.trim() || null,
        history: history.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        theme: theme.trim() || 'default',
        primary_color: primaryColor.trim() || '#1e40af',
        secondary_color: secondaryColor.trim() || '#0ea5e9',
        is_maintenance_mode: Boolean(isMaintenanceMode),
        maintenance_message: maintenanceMessage.trim(),
      };

      // Only pass logo if a new image was uploaded or explicitly removed
      if (removeLogo) {
        payload.remove_logo = true;
        payload.logo = '';
      } else if (logoDataUri) {
        payload.logo = logoDataUri;
      }

      // Only pass favicon if a new icon was uploaded or explicitly removed
      if (removeFavicon) {
        payload.remove_favicon = true;
        payload.favicon = '';
      } else if (faviconDataUri) {
        payload.favicon = faviconDataUri;
      }

      const res = await fetch(getApiEndpoint('staff/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update website settings.');
      }

      toast.success(data.message || 'Website settings and assets updated successfully!', { id: toastId });
      if (typeof fetchWebsiteSettings === 'function') {
        fetchWebsiteSettings();
      }
      refreshSettings();
    } catch (err) {
      toast.error(err.message || 'Error updating settings', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <div className="w-full space-y-5">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Website Information &amp; Campus Settings
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Institutional Master Control
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure all public institutional metadata, branding, Cloudinary logo &amp; favicon assets, default billing currency, and campus system maintenance.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={submitting}
            className="px-5 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-xs flex items-center gap-1.5"
          >
            {submitting ? 'Uploading & Updating...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-0 overflow-x-auto text-xs font-medium">
        {[
          { key: 'general', label: 'General & Identity' },
          { key: 'branding', label: 'Logo, Favicon & Theme' },
          { key: 'contact', label: 'Contact & Location' },
          { key: 'mission', label: 'Mission, Vision & History' },
          { key: 'social', label: 'Social Channels' },
          { key: 'system', label: 'System & Maintenance' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2.5 rounded-t text-xs font-medium transition cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-2xs space-y-6">
        
        {/* TAB 1: General & Identity */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                General Institution Identification &amp; Defaults
              </h2>
              <p className="text-[11px] text-slate-500">Core organizational names, accreditation codes, and operational transaction currency.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Institution Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Oxford Academy of Sciences"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Institution Type *
                </label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="School">School</option>
                  <option value="High School">High School</option>
                  <option value="College">College</option>
                  <option value="Madrasah">Madrasah</option>
                  <option value="Academy">Academy</option>
                  <option value="University">University</option>
                  <option value="Polytechnic Institute">Polytechnic Institute</option>
                  <option value="Training Center">Training Center</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  EIIN / Registration Code
                </label>
                <input
                  type="text"
                  value={eiinNumber}
                  onChange={(e) => setEiinNumber(e.target.value)}
                  placeholder="e.g. 132456"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Default Operating Currency *</span>
                  <span className="text-[10px] text-primary lowercase font-medium">Used for fees &amp; salaries</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer font-medium"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  This currency is automatically used across student admission fees, monthly tuition invoices, fee receipts, payroll scales, and accounting statements.
                </p>
              </div>

              {/* CURRENCY & PAYMENT GATEWAYS COMPATIBILITY PANEL */}
              <div className="md:col-span-2 p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Compatible Online Payment Gateways for {selectedCleanCurrency}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {compatibleGateways.length} of {allGatewaysList.length} Supported
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Online payment accounts configured for this institution will only accept transactions if the gateway provider natively supports {selectedCleanCurrency}.
                    </p>
                  </div>
                  <Link
                    href="configure-payments"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 transition shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    <FiSettings className="w-3.5 h-3.5" />
                    <span>Configure Gateways</span>
                  </Link>
                </div>

                {/* Grid of Compatible Gateways */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-1">
                  {compatibleGateways.map((gw) => (
                    <div
                      key={gw.code}
                      className="p-2.5 rounded border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {gw.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                          {gw.category ? String(gw.category).replace(/_/g, ' ') : 'Gateway'}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span>✓</span>
                        <span>Supports {selectedCleanCurrency}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Incompatible Gateways Notice */}
                {incompatibleGateways.length > 0 && (
                  <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1.5">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0">Incompatible Gateways:</span>
                    <span>
                      {incompatibleGateways.map((g) => g.name).join(', ')} do not support {selectedCleanCurrency}. If you intend to collect fees using these providers, consider choosing a supported operating currency or secondary multi-currency routing.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Branding (Cloudinary Logo & Favicon + Colors) */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Brand Assets &amp; Appearance (Cloudinary Powered)
              </h2>
              <p className="text-[11px] text-slate-500">
                Upload your official institution logo and browser tab favicon directly. Files are stored securely on Cloudinary CDN.
              </p>
            </div>

            {/* Logo and Favicon Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* LOGO UPLOADER */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Official Institution Logo</span>
                    <span className="text-[10px] text-slate-500">Appears in header, navbar, report cards &amp; invoices</span>
                  </div>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="px-2 py-1 text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition font-medium cursor-pointer"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Preview Thumbnail */}
                  <div className="w-20 h-20 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-2xs">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <span className="text-[10px] block font-mono">No Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 text-xs font-medium transition cursor-pointer shadow-2xs"
                    >
                      {logoPreview ? 'Replace Logo Image' : 'Select Logo Image'}
                    </button>
                    <p className="text-[10px] text-slate-500">
                      Supports PNG, JPG, SVG, WEBP up to 5MB. Cloudinary CDN optimized.
                    </p>
                    {logoDataUri && (
                      <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        [Ready to upload]
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* FAVICON UPLOADER */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Browser Tab Favicon</span>
                    <span className="text-[10px] text-slate-500">Shown in browser tabs &amp; mobile bookmarks</span>
                  </div>
                  {faviconPreview && (
                    <button
                      type="button"
                      onClick={handleClearFavicon}
                      className="px-2 py-1 text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition font-medium cursor-pointer"
                    >
                      Remove Favicon
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Preview Thumbnail */}
                  <div className="w-14 h-14 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-2xs">
                    {faviconPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={faviconPreview}
                        alt="Favicon Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <span className="text-[9px] block font-mono">No Icon</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/x-icon,image/png,image/svg+xml,image/jpeg"
                      onChange={handleFaviconSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => faviconInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 text-xs font-medium transition cursor-pointer shadow-2xs"
                    >
                      {faviconPreview ? 'Replace Favicon' : 'Select Favicon'}
                    </button>
                    <p className="text-[10px] text-slate-500">
                      Square ratio recommended (32x32 or 64x64, ICO/PNG).
                    </p>
                    {faviconDataUri && (
                      <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        [Ready to upload]
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Colors and Theme Preset */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white block mb-3">
                Color Palette &amp; Accents
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Theme Preset
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="default">Default Academic</option>
                    <option value="modern">Modern Sleek</option>
                    <option value="classic">Classic Ivy</option>
                    <option value="minimal">Minimal Slate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Primary Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded border border-slate-200 dark:border-slate-800 cursor-pointer bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1e40af"
                      className="flex-1 px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Secondary Highlight Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded border border-slate-200 dark:border-slate-800 cursor-pointer bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#0ea5e9"
                      className="flex-1 px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Presets */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Recommended Color Presets</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Royal Navy', pri: '#1e40af', sec: '#0ea5e9' },
                  { name: 'Emerald Scholar', pri: '#047857', sec: '#10b981' },
                  { name: 'Crimson Heritage', pri: '#b91c1c', sec: '#f87171' },
                  { name: 'Indigo Modern', pri: '#4338ca', sec: '#818cf8' },
                  { name: 'Deep Amethyst', pri: '#6d28d9', sec: '#a78bfa' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(preset.pri);
                      setSecondaryColor(preset.sec);
                    }}
                    className="px-2.5 py-1 rounded text-[11px] border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.pri }}></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Contact & Location */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Contact &amp; Physical Location Details
              </h2>
              <p className="text-[11px] text-slate-500">Official email, telephone numbers, campus address, and Google map embed link.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Primary Contact Telephone
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+880 1700 000000"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Official Inquiries Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@institution.edu"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Physical Campus Postal Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Academic Avenue, Educational District, City, Country"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Google Maps Embed URL
                </label>
                <input
                  type="url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Mission, Vision & History */}
        {activeTab === 'mission' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Institutional Philosophy &amp; Historical Background
              </h2>
              <p className="text-[11px] text-slate-500">Appears on the About Us page, prospectus, and institutional showcases.</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Official Motto / Tagline
                </label>
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="e.g. Inspiring Excellence, Cultivating Character"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mission Statement
                </label>
                <textarea
                  rows={3}
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder="Describe your school's fundamental purpose and learning objectives..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Vision Statement
                </label>
                <textarea
                  rows={3}
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="Describe the future aspiration and academic impact envisioned for your graduates..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Campus Brief History
                </label>
                <textarea
                  rows={3}
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  placeholder="Write a concise history of founding year, campus milestones, and accreditations..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Social Channels */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Social Media Channels
              </h2>
              <p className="text-[11px] text-slate-500">Public profile links shown in footer and header navigation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Facebook Page URL
                </label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Twitter / X Profile URL
                </label>
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Instagram Profile URL
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  YouTube Channel URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/school/..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: System & Maintenance */}
        {activeTab === 'system' && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Operations &amp; Maintenance Status
              </h2>
              <p className="text-[11px] text-slate-500">
                Control campus website availability, active service mode, and visitor notices during upgrades.
              </p>
            </div>

            {/* Toggle Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Campus Portal Maintenance Mode
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      isMaintenanceMode
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40'
                    }`}
                  >
                    {isMaintenanceMode ? 'Maintenance Active' : 'Live & Operational'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed">
                  When enabled, all public web pages (home, admissions, news, facilities) show an elegant maintenance screen. Staff, teachers, officers, and students can still securely login and access panel workstations.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isMaintenanceMode}
                  onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Maintenance Message */}
            <div className="space-y-2 text-xs">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Public Maintenance Notice Message
              </label>
              <textarea
                rows={3}
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Our campus portal is temporarily under scheduled maintenance. Please check back shortly."
                className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary leading-relaxed"
              />
              <p className="text-[10px] text-slate-500">
                This announcement will be displayed prominently to public visitors on the maintenance screen.
              </p>
            </div>

            {/* Live Preview Card */}
            {isMaintenanceMode && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded space-y-2">
                <div className="text-amber-800 dark:text-amber-300 font-semibold text-xs">
                  Preview of Public Visitor Screen
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/40 rounded shadow-2xs space-y-2">
                  <div className="flex items-center gap-2.5">
                    {logoPreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="Logo" className="w-6 h-6 object-contain" />
                    )}
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{name || 'Your Institution'}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                    &ldquo;{maintenanceMessage}&rdquo;
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    Campus Helplines: {contactPhone || 'Available'} • {contactEmail || 'Support Available'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link
            href="/staff-panel"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            ← Return to Dashboard
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-xs flex items-center gap-1.5"
          >
            {submitting ? 'Uploading & Updating...' : 'Save All Settings Changes →'}
          </button>
        </div>

      </form>
    </div>
  );
}
