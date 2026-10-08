'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
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

  const [activeTab, setActiveTab] = useState('domains'); // 'domains' | 'general' | 'branding' | 'portals' | 'danger'

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
  const [favicon, setFavicon] = useState('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Subdomain Management
  const [subdomain, setSubdomain] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState({ state: 'idle', message: '' });

  // Custom Domain Management (WordPress / Webflow style)
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [customDomainStatus, setCustomDomainStatus] = useState({ state: 'idle', message: '' });
  const [verifyingDns, setVerifyingDns] = useState(false);

  // Save / Update states
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

  // Handle Add Staff
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
        creatorId,
        name: staffForm.name,
        email: staffForm.email,
        number: staffForm.number,
        address: staffForm.address,
        gradeId: staffForm.gradeId,
        bio: staffForm.bio,
        permissions: staffForm.permissions,
        sendInvite: staffForm.passwordMode === 'invite',
        password: staffForm.passwordMode === 'manual' ? staffForm.password : undefined,
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
        text: `Staff member "${staffForm.name}" created successfully.${data.inviteSent ? ' Setup email invitation sent.' : ''}`,
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

  // Handle Toggle Active
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
          creatorId,
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

  // Handle Revoke Sessions
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
          creatorId,
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

  // Handle Open Edit Perms
  const handleOpenEditPerms = (staff) => {
    setTargetStaff(staff);
    const existing = {};
    if (staff.permissions) {
      for (const [slug, p] of Object.entries(staff.permissions)) {
        existing[slug] = {
          can_view: Boolean(p.can_view),
          can_create: Boolean(p.can_create),
          can_edit: Boolean(p.can_edit),
          can_delete: Boolean(p.can_delete),
        };
      }
    }
    setEditPermsMap(existing);
    setShowEditPermsModal(true);
  };

  // Handle Save Permissions
  const handleSavePermissions = async (e) => {
    e.preventDefault();
    if (!targetStaff || !website?.id) return;
    try {
      setSavingPerms(true);
      setStaffActionMsg({ type: '', text: '' });
      const res = await fetch('/api/marketing/creator/websites/staffs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_permissions',
          staffId: targetStaff.id,
          websiteId: website.id,
          creatorId,
          permissions: editPermsMap,
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

  // Handle Open Edit Profile
  const handleOpenEditProfile = (staff) => {
    setTargetStaff(staff);
    setEditProfileForm({
      name: staff.name || '',
      email: staff.email || '',
      number: staff.number || '',
      address: staff.address || '',
      gradeId: staff.grade_id ? String(staff.grade_id) : '',
      bio: staff.bio || '',
    });
    setShowEditProfileModal(true);
  };

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!targetStaff || !website?.id) return;
    try {
      setSavingProfile(true);
      setStaffActionMsg({ type: '', text: '' });
      const res = await fetch('/api/marketing/creator/websites/staffs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          staffId: targetStaff.id,
          websiteId: website.id,
          creatorId,
          ...editProfileForm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update profile.');
      setStaffActionMsg({ type: 'success', text: 'Staff profile updated successfully.' });
      setShowEditProfileModal(false);
      await fetchStaffs(website.id);
    } catch (err) {
      setStaffActionMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Delete Staff
  const handleDeleteStaff = async (staffId, staffName) => {
    if (!website?.id) return;
    if (!confirm(`Are you sure you want to permanently remove "${staffName}"? This will revoke all their access.`)) {
      return;
    }
    try {
      setStaffActionMsg({ type: '', text: '' });
      const res = await fetch(
        `/api/marketing/creator/websites/staffs?staffId=${staffId}&websiteId=${website.id}&creatorId=${creatorId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete staff member.');
      setStaffActionMsg({ type: 'success', text: data.message });
      await fetchStaffs(website.id);
    } catch (err) {
      setStaffActionMsg({ type: 'error', text: err.message });
    }
  };

  // Fetch website data
  const fetchWebsite = useCallback(async () => {
    if (!domainParam || domainParam === 'new') return;
    try {
      setLoading(true);
      setLoadError('');
      const res = await fetch(
        `/api/marketing/creator/websites?creatorId=${creatorId}&domain=${encodeURIComponent(domainParam)}`
      );
      const data = await res.json();

      if (data.baseDomain) {
        setBaseDomain(data.baseDomain);
      }

      if (data.success && data.website) {
        const w = data.website;
        setWebsite(w);
        fetchStaffs(w.id);
        setName(w.name || '');
        setInstitutionType(w.institution_type || 'school');
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
        setFavicon(w.favicon || '');
        setIsMaintenanceMode(Boolean(w.is_maintenance_mode));

        // Subdomain
        let cleanSub = w.subdomain || w.slug || '';
        if (cleanSub.includes('.')) {
          cleanSub = cleanSub.split('.')[0];
        }
        setSubdomain(cleanSub);

        // Custom Domain
        setCustomDomainInput(w.custom_domain || '');
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
    }, 220);

    return () => clearTimeout(timer);
  }, [subdomain, website, baseDomain]);

  // Real-time Custom Domain Availability Checker
  useEffect(() => {
    if (!website) return;
    const clean = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const currentCustom = (website.custom_domain || '').toLowerCase();

    if (!clean || clean === currentCustom) {
      setCustomDomainStatus({
        state: 'idle',
        message: currentCustom ? 'Current connected domain' : '',
      });
      return;
    }

    if (!clean.includes('.')) {
      setCustomDomainStatus({
        state: 'invalid',
        message: 'Enter a valid domain name with extension (e.g. school.edu).',
      });
      return;
    }

    setCustomDomainStatus({ state: 'checking', message: 'Verifying domain availability...' });

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

  // Handle Save
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
        logo: logo.trim(),
        favicon: favicon.trim(),
        is_maintenance_mode: isMaintenanceMode,
        is_published: !isMaintenanceMode,
      };

      if (cleanSub) {
        payload.subdomain = cleanSub;
      }

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
        }
        if (refetchCreator) refetchCreator();
        // If subdomain changed, update URL without reload
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

  // Verify Custom Domain DNS
  const handleVerifyDns = async () => {
    if (!website) return;
    setVerifyingDns(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_custom_domain',
          id: website.id,
          creatorId: Number(creatorId),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(data.message || 'Custom domain verified and activated successfully!');
        setWebsite((prev) => ({ ...prev, custom_domain_verified: true }));
        if (refetchCreator) refetchCreator();
        setTimeout(() => setSaveSuccess(''), 4000);
      } else {
        setSaveError(data.error || 'Failed to verify custom domain.');
      }
    } catch {
      setSaveError('Network error verifying custom domain.');
    } finally {
      setVerifyingDns(false);
    }
  };

  // Disconnect Custom Domain
  const handleDisconnectCustomDomain = async () => {
    if (!confirm('Are you sure you want to disconnect this custom domain? Your website will still be accessible via its subdomain.')) {
      return;
    }
    setCustomDomainInput('');
    try {
      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_website',
          id: website.id,
          creatorId: Number(creatorId),
          custom_domain: '',
          custom_domain_verified: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess('Custom domain disconnected successfully.');
        setWebsite((prev) => ({ ...prev, custom_domain: null, custom_domain_verified: false }));
        if (refetchCreator) refetchCreator();
        setTimeout(() => setSaveSuccess(''), 3000);
      }
    } catch {
      setSaveError('Failed to disconnect custom domain.');
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
    return (
      <LoadingScreen fullScreen={false} label="Loading website configuration..." />
    );
  }

  if (loadError || !website) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-slate-900">Website Not Found</h2>
        <p className="text-xs text-slate-500">{loadError || 'The requested website could not be found.'}</p>
        <Link
          href={`/creator/${creatorId}/workspace`}
          className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700"
        >
          &larr; Return to Workspace
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
    <div className="w-full space-y-6 text-slate-800 text-xs pb-20">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/creator/${creatorId}/workspace`}
              className="text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center gap-1 font-semibold"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Websites
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">{website.name}</span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                !isMaintenanceMode
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${!isMaintenanceMode ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {!isMaintenanceMode ? 'Live' : 'Maintenance Mode'}
            </span>
          </div>

          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="flex items-center -space-x-1 shrink-0" title={`Primary: ${primaryColor} | Secondary: ${secondaryColor}`}>
              <span
                className="w-3 h-3 rounded-full inline-block border border-white shadow-xs"
                style={{ backgroundColor: primaryColor }}
              />
              <span
                className="w-3 h-3 rounded-full inline-block border border-white shadow-xs"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
            {website.name}
            <span className="text-xs font-normal text-slate-400 font-mono">
              ({cleanSub}.{baseDomain})
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Visit Live Site
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Notifications */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            {saveSuccess}
          </span>
          <button onClick={() => setSaveSuccess('')} className="text-emerald-600 hover:text-emerald-900">&times;</button>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {saveError}
          </span>
          <button onClick={() => setSaveError('')} className="text-red-600 hover:text-red-900">&times;</button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'domains', label: 'Domains & DNS (Custom Domain)', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9' },
          { id: 'staffs', label: 'Staff & Permissions', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          { id: 'general', label: 'Institutional Profile', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
          { id: 'branding', label: 'Appearance & Themes', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
          { id: 'portals', label: 'Direct Portal Links', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          { id: 'danger', label: 'Danger Zone', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'staffs' && website?.id) fetchStaffs(website.id);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DOMAINS & CUSTOM DOMAIN (CORE FEATURE) */}
      {activeTab === 'domains' && (
        <div className="space-y-6">
          {/* Subdomain Management */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Institutional Subdomain
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Active & Routing
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Your website is provisioned on the shared SaaS platform domain.
                </p>
              </div>
            </div>

            <div className="space-y-3 max-w-xl">
              <label className="block font-semibold text-slate-700">Subdomain Prefix</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'))}
                  className="flex-1 px-3.5 py-2.5 rounded-l-lg border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="px-3.5 py-2.5 rounded-r-lg bg-slate-100 border border-l-0 border-slate-300 text-slate-600 font-mono text-xs select-none">
                  .{baseDomain}
                </span>
              </div>

              {subdomainStatus.message && (
                <div className="text-[11px] font-medium pt-1">
                  {subdomainStatus.state === 'available' && (
                    <span className="text-emerald-700 font-semibold">✓ {subdomainStatus.message}</span>
                  )}
                  {subdomainStatus.state === 'taken' && (
                    <span className="text-red-600 font-semibold">✗ {subdomainStatus.message}</span>
                  )}
                  {subdomainStatus.state === 'checking' && (
                    <span className="text-blue-600">Checking availability...</span>
                  )}
                  {subdomainStatus.state === 'idle' && (
                    <span className="text-slate-400">{subdomainStatus.message}</span>
                  )}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg text-slate-600 flex items-center justify-between">
                <span className="text-[11px]">Live Subdomain URL:</span>
                <a
                  href={`https://${cleanSub}.${baseDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-blue-600 hover:underline"
                >
                  https://{cleanSub}.{baseDomain}
                </a>
              </div>
            </div>
          </div>

          {/* Custom Domain Management (WordPress / Webflow style) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Custom Domain Configuration
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                    WordPress / Webflow Style
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Connect your school or university’s own branded domain (e.g. <code>yourschool.edu</code> or <code>academy.org</code>).
                </p>
              </div>

              {website.custom_domain && (
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                    website.custom_domain_verified
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${website.custom_domain_verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {website.custom_domain_verified ? 'Verified & Active' : 'DNS Setup Pending'}
                </span>
              )}
            </div>

            {/* Custom Domain Input & Actions */}
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Custom Domain Name
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. oxford-academy.edu"
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().trim())}
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !customDomainInput || customDomainStatus.state === 'taken'}
                    className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Save Domain
                  </button>
                </div>

                {customDomainStatus.message && (
                  <div className="text-[11px] font-medium pt-1">
                    {customDomainStatus.state === 'available' && (
                      <span className="text-emerald-700 font-semibold">✓ {customDomainStatus.message}</span>
                    )}
                    {customDomainStatus.state === 'taken' && (
                      <span className="text-red-600 font-semibold">✗ {customDomainStatus.message}</span>
                    )}
                    {customDomainStatus.state === 'invalid' && (
                      <span className="text-amber-700 font-medium">{customDomainStatus.message}</span>
                    )}
                    {customDomainStatus.state === 'checking' && (
                      <span className="text-blue-600">Verifying domain...</span>
                    )}
                  </div>
                )}
              </div>

              {/* If Custom Domain Is Set */}
              {website.custom_domain && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Connected Domain</span>
                      <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                        https://{website.custom_domain}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyDns}
                        disabled={verifyingDns}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {verifyingDns ? 'Verifying...' : 'Verify DNS'}
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectCustomDomain}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium text-xs transition-colors cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DNS Instructions Card */}
            <div className="p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/30 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>DNS Configuration Instructions (GoDaddy, Namecheap, Cloudflare, Route53)</span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                To connect your custom domain, log into your domain registrar and create a <strong>CNAME record</strong> pointing to our platform router.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-white rounded-lg border border-slate-200/80 overflow-hidden">
                  <thead className="bg-slate-100/75 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Name / Host</th>
                      <th className="py-2.5 px-3">Value / Target</th>
                      <th className="py-2.5 px-3">TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-blue-700">CNAME</td>
                      <td className="py-2.5 px-3">@ or www</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{baseDomain}</td>
                      <td className="py-2.5 px-3 text-slate-500">Automatic / 3600</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-indigo-700">CNAME (Subdomain)</td>
                      <td className="py-2.5 px-3">portal or school</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{baseDomain}</td>
                      <td className="py-2.5 px-3 text-slate-500">Automatic / 3600</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>DNS changes usually take between 2 to 60 minutes to propagate worldwide.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: STAFF & PERMISSIONS */}
      {activeTab === 'staffs' && (
        <div className="space-y-4">
          {/* Notifications */}
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
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Section Header */}
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Staff Members & Module Permissions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage operational staff, assign granular module access (SIS, Attendance, Fees, LMS, Exams, etc.), and oversee multi-device sessions.
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
              <span className="text-[10px] text-slate-500">Registered on roster</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Status</span>
              <span className="text-base font-semibold text-emerald-700 block mt-0.5">
                {staffsList.filter((s) => s.is_active).length}
              </span>
              <span className="text-[10px] text-slate-500">Granted login access</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Account Setup</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">
                {staffsList.filter((s) => s.is_registered).length} of {staffsList.length}
              </span>
              <span className="text-[10px] text-slate-500">Completed credential setup</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Sessions</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">
                {staffsList.reduce((acc, s) => acc + (s.activeSessions || 0), 0)}
              </span>
              <span className="text-[10px] text-slate-500">Live devices signed in</span>
            </div>
          </div>

          {/* Staff Roster Table */}
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3">Pay Grade</th>
                    <th className="py-2.5 px-3">Account Status</th>
                    <th className="py-2.5 px-3">Active Sessions</th>
                    <th className="py-2.5 px-3">Permitted Modules</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        {loadingStaffs ? 'Loading staff roster...' : 'No staff members added yet. Click "+ Add Staff Member" to onboard.'}
                      </td>
                    </tr>
                  ) : (
                    staffsList.map((s) => {
                      const allowedPerms = Object.entries(s.permissions || {}).filter(([_, p]) => p.can_view);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-900">{s.name}</div>
                            <div className="text-[11px] text-slate-500">{s.email}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{s.number}</div>
                          </td>

                          <td className="py-3 px-3">
                            {s.grade_name ? (
                              <span className="text-xs font-medium text-slate-800">{s.grade_name}</span>
                            ) : (
                              <span className="text-xs text-slate-400">Standard / Unassigned</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
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
                                {s.is_registered ? 'Setup Complete' : 'Pending Invite'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-700">
                                {s.activeSessions || 0} device(s)
                              </span>
                              {s.activeSessions > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeStaffSessions(s.id)}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
                                  title="Terminate all active sessions"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {allowedPerms.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">No modules granted</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {allowedPerms.slice(0, 4).map(([slug, p]) => (
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

                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
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
              <div className="bg-white rounded border border-slate-200 max-w-2xl w-full p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Add Staff Member</h3>
                    <p className="text-xs text-slate-500">Provide personal credentials and configure initial module permissions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={staffForm.name}
                        onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500"
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
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500"
                        placeholder="staff@campus.edu"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone *</label>
                      <input
                        type="tel"
                        required
                        value={staffForm.number}
                        onChange={(e) => setStaffForm({ ...staffForm, number: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500"
                        placeholder="+880 1712 345678"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Pay Scale Grade (Optional)</label>
                      <select
                        value={staffForm.gradeId}
                        onChange={(e) => setStaffForm({ ...staffForm, gradeId: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500 bg-white"
                      >
                        <option value="">Unassigned / Default</option>
                        {payScalesList.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} (Base: ৳{g.basic_salary})
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
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500"
                        placeholder="Address details"
                      />
                    </div>
                  </div>

                  {/* Password Onboarding Mode */}
                  <div className="p-3 rounded border border-slate-200 bg-slate-50 space-y-2">
                    <label className="block text-xs font-medium text-slate-800">Account Onboarding Method</label>
                    <div className="flex items-center gap-4 text-xs text-slate-700">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="pwdMode"
                          checked={staffForm.passwordMode === 'invite'}
                          onChange={() => setStaffForm({ ...staffForm, passwordMode: 'invite' })}
                        />
                        Send Email Invitation (Staff creates password)
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="pwdMode"
                          checked={staffForm.passwordMode === 'manual'}
                          onChange={() => setStaffForm({ ...staffForm, passwordMode: 'manual' })}
                        />
                        Set Manual Password
                      </label>
                    </div>

                    {staffForm.passwordMode === 'manual' && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Temporary Password (min 6 chars)</label>
                        <input
                          type="password"
                          value={staffForm.password}
                          onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-slate-500"
                          placeholder="••••••••"
                        />
                      </div>
                    )}
                  </div>

                  {/* Module Permissions Matrix */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-900">Module Access Permissions</label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            const all = {};
                            modulesList.forEach((m) => {
                              all[m.slug] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
                            });
                            setStaffForm({ ...staffForm, permissions: all });
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
                            setStaffForm({ ...staffForm, permissions: all });
                          }}
                          className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                        >
                          Full Access All
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

                    <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {modulesList.map((m) => {
                        const perm = staffForm.permissions[m.slug] || {};
                        return (
                          <div key={m.slug} className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50">
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
                      className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                    >
                      {submittingStaff ? 'Saving...' : 'Save Staff Member'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* EDIT PERMISSIONS MODAL */}
          {showEditPermsModal && targetStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="bg-white rounded border border-slate-200 max-w-xl w-full p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Module Permissions: {targetStaff.name}
                    </h3>
                    <p className="text-xs text-slate-500">Configure CRUD operations for each school module.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditPermsModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSavePermissions} className="space-y-4">
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

                  <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {modulesList.map((m) => {
                      const perm = editPermsMap[m.slug] || {};
                      return (
                        <div key={m.slug} className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50">
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
                      className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
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
              <div className="bg-white rounded border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Edit Profile: {targetStaff.name}
                    </h3>
                    <p className="text-xs text-slate-500">Update contact and employment details.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                  >
                    &times;
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
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editProfileForm.email}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={editProfileForm.number}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, number: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Pay Scale Grade</label>
                    <select
                      value={editProfileForm.gradeId}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, gradeId: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500 bg-white"
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
                    <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={editProfileForm.address}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-500"
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
                      className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
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

      {/* TAB 2: GENERAL & INSTITUTIONAL PROFILE */}
      {activeTab === 'general' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Institutional Profile & Contact Details</h2>
            <p className="text-[11px] text-slate-500">Official registry information, institutional vision, and communication channels.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Institution Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Institution Type</label>
              <select
                value={institutionType}
                onChange={(e) => setInstitutionType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500"
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">EIIN / Registration Number</label>
              <input
                type="text"
                value={eeinNumber}
                onChange={(e) => setEeinNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Campus Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Mission Statement</label>
              <textarea
                rows={3}
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="Institutional educational mission..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Vision Statement</label>
              <textarea
                rows={3}
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                placeholder="Long-term vision for student development..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Institutional History</label>
              <textarea
                rows={3}
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                placeholder="Background, foundation year, and key milestones..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Social Media Links */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Facebook Page URL</label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/yourschool"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Twitter / X URL</label>
              <input
                type="url"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://twitter.com/yourschool"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Instagram URL</label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/yourschool"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">YouTube Channel URL</label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/@yourschool"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BRANDING & APPEARANCE */}
      {activeTab === 'branding' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Branding, Colors & Assets</h2>
            <p className="text-[11px] text-slate-500">Configure visual themes and brand assets for tenant frontends.</p>
          </div>

          <div className="space-y-5 max-w-xl">
            {/* Color Presets */}
            <div className="space-y-3">
              <label className="block font-semibold text-slate-700">Primary Brand Accent Color</label>
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
                  />
                  <span className="font-mono text-[11px] text-slate-500">{primaryColor}</span>
                </div>
              </div>
            </div>

            {/* Secondary Color Presets */}
            <div className="space-y-3">
              <label className="block font-semibold text-slate-700">Secondary Brand Accent Color</label>
              <div className="flex flex-wrap items-center gap-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={`sec-${c.hex}`}
                    type="button"
                    onClick={() => setSecondaryColor(c.hex)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                      secondaryColor.toLowerCase() === c.hex.toLowerCase()
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
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-[11px] text-slate-500">{secondaryColor}</span>
                </div>
              </div>
            </div>

            {/* Theme Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Portal Theme Mode</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">Default Academic Clean</option>
                <option value="modern">Modern Campus Grid</option>
                <option value="slate">Deep Slate Prestige</option>
                <option value="classic">Classic University Blue</option>
              </select>
            </div>

            {/* Logo URL */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Logo URL</label>
              <input
                type="text"
                placeholder="https://example.com/logo.png"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            {/* Favicon URL */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Favicon URL</label>
              <input
                type="text"
                placeholder="https://example.com/favicon.ico"
                value={favicon}
                onChange={(e) => setFavicon(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DIRECT PORTALS */}
      {activeTab === 'portals' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Tenant Portals & Live Navigation</h2>
            <p className="text-[11px] text-slate-500">
              Direct access endpoints for students, teachers, administrators, and visitors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Public Institution Front',
                desc: 'Main public homepage with notice board, events, and campus news.',
                path: localPreviewPath,
                subPath: '/',
                color: 'text-blue-600 bg-blue-50',
              },
              {
                title: 'Student Academic Portal',
                desc: 'Student timetable, grade sheets, attendance records, and fees.',
                path: `${localPreviewPath}/student`,
                subPath: '/student',
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                title: 'Faculty / Teacher Portal',
                desc: 'Teacher routine, attendance entry, grade submission, and lessons.',
                path: `${localPreviewPath}/teacher`,
                subPath: '/teacher',
                color: 'text-indigo-600 bg-indigo-50',
              },
              {
                title: 'Staff Management Panel',
                desc: 'Authorized staff portal for admissions, records, and module operations.',
                path: `${localPreviewPath}/staff-panel`,
                subPath: '/staff-panel',
                color: 'text-purple-600 bg-purple-50',
              },
              {
                title: 'Public Notice Bulletin',
                desc: 'Campus circulars, official decrees, and exam schedules.',
                path: `${localPreviewPath}/notices`,
                subPath: '/notices',
                color: 'text-amber-600 bg-amber-50',
              },
              {
                title: 'Online Student Admission',
                desc: 'Public admission registration portal and form submissions.',
                path: `${localPreviewPath}/apply`,
                subPath: '/apply',
                color: 'text-rose-600 bg-rose-50',
              },
            ].map((p) => (
              <div key={p.title} className="p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center font-bold text-xs`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs mt-2">{p.title}</h3>
                  <p className="text-[11px] text-slate-500 leading-normal">{p.desc}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                    {p.subPath}
                  </span>
                  <a
                    href={website.custom_domain && website.custom_domain_verified ? `https://${website.custom_domain}${p.subPath}` : p.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 text-[11px]"
                  >
                    Open Portal &rarr;
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: DANGER ZONE */}
      {activeTab === 'danger' && (
        <div className="bg-white border border-red-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-red-100 pb-3">
            <h2 className="text-sm font-bold text-red-700">Maintenance & Deletion Controls</h2>
            <p className="text-[11px] text-slate-500">High-risk actions for this educational institution.</p>
          </div>

          <div className="space-y-6 max-w-xl">
            {/* Maintenance Mode Toggle */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Maintenance Mode</p>
                <p className="text-[11px] text-slate-500">
                  When enabled, visitors will see a maintenance notice instead of the live campus site.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMaintenanceMode}
                  onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {/* Permanent Deletion */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-red-900">Delete This Website</p>
                <p className="text-[11px] text-red-700">
                  Permanently remove this institution, subdomains, student databases, and custom domain connections.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteWebsite}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Website'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
