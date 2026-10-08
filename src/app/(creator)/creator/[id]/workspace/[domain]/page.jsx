'use client';
/* eslint-disable react-hooks/set-state-in-effect */

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

export default function WebsiteManagePage() {
  const router = useRouter();
  const routeParams = useParams();
  const { creatorId: contextCreatorId, refetch: refetchCreator } = useCreator();

  const creatorId = routeParams?.id || contextCreatorId;
  const domainParam = routeParams?.domain;

  // Active Tab: 'domains' | 'staffs' | 'general' | 'branding' | 'portals' | 'danger'
  const [activeTab, setActiveTab] = useState('domains');

  const [baseDomain, setBaseDomain] = useState(
    typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:3000'
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [website, setWebsite] = useState(null);

  // Form Fields
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
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [secondaryColor, setSecondaryColor] = useState('#0ea5e9');
  const [theme, setTheme] = useState('default');
  const [logo, setLogo] = useState('');
  const [logoId, setLogoId] = useState('');
  const [favicon, setFavicon] = useState('');
  const [faviconId, setFaviconId] = useState('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Brand Asset Upload states
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState('');
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const [brandingMsg, setBrandingMsg] = useState({ type: '', text: '' });
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  // Subdomain Management
  const [subdomain, setSubdomain] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState({ state: 'idle', message: '' });

  // Custom Domain Management
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [customDomainStatus, setCustomDomainStatus] = useState({ state: 'idle', message: '' });
  const [verifyingDns, setVerifyingDns] = useState(false);

  // Save / Action states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Staffs & Permissions Management
  const [staffsList, setStaffsList] = useState([]);
  const [modulesList, setModulesList] = useState([]);
  const [payScalesList, setPayScalesList] = useState([]);
  const [loadingStaffs, setLoadingStaffs] = useState(false);
  const [staffActionMsg, setStaffActionMsg] = useState({ type: '', text: '' });
  const [resendingStaffId, setResendingStaffId] = useState(null);

  // Staff Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditPermsModal, setShowEditPermsModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [targetStaff, setTargetStaff] = useState(null);

  // Staff Forms
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    number: '',
    address: '',
    password: '',
    passwordMode: 'invite', // 'invite' | 'manual'
    gradeId: '',
    bio: '',
    sendInvite: true,
    permissions: {},
  });
  const [submittingStaff, setSubmittingStaff] = useState(false);

  // Edit Permissions Form
  const [editPermsMap, setEditPermsMap] = useState({});
  const [savingPerms, setSavingPerms] = useState(false);

  // Edit Profile Form
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    email: '',
    number: '',
    address: '',
    gradeId: '',
    bio: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch Staffs
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
      // Non-fatal
    } finally {
      setLoadingStaffs(false);
    }
  }, [creatorId]);

  // Fetch Website Data
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
        setPrimaryColor(w.primary_color || '#1e40af');
        setSecondaryColor(w.secondary_color || '#0ea5e9');
        setTheme(w.theme || 'default');
        setLogo(w.logo || '');
        setLogoId(w.logo_id || '');
        setFavicon(w.favicon || '');
        setFaviconId(w.favicon_id || '');
        setIsMaintenanceMode(Boolean(w.is_maintenance_mode));

        // Subdomain
        let cleanSub = w.subdomain || w.slug || '';
        if (cleanSub.includes('.')) {
          cleanSub = cleanSub.split('.')[0];
        }
        setSubdomain(cleanSub);

        // Custom Domain
        setCustomDomainInput(w.custom_domain || '');

        // Fetch staff members
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
    fetchWebsite();
  }, [fetchWebsite]);

  // Real-time Subdomain Availability Checker
  useEffect(() => {
    if (!website) return;
    const clean = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    const originalSub = (website.subdomain || website.slug || '').split('.')[0].toLowerCase();

    if (!clean || clean === originalSub) {
      setSubdomainStatus({ state: 'idle', message: 'Current active subdomain' });
      return;
    }

    if (clean.length < 3) {
      setSubdomainStatus({ state: 'invalid', message: 'Subdomain must be at least 3 characters.' });
      return;
    }

    setSubdomainStatus({ state: 'checking', message: 'Checking availability...' });

    const timer = setTimeout(async () => {
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

  // Real-time Custom Domain Availability Checker
  useEffect(() => {
    if (!website) return;
    const clean = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const originalCustom = (website.custom_domain || '').toLowerCase();

    if (!clean || clean === originalCustom) {
      setCustomDomainStatus({ state: 'idle', message: '' });
      return;
    }

    if (!clean.includes('.') || clean.length < 4) {
      setCustomDomainStatus({ state: 'invalid', message: 'Enter a valid domain name (e.g. school.edu or academy.org)' });
      return;
    }

    setCustomDomainStatus({ state: 'checking', message: 'Checking availability...' });

    const timer = setTimeout(async () => {
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

  // ---------------------------------------------------------------------------
  // BRAND ASSETS (LOGO & FAVICON) WITH CLOUDINARY
  // ---------------------------------------------------------------------------

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
    if (!confirm('Remove this official logo? The file will be permanently deleted from Cloudinary.')) return;
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
    if (!confirm('Remove this favicon? The file will be permanently deleted from Cloudinary.')) return;
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
    } catch (err) {
      setBrandingMsg({ type: 'error', text: err.message });
    } finally {
      setUploadingFavicon(false);
    }
  };

  // ---------------------------------------------------------------------------
  // MAIN SAVE HANDLER
  // ---------------------------------------------------------------------------

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
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        theme: theme,
        logo: logoPreview || logo.trim(),
        logo_id: logoId,
        favicon: faviconPreview || favicon.trim(),
        favicon_id: faviconId,
        is_maintenance_mode: isMaintenanceMode,
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

  // ---------------------------------------------------------------------------
  // CUSTOM DOMAIN ACTIONS
  // ---------------------------------------------------------------------------

  const handleConnectCustomDomain = async (e) => {
    e.preventDefault();
    const clean = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean || !clean.includes('.')) {
      alert('Please enter a valid custom domain (e.g. school.edu or myacademy.org).');
      return;
    }
    setSaving(true);
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
        setSaveSuccess(`Custom domain "${clean}" saved! Follow DNS setup instructions.`);
        setWebsite((prev) => ({ ...prev, custom_domain: clean, custom_domain_verified: false }));
        if (refetchCreator) refetchCreator();
        setTimeout(() => setSaveSuccess(''), 4000);
      } else {
        alert(data.error || 'Failed to connect custom domain.');
      }
    } catch {
      alert('Network error connecting custom domain.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDns = async () => {
    if (!website?.custom_domain) return;
    setVerifyingDns(true);
    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_dns',
          id: website.id,
          creatorId: Number(creatorId),
        }),
      });
      const data = await res.json();
      if (data.verified) {
        setSaveSuccess('DNS Verified! Your custom domain is now live.');
        setWebsite((prev) => ({ ...prev, custom_domain_verified: true }));
        if (refetchCreator) refetchCreator();
        setTimeout(() => setSaveSuccess(''), 4000);
      } else {
        alert(`DNS Verification Notice: ${data.message || 'CNAME record was not detected yet. DNS changes can take up to 24 hours to propagate.'}`);
      }
    } catch {
      alert('Network error verifying DNS.');
    } finally {
      setVerifyingDns(false);
    }
  };

  const handleDisconnectCustomDomain = async () => {
    if (!confirm('Disconnect your custom domain? Traffic will revert to the default platform subdomain.')) return;
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
        setSaveSuccess('Custom domain disconnected successfully.');
        setWebsite((prev) => ({ ...prev, custom_domain: null, custom_domain_verified: false }));
        setCustomDomainInput('');
        if (refetchCreator) refetchCreator();
        setTimeout(() => setSaveSuccess(''), 3000);
      }
    } catch {
      setSaveError('Failed to disconnect custom domain.');
    }
  };

  // ---------------------------------------------------------------------------
  // STAFF ACTIONS
  // ---------------------------------------------------------------------------

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
    if (!confirm(`Are you sure you want to remove staff member "${staffName}"? This action cannot be undone.`)) return;
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
      number: staff.number || '',
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

  // Delete Website
  const handleDeleteWebsite = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${website.name}"? All student data, notices, and records will be deleted. This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
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
        alert(data.error || 'Failed to delete website');
      }
    } catch {
      alert('Network error deleting website');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen={false} label="Loading website configuration..." />;
  }

  if (loadError || !website) {
    return (
      <div className="w-full py-12 text-center max-w-md mx-auto space-y-3">
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
  const liveUrl = website.custom_domain && website.custom_domain_verified
    ? `https://${website.custom_domain}`
    : `https://${cleanSub}.${baseDomain}`;
  const localPreviewPath = `/${cleanSub}`;

  return (
    <div className="w-full space-y-4 text-slate-800 text-xs pb-16">
      {/* Top Header & Global Actions Bar */}
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
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                !isMaintenanceMode
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

      {/* Global Notifications */}
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

      {/* Navigation Tabs (Zero Icons, Strict Style Guide) */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'domains', label: 'Domains & DNS' },
          { id: 'staffs', label: `Staff Members (${staffsList.length})` },
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
            }}
            className={`px-3.5 py-2 font-medium text-xs border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-slate-900 text-slate-900 bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: DOMAINS & CUSTOM DOMAIN                                        */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'domains' && (
        <div className="space-y-4">
          {/* Subdomain Card */}
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
                  href={`https://${cleanSub}.${baseDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-slate-900 hover:underline font-medium"
                >
                  https://{cleanSub}.{baseDomain}
                </a>
              </div>
            </div>
          </div>

          {/* Custom Domain Card */}
          <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Custom Domain Configuration</h2>
                <p className="text-xs text-slate-500">
                  Connect your institution&apos;s apex or branded domain (e.g. <code>yourschool.edu</code> or <code>campus.org</code>).
                </p>
              </div>

              {website.custom_domain && (
                <span
                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                    website.custom_domain_verified
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {website.custom_domain_verified ? 'DNS Verified & Connected' : 'DNS Propagation Pending'}
                </span>
              )}
            </div>

            <form onSubmit={handleConnectCustomDomain} className="space-y-3 max-w-lg">
              <label className="block text-xs font-medium text-slate-700">Custom Domain Host</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. portal.oxford.edu"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                >
                  Connect
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
                </div>
              )}
            </form>

            {website.custom_domain && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                  <div className="text-xs font-medium text-slate-800">Required DNS Records:</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200 text-[10px] uppercase font-semibold">
                          <th className="pb-1.5">Type</th>
                          <th className="pb-1.5">Name / Host</th>
                          <th className="pb-1.5">Target Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        <tr>
                          <td className="py-1.5 font-semibold">CNAME</td>
                          <td className="py-1.5">{website.custom_domain}</td>
                          <td className="py-1.5 text-slate-900">{baseDomain}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyDns}
                    disabled={verifyingDns}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    {verifyingDns ? 'Checking DNS...' : 'Verify DNS Records'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectCustomDomain}
                    className="px-3 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium text-xs cursor-pointer"
                  >
                    Disconnect Domain
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: STAFF MEMBERS & PERMISSIONS                                    */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'staffs' && (
        <div className="space-y-4">
          {/* Action notification banner */}
          {staffActionMsg.text && (
            <div
              className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${
                staffActionMsg.type === 'error'
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

          {/* Section Header */}
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

          {/* KPI Stats Row */}
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

          {/* Staff Roster Table */}
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
                            <div className="text-[11px] text-slate-400 font-mono">{s.number}</div>
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
                                className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                                  s.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {s.is_active ? 'Active' : 'Inactive'}
                              </span>

                              <span
                                className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                                  s.is_registered
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
                                className={`px-2 py-1 rounded font-medium text-[11px] cursor-pointer border ${
                                  s.is_active
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

          {/* ADD STAFF MODAL */}
          {showAddStaffModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="bg-white rounded border border-slate-200 max-w-2xl w-full p-4 max-h-[90vh] overflow-y-auto space-y-3 shadow-md">
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
                        placeholder="e.g. John Doe"
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
                        placeholder="staff@institution.edu"
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
                        placeholder="+880 1700 000000"
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
                        placeholder="Campus quarter or residential address"
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
                            placeholder="At least 6 characters"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Module Permissions Matrix */}
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
                              <span className="text-[10px] text-slate-400 font-mono block">slug: {m.slug}</span>
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
            </div>
          )}

          {/* EDIT PERMISSIONS MODAL */}
          {showEditPermsModal && targetStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="bg-white rounded border border-slate-200 max-w-xl w-full p-4 max-h-[90vh] overflow-y-auto space-y-3 shadow-md">
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
                            <span className="text-[10px] text-slate-400 font-mono block">slug: {m.slug}</span>
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
            </div>
          )}

          {/* EDIT PROFILE MODAL */}
          {showEditProfileModal && targetStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="bg-white rounded border border-slate-200 max-w-md w-full p-4 space-y-3 shadow-md">
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
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: INSTITUTIONAL PROFILE (WITH CLOUDINARY LOGO & FAVICON)        */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          {/* Notification for logo/favicon action */}
          {brandingMsg.text && (
            <div
              className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${
                brandingMsg.type === 'error'
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

          {/* CARD 1: BRAND ASSETS (LOGO & FAVICON VIA CLOUDINARY) */}
          <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">Brand Identity Assets (Logo & Favicon)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload and manage your institution&apos;s official logo and favicon using Cloudinary. When replacing or updating an asset, the previous version is deleted automatically from Cloudinary storage.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LOGO MANAGER */}
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
                  {/* Current / Preview Box */}
                  <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                    {logoPreview || logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
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
                      Recommended: Transparent PNG or SVG. Minimum 200x200 px.
                    </div>
                  </div>
                </div>

                {/* Direct Logo URL field */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Or Enter Hosted Logo URL
                  </label>
                  <input
                    type="text"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://res.cloudinary.com/.../logo.png"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* FAVICON MANAGER */}
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
                  {/* Current / Preview Box */}
                  <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    {faviconPreview || favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
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
                      Standard square icon: .ico, .png, or .svg (32x32 px).
                    </div>
                  </div>
                </div>

                {/* Direct Favicon URL field */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Or Enter Hosted Favicon URL
                  </label>
                  <input
                    type="text"
                    value={favicon}
                    onChange={(e) => setFavicon(e.target.value)}
                    placeholder="https://res.cloudinary.com/.../favicon.ico"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: INSTITUTION GENERAL INFORMATION */}
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
                  placeholder="e.g. 108342"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Motto / Tagline Statement</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Inspiring Excellence, Cultivating Leadership"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Official Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="info@institution.edu"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Official Contact Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+880 2 9876543"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Physical Campus Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Road, Sector, City, Country"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Google Maps Embed URL</label>
                <input
                  type="url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* CARD 3: MISSION, VISION & HISTORY */}
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
                  placeholder="Educational mission and pedagogical goals..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vision Statement</label>
                <textarea
                  rows={2}
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="Long-term institution vision..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Institutional History</label>
                <textarea
                  rows={3}
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  placeholder="Founding background, founding year, milestones..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* CARD 4: SOCIAL MEDIA CHANNELS */}
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
                  placeholder="https://facebook.com/yourschool"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Twitter / X URL</label>
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://twitter.com/yourschool"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourschool"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">YouTube URL</label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@yourschool"
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

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: APPEARANCE & THEMES                                            */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'branding' && (
        <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">Visual Styling & Accent Colors</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure institutional primary and secondary palette tokens.</p>
          </div>

          <div className="space-y-4 max-w-xl">
            {/* Primary Color */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Primary Brand Accent</label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPrimaryColor(c.hex)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs font-medium cursor-pointer ${
                      primaryColor.toLowerCase() === c.hex.toLowerCase()
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

            {/* Secondary Color */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Secondary Brand Accent</label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={`sec-${c.hex}`}
                    type="button"
                    onClick={() => setSecondaryColor(c.hex)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs font-medium cursor-pointer ${
                      secondaryColor.toLowerCase() === c.hex.toLowerCase()
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

            {/* Theme Selector */}
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

      {/* --------------------------------------------------------------------- */}
      {/* TAB 5: DIRECT PORTALS                                                 */}
      {/* --------------------------------------------------------------------- */}
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

      {/* --------------------------------------------------------------------- */}
      {/* TAB 6: DANGER ZONE                                                    */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'danger' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">Maintenance Mode</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                When maintenance mode is active, public visitors will see a temporary maintenance notice.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-800 block text-xs">Enable Maintenance Mode</span>
                <span className="text-[11px] text-slate-500">
                  Status: {isMaintenanceMode ? 'Website is currently in Maintenance' : 'Website is Live & Operational'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMaintenanceMode(!isMaintenanceMode);
                  handleSave();
                }}
                className={`px-3 py-1.5 rounded font-medium text-xs cursor-pointer border ${
                  isMaintenanceMode
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                {isMaintenanceMode ? 'Switch to Live' : 'Enable Maintenance'}
              </button>
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
                onClick={handleDeleteWebsite}
                disabled={deleting}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Website Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
