'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreator } from '../../layout';
import LoadingScreen from 'src/component/common/LoadingScreen';

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
  { name: 'Indigo Royal', hex: '#4338ca' },
  { name: 'Emerald Scholar', hex: '#047857' },
  { name: 'Crimson Pride', hex: '#b91c1c' },
  { name: 'Deep Violet', hex: '#6d28d9' },
  { name: 'Slate Modern', hex: '#0f172a' },
];

const CURRENCIES = [
  { code: 'BDT', symbol: '৳', label: 'BDT (৳) - Bangladeshi Taka' },
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD ($) - Canadian Dollar' },
  { code: 'AUD', symbol: 'AU$', label: 'AU$ ($) - Australian Dollar' },
  { code: 'AED', symbol: 'AED', label: 'AED (د.إ) - UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', label: 'SAR (﷼) - Saudi Riyal' },
  { code: 'MYR', symbol: 'RM', label: 'MYR (RM) - Malaysian Ringgit' },
  { code: 'SGD', symbol: 'S$', label: 'SGD ($) - Singapore Dollar' },
];

export default function WebsiteManagePage() {
  const router = useRouter();
  const routeParams = useParams();
  const { creatorId: contextCreatorId, refetch: refetchCreator } = useCreator();

  const creatorId = routeParams?.id || contextCreatorId;
  const domainParam = routeParams?.domain;

  const [activeTab, setActiveTab] = useState('domains');

  const [baseDomain, setBaseDomain] = useState(
    typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:3000'
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [website, setWebsite] = useState(null);

  const [name, setName] = useState('');
  const [institutionType, setInstitutionType] = useState('school');
  const [eeinNumber, setEeinNumber] = useState('');
  const [tagline, setTagline] = useState('');
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [history, setHistory] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [secondaryColor, setSecondaryColor] = useState('#0ea5e9');
  const [theme, setTheme] = useState('default');
  const [logo, setLogo] = useState('');
  const [logoId, setLogoId] = useState('');
  const [favicon, setFavicon] = useState('');
  const [faviconId, setFaviconId] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.'
  );

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState('');
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const [brandingMsg, setBrandingMsg] = useState({ type: '', text: '' });
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  const [subdomain, setSubdomain] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState({ state: 'idle', message: '' });

  const [customDomainInput, setCustomDomainInput] = useState('');
  const [customDomainStatus, setCustomDomainStatus] = useState({ state: 'idle', message: '' });
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [confirmingDomain, setConfirmingDomain] = useState(false);
  const [domainDnsRecords, setDomainDnsRecords] = useState([]);
  const [dnsVerificationResult, setDnsVerificationResult] = useState(null);
  const [copiedRecordKey, setCopiedRecordKey] = useState('');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [domainFeedback, setDomainFeedback] = useState({ type: '', text: '' });
  const [showDnsDetails, setShowDnsDetails] = useState(true);
  const [cnameTarget, setCnameTarget] = useState('domains.hiesci.com');
  const [aTarget, setATarget] = useState('76.76.21.21');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteWebsiteModal, setShowDeleteWebsiteModal] = useState(false);
  const [deleteWebsiteError, setDeleteWebsiteError] = useState('');
  const [staffDeleteTarget, setStaffDeleteTarget] = useState(null);
  const [logoDeleteConfirm, setLogoDeleteConfirm] = useState(false);
  const [faviconDeleteConfirm, setFaviconDeleteConfirm] = useState(false);

  const [moduleSearch, setModuleSearch] = useState('');
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState('all');
  const [moduleViewType, setModuleViewType] = useState('all');

  const [staffsList, setStaffsList] = useState([]);
  const [modulesList, setModulesList] = useState([]);
  const [payScalesList, setPayScalesList] = useState([]);
  const [loadingStaffs, setLoadingStaffs] = useState(false);
  const [staffActionMsg, setStaffActionMsg] = useState({ type: '', text: '' });
  const [resendingStaffId, setResendingStaffId] = useState(null);

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditPermsModal, setShowEditPermsModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [targetStaff, setTargetStaff] = useState(null);

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    number: '',
    address: '',
    password: '',
    passwordMode: 'invite',
    gradeId: '',
    bio: '',
    sendInvite: true,
    permissions: {},
  });
  const [submittingStaff, setSubmittingStaff] = useState(false);

  const [editPermsMap, setEditPermsMap] = useState({});
  const [savingPerms, setSavingPerms] = useState(false);

  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    email: '',
    number: '',
    address: '',
    gradeId: '',
    bio: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [academicsSubTab, setAcademicsSubTab] = useState('departments');
  const [academicDepts, setAcademicDepts] = useState([]);
  const [academicClasses, setAcademicClasses] = useState([]);
  const [academicSections, setAcademicSections] = useState([]);
  const [academicSubjects, setAcademicSubjects] = useState([]);
  const [loadingAcademics, setLoadingAcademics] = useState(false);
  const [academicActionMsg, setAcademicActionMsg] = useState({ type: '', text: '' });

  const [deptModal, setDeptModal] = useState({ open: false, editing: null });
  const [deptForm, setDeptForm] = useState({ name: '', code: '', order_no: 0, description: '', is_active: true });

  const [classModal, setClassModal] = useState({ open: false, editing: null });
  const [classForm, setClassForm] = useState({ name: '', code: '', department_id: '', capacity: 40, display_order: 0 });

  const [sectionModal, setSectionModal] = useState({ open: false, editing: null });
  const [sectionForm, setSectionForm] = useState({ class_id: '', name: '', capacity: 40, room_number: '' });

  const [subjectModal, setSubjectModal] = useState({ open: false, editing: null });
  const [subjectForm, setSubjectForm] = useState({ class_id: '', name: '', code: '', type: 'Theory', description: '' });

  const [academicDeleteTarget, setAcademicDeleteTarget] = useState(null);
  const [deletingAcademic, setDeletingAcademic] = useState(false);
  const [submittingAcademic, setSubmittingAcademic] = useState(false);

  const fetchStaffs = useCallback(async (siteId) => {
    if (!siteId) return;
    try {
      setLoadingStaffs(true);
      const res = await fetch(`/api/marketing/creator/websites/staffs?websiteId=${siteId}&creatorId=${creatorId}`);
      const data = await res.json();
      if (data.success) {
        setStaffsList(data.staffs || []);
        setModulesList(data.modules || []);
        setPayScalesList(data.payScales || []);
      }
    } catch {
    } finally {
      setLoadingStaffs(false);
    }
  }, [creatorId]);

  const fetchWebsite = useCallback(async () => {
    if (!creatorId || !domainParam) return;
    try {
      setLoading(true);
      setLoadError('');
      const res = await fetch(`/api/marketing/creator/websites?creatorId=${creatorId}&domain=${encodeURIComponent(domainParam)}`);
      const data = await res.json();
      if (data.success && data.website) {
        const w = data.website;
        setWebsite(w);
        if (data.baseDomain) setBaseDomain(data.baseDomain);
        if (data.cnameTarget) setCnameTarget(data.cnameTarget);
        if (data.aTarget) setATarget(data.aTarget);

        setName(w.name || '');
        setInstitutionType((w.institution_type || 'school').toLowerCase());
        setEeinNumber(w.eiin_number || '');
        setTagline(w.tagline || w.motto || '');
        setMission(w.mission || '');
        setVision(w.vision || '');
        setHistory(w.history || '');
        setContactEmail(w.contact_email || '');
        setContactPhone(w.contact_phone || '');
        setAddress(w.address || '');
        setMapUrl(w.map_url || '');
        setFacebookUrl(w.facebook_url || '');
        setTwitterUrl(w.twitter_url || '');
        setInstagramUrl(w.instagram_url || '');
        setYoutubeUrl(w.youtube_url || '');
        setLinkedinUrl(w.linkedin_url || '');
        setPrimaryColor(w.primary_color || '#1e40af');
        setSecondaryColor(w.secondary_color || '#0ea5e9');
        setTheme(w.theme || 'default');
        setLogo(w.logo || '');
        setLogoId(w.logo_id || '');
        setFavicon(w.favicon || '');
        setFaviconId(w.favicon_id || '');
        setCurrency(w.currency || 'BDT');
        setIsMaintenanceMode(Boolean(w.is_maintenance_mode));
        setMaintenanceMessage(
          w.maintenance_message ||
          'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.'
        );

        let cleanSub = w.subdomain || w.slug || '';
        if (cleanSub.includes('.')) {
          cleanSub = cleanSub.split('.')[0];
        }
        setSubdomain(cleanSub);

        setCustomDomainInput(w.custom_domain || '');
        if (w.custom_domain_record?.dns_records) {
          let recs = w.custom_domain_record.dns_records;
          if (typeof recs === 'string') {
            try {
              recs = JSON.parse(recs);
            } catch { }
          }
          if (Array.isArray(recs)) {
            setDomainDnsRecords(recs);
          }
        }

        fetchStaffs(w.id);
      } else {
        setLoadError(data.error || 'Website not found or access denied.');
      }
    } catch {
      setLoadError('Failed to fetch website data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [creatorId, domainParam, fetchStaffs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWebsite();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchWebsite]);

  useEffect(() => {
    if (!website) return;
    const clean = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    const originalSub = (website.subdomain || website.slug || '').split('.')[0].toLowerCase();

    const timer = setTimeout(async () => {
      if (!clean || clean === originalSub) {
        setSubdomainStatus({ state: 'idle', message: 'Current active subdomain' });
        return;
      }

      if (clean.length < 3) {
        setSubdomainStatus({ state: 'invalid', message: 'Subdomain must be at least 3 characters.' });
        return;
      }

      setSubdomainStatus({ state: 'checking', message: 'Checking availability...' });

      try {
        const res = await fetch(
          `/api/marketing/creator/websites/check-domain?domain=${encodeURIComponent(clean)}&websiteId=${website.id}`
        );
        const json = await res.json();
        if (json.available) {
          setSubdomainStatus({
            state: 'available',
            message: `Available! ${json.fullDomain || `${clean}.${baseDomain}`}`,
          });
        } else {
          setSubdomainStatus({
            state: 'taken',
            message: json.error || 'Subdomain is already taken.',
          });
        }
      } catch {
        setSubdomainStatus({ state: 'error', message: 'Error checking availability.' });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [subdomain, website, baseDomain]);

  useEffect(() => {
    if (!website) return;
    const clean = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const originalCustom = (website.custom_domain || '').toLowerCase();

    const timer = setTimeout(async () => {
      if (!clean || clean === originalCustom) {
        setCustomDomainStatus({ state: 'idle', message: '' });
        return;
      }

      if (!clean.includes('.') || clean.length < 4) {
        setCustomDomainStatus({ state: 'invalid', message: 'Enter a valid domain name (e.g. school.edu or academy.org)' });
        return;
      }

      setCustomDomainStatus({ state: 'checking', message: 'Checking availability...' });

      try {
        const res = await fetch(
          `/api/marketing/creator/websites/check-domain?type=custom&domain=${encodeURIComponent(clean)}&websiteId=${website.id}`
        );
        const json = await res.json();
        if (json.available) {
          setCustomDomainStatus({
            state: 'available',
            message: `Available to connect: ${clean}`,
          });
        } else {
          setCustomDomainStatus({
            state: 'taken',
            message: json.error || 'This custom domain is already registered to another website.',
          });
        }
      } catch {
        setCustomDomainStatus({ state: 'error', message: 'Error checking domain availability.' });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customDomainInput, website]);

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogoToCloudinary = async () => {
    if (!logoPreview || !website?.id) return;
    try {
      setUploadingLogo(true);
      setBrandingMsg({ type: '', text: '' });
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_branding',
          type: 'logo',
          websiteId: website.id,
          creatorId: Number(creatorId),
          image: logoPreview,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload logo to Cloudinary.');
      }
      setLogo(data.url);
      setLogoId(data.publicId || '');
      setLogoFile(null);
      setLogoPreview('');
      if (data.website) setWebsite(data.website);
      setBrandingMsg({
        type: 'success',
        text: 'Logo uploaded to Cloudinary successfully. Previous asset was automatically deleted.',
      });
      setTimeout(() => setBrandingMsg({ type: '', text: '' }), 5000);
    } catch (err) {
      setBrandingMsg({ type: 'error', text: err.message });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!website?.id) return;
    try {
      setUploadingLogo(true);
      setBrandingMsg({ type: '', text: '' });
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_branding',
          type: 'logo',
          websiteId: website.id,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove logo.');
      }
      setLogo('');
      setLogoId('');
      setLogoFile(null);
      setLogoPreview('');
      if (data.website) setWebsite(data.website);
      setBrandingMsg({ type: 'success', text: 'Logo removed and deleted from Cloudinary.' });
      setTimeout(() => setBrandingMsg({ type: '', text: '' }), 4000);
      setLogoDeleteConfirm(false);
    } catch (err) {
      setBrandingMsg({ type: 'error', text: err.message });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFaviconPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadFaviconToCloudinary = async () => {
    if (!faviconPreview || !website?.id) return;
    try {
      setUploadingFavicon(true);
      setBrandingMsg({ type: '', text: '' });
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_branding',
          type: 'favicon',
          websiteId: website.id,
          creatorId: Number(creatorId),
          image: faviconPreview,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload favicon to Cloudinary.');
      }
      setFavicon(data.url);
      setFaviconId(data.publicId || '');
      setFaviconFile(null);
      setFaviconPreview('');
      if (data.website) setWebsite(data.website);
      setBrandingMsg({
        type: 'success',
        text: 'Favicon uploaded to Cloudinary successfully. Previous asset was automatically deleted.',
      });
      setTimeout(() => setBrandingMsg({ type: '', text: '' }), 5000);
    } catch (err) {
      setBrandingMsg({ type: 'error', text: err.message });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleRemoveFavicon = async () => {
    if (!website?.id) return;
    try {
      setUploadingFavicon(true);
      setBrandingMsg({ type: '', text: '' });
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_branding',
          type: 'favicon',
          websiteId: website.id,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove favicon.');
      }
      setFavicon('');
      setFaviconId('');
      setFaviconFile(null);
      setFaviconPreview('');
      if (data.website) setWebsite(data.website);
      setBrandingMsg({ type: 'success', text: 'Favicon removed and deleted from Cloudinary.' });
      setTimeout(() => setBrandingMsg({ type: '', text: '' }), 4000);
      setFaviconDeleteConfirm(false);
    } catch (err) {
      setBrandingMsg({ type: 'error', text: err.message });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!website) return;

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
      const cleanCustom = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

      const payload = {
        action: 'update_website',
        id: website.id,
        creatorId: Number(creatorId),
        name: name.trim(),
        institution_type: institutionType,
        eiin_number: eeinNumber.trim(),
        tagline: tagline.trim(),
        mission: mission.trim(),
        vision: vision.trim(),
        history: history.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        address: address.trim(),
        map_url: mapUrl.trim(),
        facebook_url: facebookUrl.trim(),
        twitter_url: twitterUrl.trim(),
        instagram_url: instagramUrl.trim(),
        youtube_url: youtubeUrl.trim(),
        linkedin_url: linkedinUrl.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        theme: theme,
        logo: logoPreview || logo.trim(),
        logo_id: logoId,
        favicon: faviconPreview || favicon.trim(),
        favicon_id: faviconId,
        currency: currency,
        is_maintenance_mode: isMaintenanceMode,
        maintenance_message: maintenanceMessage.trim(),
        is_published: !isMaintenanceMode,
      };

      if (cleanSub) payload.subdomain = cleanSub;
      payload.custom_domain = cleanCustom || '';

      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess('Website changes saved successfully!');
        if (data.website) {
          setWebsite(data.website);
          setLogo(data.website.logo || '');
          setLogoId(data.website.logo_id || '');
          setFavicon(data.website.favicon || '');
          setFaviconId(data.website.favicon_id || '');
          setLogoPreview('');
          setFaviconPreview('');
        }
        if (refetchCreator) refetchCreator();
        if (cleanSub && cleanSub !== domainParam) {
          router.replace(`/creator/${creatorId}/workspace/${cleanSub}`);
        }
        setTimeout(() => setSaveSuccess(''), 3000);
      } else {
        setSaveError(data.error || 'Failed to save changes.');
      }
    } catch {
      setSaveError('Network error while saving changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenanceMode = async (targetMode) => {
    if (!website?.id) return;
    setIsMaintenanceMode(targetMode);
    try {
      setSaving(true);
      setSaveError('');
      setSaveSuccess('');
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_website',
          id: website.id,
          creatorId: Number(creatorId),
          is_maintenance_mode: targetMode,
          is_published: !targetMode,
          maintenance_message: maintenanceMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.website) setWebsite(data.website);
        setSaveSuccess(`Website switched to ${targetMode ? 'Maintenance Mode' : 'Live'}.`);
        setTimeout(() => setSaveSuccess(''), 3000);
      } else {
        setSaveError(data.error || 'Failed to update maintenance mode.');
      }
    } catch {
      setSaveError('Network error while toggling maintenance mode.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectCustomDomain = async (e) => {
    e?.preventDefault?.();
    if (website?.package && website.package.is_available_custom_domain === false) {
      setDomainFeedback({
        type: 'error',
        text: `Custom domain addition is not included in your ${website.package.name || 'current'} subscription plan. Please upgrade your package to connect a custom domain.`,
      });
      return;
    }
    const clean = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
    if (!clean || !clean.includes('.')) {
      setDomainFeedback({ type: 'error', text: 'Please enter a valid custom domain (e.g. school.edu or portal.academy.com).' });
      return;
    }
    setSaving(true);
    setDomainFeedback({ type: '', text: '' });
    setDnsVerificationResult(null);
    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect_custom_domain',
          id: website.id,
          creatorId: Number(creatorId),
          custom_domain: clean,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDomainFeedback({
          type: 'success',
          text: data.message || `Custom domain "${clean}" saved! Configure the required DNS records below.`,
        });
        setWebsite((prev) => ({
          ...prev,
          custom_domain: clean,
          custom_domain_verified: false,
          custom_domain_record: data.domain,
        }));
        if (data.dns_records && Array.isArray(data.dns_records)) {
          setDomainDnsRecords(data.dns_records);
        }
        if (refetchCreator) refetchCreator();
      } else {
        setDomainFeedback({ type: 'error', text: data.error || 'Failed to connect custom domain.' });
      }
    } catch {
      setDomainFeedback({ type: 'error', text: 'Network error connecting custom domain.' });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDns = async (bypassInDev = false) => {
    if (!website?.custom_domain) return;
    setVerifyingDns(true);
    setDomainFeedback({ type: '', text: '' });
    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_dns',
          id: website.id,
          creatorId: Number(creatorId),
          bypassInDev: Boolean(bypassInDev),
        }),
      });
      const data = await res.json();
      setDnsVerificationResult({
        verified: Boolean(data.verified),
        message: data.message || '',
        canBypassInDev: Boolean(data.canBypassInDev),
      });
      if (data.verified) {
        setDomainFeedback({
          type: 'success',
          text: data.message || 'DNS Verified! Click Confirm & Activate Domain below to make it live.',
        });
        setWebsite((prev) => ({
          ...prev,
          custom_domain_verified: true,
          custom_domain_record: data.domain || prev.custom_domain_record,
        }));
        if (refetchCreator) refetchCreator();
      } else {
        setDomainFeedback({
          type: 'info',
          text: data.message || 'CNAME or TXT record not detected yet. DNS propagation can take up to 24 hours.',
        });
      }
    } catch {
      setDomainFeedback({ type: 'error', text: 'Network error verifying DNS records.' });
    } finally {
      setVerifyingDns(false);
    }
  };

  const handleConfirmCustomDomain = async () => {
    if (!website?.custom_domain) return;
    setConfirmingDomain(true);
    setDomainFeedback({ type: '', text: '' });
    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_custom_domain',
          id: website.id,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDomainFeedback({
          type: 'success',
          text: data.message || 'Domain successfully confirmed and activated as live primary domain!',
        });
        setWebsite((prev) => ({
          ...prev,
          custom_domain_verified: true,
          custom_domain_record: data.domain,
        }));
        if (refetchCreator) refetchCreator();
      } else {
        setDomainFeedback({ type: 'error', text: data.error || 'Failed to confirm custom domain.' });
      }
    } catch {
      setDomainFeedback({ type: 'error', text: 'Network error confirming custom domain.' });
    } finally {
      setConfirmingDomain(false);
    }
  };

  const handleDisconnectCustomDomain = async () => {
    setSaving(true);
    setDomainFeedback({ type: '', text: '' });
    setShowDisconnectConfirm(false);
    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect_custom_domain',
          id: website.id,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDomainFeedback({ type: 'success', text: 'Custom domain disconnected successfully.' });
        setWebsite((prev) => ({ ...prev, custom_domain: null, custom_domain_verified: false, custom_domain_record: null }));
        setCustomDomainInput('');
        setDomainDnsRecords([]);
        setDnsVerificationResult(null);
        if (refetchCreator) refetchCreator();
      } else {
        setDomainFeedback({ type: 'error', text: data.error || 'Failed to disconnect custom domain.' });
      }
    } catch {
      setDomainFeedback({ type: 'error', text: 'Network error disconnecting custom domain.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyText = (val, key) => {
    if (!val) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopiedRecordKey(key);
      setTimeout(() => setCopiedRecordKey(''), 2000);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!website?.id) return;
    if (!staffForm.name || !staffForm.email || !staffForm.number) {
      setStaffActionMsg({ type: 'error', text: 'Name, email, and phone number are required.' });
      return;
    }
    try {
      setSubmittingStaff(true);
      setStaffActionMsg({ type: '', text: '' });
      const payload = {
        websiteId: website.id,
        creatorId: Number(creatorId),
        name: staffForm.name,
        email: staffForm.email,
        number: staffForm.number,
        address: staffForm.address,
        gradeId: staffForm.gradeId,
        bio: staffForm.bio,
        permissions: staffForm.permissions,
        sendInvite: staffForm.passwordMode === 'invite' || staffForm.sendInvite,
        password: staffForm.passwordMode === 'manual' ? staffForm.password : undefined,
        markAsRegistered: staffForm.passwordMode === 'manual' && staffForm.password?.length >= 6,
      };

      const res = await fetch('/api/marketing/creator/websites/staffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add staff member.');
      }

      setStaffActionMsg({
        type: 'success',
        text: `Staff member "${staffForm.name}" created successfully.${data.emailSent ? ' Verification email sent.' : ' Note: Verification token generated.'}${data.setupUrl ? ` Link: ${data.setupUrl}` : ''}`,
      });
      setShowAddStaffModal(false);
      setStaffForm({
        name: '',
        email: '',
        number: '',
        address: '',
        password: '',
        passwordMode: 'invite',
        gradeId: '',
        bio: '',
        sendInvite: true,
        permissions: {},
      });
      await fetchStaffs(website.id);
    } catch (err) {
      setStaffActionMsg({ type: 'error', text: err.message });
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleResendVerification = async (staffId, staffName, staffEmail) => {
    if (!website?.id) return;
    try {
      setResendingStaffId(staffId);
      setStaffActionMsg({ type: '', text: '' });
      const res = await fetch('/api/marketing/creator/websites/staffs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_verification',
          staffId,
          websiteId: website.id,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend verification email.');
      }
      setStaffActionMsg({
        type: 'success',
        text: `${data.message || `Verification link sent to ${staffEmail}.`}${data.setupUrl ? ` Link: ${data.setupUrl}` : ''}`,
      });
      await fetchStaffs(website.id);
    } catch (err) {
      setStaffActionMsg({ type: 'error', text: err.message });
    } finally {
      setResendingStaffId(null);
    }
  };

  const handleToggleStaffActive = async (staffId) => {
    if (!website?.id) return;
    try {
      setStaffActionMsg({ type: '', text: '' });
      const res = await fetch('/api/marketing/creator/websites/staffs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_active',
          staffId,
          websiteId: website.id,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to toggle status.');
      setStaffActionMsg({ type: 'success', text: data.message });
      await fetchStaffs(website.id);
    } catch (err) {
      setStaffActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleRevokeStaffSessions = async (staffId) => {
    if (!website?.id) return;
    try {
      setStaffActionMsg({ type: '', text: '' });
      const res = await fetch('/api/marketing/creator/websites/staffs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_sessions',
          staffId,
          websiteId: website.id,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to terminate sessions.');
      setStaffActionMsg({ type: 'success', text: data.message });
      await fetchStaffs(website.id);
    } catch (err) {
      setStaffActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    try {
      setStaffActionMsg({ type: '', text: '' });
      const res = await fetch(
        `/api/marketing/creator/websites/staffs?staffId=${staffId}&websiteId=${website.id}&creatorId=${creatorId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to remove staff member.');
      setStaffActionMsg({ type: 'success', text: `Staff member "${staffName}" removed successfully.` });
      await fetchStaffs(website.id);
    } catch (err) {
      setStaffActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleOpenEditPerms = (staff) => {
    setTargetStaff(staff);
    setEditPermsMap(staff.permissions || {});
    setShowEditPermsModal(true);
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    if (!targetStaff || !website?.id) return;
    try {
      setSavingPerms(true);
      const res = await fetch('/api/marketing/creator/websites/staffs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_permissions',
          staffId: targetStaff.id,
          websiteId: website.id,
          permissions: editPermsMap,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update permissions.');
      setStaffActionMsg({ type: 'success', text: 'Module permissions updated successfully.' });
      setShowEditPermsModal(false);
      await fetchStaffs(website.id);
    } catch (err) {
      setStaffActionMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPerms(false);
    }
  };

  const handleOpenEditProfile = (staff) => {
    setTargetStaff(staff);
    setEditProfileForm({
      name: staff.name || '',
      email: staff.email || '',
      number: staff.phone || staff.number || '',
      address: staff.address || '',
      gradeId: staff.grade_id || '',
      bio: staff.bio || '',
    });
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!targetStaff || !website?.id) return;
    try {
      setSavingProfile(true);
      const res = await fetch('/api/marketing/creator/websites/staffs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          staffId: targetStaff.id,
          websiteId: website.id,
          name: editProfileForm.name,
          email: editProfileForm.email,
          number: editProfileForm.number,
          address: editProfileForm.address,
          gradeId: editProfileForm.gradeId,
          bio: editProfileForm.bio,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update staff profile.');
      setStaffActionMsg({ type: 'success', text: 'Staff profile updated successfully.' });
      setShowEditProfileModal(false);
      await fetchStaffs(website.id);
    } catch (err) {
      setStaffActionMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchAcademics = useCallback(async () => {
    if (!domainParam) return;
    try {
      setLoadingAcademics(true);
      const [deptRes, classRes, secRes, subRes] = await Promise.all([
        fetch(`/api/${domainParam}/staff/panel/departments`),
        fetch(`/api/${domainParam}/staff/panel/classes`),
        fetch(`/api/${domainParam}/staff/panel/sections`),
        fetch(`/api/${domainParam}/staff/panel/subjects`),
      ]);
      const [deptData, classData, secData, subData] = await Promise.all([
        deptRes.json(),
        classRes.json(),
        secRes.json(),
        subRes.json(),
      ]);
      if (deptData?.success) setAcademicDepts(deptData.departments || []);
      if (classData?.success) setAcademicClasses(classData.classes || []);
      if (secData?.success) setAcademicSections(secData.sections || []);
      if (subData?.success) setAcademicSubjects(subData.subjects || []);
    } catch {
      setAcademicActionMsg({ type: 'error', text: 'Failed to load institutional academic records.' });
    } finally {
      setLoadingAcademics(false);
    }
  }, [domainParam]);

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      setAcademicActionMsg({ type: 'error', text: 'Department name is required.' });
      return;
    }
    try {
      setSubmittingAcademic(true);
      setAcademicActionMsg({ type: '', text: '' });
      const method = deptModal.editing ? 'PUT' : 'POST';
      const body = deptModal.editing ? { ...deptForm, id: deptModal.editing.id } : deptForm;
      const res = await fetch(`/api/${domainParam}/staff/panel/departments`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save department.');
      setAcademicActionMsg({ type: 'success', text: data.message || 'Department saved successfully.' });
      setDeptModal({ open: false, editing: null });
      fetchAcademics();
    } catch (err) {
      setAcademicActionMsg({ type: 'error', text: err.message });
    } finally {
      setSubmittingAcademic(false);
    }
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!classForm.name.trim()) {
      setAcademicActionMsg({ type: 'error', text: 'Class name is required.' });
      return;
    }
    try {
      setSubmittingAcademic(true);
      setAcademicActionMsg({ type: '', text: '' });
      const method = classModal.editing ? 'PUT' : 'POST';
      const body = {
        name: classForm.name.trim(),
        code: classForm.code.trim(),
        department_id: classForm.department_id ? classForm.department_id : null,
        capacity: Number(classForm.capacity) || 40,
        display_order: Number(classForm.display_order) || 0,
      };
      if (classModal.editing) body.id = classModal.editing.id;
      const res = await fetch(`/api/${domainParam}/staff/panel/classes`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save class.');
      setAcademicActionMsg({ type: 'success', text: data.message || 'Class saved successfully.' });
      setClassModal({ open: false, editing: null });
      fetchAcademics();
    } catch (err) {
      setAcademicActionMsg({ type: 'error', text: err.message });
    } finally {
      setSubmittingAcademic(false);
    }
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    if (!sectionForm.class_id) {
      setAcademicActionMsg({ type: 'error', text: 'Parent class selection is required.' });
      return;
    }
    if (!sectionForm.name.trim()) {
      setAcademicActionMsg({ type: 'error', text: 'Section name is required.' });
      return;
    }
    try {
      setSubmittingAcademic(true);
      setAcademicActionMsg({ type: '', text: '' });
      const method = sectionModal.editing ? 'PUT' : 'POST';
      const body = {
        class_id: sectionForm.class_id,
        name: sectionForm.name.trim(),
        capacity: Number(sectionForm.capacity) || 40,
        room_number: sectionForm.room_number.trim(),
      };
      if (sectionModal.editing) body.id = sectionModal.editing.id;
      const res = await fetch(`/api/${domainParam}/staff/panel/sections`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save section.');
      setAcademicActionMsg({ type: 'success', text: data.message || 'Section saved successfully.' });
      setSectionModal({ open: false, editing: null });
      fetchAcademics();
    } catch (err) {
      setAcademicActionMsg({ type: 'error', text: err.message });
    } finally {
      setSubmittingAcademic(false);
    }
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.class_id) {
      setAcademicActionMsg({ type: 'error', text: 'Parent class selection is required.' });
      return;
    }
    if (!subjectForm.name.trim()) {
      setAcademicActionMsg({ type: 'error', text: 'Subject name is required.' });
      return;
    }
    try {
      setSubmittingAcademic(true);
      setAcademicActionMsg({ type: '', text: '' });
      const method = subjectModal.editing ? 'PUT' : 'POST';
      const body = {
        class_id: subjectForm.class_id,
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim(),
        type: subjectForm.type || 'Theory',
        description: subjectForm.description.trim(),
      };
      if (subjectModal.editing) body.id = subjectModal.editing.id;
      const res = await fetch(`/api/${domainParam}/staff/panel/subjects`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save subject.');
      setAcademicActionMsg({ type: 'success', text: data.message || 'Subject saved successfully.' });
      setSubjectModal({ open: false, editing: null });
      fetchAcademics();
    } catch (err) {
      setAcademicActionMsg({ type: 'error', text: err.message });
    } finally {
      setSubmittingAcademic(false);
    }
  };

  const handleConfirmDeleteAcademic = async () => {
    if (!academicDeleteTarget) return;
    try {
      setDeletingAcademic(true);
      let endpoint = '';
      if (academicDeleteTarget.type === 'department') endpoint = `/api/${domainParam}/staff/panel/departments?id=${academicDeleteTarget.id}`;
      if (academicDeleteTarget.type === 'class') endpoint = `/api/${domainParam}/staff/panel/classes?id=${academicDeleteTarget.id}`;
      if (academicDeleteTarget.type === 'section') endpoint = `/api/${domainParam}/staff/panel/sections?id=${academicDeleteTarget.id}`;
      if (academicDeleteTarget.type === 'subject') endpoint = `/api/${domainParam}/staff/panel/subjects?id=${academicDeleteTarget.id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete record.');
      setAcademicActionMsg({ type: 'success', text: data.message || 'Record deleted successfully.' });
      setAcademicDeleteTarget(null);
      fetchAcademics();
    } catch (err) {
      setAcademicActionMsg({ type: 'error', text: err.message });
    } finally {
      setDeletingAcademic(false);
    }
  };

  const handleConfirmDeleteWebsite = async () => {
    setDeleting(true);
    setDeleteWebsiteError('');
    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_website',
          id: website.id,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (refetchCreator) await refetchCreator();
        router.push(`/creator/${creatorId}/workspace`);
      } else {
        setDeleteWebsiteError(data.error || 'Failed to delete website');
      }
    } catch {
      setDeleteWebsiteError('Network error deleting website');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen={false} label="Loading website configuration..." />;
  }

  if (loadError || !website) {
    return (
      <div className="w-full py-12 text-center space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Website Not Found</h2>
        <p className="text-xs text-slate-500">{loadError || 'The requested website could not be found.'}</p>
        <Link
          href={`/creator/${creatorId}/workspace`}
          className="inline-block px-3 py-1.5 rounded bg-slate-900 text-white font-medium text-xs hover:bg-slate-800"
        >
          Return to Workspace
        </Link>
      </div>
    );
  }

  const cleanSub = (website.subdomain || website.slug || '').split('.')[0];
  const isDevHost = baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+/.test(baseDomain) || baseDomain.includes(':');
  const tenantProto = isDevHost ? 'http' : 'https';
  const liveUrl = website.custom_domain && website.custom_domain_verified
    ? `https://${website.custom_domain}`
    : `${tenantProto}://${cleanSub}.${baseDomain}`;
  const localPreviewPath = `/${cleanSub}`;

  return (
    <div className="w-full space-y-4 text-slate-800 text-xs pb-16">
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={`/creator/${creatorId}/workspace`}
              className="text-slate-500 hover:text-slate-800 font-medium"
            >
              Websites
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">{website.name}</span>
            <span
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${!isMaintenanceMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
            >
              {!isMaintenanceMode ? 'Live' : 'Maintenance Mode'}
            </span>
          </div>

          <h1 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>{website.name}</span>
            <span className="text-xs font-mono text-slate-500 font-normal">
              ({cleanSub}.{baseDomain})
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors"
          >
            Visit Live Site
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <span>{saveSuccess}</span>
          <button type="button" onClick={() => setSaveSuccess('')} className="text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {saveError && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <span>{saveError}</span>
          <button type="button" onClick={() => setSaveError('')} className="text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'domains', label: 'Domains & DNS' },
          { id: 'modules', label: 'Package & Modules' },
          { id: 'staffs', label: `Staff Members (${staffsList.length})` },
          { id: 'academics', label: 'Academic Setup' },
          { id: 'general', label: 'Institutional Profile' },
          { id: 'branding', label: 'Appearance & Themes' },
          { id: 'portals', label: 'Direct Portals' },
          { id: 'danger', label: 'Danger Zone' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'staffs' && website?.id) fetchStaffs(website.id);
              if (tab.id === 'academics') fetchAcademics();
            }}
            className={`px-3.5 py-2 font-medium text-xs border-b-2 whitespace-nowrap transition-colors cursor-pointer ${activeTab === tab.id
              ? 'border-slate-900 text-slate-900 bg-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'domains' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Institutional Subdomain</h2>
                <p className="text-xs text-slate-500">Shared multi-tenant subdomain route on the SaaS host.</p>
              </div>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                Active & Routing
              </span>
            </div>

            <div className="space-y-2 max-w-lg">
              <label className="block text-xs font-medium text-slate-700">Subdomain Prefix</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'))}
                  className="flex-1 bg-white border border-slate-300 rounded-l px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
                <span className="px-3 py-1.5 rounded-r bg-slate-100 border border-l-0 border-slate-300 text-slate-600 font-mono text-xs select-none">
                  .{baseDomain}
                </span>
              </div>

              {subdomainStatus.message && (
                <div className="text-[11px] font-medium">
                  {subdomainStatus.state === 'available' && (
                    <span className="text-emerald-700">{subdomainStatus.message}</span>
                  )}
                  {subdomainStatus.state === 'taken' && (
                    <span className="text-rose-600">{subdomainStatus.message}</span>
                  )}
                  {subdomainStatus.state === 'checking' && (
                    <span className="text-slate-500">Checking availability...</span>
                  )}
                  {subdomainStatus.state === 'idle' && (
                    <span className="text-slate-400">{subdomainStatus.message}</span>
                  )}
                </div>
              )}

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-600 flex items-center justify-between">
                <span className="text-[11px]">Direct Address:</span>
                <a
                  href={`${tenantProto}://${cleanSub}.${baseDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-slate-900 hover:underline font-medium"
                >
                  {tenantProto}://{cleanSub}.{baseDomain}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Custom Domain Configuration</h2>
                <p className="text-xs text-slate-500">
                  Connect your institution&apos;s custom domain (e.g. <code>yourschool.edu</code> or <code>portal.campus.org</code>).
                </p>
              </div>

              {website.custom_domain && (
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded border flex items-center gap-1.5 ${website.custom_domain_verified
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${website.custom_domain_verified ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                      }`}
                  />
                  {website.custom_domain_verified ? 'DNS Verified & Primary Live Domain' : 'DNS Setup & Propagation Pending'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 border border-slate-100 bg-slate-50/70 p-2.5 rounded text-[11px]">
              <div
                className={`flex items-center gap-2 p-1.5 rounded ${!website.custom_domain ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>Enter Domain</span>
              </div>
              <div
                className={`flex items-center gap-2 p-1.5 rounded ${website.custom_domain && !website.custom_domain_verified
                  ? 'bg-white font-semibold text-slate-900 shadow-xs'
                  : 'text-slate-600'
                  }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>DNS Records</span>
              </div>
              <div
                className={`flex items-center gap-2 p-1.5 rounded ${website.custom_domain && verifyingDns
                  ? 'bg-white font-semibold text-slate-900 shadow-xs'
                  : 'text-slate-600'
                  }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                <span>Verify DNS</span>
              </div>
              <div
                className={`flex items-center gap-2 p-1.5 rounded ${website.custom_domain_verified ? 'bg-white font-semibold text-emerald-900 shadow-xs' : 'text-slate-600'
                  }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  4
                </span>
                <span>Confirm Live</span>
              </div>
            </div>

            {domainFeedback.text && (
              <div
                className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${domainFeedback.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : domainFeedback.type === 'info'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span>{domainFeedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDomainFeedback({ type: '', text: '' })}
                  className="text-xs hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {website.custom_domain && website.custom_domain_verified && (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                      Active Primary Custom Domain
                    </div>
                    <div className="text-base font-bold font-mono text-emerald-950 mt-0.5">
                      {website.custom_domain}
                    </div>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      SSL/TLS security certificate is active. All institutional traffic is served directly through this domain.
                    </p>
                  </div>
                  <a
                    href={`https://${website.custom_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Visit Live Site</span>
                    <span>↗</span>
                  </a>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <span className="font-semibold">Security:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-mono">
                      TLS 1.3 / SSL Active
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDnsDetails((prev) => !prev)}
                      className="px-2.5 py-1 rounded border border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-50 font-medium text-xs cursor-pointer"
                    >
                      {showDnsDetails ? 'Hide DNS Setup' : 'View DNS Records'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerifyDns(false)}
                      disabled={verifyingDns}
                      className="px-2.5 py-1 rounded border border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-50 font-medium text-xs cursor-pointer disabled:opacity-50"
                    >
                      {verifyingDns ? 'Checking...' : 'Re-check DNS Health'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="px-2.5 py-1 rounded border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 font-medium text-xs cursor-pointer"
                    >
                      Disconnect Domain
                    </button>
                  </div>
                </div>
              </div>
            )}

            {website.package && website.package.is_available_custom_domain === false ? (
              <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-3 max-w-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 text-sm font-bold">
                    🔒
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Custom Domain Locked in Current Plan
                    </h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Your current subscription plan <span className="font-semibold text-amber-950">{website.package?.name || 'Current Plan'}</span> does not include custom domain connectivity. Upgrade your package to connect your custom branded institutional domain with automated SSL.
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-amber-700">
                    Active Plan: {website.package?.name}
                  </span>
                  <Link
                    href={`/creator/${creatorId}/workspace/new`}
                    className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Upgrade Package</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ) : (
              (!website.custom_domain || !website.custom_domain_verified) && (
                <form onSubmit={handleConnectCustomDomain} className="space-y-3 max-w-lg">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Custom Domain Host</label>
                    <p className="text-[11px] text-slate-500">
                      Enter your root domain or subdomain without http:// or https://. Example: <code>school.edu</code> or <code>portal.campus.org</code>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      aria-label="Custom Domain Host"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {saving ? 'Saving...' : website.custom_domain ? 'Update Domain' : 'Save & Generate DNS'}
                    </button>
                  </div>

                  {customDomainStatus.message && (
                    <div className="text-[11px] font-medium">
                      {customDomainStatus.state === 'available' && (
                        <span className="text-emerald-700">{customDomainStatus.message}</span>
                      )}
                      {customDomainStatus.state === 'taken' && (
                        <span className="text-rose-600">{customDomainStatus.message}</span>
                      )}
                      {customDomainStatus.state === 'invalid' && (
                        <span className="text-slate-500">{customDomainStatus.message}</span>
                      )}
                      {customDomainStatus.state === 'checking' && (
                        <span className="text-slate-500">Checking availability...</span>
                      )}
                    </div>
                  )}
                </form>
              )
            )}

            {website.custom_domain && (showDnsDetails || !website.custom_domain_verified) && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Required DNS Records for: <span className="font-mono text-slate-800">{website.custom_domain}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Add the following DNS records in your domain registrar or DNS management console (Cloudflare, Namecheap, GoDaddy, etc.):
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const allTxt = (domainDnsRecords.length > 0
                          ? domainDnsRecords
                          : [
                            {
                              type: website.custom_domain.split('.').length === 2 ? 'A' : 'CNAME',
                              name: website.custom_domain.split('.').length === 2 ? '@' : website.custom_domain.split('.')[0],
                              value: website.custom_domain.split('.').length === 2 ? aTarget : cnameTarget,
                              ttl: '3600',
                            },
                            {
                              type: 'TXT',
                              name: `_hiesci-challenge${website.custom_domain.split('.').length === 2 ? '' : '.' + website.custom_domain.split('.')[0]
                                }`,
                              value: website.custom_domain_record?.verification_token || 'hiesci-verification',
                              ttl: '3600',
                            },
                          ]
                        )
                          .map((r) => `${r.type}\t${r.name}\t${r.value}\t${r.ttl}`)
                          .join('\n');
                        handleCopyText(allTxt, 'all');
                      }}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer"
                    >
                      {copiedRecordKey === 'all' ? 'Copied All Records!' : 'Copy All Records'}
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded bg-white">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-semibold">
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Name / Host</th>
                          <th className="py-2 px-3">Target / Address / Value</th>
                          <th className="py-2 px-3">TTL</th>
                          <th className="py-2 px-3">Purpose</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {(domainDnsRecords.length > 0
                          ? domainDnsRecords
                          : [
                            {
                              type: website.custom_domain.split('.').length === 2 ? 'A' : 'CNAME',
                              name: website.custom_domain.split('.').length === 2 ? '@' : website.custom_domain.split('.')[0],
                              value: website.custom_domain.split('.').length === 2 ? aTarget : cnameTarget,
                              ttl: '3600',
                              description: 'Primary hostname routing record',
                            },
                            {
                              type: 'TXT',
                              name: `_hiesci-challenge${website.custom_domain.split('.').length === 2 ? '' : '.' + website.custom_domain.split('.')[0]
                                }`,
                              value: website.custom_domain_record?.verification_token || 'hiesci-verification',
                              ttl: '3600',
                              description: 'Domain ownership verification challenge',
                            },
                          ]
                        ).map((record, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${record.type === 'CNAME'
                                  ? 'bg-purple-100 text-purple-800'
                                  : record.type === 'A'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                  }`}
                              >
                                {record.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900 select-all">
                              {record.name}
                            </td>
                            <td className="py-2 px-3 text-slate-900 break-all select-all font-mono">
                              {record.value}
                            </td>
                            <td className="py-2 px-3 text-slate-500 font-sans text-[11px]">
                              {record.ttl || '3600'}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-sans text-[11px]">
                              {record.description || 'DNS record'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleCopyText(record.value, `val-${idx}`)}
                                className="px-2 py-0.5 rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-[10px] font-sans font-medium cursor-pointer"
                              >
                                {copiedRecordKey === `val-${idx}` ? 'Copied!' : 'Copy Value'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Note: After adding the records in your DNS console, propagation typically takes 2 to 15 minutes, but may take up to 24 hours depending on your registrar.
                  </p>
                </div>

                {!website.custom_domain_verified && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          Step 3 & 4: Verify and Confirm Domain
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Click Verify DNS to check that your DNS records are active. Once verified, confirm to activate your live custom domain.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerifyDns(false)}
                          disabled={verifyingDns}
                          className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                        >
                          {verifyingDns ? 'Checking DNS Records...' : 'Verify DNS Records'}
                        </button>

                        {dnsVerificationResult?.canBypassInDev && (
                          <button
                            type="button"
                            onClick={() => handleVerifyDns(true)}
                            disabled={verifyingDns}
                            className="px-3 py-1.5 rounded border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-medium text-xs cursor-pointer disabled:opacity-50"
                          >
                            Simulate DNS Verified (Dev Mode)
                          </button>
                        )}
                      </div>
                    </div>

                    {dnsVerificationResult && !dnsVerificationResult.verified && (
                      <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                        {dnsVerificationResult.message}
                      </div>
                    )}

                    {(website.custom_domain_verified || dnsVerificationResult?.verified) && (
                      <div className="p-3 rounded bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-emerald-900">
                            DNS Records Detected & Verified!
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            Your domain ownership and DNS routing are verified. Click below to activate this domain for all live traffic.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmCustomDomain}
                          disabled={confirmingDomain}
                          className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {confirmingDomain ? 'Activating...' : 'Confirm & Activate Domain'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showDisconnectConfirm && (
              <div className="p-3.5 rounded bg-rose-50 border border-rose-200 space-y-2 text-xs">
                <div className="font-semibold text-rose-900">Disconnect Custom Domain?</div>
                <p className="text-rose-700">
                  Are you sure you want to disconnect <code>{website.custom_domain}</code>? Incoming visitor traffic will automatically revert to your platform subdomain (<code>{subdomain}.{baseDomain}</code>).
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDisconnectCustomDomain}
                    disabled={saving}
                    className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Disconnecting...' : 'Yes, Disconnect Domain'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Current Package Plan
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    {website?.package?.subscription_status || 'Active'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {website?.package?.name || 'Infinte Campus'}
                </h2>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  {website?.package?.short_description || website?.package?.description || 'Comprehensive institutional management and campus portal automation suite.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/creator/${creatorId}/workspace/new`}
                  className="px-3.5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Upgrade Plan</span>
                  <span>↗</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Students
                </div>
                <div className="text-base font-bold text-slate-900">
                  {website?.package?.max_students ? Number(website.package.max_students).toLocaleString() : 'Unlimited'}
                </div>
                <div className="text-[10px] text-slate-500">Maximum capacity</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Teachers
                </div>
                <div className="text-base font-bold text-slate-900">
                  {website?.package?.max_teachers ? Number(website.package.max_teachers).toLocaleString() : 'Unlimited'}
                </div>
                <div className="text-[10px] text-slate-500">Faculty seats</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Staff Members
                </div>
                <div className="text-base font-bold text-slate-900">
                  {website?.package?.max_staff ? Number(website.package.max_staff).toLocaleString() : 'Unlimited'}
                </div>
                <div className="text-[10px] text-slate-500">Workstation seats</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Storage Quota
                </div>
                <div className="text-base font-bold text-slate-900">
                  {website?.package?.max_storage_mb ? `${(website.package.max_storage_mb / 1024).toFixed(0)} GB` : '5 GB'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {website?.package?.max_storage_mb ? `${Number(website.package.max_storage_mb).toLocaleString()} MB cloud` : '5,120 MB cloud'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-xs font-semibold text-slate-900">
                Core Feature & Portal Entitlements
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div
                  className={`p-3 rounded border flex items-center justify-between gap-2 ${website?.package?.is_available_student_panel
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold">Student Portal</div>
                    <div className="text-[11px] opacity-80">Online student dashboard & grades</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${website?.package?.is_available_student_panel
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                      }`}
                  >
                    {website?.package?.is_available_student_panel ? 'Included' : 'Locked'}
                  </span>
                </div>

                <div
                  className={`p-3 rounded border flex items-center justify-between gap-2 ${website?.package?.is_available_teacher_panel
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold">Teacher Portal</div>
                    <div className="text-[11px] opacity-80">Faculty marks, routine & assignments</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${website?.package?.is_available_teacher_panel
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                      }`}
                  >
                    {website?.package?.is_available_teacher_panel ? 'Included' : 'Locked'}
                  </span>
                </div>

                <div
                  className={`p-3 rounded border flex items-center justify-between gap-2 ${website?.package?.is_available_custom_domain
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/60 border-amber-200 text-amber-950'
                    }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold">Custom Domain</div>
                    <div className="text-[11px] opacity-80">Institutional root domain & SSL</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${website?.package?.is_available_custom_domain
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                      }`}
                  >
                    {website?.package?.is_available_custom_domain ? 'Included' : 'Locked'}
                  </span>
                </div>
              </div>
            </div>

            {Array.isArray(website?.package?.features) && website.package.features.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-900">
                  Additional Included Features
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {website.package.features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs inline-flex items-center gap-1.5"
                    >
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{typeof feat === 'string' ? feat : feat?.name || JSON.stringify(feat)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Included Modules & Workstations</h3>
                <p className="text-xs text-slate-500">
                  Public institutional frontend modules and administrative staff workstations enabled under your subscription.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white text-xs">
                  <button
                    type="button"
                    onClick={() => setModuleViewType('all')}
                    className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${moduleViewType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    All Modules ({(website?.allowed_home_modules?.length || 0) + (website?.allowed_control_modules?.length || 0)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModuleViewType('home')}
                    className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${moduleViewType === 'home' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    Public Home Modules ({website?.allowed_home_modules?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModuleViewType('control')}
                    className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${moduleViewType === 'control' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    Staff Control Modules ({website?.allowed_control_modules?.length || 0})
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Search Modules by Name or Path</label>
                <input
                  type="text"
                  aria-label="Search Modules by Name or Path"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="w-48 shrink-0">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Filter by Category</label>
                <select
                  aria-label="Filter by Category"
                  value={moduleCategoryFilter}
                  onChange={(e) => setModuleCategoryFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="all">All Categories</option>
                  {Array.from(
                    new Set([
                      ...(website?.allowed_home_modules || []).map((m) => m.category).filter(Boolean),
                      ...(website?.allowed_control_modules || []).map((m) => m.category).filter(Boolean),
                    ])
                  ).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {(moduleSearch || moduleCategoryFilter !== 'all') && (
                <div className="self-end pb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setModuleSearch('');
                      setModuleCategoryFilter('all');
                    }}
                    className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>

            {(moduleViewType === 'all' || moduleViewType === 'home') && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Public Institutional Website Modules
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {(website?.allowed_home_modules || []).filter((m) => {
                      if (moduleCategoryFilter !== 'all' && m.category?.toLowerCase() !== moduleCategoryFilter.toLowerCase()) return false;
                      if (moduleSearch.trim()) {
                        const q = moduleSearch.trim().toLowerCase();
                        return (
                          m.name?.toLowerCase().includes(q) ||
                          m.category?.toLowerCase().includes(q) ||
                          m.description?.toLowerCase().includes(q) ||
                          m.path?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    }).length} of {website?.allowed_home_modules?.length || 0}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(website?.allowed_home_modules || [])
                    .filter((m) => {
                      if (moduleCategoryFilter !== 'all' && m.category?.toLowerCase() !== moduleCategoryFilter.toLowerCase()) return false;
                      if (moduleSearch.trim()) {
                        const q = moduleSearch.trim().toLowerCase();
                        return (
                          m.name?.toLowerCase().includes(q) ||
                          m.category?.toLowerCase().includes(q) ||
                          m.description?.toLowerCase().includes(q) ||
                          m.path?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((mod) => (
                      <div
                        key={mod.id || mod.path}
                        className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1.5">


                          <h5 className="text-sm font-bold text-slate-900">{mod.name}</h5>


                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {mod.description || 'Public institutional module active for student and visitor navigation.'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-500">Public Portal Page</span>
                          <a
                            href={
                              website?.custom_domain && website.custom_domain_verified
                                ? `https://${website.custom_domain}${mod.path || '/'}`
                                : `http://${cleanSub}.${baseDomain}${mod.path || '/'}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-slate-800 hover:text-slate-950 inline-flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span>Open Page</span>
                            <span>↗</span>
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {(moduleViewType === 'all' || moduleViewType === 'control') && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Administrative Staff Control Modules
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {(website?.allowed_control_modules || []).filter((m) => {
                      if (moduleCategoryFilter !== 'all' && m.category?.toLowerCase() !== moduleCategoryFilter.toLowerCase()) return false;
                      if (moduleSearch.trim()) {
                        const q = moduleSearch.trim().toLowerCase();
                        return (
                          m.name?.toLowerCase().includes(q) ||
                          m.category?.toLowerCase().includes(q) ||
                          m.description?.toLowerCase().includes(q) ||
                          m.path?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    }).length} of {website?.allowed_control_modules?.length || 0}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(website?.allowed_control_modules || [])
                    .filter((m) => {
                      if (moduleCategoryFilter !== 'all' && m.category?.toLowerCase() !== moduleCategoryFilter.toLowerCase()) return false;
                      if (moduleSearch.trim()) {
                        const q = moduleSearch.trim().toLowerCase();
                        return (
                          m.name?.toLowerCase().includes(q) ||
                          m.category?.toLowerCase().includes(q) ||
                          m.description?.toLowerCase().includes(q) ||
                          m.path?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((mod) => (
                      <div
                        key={mod.id || mod.path}
                        className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                              {mod.category || 'Workstation'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active in Plan
                            </span>
                          </div>

                          <h5 className="text-sm font-bold text-slate-900">{mod.name}</h5>

                          <div className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                            {mod.path || '/staff-panel'}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {mod.description || 'Administrative workstation module enabled for institutional staff.'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-500">Workstation Panel</span>
                          <a
                            href={
                              website?.custom_domain && website.custom_domain_verified
                                ? `https://${website.custom_domain}${mod.path || '/staff-panel'}`
                                : (baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1')
                                    ? `/${cleanSub}${mod.path || '/staff-panel'}`
                                    : `http://${cleanSub}.${baseDomain}${mod.path || '/staff-panel'}`)
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-slate-800 hover:text-slate-950 inline-flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span>Open Workstation</span>
                            <span>↗</span>
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'staffs' && (
        <div className="space-y-4">
          {staffActionMsg.text && (
            <div
              className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${staffActionMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
            >
              <span>{staffActionMsg.text}</span>
              <button
                type="button"
                onClick={() => setStaffActionMsg({ type: '', text: '' })}
                className="hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Staff Members & Module Access
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Onboard institutional administrators, assign module permissions (SIS, Attendance, Fees, Exams), and dispatch verification invitations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchStaffs(website?.id)}
                disabled={loadingStaffs}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer disabled:opacity-50"
              >
                {loadingStaffs ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(true)}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer"
              >
                + Add Staff Member
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Staff</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{staffsList.length}</span>
              <span className="text-[10px] text-slate-500">Registered members</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Status</span>
              <span className="text-base font-semibold text-emerald-700 block mt-0.5">
                {staffsList.filter((s) => s.is_active).length}
              </span>
              <span className="text-[10px] text-slate-500">Allowed system login</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Setup Complete</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">
                {staffsList.filter((s) => s.is_registered).length} of {staffsList.length}
              </span>
              <span className="text-[10px] text-slate-500">Verified credentials</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Sessions</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">
                {staffsList.reduce((acc, s) => acc + (s.activeSessions || 0), 0)}
              </span>
              <span className="text-[10px] text-slate-500">Concurrent logged-in devices</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">Institutional Staff Roster</h3>
              <span className="text-xs text-slate-500">{staffsList.length} total staff</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                    <th className="pb-2">Staff Member</th>
                    <th className="pb-2">Pay Grade</th>
                    <th className="pb-2">Account Status</th>
                    <th className="pb-2">Active Sessions</th>
                    <th className="pb-2">Module Access</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                  {staffsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        {loadingStaffs
                          ? 'Loading staff members...'
                          : 'No staff members onboarded yet. Click "+ Add Staff Member" to add one and send a verification email.'}
                      </td>
                    </tr>
                  ) : (
                    staffsList.map((s) => {
                      const allowedPerms = Object.entries(s.permissions || {}).filter(([_, p]) => p.can_view);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5">
                            <div className="font-medium text-slate-900">{s.name}</div>
                            <div className="text-[11px] text-slate-500">{s.email}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{s.phone || s.number}</div>
                          </td>

                          <td className="py-2.5">
                            {s.grade_name ? (
                              <span className="text-xs font-medium text-slate-800">{s.grade_name}</span>
                            ) : (
                              <span className="text-xs text-slate-400">Standard / Unassigned</span>
                            )}
                          </td>

                          <td className="py-2.5">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${s.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                              >
                                {s.is_active ? 'Active' : 'Inactive'}
                              </span>

                              {s.locked_until && new Date(s.locked_until) > new Date() && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">
                                  Account Locked
                                </span>
                              )}

                              <span
                                className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${s.is_registered
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                              >
                                {s.is_registered ? 'Setup Complete' : 'Pending Verification'}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-700">
                                {s.activeSessions || 0} device(s)
                              </span>
                              {s.activeSessions > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeStaffSessions(s.id)}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5">
                            {allowedPerms.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">No modules assigned</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {allowedPerms.slice(0, 4).map(([slug]) => (
                                  <span
                                    key={slug}
                                    className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-mono"
                                  >
                                    {slug}
                                  </span>
                                ))}
                                {allowedPerms.length > 4 && (
                                  <span className="text-[9px] text-slate-500 font-medium self-center">
                                    +{allowedPerms.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {!s.is_registered && (
                                <button
                                  type="button"
                                  disabled={resendingStaffId === s.id}
                                  onClick={() => handleResendVerification(s.id, s.name, s.email)}
                                  className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[11px] cursor-pointer disabled:opacity-50"
                                >
                                  {resendingStaffId === s.id ? 'Sending...' : 'Resend Email'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditPerms(s)}
                                className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[11px] cursor-pointer"
                              >
                                Permissions
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditProfile(s)}
                                className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[11px] cursor-pointer"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStaffActive(s.id)}
                                className={`px-2 py-1 rounded font-medium text-[11px] cursor-pointer border ${s.is_active
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                              >
                                {s.is_active ? 'Deactivate' : 'Activate'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(s.id, s.name)}
                                className="px-2 py-1 rounded text-rose-600 hover:text-rose-800 text-[11px] font-medium cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showAddStaffModal && (
            <div className="bg-white rounded border border-slate-200 p-4 space-y-3 shadow-sm mb-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Add Staff Member</h3>
                  <p className="text-xs text-slate-500">Provide staff credentials and send verification setup email.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={staffForm.number}
                      onChange={(e) => setStaffForm({ ...staffForm, number: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Pay Grade Scale</label>
                    <select
                      value={staffForm.gradeId}
                      onChange={(e) => setStaffForm({ ...staffForm, gradeId: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    >
                      <option value="">Unassigned / Default</option>
                      {payScalesList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} (Basic: ৳{g.basic_salary})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Residential Address</label>
                    <input
                      type="text"
                      value={staffForm.address}
                      onChange={(e) => setStaffForm({ ...staffForm, address: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2 border-t border-slate-100 pt-2">
                    <label className="block text-xs font-medium text-slate-700">Password & Invitation Mode</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="passwordMode"
                          value="invite"
                          checked={staffForm.passwordMode === 'invite'}
                          onChange={() => setStaffForm({ ...staffForm, passwordMode: 'invite' })}
                        />
                        <span>Send verification email invitation (Staff creates password via email link)</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="passwordMode"
                          value="manual"
                          checked={staffForm.passwordMode === 'manual'}
                          onChange={() => setStaffForm({ ...staffForm, passwordMode: 'manual' })}
                        />
                        <span>Set initial password manually (Staff still receives verification email)</span>
                      </label>
                    </div>

                    {staffForm.passwordMode === 'manual' && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Initial Password *</label>
                        <input
                          type="password"
                          required={staffForm.passwordMode === 'manual'}
                          minLength={6}
                          value={staffForm.password}
                          onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                          className="w-full max-w-sm bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-900">
                      Initial Module Access Permissions
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const full = {};
                          modulesList.forEach((m) => {
                            full[m.slug] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                          });
                          setStaffForm({ ...staffForm, permissions: full });
                        }}
                        className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                      >
                        All Access
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => {
                          const viewOnly = {};
                          modulesList.forEach((m) => {
                            viewOnly[m.slug] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
                          });
                          setStaffForm({ ...staffForm, permissions: viewOnly });
                        }}
                        className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                      >
                        View Only
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setStaffForm({ ...staffForm, permissions: {} })}
                        className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {modulesList.map((m) => {
                      const perm = staffForm.permissions[m.slug] || {};
                      return (
                        <div key={m.slug} className="p-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                          <div>
                            <span className="font-medium text-slate-800">{m.name}</span>
                            <span className="text-[10px] text-slate-400 block">{m.category || m.path || 'Workstation'}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(perm.can_view)}
                                onChange={(e) => {
                                  const next = { ...perm, can_view: e.target.checked };
                                  setStaffForm({
                                    ...staffForm,
                                    permissions: { ...staffForm.permissions, [m.slug]: next },
                                  });
                                }}
                              />
                              View
                            </label>
                            <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(perm.can_create)}
                                onChange={(e) => {
                                  const next = { ...perm, can_create: e.target.checked };
                                  if (e.target.checked) next.can_view = true;
                                  setStaffForm({
                                    ...staffForm,
                                    permissions: { ...staffForm.permissions, [m.slug]: next },
                                  });
                                }}
                              />
                              Create
                            </label>
                            <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(perm.can_edit)}
                                onChange={(e) => {
                                  const next = { ...perm, can_edit: e.target.checked };
                                  if (e.target.checked) next.can_view = true;
                                  setStaffForm({
                                    ...staffForm,
                                    permissions: { ...staffForm.permissions, [m.slug]: next },
                                  });
                                }}
                              />
                              Edit
                            </label>
                            <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(perm.can_delete)}
                                onChange={(e) => {
                                  const next = { ...perm, can_delete: e.target.checked };
                                  if (e.target.checked) next.can_view = true;
                                  setStaffForm({
                                    ...staffForm,
                                    permissions: { ...staffForm.permissions, [m.slug]: next },
                                  });
                                }}
                              />
                              Delete
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStaff}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    {submittingStaff ? 'Creating & Sending Verification...' : 'Create Staff & Send Verification Email'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {showEditPermsModal && targetStaff && (
            <div className="bg-white rounded border border-slate-200 p-4 space-y-3 shadow-sm mb-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Module Permissions: {targetStaff.name}
                  </h3>
                  <p className="text-xs text-slate-500">Configure access rights for institutional modules.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditPermsModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSavePermissions} className="space-y-3">
                <div className="flex items-center justify-end gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const all = {};
                      modulesList.forEach((m) => {
                        all[m.slug] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
                      });
                      setEditPermsMap(all);
                    }}
                    className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    View Only All
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const all = {};
                      modulesList.forEach((m) => {
                        all[m.slug] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                      });
                      setEditPermsMap(all);
                    }}
                    className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    Full Access All
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => setEditPermsMap({})}
                    className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {modulesList.map((m) => {
                    const perm = editPermsMap[m.slug] || {};
                    return (
                      <div key={m.slug} className="p-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                        <div>
                          <span className="font-medium text-slate-800">{m.name}</span>
                          <span className="text-[10px] text-slate-400 block">{m.category || m.path || 'Workstation'}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.can_view)}
                              onChange={(e) => {
                                const next = { ...perm, can_view: e.target.checked };
                                setEditPermsMap({ ...editPermsMap, [m.slug]: next });
                              }}
                            />
                            View
                          </label>
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.can_create)}
                              onChange={(e) => {
                                const next = { ...perm, can_create: e.target.checked };
                                if (e.target.checked) next.can_view = true;
                                setEditPermsMap({ ...editPermsMap, [m.slug]: next });
                              }}
                            />
                            Create
                          </label>
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.can_edit)}
                              onChange={(e) => {
                                const next = { ...perm, can_edit: e.target.checked };
                                if (e.target.checked) next.can_view = true;
                                setEditPermsMap({ ...editPermsMap, [m.slug]: next });
                              }}
                            />
                            Edit
                          </label>
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.can_delete)}
                              onChange={(e) => {
                                const next = { ...perm, can_delete: e.target.checked };
                                if (e.target.checked) next.can_view = true;
                                setEditPermsMap({ ...editPermsMap, [m.slug]: next });
                              }}
                            />
                            Delete
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditPermsModal(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPerms}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingPerms ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {showEditProfileModal && targetStaff && (
            <div className="bg-white rounded border border-slate-200 p-4 space-y-3 shadow-sm mb-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Edit Profile: {targetStaff.name}
                  </h3>
                  <p className="text-xs text-slate-500">Update staff contact and employment details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editProfileForm.email}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editProfileForm.number}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, number: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pay Grade Scale</label>
                  <select
                    value={editProfileForm.gradeId}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, gradeId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="">Unassigned</option>
                    {payScalesList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={editProfileForm.address}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'academics' && (
        <div className="space-y-4">
          {academicActionMsg.text && (
            <div
              className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${academicActionMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
            >
              <span>{academicActionMsg.text}</span>
              <button
                type="button"
                onClick={() => setAcademicActionMsg({ type: '', text: '' })}
                className="hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Academic Architecture &amp; Curriculum Setup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured hierarchy: Department (optional) &rarr; Class &rarr; Section, and Class &rarr; Subject.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fetchAcademics()}
                disabled={loadingAcademics}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer disabled:opacity-50"
              >
                {loadingAcademics ? 'Refreshing...' : 'Refresh'}
              </button>

              {academicsSubTab === 'departments' && (
                <button
                  type="button"
                  onClick={() => {
                    setDeptModal({ open: true, editing: null });
                    setDeptForm({
                      name: '',
                      code: '',
                      order_no: academicDepts.length + 1,
                      description: '',
                      is_active: true,
                    });
                  }}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer"
                >
                  + Add Department
                </button>
              )}

              {academicsSubTab === 'classes' && (
                <button
                  type="button"
                  onClick={() => {
                    setClassModal({ open: true, editing: null });
                    setClassForm({
                      name: '',
                      code: '',
                      department_id: '',
                      capacity: 40,
                      display_order: academicClasses.length + 1,
                    });
                  }}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer"
                >
                  + Add Class
                </button>
              )}

              {academicsSubTab === 'sections' && (
                <button
                  type="button"
                  onClick={() => {
                    setSectionModal({ open: true, editing: null });
                    setSectionForm({
                      class_id: academicClasses[0]?.id ? String(academicClasses[0].id) : '',
                      name: '',
                      capacity: 40,
                      room_number: '',
                    });
                  }}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer"
                >
                  + Add Section
                </button>
              )}

              {academicsSubTab === 'subjects' && (
                <button
                  type="button"
                  onClick={() => {
                    setSubjectModal({ open: true, editing: null });
                    setSubjectForm({
                      class_id: academicClasses[0]?.id ? String(academicClasses[0].id) : '',
                      name: '',
                      code: '',
                      type: 'Theory',
                      description: '',
                    });
                  }}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer"
                >
                  + Add Subject
                </button>
              )}
            </div>
          </div>



          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Departments</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{academicDepts.length}</span>
              <span className="text-[10px] text-slate-500">Foundational tracks</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Classes</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{academicClasses.length}</span>
              <span className="text-[10px] text-slate-500">Enrolled levels</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Sections</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{academicSections.length}</span>
              <span className="text-[10px] text-slate-500">Under classes</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Subjects</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{academicSubjects.length}</span>
              <span className="text-[10px] text-slate-500">Under classes</span>
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 pt-2 rounded-t">
            {[
              { id: 'departments', label: `Departments (${academicDepts.length})` },
              { id: 'classes', label: `Classes (${academicClasses.length})` },
              { id: 'sections', label: `Sections (${academicSections.length})` },
              { id: 'subjects', label: `Subjects (${academicSubjects.length})` },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setAcademicsSubTab(sub.id)}
                className={`px-3 py-1.5 font-medium text-xs border-b-2 transition-colors cursor-pointer ${academicsSubTab === sub.id
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-b p-4 shadow-2xs">
            {loadingAcademics ? (
              <div className="py-12 flex justify-center items-center text-xs text-slate-500">
                Loading academic structure...
              </div>
            ) : academicsSubTab === 'departments' ? (
              academicDepts.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-500">No departments configured yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeptModal({ open: true, editing: null });
                      setDeptForm({
                        name: '',
                        code: '',
                        order_no: 1,
                        description: '',
                        is_active: true,
                      });
                    }}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    Add first academic department
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Department Name</th>
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Order</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Classes</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicDepts.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{d.name}</td>
                          <td className="py-2.5 px-3 font-mono text-[10px]">{d.code || '—'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">#{d.order_no}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${d.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                              {d.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{d.class_count || 0}</td>
                          <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{d.description || '—'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setDeptModal({ open: true, editing: d });
                                  setDeptForm({
                                    name: d.name,
                                    code: d.code || '',
                                    order_no: d.order_no ?? 0,
                                    description: d.description || '',
                                    is_active: Boolean(d.is_active),
                                  });
                                }}
                                className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setAcademicDeleteTarget({ type: 'department', id: d.id, name: d.name })}
                                className="px-2 py-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : academicsSubTab === 'classes' ? (
              academicClasses.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-500">No classes configured yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setClassModal({ open: true, editing: null });
                      setClassForm({
                        name: '',
                        code: '',
                        department_id: '',
                        capacity: 40,
                        display_order: 1,
                      });
                    }}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    Add first academic class
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Class Name</th>
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Department (Optional)</th>
                        <th className="py-2.5 px-3">Capacity</th>
                        <th className="py-2.5 px-3">Sections</th>
                        <th className="py-2.5 px-3">Order</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicClasses.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{c.name}</td>
                          <td className="py-2.5 px-3 font-mono text-[10px]">{c.code || '—'}</td>
                          <td className="py-2.5 px-3">
                            {c.department_name ? (
                              <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[10px]">
                                {c.department_name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Independent / General</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{c.capacity} seats</td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{c.section_count || 0}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">#{c.display_order}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setClassModal({ open: true, editing: c });
                                  setClassForm({
                                    name: c.name,
                                    code: c.code || '',
                                    department_id: c.department_id ? String(c.department_id) : '',
                                    capacity: c.capacity ?? 40,
                                    display_order: c.display_order ?? 0,
                                  });
                                }}
                                className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setAcademicDeleteTarget({ type: 'class', id: c.id, name: c.name })}
                                className="px-2 py-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : academicsSubTab === 'sections' ? (
              academicSections.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-500">No sections configured yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSectionModal({ open: true, editing: null });
                      setSectionForm({
                        class_id: academicClasses[0]?.id ? String(academicClasses[0].id) : '',
                        name: '',
                        capacity: 40,
                        room_number: '',
                      });
                    }}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    Add first class section
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Section Name</th>
                        <th className="py-2.5 px-3">Parent Class</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Capacity</th>
                        <th className="py-2.5 px-3">Room / Venue</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicSections.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{s.name}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{s.class_name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.department_name || 'General'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{s.capacity} seats</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.room_number || '—'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSectionModal({ open: true, editing: s });
                                  setSectionForm({
                                    class_id: String(s.class_id),
                                    name: s.name,
                                    capacity: s.capacity ?? 40,
                                    room_number: s.room_number || '',
                                  });
                                }}
                                className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setAcademicDeleteTarget({ type: 'section', id: s.id, name: s.name })}
                                className="px-2 py-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              academicSubjects.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-500">No subjects configured yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubjectModal({ open: true, editing: null });
                      setSubjectForm({
                        class_id: academicClasses[0]?.id ? String(academicClasses[0].id) : '',
                        name: '',
                        code: '',
                        type: 'Theory',
                        description: '',
                      });
                    }}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    Add first subject
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Subject Name</th>
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Parent Class (Class &gt; Subject)</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicSubjects.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{sub.name}</td>
                          <td className="py-2.5 px-3 font-mono text-[10px]">{sub.code || '—'}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {sub.class_name ? sub.class_name : <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${sub.type === 'Practical' ? 'bg-emerald-50 text-emerald-700' : sub.type === 'Both' ? 'bg-purple-50 text-purple-700' : sub.type === 'Optional' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                              {sub.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{sub.description || '—'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSubjectModal({ open: true, editing: sub });
                                  setSubjectForm({
                                    class_id: sub.class_id ? String(sub.class_id) : '',
                                    name: sub.name,
                                    code: sub.code || '',
                                    type: sub.type || 'Theory',
                                    description: sub.description || '',
                                  });
                                }}
                                className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setAcademicDeleteTarget({ type: 'subject', id: sub.id, name: sub.name })}
                                className="px-2 py-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {deptModal.open && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    {deptModal.editing ? 'Edit Department' : 'Create Department'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDeptModal({ open: false, editing: null })}
                    className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveDept} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      aria-label="Department Name"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      required
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Department Code
                      </label>
                      <input
                        type="text"
                        aria-label="Department Code"
                        value={deptForm.code}
                        onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Order Sequence
                      </label>
                      <input
                        type="number"
                        aria-label="Order Sequence"
                        value={deptForm.order_no}
                        onChange={(e) => setDeptForm({ ...deptForm, order_no: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      aria-label="Department Description"
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                      className="w-full text-xs p-2 rounded border border-slate-300 text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deptIsActive"
                      checked={deptForm.is_active}
                      onChange={(e) => setDeptForm({ ...deptForm, is_active: e.target.checked })}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="deptIsActive" className="text-xs text-slate-700 cursor-pointer">
                      Operational / Active Department
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setDeptModal({ open: false, editing: null })}
                      className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAcademic}
                      className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50"
                    >
                      {submittingAcademic ? 'Saving...' : deptModal.editing ? 'Update Department' : 'Create Department'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {classModal.open && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    {classModal.editing ? 'Edit Class' : 'Create Class'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setClassModal({ open: false, editing: null })}
                    className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveClass} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Class / Grade Title *
                    </label>
                    <input
                      type="text"
                      aria-label="Class Name"
                      value={classForm.name}
                      onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                      required
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Department Track (Optional)
                    </label>
                    <select
                      aria-label="Department Track"
                      value={classForm.department_id}
                      onChange={(e) => setClassForm({ ...classForm, department_id: e.target.value })}
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">None / General (Independent Class)</option>
                      {academicDepts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.code ? `(${d.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Class Code
                      </label>
                      <input
                        type="text"
                        aria-label="Class Code"
                        value={classForm.code}
                        onChange={(e) => setClassForm({ ...classForm, code: e.target.value.toUpperCase() })}
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Display Order
                      </label>
                      <input
                        type="number"
                        aria-label="Display Order"
                        value={classForm.display_order}
                        onChange={(e) => setClassForm({ ...classForm, display_order: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Max Student Capacity
                    </label>
                    <input
                      type="number"
                      aria-label="Max Student Capacity"
                      value={classForm.capacity}
                      onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })}
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setClassModal({ open: false, editing: null })}
                      className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAcademic}
                      className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50"
                    >
                      {submittingAcademic ? 'Saving...' : classModal.editing ? 'Update Class' : 'Create Class'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {sectionModal.open && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    {sectionModal.editing ? 'Edit Section' : 'Create Section'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSectionModal({ open: false, editing: null })}
                    className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveSection} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Parent Class *
                    </label>
                    <select
                      aria-label="Parent Class"
                      value={sectionForm.class_id}
                      onChange={(e) => setSectionForm({ ...sectionForm, class_id: e.target.value })}
                      required
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">Select Parent Class</option>
                      {academicClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.department_name ? `(${c.department_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Section / Batch Name *
                    </label>
                    <input
                      type="text"
                      aria-label="Section Name"
                      value={sectionForm.name}
                      onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                      required
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Max Capacity
                      </label>
                      <input
                        type="number"
                        aria-label="Max Capacity"
                        value={sectionForm.capacity}
                        onChange={(e) => setSectionForm({ ...sectionForm, capacity: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Room / Venue
                      </label>
                      <input
                        type="text"
                        aria-label="Room Number"
                        value={sectionForm.room_number}
                        onChange={(e) => setSectionForm({ ...sectionForm, room_number: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSectionModal({ open: false, editing: null })}
                      className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAcademic}
                      className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50"
                    >
                      {submittingAcademic ? 'Saving...' : sectionModal.editing ? 'Update Section' : 'Create Section'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {subjectModal.open && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    {subjectModal.editing ? 'Edit Subject' : 'Create Subject'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSubjectModal({ open: false, editing: null })}
                    className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveSubject} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Parent Class * (Class &gt; Subject)
                    </label>
                    <select
                      aria-label="Parent Class"
                      value={subjectForm.class_id}
                      onChange={(e) => setSubjectForm({ ...subjectForm, class_id: e.target.value })}
                      required
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">Select Parent Class</option>
                      {academicClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.department_name ? `(${c.department_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      aria-label="Subject Name"
                      value={subjectForm.name}
                      onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                      required
                      className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Subject Code
                      </label>
                      <input
                        type="text"
                        aria-label="Subject Code"
                        value={subjectForm.code}
                        onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Course Type
                      </label>
                      <select
                        aria-label="Course Type"
                        value={subjectForm.type}
                        onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden cursor-pointer"
                      >
                        <option value="Theory">Theory</option>
                        <option value="Practical">Practical</option>
                        <option value="Both">Both (Theory &amp; Lab)</option>
                        <option value="Optional">Optional</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Description / Overview
                    </label>
                    <textarea
                      rows={2}
                      aria-label="Subject Description"
                      value={subjectForm.description}
                      onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                      className="w-full text-xs p-2 rounded border border-slate-300 text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSubjectModal({ open: false, editing: null })}
                      className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAcademic}
                      className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50"
                    >
                      {submittingAcademic ? 'Saving...' : subjectModal.editing ? 'Update Subject' : 'Create Subject'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {academicDeleteTarget && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-sm w-full p-4 shadow-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Delete {academicDeleteTarget.type.toUpperCase()}?
                </h4>
                <p className="text-xs text-slate-600">
                  Are you sure you want to remove &quot;{academicDeleteTarget.name}&quot;? Dependent records will be unassigned.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAcademicDeleteTarget(null)}
                    className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteAcademic}
                    disabled={deletingAcademic}
                    className="px-3.5 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
                  >
                    {deletingAcademic ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'general' && (
        <div className="space-y-4">
          {brandingMsg.text && (
            <div
              className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${brandingMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
            >
              <span>{brandingMsg.text}</span>
              <button
                type="button"
                onClick={() => setBrandingMsg({ type: '', text: '' })}
                className="hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">Brand Identity Assets (Logo & Favicon)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload and manage your institution&apos;s official logo and favicon using Cloudinary. When replacing or updating an asset, the previous version is deleted automatically from Cloudinary storage.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded p-3 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Official Institution Logo</span>
                  {logoId && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Cloudinary ID: {logoId}
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                    {logoPreview || logo ? (
                      <img
                        src={logoPreview || logo}
                        alt="Institution Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center">No Logo Set</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoFileChange}
                      className="hidden"
                      id="logo-file-input"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer"
                      >
                        {logo ? 'Change Logo Image' : 'Select Logo Image'}
                      </button>

                      {logoPreview && (
                        <button
                          type="button"
                          onClick={handleUploadLogoToCloudinary}
                          disabled={uploadingLogo}
                          className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                        >
                          {uploadingLogo ? 'Uploading to Cloudinary...' : 'Upload Now'}
                        </button>
                      )}

                      {logo && !logoPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          disabled={uploadingLogo}
                          className="px-2.5 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium text-xs cursor-pointer disabled:opacity-50"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>

                    {logoFile && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400">
                      Recommended: Transparent PNG, WEBP, or SVG. Minimum 200x200 px. Files upload directly to Cloudinary.
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-3 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Website Favicon</span>
                  {faviconId && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Cloudinary ID: {faviconId}
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    {faviconPreview || favicon ? (
                      <img
                        src={faviconPreview || favicon}
                        alt="Favicon"
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center">No Favicon</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/x-icon,image/png,image/svg+xml,image/jpeg"
                      onChange={handleFaviconFileChange}
                      className="hidden"
                      id="favicon-file-input"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer"
                      >
                        {favicon ? 'Change Favicon' : 'Select Favicon'}
                      </button>

                      {faviconPreview && (
                        <button
                          type="button"
                          onClick={handleUploadFaviconToCloudinary}
                          disabled={uploadingFavicon}
                          className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                        >
                          {uploadingFavicon ? 'Uploading to Cloudinary...' : 'Upload Now'}
                        </button>
                      )}

                      {favicon && !faviconPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveFavicon}
                          disabled={uploadingFavicon}
                          className="px-2.5 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium text-xs cursor-pointer disabled:opacity-50"
                        >
                          Remove Favicon
                        </button>
                      )}
                    </div>

                    {faviconFile && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        Selected: {faviconFile.name} ({(faviconFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400">
                      Standard square icon: .ico, .png, or .svg (32x32 px). Files upload directly to Cloudinary.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">Institutional Identity & Contact Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">Core registry details presented on public directories, transcripts, and invoices.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Institution Legal Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Institution Category Type</label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">EIIN / Government Registration Number</label>
                <input
                  type="text"
                  value={eeinNumber}
                  onChange={(e) => setEeinNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Campus Operating Currency *</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">Applied to student fees, invoices, salary scales, and payments.</p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Motto / Tagline Statement</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Official Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Official Contact Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Physical Campus Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Google Maps Embed URL</label>
                <input
                  type="url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">Statements & Institutional Narrative</h2>
              <p className="text-xs text-slate-500 mt-0.5">Foundational statements rendered on the public About page.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mission Statement</label>
                <textarea
                  rows={2}
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vision Statement</label>
                <textarea
                  rows={2}
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Institutional History</label>
                <textarea
                  rows={3}
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">Official Social Media Links</h2>
              <p className="text-xs text-slate-500 mt-0.5">External social media channel links displayed in tenant header & footer.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Facebook URL</label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Twitter / X URL</label>
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">YouTube URL</label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Institutional Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">Visual Styling & Accent Colors</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure institutional primary and secondary palette tokens.</p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Primary Brand Accent</label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPrimaryColor(c.hex)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs font-medium cursor-pointer ${primaryColor.toLowerCase() === c.hex.toLowerCase()
                      ? 'border-slate-900 bg-slate-100 text-slate-900 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                  >
                    <span className="w-3 h-3 rounded-xs border border-black/10 inline-block" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                  </button>
                ))}

                <div className="flex items-center gap-2 pl-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs text-slate-600">{primaryColor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Secondary Brand Accent</label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={`sec-${c.hex}`}
                    type="button"
                    onClick={() => setSecondaryColor(c.hex)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs font-medium cursor-pointer ${secondaryColor.toLowerCase() === c.hex.toLowerCase()
                      ? 'border-slate-900 bg-slate-100 text-slate-900 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                  >
                    <span className="w-3 h-3 rounded-xs border border-black/10 inline-block" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                  </button>
                ))}

                <div className="flex items-center gap-2 pl-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs text-slate-600">{secondaryColor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Theme Layout Mode</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              >
                <option value="default">Default Academic Clean</option>
                <option value="modern">Modern Campus Grid</option>
                <option value="slate">Deep Slate Prestige</option>
                <option value="classic">Classic University Blue</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Appearance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'portals' && (
        <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">Direct Tenant Portal Endpoints</h2>
            <p className="text-xs text-slate-500 mt-0.5">Quick access links to all student, faculty, and administrative portals.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                title: 'Public Portal Front',
                desc: 'Main public homepage with circulars, events, and campus news.',
                subPath: '/',
              },
              {
                title: 'Student Academic Portal',
                desc: 'Timetable, grade sheets, attendance tracking, and dues.',
                subPath: '/student',
              },
              {
                title: 'Faculty / Teacher Portal',
                desc: 'Teacher routine, attendance marking, and grade submission.',
                subPath: '/teacher',
              },
              {
                title: 'Staff Management Panel',
                desc: 'Operational portal for admissions, records, and module operations.',
                subPath: '/staff-panel',
              },
              {
                title: 'Public Notice Bulletin',
                desc: 'Campus circulars, official decrees, and exam notices.',
                subPath: '/notices',
              },
              {
                title: 'Online Student Admission',
                desc: 'Public admission registration portal and form submissions.',
                subPath: '/apply',
              },
            ].map((p) => {
              const fullPortUrl = `${localPreviewPath}${p.subPath === '/' ? '' : p.subPath}`;
              return (
                <div key={p.title} className="p-3 border border-slate-200 rounded hover:border-slate-300 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 text-xs">{p.title}</div>
                    <p className="text-[11px] text-slate-500">{p.desc}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400">{p.subPath}</span>
                    <a
                      href={fullPortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-900 hover:underline font-medium text-xs"
                    >
                      Open Portal &rarr;
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'danger' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">Maintenance Mode & Public Notice</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                When maintenance mode is active, public visitors will see a branded maintenance screen. Staff and administrative panels remain fully accessible.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded border bg-slate-50 border-slate-200">
              <div>
                <span className="font-semibold text-slate-800 block text-xs">
                  {isMaintenanceMode ? 'Campus Website Under Maintenance' : 'Campus Website is Live & Operational'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isMaintenanceMode
                    ? 'Public home routes redirect to the maintenance notice.'
                    : 'All public circulars, admissions, and portals are live.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleMaintenanceMode(!isMaintenanceMode)}
                disabled={saving}
                className={`px-3 py-1.5 rounded font-medium text-xs cursor-pointer border transition-colors disabled:opacity-50 ${isMaintenanceMode
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                  }`}
              >
                {isMaintenanceMode ? 'Switch to Live Mode' : 'Enable Maintenance Mode'}
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Public Maintenance Notice Message
              </label>
              <textarea
                rows={3}
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Maintenance Notice'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-rose-200 rounded p-4 space-y-3">
            <div className="border-b border-rose-100 pb-2">
              <h2 className="text-sm font-semibold text-rose-900">Permanently Delete Website</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanently delete this institution website, student records, notices, modules, and domain bindings. This action is irreversible.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Delete website {website.name} ({cleanSub})</span>
              <button
                type="button"
                onClick={() => {
                  setDeleteWebsiteError('');
                  setShowDeleteWebsiteModal(true);
                }}
                disabled={deleting}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
              >
                Delete Website Permanently
              </button>
            </div>
          </div>

          {showDeleteWebsiteModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Permanently Delete Website
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Are you sure you want to permanently delete <strong className="text-slate-900">{website.name}</strong>? All student data, notices, academic records, and institutional files will be permanently erased. This cannot be undone.
                    </p>
                  </div>
                </div>

                {deleteWebsiteError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {deleteWebsiteError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setShowDeleteWebsiteModal(false);
                      setDeleteWebsiteError('');
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleConfirmDeleteWebsite}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {deleting ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>Purging Data...</span>
                      </>
                    ) : (
                      <span>Delete Permanently</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
