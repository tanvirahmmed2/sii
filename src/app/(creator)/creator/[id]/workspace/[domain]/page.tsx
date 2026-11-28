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
    const routeParams: any = useParams();
    const { creatorId: contextCreatorId, refetch: refetchCreator } = useCreator();
    const creatorId = routeParams?.id || contextCreatorId;
    const domainParam = routeParams?.domain;
    const [activeTab, setActiveTab] = useState<any>('domains');
    const [baseDomain, setBaseDomain] = useState<any>(typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:3000');
    const [loading, setLoading] = useState<any>(true);
    const [loadError, setLoadError] = useState<any>('');
    const [website, setWebsite] = useState<any>(null);
    const [name, setName] = useState<any>('');
    const [institutionType, setInstitutionType] = useState<any>('school');
    const [eeinNumber, setEeinNumber] = useState<any>('');
    const [tagline, setTagline] = useState<any>('');
    const [mission, setMission] = useState<any>('');
    const [vision, setVision] = useState<any>('');
    const [history, setHistory] = useState<any>('');
    const [contactEmail, setContactEmail] = useState<any>('');
    const [contactPhone, setContactPhone] = useState<any>('');
    const [address, setAddress] = useState<any>('');
    const [mapUrl, setMapUrl] = useState<any>('');
    const [facebookUrl, setFacebookUrl] = useState<any>('');
    const [twitterUrl, setTwitterUrl] = useState<any>('');
    const [instagramUrl, setInstagramUrl] = useState<any>('');
    const [youtubeUrl, setYoutubeUrl] = useState<any>('');
    const [linkedinUrl, setLinkedinUrl] = useState<any>('');
    const [primaryColor, setPrimaryColor] = useState<any>('#1e40af');
    const [secondaryColor, setSecondaryColor] = useState<any>('#0ea5e9');
    const [theme, setTheme] = useState<any>('default');
    const [logo, setLogo] = useState<any>('');
    const [logoId, setLogoId] = useState<any>('');
    const [favicon, setFavicon] = useState<any>('');
    const [faviconId, setFaviconId] = useState<any>('');
    const [currency, setCurrency] = useState<any>('BDT');
    const [isMaintenanceMode, setIsMaintenanceMode] = useState<any>(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState<any>('Our campus portal is temporarily under scheduled maintenance. Please check back shortly.');
    const [verificationStatus, setVerificationStatus] = useState<any>('pending');
    const [creatorNid, setCreatorNid] = useState<any>('');
    const [eiinCertificate, setEiinCertificate] = useState<any>('');
    const [verificationAddress, setVerificationAddress] = useState<any>('');
    const [principalName, setPrincipalName] = useState<any>('');
    const [boardAffiliation, setBoardAffiliation] = useState<any>('');
    const [verificationNotes, setVerificationNotes] = useState<any>('');
    const [nidFrontUrl, setNidFrontUrl] = useState<any>('');
    const [nidFrontId, setNidFrontId] = useState<any>('');
    const [nidFrontFile, setNidFrontFile] = useState<any>(null);
    const [nidBackUrl, setNidBackUrl] = useState<any>('');
    const [nidBackId, setNidBackId] = useState<any>('');
    const [nidBackFile, setNidBackFile] = useState<any>(null);
    const [eiinCertUrl, setEiinCertUrl] = useState<any>('');
    const [eiinCertId, setEiinCertId] = useState<any>('');
    const [eiinCertFile, setEiinCertFile] = useState<any>(null);
    const [ugcCertUrl, setUgcCertUrl] = useState<any>('');
    const [ugcCertId, setUgcCertId] = useState<any>('');
    const [ugcCertFile, setUgcCertFile] = useState<any>(null);
    const [additionalCertUrl, setAdditionalCertUrl] = useState<any>('');
    const [additionalCertId, setAdditionalCertId] = useState<any>('');
    const [additionalCertFile, setAdditionalCertFile] = useState<any>(null);
    const [savingVerification, setSavingVerification] = useState<any>(false);
    const [verificationMsg, setVerificationMsg] = useState<any>({ type: '', text: '' });
    const [logoFile, setLogoFile] = useState<any>(null);
    const [logoPreview, setLogoPreview] = useState<any>('');
    const [uploadingLogo, setUploadingLogo] = useState<any>(false);
    const [faviconFile, setFaviconFile] = useState<any>(null);
    const [faviconPreview, setFaviconPreview] = useState<any>('');
    const [uploadingFavicon, setUploadingFavicon] = useState<any>(false);
    const [brandingMsg, setBrandingMsg] = useState<any>({ type: '', text: '' });
    const logoInputRef = useRef<any>(null);
    const faviconInputRef = useRef<any>(null);
    const [subdomain, setSubdomain] = useState<any>('');
    const [subdomainStatus, setSubdomainStatus] = useState<any>({ state: 'idle', message: '' });
    const [customDomainInput, setCustomDomainInput] = useState<any>('');
    const [customDomainStatus, setCustomDomainStatus] = useState<any>({ state: 'idle', message: '' });
    const [verifyingDns, setVerifyingDns] = useState<any>(false);
    const [confirmingDomain, setConfirmingDomain] = useState<any>(false);
    const [pendingCustomDomain, setPendingCustomDomain] = useState<any>('');
    const [pendingVerificationToken, setPendingVerificationToken] = useState<any>('');
    const [domainDnsRecords, setDomainDnsRecords] = useState<any>([]);
    const [dnsVerificationResult, setDnsVerificationResult] = useState<any>(null);
    const [copiedRecordKey, setCopiedRecordKey] = useState<any>('');
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<any>(false);
    const [domainFeedback, setDomainFeedback] = useState<any>({ type: '', text: '' });
    const [showDnsDetails, setShowDnsDetails] = useState<any>(true);
    const [cnameTarget, setCnameTarget] = useState<any>('domains.hiesci.com');
    const [aTarget, setATarget] = useState<any>('76.76.21.21');
    const [saving, setSaving] = useState<any>(false);
    const [saveSuccess, setSaveSuccess] = useState<any>('');
    const [saveError, setSaveError] = useState<any>('');
    const [deleting, setDeleting] = useState<any>(false);
    const [showDeleteWebsiteModal, setShowDeleteWebsiteModal] = useState<any>(false);
    const [deleteWebsiteError, setDeleteWebsiteError] = useState<any>('');
    const [staffDeleteTarget, setStaffDeleteTarget] = useState<any>(null);
    const [logoDeleteConfirm, setLogoDeleteConfirm] = useState<any>(false);
    const [faviconDeleteConfirm, setFaviconDeleteConfirm] = useState<any>(false);
    const [moduleSearch, setModuleSearch] = useState<any>('');
    const [moduleCategoryFilter, setModuleCategoryFilter] = useState<any>('all');
    const [moduleViewType, setModuleViewType] = useState<any>('all');
    const [staffsList, setStaffsList] = useState<any>([]);
    const [modulesList, setModulesList] = useState<any>([]);
    const [payScalesList, setPayScalesList] = useState<any>([]);
    const [loadingStaffs, setLoadingStaffs] = useState<any>(false);
    const [staffActionMsg, setStaffActionMsg] = useState<any>({ type: '', text: '' });
    const [resendingStaffId, setResendingStaffId] = useState<any>(null);
    const [showAddStaffModal, setShowAddStaffModal] = useState<any>(false);
    const [showEditPermsModal, setShowEditPermsModal] = useState<any>(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState<any>(false);
    const [targetStaff, setTargetStaff] = useState<any>(null);
    const [staffForm, setStaffForm] = useState<any>({
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
    const [submittingStaff, setSubmittingStaff] = useState<any>(false);
    const [editPermsMap, setEditPermsMap] = useState<any>({});
    const [savingPerms, setSavingPerms] = useState<any>(false);
    const [editProfileForm, setEditProfileForm] = useState<any>({
        name: '',
        email: '',
        number: '',
        address: '',
        gradeId: '',
        bio: '',
    });
    const [savingProfile, setSavingProfile] = useState<any>(false);
    const [academicsSubTab, setAcademicsSubTab] = useState<any>('hierarchy');
    const [academicConfig, setAcademicConfig] = useState<any>({
        hierarchy_type: 'CLASS_SEC',
        use_department: false,
        use_session: true,
        use_class: true,
        use_section: true,
        require_department: false,
        require_session: true,
        require_class: true,
        require_section: false,
        labels: {
            department: 'Department',
            session: 'Academic Year',
            class: 'Class',
            section: 'Section',
        },
    });
    const [savingAcademicConfig, setSavingAcademicConfig] = useState<any>(false);
    const [academicSessions, setAcademicSessions] = useState<any>([]);
    const [academicDays, setAcademicDays] = useState<any>([]);
    const [academicPeriods, setAcademicPeriods] = useState<any>([]);
    const [sessionForm, setSessionForm] = useState<any>({ name: '', status: 'active' });
    const [dayForm, setDayForm] = useState<any>({ name: '', day_order: 1, status: 'on' });
    const [periodForm, setPeriodForm] = useState<any>({ day_id: '', name: '', start_time: '09:00', end_time: '09:45', is_break: false, apply_to_all_active_days: false });
    const [academicDepts, setAcademicDepts] = useState<any>([]);
    const [academicDeptInfos, setAcademicDeptInfos] = useState<any>([]);
    const [academicDeptHeads, setAcademicDeptHeads] = useState<any>([]);
    const [academicClasses, setAcademicClasses] = useState<any>([]);
    const [academicSections, setAcademicSections] = useState<any>([]);
    const [academicSubjects, setAcademicSubjects] = useState<any>([]);
    const [academicClassSubjects, setAcademicClassSubjects] = useState<any>([]);
    const [academicRoutines, setAcademicRoutines] = useState<any>([]);
    const [loadingAcademics, setLoadingAcademics] = useState<any>(false);
    const [academicActionMsg, setAcademicActionMsg] = useState<any>({ type: '', text: '' });
    const [editingSessionId, setEditingSessionId] = useState<any>(null);
    const [editingSessionForm, setEditingSessionForm] = useState<any>({ name: '', status: 'active' });
    const [deptModal, setDeptModal] = useState<any>({ open: false, editing: null });
    const [deptForm, setDeptForm] = useState<any>({ name: '', code: '', order_no: 0, description: '', is_active: true });
    const [deptProfileModal, setDeptProfileModal] = useState<any>({ open: false, department: null });
    const [deptProfileForm, setDeptProfileForm] = useState<any>({
        motto: '',
        summary: '',
        description: '',
        expected_cost: '0',
        head_id: null,
        head_name: '',
        head_title: '',
        head_designation: 'Head of Department',
        head_email: '',
        head_phone: '',
        head_bio: '',
        head_message: '',
        head_is_active: true,
        head_image: '',
        head_image_file: null,
    });
    const [classModal, setClassModal] = useState<any>({ open: false, editing: null });
    const [classForm, setClassForm] = useState<any>({ name: '', code: '', department_id: '', max_seats: 40, description: '' });
    const [sectionModal, setSectionModal] = useState<any>({ open: false, editing: null });
    const [sectionForm, setSectionForm] = useState<any>({ class_id: '', department_id: '', session_id: '', name: '', capacity: 40, room_number: '' });
    const [subjectModal, setSubjectModal] = useState<any>({ open: false, editing: null });
    const [subjectForm, setSubjectForm] = useState<any>({ class_id: '', name: '', code: '', type: 'Theory', description: '' });
    const [classSubjectForm, setClassSubjectForm] = useState<any>({ class_id: '', subject_id: '', full_marks: 100, pass_marks: 33, is_optional: false });
    const [editingClassSubjectId, setEditingClassSubjectId] = useState<any>(null);
    const [editingClassSubjectMarks, setEditingClassSubjectMarks] = useState<any>({ full_marks: 100, pass_marks: 33, is_optional: false });
    const [editingPeriodId, setEditingPeriodId] = useState<any>(null);
    const [editingPeriodForm, setEditingPeriodForm] = useState<any>({ name: '', start_time: '09:00', end_time: '09:45', is_break: false });
    const [routineForm, setRoutineForm] = useState<any>({ day_id: '', period_id: '', class_subject_id: '', section_id: '', session_id: '', room_number: '' });
    const [academicDeleteTarget, setAcademicDeleteTarget] = useState<any>(null);
    const [deletingAcademic, setDeletingAcademic] = useState<any>(false);
    const [submittingAcademic, setSubmittingAcademic] = useState<any>(false);
    const fetchStaffs = useCallback(async (siteId: any) => {
        if (!siteId)
            return;
        try {
            setLoadingStaffs(true);
            const res = await fetch(`/api/marketing/creator/websites/staffs?websiteId=${siteId}&creatorId=${creatorId}`);
            const data = await res.json();
            if (data.success) {
                setStaffsList(data.staffs || []);
                setModulesList(data.modules || []);
                setPayScalesList(data.payScales || []);
            }
        }
        catch {
        }
        finally {
            setLoadingStaffs(false);
        }
    }, [creatorId]);
    const fetchWebsite = useCallback(async () => {
        if (!creatorId || !domainParam)
            return;
        try {
            setLoading(true);
            setLoadError('');
            const res = await fetch(`/api/marketing/creator/websites?creatorId=${creatorId}&domain=${encodeURIComponent(domainParam)}`);
            const data = await res.json();
            if (data.success && data.website) {
                const w = data.website;
                setWebsite(w);
                if (data.baseDomain)
                    setBaseDomain(data.baseDomain);
                if (data.cnameTarget)
                    setCnameTarget(data.cnameTarget);
                if (data.aTarget)
                    setATarget(data.aTarget);
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
                setMaintenanceMessage(w.maintenance_message ||
                    'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.');
                const wi = w.website_information || {};
                const od = typeof wi.other_details === 'object' && wi.other_details !== null ? wi.other_details : {};
                setVerificationStatus(wi.verification_status || 'pending');
                setCreatorNid(wi.creator_nid || '');
                setEiinCertificate(wi.eiin_certificate || '');
                setVerificationAddress(wi.address || w.address || '');
                setPrincipalName(od.principal_name || '');
                setBoardAffiliation(od.board_affiliation || '');
                setVerificationNotes(od.notes || '');
                if (od.tagline && !w.tagline) setTagline(od.tagline);
                if (od.mission && !w.mission) setMission(od.mission);
                if (od.vision && !w.vision) setVision(od.vision);
                if (od.history && !w.history) setHistory(od.history);
                if (od.map_url && !w.map_url) setMapUrl(od.map_url);
                setNidFrontUrl(wi.creator_nid_front_image || wi.creator_nid_url || '');
                setNidFrontId(wi.creator_nid_front_image_id || '');
                setNidBackUrl(wi.creator_nid_back_image || '');
                setNidBackId(wi.creator_nid_back_image_id || '');
                setEiinCertUrl(wi.eiin_certificate_image || wi.eiin_certificate_url || '');
                setEiinCertId(wi.eiin_certificate_image_id || '');
                setUgcCertUrl(wi.ugc_certificate || '');
                setUgcCertId(wi.ugc_certificate_id || '');
                setAdditionalCertUrl(wi.additional_certificate || '');
                setAdditionalCertId(wi.additional_certificate_id || '');
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
                        }
                        catch { }
                    }
                    if (Array.isArray(recs)) {
                        setDomainDnsRecords(recs);
                    }
                }
                fetchStaffs(w.id);
            }
            else {
                setLoadError(data.error || 'Website not found or access denied.');
            }
        }
        catch {
            setLoadError('Failed to fetch website data. Please check your connection.');
        }
        finally {
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
        if (!website)
            return;
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
                const res = await fetch(`/api/marketing/creator/websites/check-domain?domain=${encodeURIComponent(clean)}&websiteId=${website.id}`);
                const json = await res.json();
                if (json.available) {
                    setSubdomainStatus({
                        state: 'available',
                        message: `Available! ${json.fullDomain || `${clean}.${baseDomain}`}`,
                    });
                }
                else {
                    setSubdomainStatus({
                        state: 'taken',
                        message: json.error || 'Subdomain is already taken.',
                    });
                }
            }
            catch {
                setSubdomainStatus({ state: 'error', message: 'Error checking availability.' });
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [subdomain, website, baseDomain]);
    useEffect(() => {
        if (!website)
            return;
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
                const res = await fetch(`/api/marketing/creator/websites/check-domain?type=custom&domain=${encodeURIComponent(clean)}&websiteId=${website.id}`);
                const json = await res.json();
                if (json.available) {
                    setCustomDomainStatus({
                        state: 'available',
                        message: `Available to connect: ${clean}`,
                    });
                }
                else {
                    setCustomDomainStatus({
                        state: 'taken',
                        message: json.error || 'This custom domain is already registered to another website.',
                    });
                }
            }
            catch {
                setCustomDomainStatus({ state: 'error', message: 'Error checking domain availability.' });
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [customDomainInput, website]);
    const handleLogoFileChange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            setLogoPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };
    const handleUploadLogoToCloudinary = async () => {
        if (!logoPreview || !website?.id)
            return;
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
            if (data.website)
                setWebsite(data.website);
            setBrandingMsg({
                type: 'success',
                text: 'Logo uploaded to Cloudinary successfully. Previous asset was automatically deleted.',
            });
            setTimeout(() => setBrandingMsg({ type: '', text: '' }), 5000);
        }
        catch (err: any) {
            setBrandingMsg({ type: 'error', text: err.message });
        }
        finally {
            setUploadingLogo(false);
        }
    };
    const handleRemoveLogo = async () => {
        if (!website?.id)
            return;
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
            if (data.website)
                setWebsite(data.website);
            setBrandingMsg({ type: 'success', text: 'Logo removed and deleted from Cloudinary.' });
            setTimeout(() => setBrandingMsg({ type: '', text: '' }), 4000);
            setLogoDeleteConfirm(false);
        }
        catch (err: any) {
            setBrandingMsg({ type: 'error', text: err.message });
        }
        finally {
            setUploadingLogo(false);
        }
    };
    const handleFaviconFileChange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setFaviconFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            setFaviconPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };
    const handleUploadFaviconToCloudinary = async () => {
        if (!faviconPreview || !website?.id)
            return;
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
            if (data.website)
                setWebsite(data.website);
            setBrandingMsg({
                type: 'success',
                text: 'Favicon uploaded to Cloudinary successfully. Previous asset was automatically deleted.',
            });
            setTimeout(() => setBrandingMsg({ type: '', text: '' }), 5000);
        }
        catch (err: any) {
            setBrandingMsg({ type: 'error', text: err.message });
        }
        finally {
            setUploadingFavicon(false);
        }
    };
    const handleRemoveFavicon = async () => {
        if (!website?.id)
            return;
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
            if (data.website)
                setWebsite(data.website);
            setBrandingMsg({ type: 'success', text: 'Favicon removed and deleted from Cloudinary.' });
            setTimeout(() => setBrandingMsg({ type: '', text: '' }), 4000);
            setFaviconDeleteConfirm(false);
        }
        catch (err: any) {
            setBrandingMsg({ type: 'error', text: err.message });
        }
        finally {
            setUploadingFavicon(false);
        }
    };
    const handleSave = async (e: any) => {
        if (e)
            e.preventDefault();
        if (!website)
            return;
        setSaving(true);
        setSaveError('');
        setSaveSuccess('');
        try {
            const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
            const cleanCustom = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            const payload: any = {
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
            if (cleanSub)
                payload.subdomain = cleanSub;
            const res = await fetch('/api/marketing/creator/websites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setSaveSuccess('Website changes saved successfully!');
                if (data.website) {
                    setWebsite((prev: any) => ({ ...prev, ...data.website }));
                    setLogo(data.website.logo || '');
                    setLogoId(data.website.logo_id || '');
                    setFavicon(data.website.favicon || '');
                    setFaviconId(data.website.favicon_id || '');
                    setLogoPreview('');
                    setFaviconPreview('');
                }
                if (refetchCreator)
                    refetchCreator();
                if (cleanSub && cleanSub !== domainParam) {
                    router.replace(`/creator/${creatorId}/workspace/${cleanSub}`);
                }
                setTimeout(() => setSaveSuccess(''), 3000);
            }
            else {
                setSaveError(data.error || 'Failed to save changes.');
            }
        }
        catch {
            setSaveError('Network error while saving changes.');
        }
        finally {
            setSaving(false);
        }
    };
    const handleToggleMaintenanceMode = async (targetMode: any) => {
        if (!website?.id)
            return;
        const canGoLive = Boolean(website?.subscription_id &&
            (website.subscription_is_active !== undefined
                ? website.subscription_is_active
                : (String(website.subscription_status || '').toLowerCase() === 'active' &&
                    (!website.subscription_period_end || new Date(website.subscription_period_end) > new Date())))) &&
            String(website?.status || '').toLowerCase() === 'active';
        if (!targetMode && !canGoLive) {
            setSaveError('Maintenance mode cannot be disabled while your subscription is inactive, suspended, or expired.');
            return;
        }
        const prevMode = isMaintenanceMode;
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
                    maintenance_message: maintenanceMessage.trim(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                if (data.website)
                    setWebsite((prev: any) => ({ ...prev, ...data.website }));
                setSaveSuccess(`Website switched to ${targetMode ? 'Maintenance Mode' : 'Live'}.`);
                if (refetchCreator)
                    refetchCreator();
                setTimeout(() => setSaveSuccess(''), 3000);
            }
            else {
                setIsMaintenanceMode(prevMode);
                setSaveError(data.error || 'Failed to update maintenance mode.');
            }
        }
        catch {
            setIsMaintenanceMode(prevMode);
            setSaveError('Network error while toggling maintenance mode.');
        }
        finally {
            setSaving(false);
        }
    };
    const isVerificationLocked = ['approved', 'verified'].includes(String(verificationStatus || '').toLowerCase());
    const handleSaveVerification = async (e: any) => {
        if (e) e.preventDefault();
        if (!website?.id) return;
        if (isVerificationLocked) {
            setVerificationMsg({
                type: 'error',
                text: 'Verification & KYC records have already been approved by a platform developer and cannot be modified.',
            });
            return;
        }
        try {
            setSavingVerification(true);
            setVerificationMsg({ type: '', text: '' });
            const payloadData: any = {
                action: 'update_website',
                id: website.id,
                creatorId: Number(creatorId),
                creator_nid: creatorNid.trim(),
                eiin_certificate: eiinCertificate.trim(),
                verification_address: verificationAddress.trim(),
                principal_name: principalName.trim(),
                board_affiliation: boardAffiliation.trim(),
                notes: verificationNotes.trim(),
            };
            const formData = new FormData();
            formData.append('payload', JSON.stringify(payloadData));
            if (nidFrontFile) formData.append('nid_front_file', nidFrontFile);
            if (nidBackFile) formData.append('nid_back_file', nidBackFile);
            if (eiinCertFile) formData.append('eiin_certificate_file', eiinCertFile);
            if (ugcCertFile) formData.append('ugc_certificate_file', ugcCertFile);
            if (additionalCertFile) formData.append('additional_certificate_file', additionalCertFile);

            const res = await fetch('/api/marketing/creator/websites', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save verification information.');
            }
            if (data.website) {
                setWebsite((prev: any) => ({ ...prev, ...data.website }));
                const wi = data.website.website_information || {};
                setVerificationStatus(wi.verification_status || verificationStatus);
                setNidFrontUrl(wi.creator_nid_front_image || wi.creator_nid_url || '');
                setNidFrontId(wi.creator_nid_front_image_id || '');
                setNidBackUrl(wi.creator_nid_back_image || '');
                setNidBackId(wi.creator_nid_back_image_id || '');
                setEiinCertUrl(wi.eiin_certificate_image || wi.eiin_certificate_url || '');
                setEiinCertId(wi.eiin_certificate_image_id || '');
                setUgcCertUrl(wi.ugc_certificate || '');
                setUgcCertId(wi.ugc_certificate_id || '');
                setAdditionalCertUrl(wi.additional_certificate || '');
                setAdditionalCertId(wi.additional_certificate_id || '');
            }
            setNidFrontFile(null);
            setNidBackFile(null);
            setEiinCertFile(null);
            setUgcCertFile(null);
            setAdditionalCertFile(null);
            setVerificationMsg({ type: 'success', text: 'Verification details and certificates saved to website_information.' });
        } catch (err: any) {
            setVerificationMsg({ type: 'error', text: err.message });
        } finally {
            setSavingVerification(false);
        }
    };
    const handleConnectCustomDomain = async (e: any) => {
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
                    action: 'prepare_custom_domain_dns',
                    id: website.id,
                    creatorId: Number(creatorId),
                    custom_domain: clean,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setPendingCustomDomain(clean);
                setPendingVerificationToken(data.verification_token || '');
                setDomainDnsRecords(Array.isArray(data.dns_records) ? data.dns_records : []);
                setShowDnsDetails(true);
                setDomainFeedback({
                    type: 'success',
                    text: data.message || `DNS verification records generated for "${clean}". Configure these DNS records at your registrar, verify DNS, and then confirm to add the custom domain.`,
                });
            }
            else {
                setDomainFeedback({ type: 'error', text: data.error || 'Failed to prepare DNS records for custom domain.' });
            }
        }
        catch {
            setDomainFeedback({ type: 'error', text: 'Network error preparing custom domain DNS.' });
        }
        finally {
            setSaving(false);
        }
    };
    const handleVerifyDns = async (bypassInDev: any = false) => {
        const targetDomain = pendingCustomDomain || website?.custom_domain;
        if (!targetDomain)
            return;
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
                    custom_domain: targetDomain,
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
                    text: data.message || 'DNS Verified! Click Add & Activate Custom Domain below to save and enable it.',
                });
            }
            else {
                setDomainFeedback({
                    type: 'info',
                    text: data.message || 'CNAME or TXT record not detected yet. DNS propagation can take up to 24 hours.',
                });
            }
        }
        catch {
            setDomainFeedback({ type: 'error', text: 'Network error verifying DNS records.' });
        }
        finally {
            setVerifyingDns(false);
        }
    };
    const handleConfirmCustomDomain = async () => {
        const targetDomain = pendingCustomDomain || website?.custom_domain;
        if (!targetDomain)
            return;
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
                    custom_domain: targetDomain,
                    bypassInDev: Boolean(dnsVerificationResult?.canBypassInDev && dnsVerificationResult?.verified),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setDomainFeedback({
                    type: 'success',
                    text: data.message || 'Custom domain verified and activated as live primary domain!',
                });
                setWebsite((prev: any) => ({
                    ...prev,
                    custom_domain: targetDomain,
                    custom_domain_verified: true,
                    custom_domain_record: data.domain,
                }));
                setPendingCustomDomain('');
                setPendingVerificationToken('');
                if (refetchCreator)
                    refetchCreator();
            }
            else {
                setDomainFeedback({ type: 'error', text: data.error || 'DNS verification failed. Custom domain was not added.' });
            }
        }
        catch {
            setDomainFeedback({ type: 'error', text: 'Network error confirming custom domain.' });
        }
        finally {
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
                setWebsite((prev: any) => ({ ...prev, custom_domain: null, custom_domain_verified: false, custom_domain_record: null }));
                setCustomDomainInput('');
                setDomainDnsRecords([]);
                setDnsVerificationResult(null);
                if (refetchCreator)
                    refetchCreator();
            }
            else {
                setDomainFeedback({ type: 'error', text: data.error || 'Failed to disconnect custom domain.' });
            }
        }
        catch {
            setDomainFeedback({ type: 'error', text: 'Network error disconnecting custom domain.' });
        }
        finally {
            setSaving(false);
        }
    };
    const handleCopyText = (val: any, key: any) => {
        if (!val)
            return;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(val);
            setCopiedRecordKey(key);
            setTimeout(() => setCopiedRecordKey(''), 2000);
        }
    };
    const handleAddStaff = async (e: any) => {
        e.preventDefault();
        if (!website?.id)
            return;
        if (!staffForm.name || !staffForm.email || !staffForm.number) {
            setStaffActionMsg({ type: 'error', text: 'Name, email, and phone number are required.' });
            return;
        }
        try {
            setSubmittingStaff(true);
            setStaffActionMsg({ type: '', text: '' });
            const payload: any = {
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
        }
        catch (err: any) {
            setStaffActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSubmittingStaff(false);
        }
    };
    const handleResendVerification = async (staffId: any, staffName: any, staffEmail: any) => {
        if (!website?.id)
            return;
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
        }
        catch (err: any) {
            setStaffActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setResendingStaffId(null);
        }
    };
    const handleToggleStaffActive = async (staffId: any) => {
        if (!website?.id)
            return;
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
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to toggle status.');
            setStaffActionMsg({ type: 'success', text: data.message });
            await fetchStaffs(website.id);
        }
        catch (err: any) {
            setStaffActionMsg({ type: 'error', text: err.message });
        }
    };
    const handleRevokeStaffSessions = async (staffId: any) => {
        if (!website?.id)
            return;
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
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to terminate sessions.');
            setStaffActionMsg({ type: 'success', text: data.message });
            await fetchStaffs(website.id);
        }
        catch (err: any) {
            setStaffActionMsg({ type: 'error', text: err.message });
        }
    };
    const handleDeleteStaff = async (staffId: any, staffName: any) => {
        try {
            setStaffActionMsg({ type: '', text: '' });
            const res = await fetch(`/api/marketing/creator/websites/staffs?staffId=${staffId}&websiteId=${website.id}&creatorId=${creatorId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to remove staff member.');
            setStaffActionMsg({ type: 'success', text: `Staff member "${staffName}" removed successfully.` });
            await fetchStaffs(website.id);
        }
        catch (err: any) {
            setStaffActionMsg({ type: 'error', text: err.message });
        }
    };
    const handleOpenEditPerms = (staff: any) => {
        setTargetStaff(staff);
        setEditPermsMap(staff.permissions || {});
        setShowEditPermsModal(true);
    };
    const handleSavePermissions = async (e: any) => {
        e.preventDefault();
        if (!targetStaff || !website?.id)
            return;
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
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to update permissions.');
            setStaffActionMsg({ type: 'success', text: 'Module permissions updated successfully.' });
            setShowEditPermsModal(false);
            await fetchStaffs(website.id);
        }
        catch (err: any) {
            setStaffActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSavingPerms(false);
        }
    };
    const handleOpenEditProfile = (staff: any) => {
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
    const handleSaveProfile = async (e: any) => {
        e.preventDefault();
        if (!targetStaff || !website?.id)
            return;
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
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to update staff profile.');
            setStaffActionMsg({ type: 'success', text: 'Staff profile updated successfully.' });
            setShowEditProfileModal(false);
            await fetchStaffs(website.id);
        }
        catch (err: any) {
            setStaffActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSavingProfile(false);
        }
    };
    const fetchAcademics = useCallback(async () => {
        if (!domainParam)
            return;
        try {
            setLoadingAcademics(true);
            const [cfgRes, sessRes, deptRes, deptInfoRes, deptHeadRes, classRes, secRes, subRes, csRes, dayRes, perRes, pcsRes] = await Promise.all([
                fetch(`/api/${domainParam}/staff/panel/academic-config`),
                fetch(`/api/${domainParam}/staff/panel/sessions`),
                fetch(`/api/${domainParam}/staff/panel/departments`),
                fetch(`/api/${domainParam}/staff/panel/department-information`),
                fetch(`/api/${domainParam}/staff/panel/dept-heads`),
                fetch(`/api/${domainParam}/staff/panel/classes`),
                fetch(`/api/${domainParam}/staff/panel/sections`),
                fetch(`/api/${domainParam}/staff/panel/subjects`),
                fetch(`/api/${domainParam}/staff/panel/class-subjects`),
                fetch(`/api/${domainParam}/staff/panel/days`),
                fetch(`/api/${domainParam}/staff/panel/periods`),
                fetch(`/api/${domainParam}/staff/panel/period-class-subjects`),
            ]);
            const [cfgData, sessData, deptData, deptInfoData, deptHeadData, classData, secData, subData, csData, dayData, perData, pcsData] = await Promise.all([
                cfgRes.json().catch(() => null),
                sessRes.json().catch(() => null),
                deptRes.json().catch(() => null),
                deptInfoRes.json().catch(() => null),
                deptHeadRes.json().catch(() => null),
                classRes.json().catch(() => null),
                secRes.json().catch(() => null),
                subRes.json().catch(() => null),
                csRes.json().catch(() => null),
                dayRes.json().catch(() => null),
                perRes.json().catch(() => null),
                pcsRes.json().catch(() => null),
            ]);
            if (cfgData?.success && cfgData.config) {
                const cfgLabels = typeof cfgData.config.labels === 'object' && cfgData.config.labels !== null ? cfgData.config.labels : {};
                setAcademicConfig({
                    hierarchy_type: cfgData.config.hierarchy_type || 'CLASS_SEC',
                    use_department: Boolean(cfgData.config.use_department),
                    use_session: cfgData.config.use_session !== false,
                    use_class: cfgData.config.use_class !== false,
                    use_section: cfgData.config.use_section !== false,
                    require_department: Boolean(cfgData.config.require_department),
                    require_session: cfgData.config.require_session !== false,
                    require_class: cfgData.config.require_class !== false,
                    require_section: Boolean(cfgData.config.require_section),
                    labels: {
                        department: cfgLabels.department || 'Department',
                        session: cfgLabels.session || 'Academic Year',
                        class: cfgLabels.class || 'Class',
                        section: cfgLabels.section || 'Section',
                    },
                });
            }
            if (sessData?.success)
                setAcademicSessions(sessData.sessions || []);
            if (deptData?.success)
                setAcademicDepts(deptData.departments || []);
            if (deptInfoData?.success)
                setAcademicDeptInfos(deptInfoData.department_information || []);
            if (deptHeadData?.success)
                setAcademicDeptHeads(deptHeadData.dept_heads || []);
            if (classData?.success)
                setAcademicClasses(classData.classes || []);
            if (secData?.success)
                setAcademicSections(secData.sections || []);
            if (subData?.success)
                setAcademicSubjects(subData.subjects || []);
            if (csData?.success)
                setAcademicClassSubjects(csData.classSubjects || []);
            if (dayData?.success) {
                const loadedDays = dayData.days || [];
                setAcademicDays(loadedDays);
                if (loadedDays.length > 0) {
                    setPeriodForm((prev: any) => prev.day_id ? prev : { ...prev, day_id: String(loadedDays[0].id) });
                }
            }
            if (perData?.success)
                setAcademicPeriods(perData.periods || []);
            if (pcsData?.success)
                setAcademicRoutines(pcsData.routines || []);
        }
        catch {
            setAcademicActionMsg({ type: 'error', text: 'Failed to load institutional academic records.' });
        }
        finally {
            setLoadingAcademics(false);
        }
    }, [domainParam]);
    const handleSaveAcademicConfig = async (e: any) => {
        e.preventDefault();
        try {
            setSavingAcademicConfig(true);
            setAcademicActionMsg({ type: '', text: '' });
            const res = await fetch(`/api/${domainParam}/staff/panel/academic-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(academicConfig),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to save hierarchy configuration.');
            setAcademicActionMsg({ type: 'success', text: 'Primary academic hierarchy configuration saved.' });
            fetchAcademics();
        }
        catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSavingAcademicConfig(false);
        }
    };
    const handleCreateSession = async (e: any) => {
        e.preventDefault();
        if (!sessionForm.name.trim())
            return;
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: sessionForm.name.trim(), status: sessionForm.status || 'active' }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to add session.');
            setSessionForm({ name: '', status: 'active' });
            setAcademicActionMsg({ type: 'success', text: 'Academic session added.' });
            fetchAcademics();
        }
        catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSubmittingAcademic(false);
        }
    };
    const handleUpdateSession = async (id: any) => {
        if (!editingSessionForm.name.trim()) return;
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/sessions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name: editingSessionForm.name.trim(), status: editingSessionForm.status }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to update session.');
            setEditingSessionId(null);
            setAcademicActionMsg({ type: 'success', text: 'Session updated.' });
            fetchAcademics();
        } catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingAcademic(false);
        }
    };
    const handleOpenDeptProfile = (dept: any) => {
        const info = academicDeptInfos.find((i: any) => String(i.department_id) === String(dept.id)) || {};
        const head = academicDeptHeads.find((h: any) => String(h.department_id) === String(dept.id)) || dept.dept_head || {};
        setDeptProfileModal({ open: true, department: dept });
        setDeptProfileForm({
            motto: info.motto || '',
            summary: info.summary || '',
            description: info.description || '',
            expected_cost: info.expected_cost ?? '0',
            head_id: head.id || null,
            head_name: head.name || '',
            head_title: head.title || '',
            head_designation: head.designation || 'Head of Department',
            head_email: head.email || '',
            head_phone: head.phone || '',
            head_bio: head.bio || '',
            head_message: head.message || '',
            head_is_active: head.is_active !== false,
            head_image: head.image || '',
            head_image_file: null,
        });
    };
    const handleSaveDeptProfileAndHead = async (e: any) => {
        e.preventDefault();
        const dept = deptProfileModal.department;
        if (!dept?.id) return;
        try {
            setSubmittingAcademic(true);
            setAcademicActionMsg({ type: '', text: '' });
            const infoRes = await fetch(`/api/${domainParam}/staff/panel/department-information`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    department_id: dept.id,
                    motto: deptProfileForm.motto.trim(),
                    summary: deptProfileForm.summary.trim(),
                    description: deptProfileForm.description.trim(),
                    expected_cost: deptProfileForm.expected_cost || 0,
                }),
            });
            const infoData = await infoRes.json();
            if (!infoRes.ok || !infoData.success)
                throw new Error(infoData.error || 'Failed to save department information.');

            if (deptProfileForm.head_name.trim()) {
                const fd = new FormData();
                fd.append('department_id', String(dept.id));
                if (deptProfileForm.head_id) fd.append('id', String(deptProfileForm.head_id));
                fd.append('name', deptProfileForm.head_name.trim());
                fd.append('title', deptProfileForm.head_title.trim());
                fd.append('designation', deptProfileForm.head_designation.trim() || 'Head of Department');
                fd.append('email', deptProfileForm.head_email.trim());
                fd.append('phone', deptProfileForm.head_phone.trim());
                fd.append('bio', deptProfileForm.head_bio.trim());
                fd.append('message', deptProfileForm.head_message.trim());
                fd.append('is_active', String(Boolean(deptProfileForm.head_is_active)));
                if (deptProfileForm.head_image_file) {
                    fd.append('image', deptProfileForm.head_image_file);
                }
                const headRes = await fetch(`/api/${domainParam}/staff/panel/dept-heads`, {
                    method: deptProfileForm.head_id ? 'PUT' : 'POST',
                    body: fd,
                });
                const headData = await headRes.json();
                if (!headRes.ok || !headData.success)
                    throw new Error(headData.error || 'Failed to save department head.');
            }
            setDeptProfileModal({ open: false, department: null });
            setAcademicActionMsg({ type: 'success', text: `Department information & head updated for ${dept.name}.` });
            fetchAcademics();
        } catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingAcademic(false);
        }
    };
    const handleToggleDayStatus = async (day: any) => {
        try {
            setSubmittingAcademic(true);
            const nextStatus = day.status === 'off' ? 'on' : 'off';
            const res = await fetch(`/api/${domainParam}/staff/panel/days`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: day.id, status: nextStatus }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to update day.');
            fetchAcademics();
        } catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingAcademic(false);
        }
    };
    const handleResetStandardDays = async () => {
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/days`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset_standard' }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to reset days.');
            setAcademicActionMsg({ type: 'success', text: data.message });
            fetchAcademics();
        } catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingAcademic(false);
        }
    };
    const handleCreateDay = async (e: any) => {
        e.preventDefault();
        if (!dayForm.name.trim())
            return;
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/days`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: dayForm.name.trim(),
                    day_order: Number(dayForm.day_order) || academicDays.length + 1,
                    status: dayForm.status === 'off' ? 'off' : 'on',
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to add day.');
            setDayForm({ name: '', day_order: academicDays.length + 2, status: 'on' });
            setAcademicActionMsg({ type: 'success', text: 'Working day added.' });
            fetchAcademics();
        }
        catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSubmittingAcademic(false);
        }
    };
    const handleCreatePeriod = async (e: any) => {
        e.preventDefault();
        const targetDayId = periodForm.day_id || (academicDays[0]?.id ? String(academicDays[0].id) : '');
        if (!periodForm.name.trim() || !targetDayId)
            return;
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/periods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_id: Number(targetDayId),
                    name: periodForm.name.trim(),
                    start_time: periodForm.start_time,
                    end_time: periodForm.end_time,
                    is_break: Boolean(periodForm.is_break),
                    apply_to_all_active_days: Boolean(periodForm.apply_to_all_active_days),
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to add period.');
            setPeriodForm((prev: any) => ({ ...prev, name: '', start_time: '09:00', end_time: '09:45', is_break: false }));
            setAcademicActionMsg({ type: 'success', text: 'Routine period added.' });
            fetchAcademics();
        }
        catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSubmittingAcademic(false);
        }
    };
    const handleSyncPeriodsToActiveDays = async () => {
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/periods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync_to_active_days' }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to synchronize periods.');
            setAcademicActionMsg({ type: 'success', text: data.message });
            fetchAcademics();
        } catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingAcademic(false);
        }
    };
    const handleUpdatePeriod = async (id: any) => {
        if (!editingPeriodForm.name.trim()) return;
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/periods`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    name: editingPeriodForm.name.trim(),
                    start_time: editingPeriodForm.start_time,
                    end_time: editingPeriodForm.end_time,
                    is_break: Boolean(editingPeriodForm.is_break),
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to update period.');
            setEditingPeriodId(null);
            setAcademicActionMsg({ type: 'success', text: 'Period updated.' });
            fetchAcademics();
        } catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingAcademic(false);
        }
    };
    const handleSaveClassSubject = async (e: any) => {
        e.preventDefault();
        if (!classSubjectForm.class_id || !classSubjectForm.subject_id) {
            setAcademicActionMsg({ type: 'error', text: 'Select both a Class and a Subject to map.' });
            return;
        }
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/class-subjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class_id: Number(classSubjectForm.class_id),
                    subject_id: Number(classSubjectForm.subject_id),
                    full_marks: Number(classSubjectForm.full_marks) || 100,
                    pass_marks: Number(classSubjectForm.pass_marks) || 33,
                    is_optional: Boolean(classSubjectForm.is_optional),
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to map subject to class.');
            setAcademicActionMsg({ type: 'success', text: 'Subject mapped to class.' });
            fetchAcademics();
        } catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingAcademic(false);
        }
    };
    const handleUpdateClassSubject = async (id: any) => {
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/class-subjects`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    full_marks: Number(editingClassSubjectMarks.full_marks) || 100,
                    pass_marks: Number(editingClassSubjectMarks.pass_marks) || 33,
                    is_optional: Boolean(editingClassSubjectMarks.is_optional),
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to update marks.');
            setEditingClassSubjectId(null);
            setAcademicActionMsg({ type: 'success', text: 'Class subject marks updated.' });
            fetchAcademics();
        } catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingAcademic(false);
        }
    };
    const handleCreateRoutineSlot = async (e: any) => {
        e.preventDefault();
        if (!routineForm.period_id || !routineForm.class_subject_id) {
            setAcademicActionMsg({ type: 'error', text: 'Select Period and Class Subject to assign timetable slot.' });
            return;
        }
        try {
            setSubmittingAcademic(true);
            const res = await fetch(`/api/${domainParam}/staff/panel/period-class-subjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    period_id: Number(routineForm.period_id),
                    class_subject_id: Number(routineForm.class_subject_id),
                    section_id: routineForm.section_id ? Number(routineForm.section_id) : null,
                    session_id: routineForm.session_id ? Number(routineForm.session_id) : null,
                    room_number: routineForm.room_number.trim() || null,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to assign routine slot.');
            setRoutineForm((prev: any) => ({ ...prev, room_number: '' }));
            setAcademicActionMsg({ type: 'success', text: 'Class routine timetable slot saved.' });
            fetchAcademics();
        } catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingAcademic(false);
        }
    };
    const handleSaveDept = async (e: any) => {
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
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to save department.');
            setAcademicActionMsg({ type: 'success', text: data.message || 'Department saved successfully.' });
            setDeptModal({ open: false, editing: null });
            fetchAcademics();
        }
        catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSubmittingAcademic(false);
        }
    };
    const handleSaveClass = async (e: any) => {
        e.preventDefault();
        if (!classForm.name.trim()) {
            setAcademicActionMsg({ type: 'error', text: 'Class name is required.' });
            return;
        }
        try {
            setSubmittingAcademic(true);
            setAcademicActionMsg({ type: '', text: '' });
            const method = classModal.editing ? 'PUT' : 'POST';
            const body: any = {
                name: classForm.name.trim(),
                code: classForm.code.trim(),
                department_id: classForm.department_id ? classForm.department_id : null,
                max_seats: Number(classForm.max_seats) || 40,
                description: (classForm.description || '').trim(),
            };
            if (classModal.editing)
                body.id = classModal.editing.id;
            const res = await fetch(`/api/${domainParam}/staff/panel/classes`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to save class.');
            setAcademicActionMsg({ type: 'success', text: data.message || 'Class saved successfully.' });
            setClassModal({ open: false, editing: null });
            fetchAcademics();
        }
        catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSubmittingAcademic(false);
        }
    };
    const handleSaveSection = async (e: any) => {
        e.preventDefault();
        if (academicConfig.use_class && academicConfig.require_class && !sectionForm.class_id) {
            setAcademicActionMsg({ type: 'error', text: `Parent ${academicConfig.labels.class} selection is required.` });
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
            const body: any = {
                class_id: sectionForm.class_id || null,
                department_id: sectionForm.department_id || null,
                session_id: sectionForm.session_id || null,
                name: sectionForm.name.trim(),
                capacity: Number(sectionForm.capacity) || 40,
                room_number: sectionForm.room_number.trim(),
            };
            if (sectionModal.editing)
                body.id = sectionModal.editing.id;
            const res = await fetch(`/api/${domainParam}/staff/panel/sections`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to save section.');
            setAcademicActionMsg({ type: 'success', text: data.message || 'Section saved successfully.' });
            setSectionModal({ open: false, editing: null });
            fetchAcademics();
        }
        catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSubmittingAcademic(false);
        }
    };
    const handleSaveSubject = async (e: any) => {
        e.preventDefault();
        if (academicConfig.use_class && academicConfig.require_class && !subjectForm.class_id) {
            setAcademicActionMsg({ type: 'error', text: `Parent ${academicConfig.labels.class} selection is required.` });
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
            const body: any = {
                class_id: subjectForm.class_id || null,
                name: subjectForm.name.trim(),
                code: subjectForm.code.trim(),
                type: subjectForm.type || 'Theory',
                description: subjectForm.description.trim(),
            };
            if (subjectModal.editing)
                body.id = subjectModal.editing.id;
            const res = await fetch(`/api/${domainParam}/staff/panel/subjects`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to save subject.');
            setAcademicActionMsg({ type: 'success', text: data.message || 'Subject saved successfully.' });
            setSubjectModal({ open: false, editing: null });
            fetchAcademics();
        }
        catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        }
        finally {
            setSubmittingAcademic(false);
        }
    };
    const handleConfirmDeleteAcademic = async () => {
        if (!academicDeleteTarget)
            return;
        try {
            setDeletingAcademic(true);
            let endpoint = '';
            if (academicDeleteTarget.type === 'department')
                endpoint = `/api/${domainParam}/staff/panel/departments?id=${academicDeleteTarget.id}`;
            if (academicDeleteTarget.type === 'class')
                endpoint = `/api/${domainParam}/staff/panel/classes?id=${academicDeleteTarget.id}`;
            if (academicDeleteTarget.type === 'section')
                endpoint = `/api/${domainParam}/staff/panel/sections?id=${academicDeleteTarget.id}`;
            if (academicDeleteTarget.type === 'subject')
                endpoint = `/api/${domainParam}/staff/panel/subjects?id=${academicDeleteTarget.id}`;
            if (academicDeleteTarget.type === 'session')
                endpoint = `/api/${domainParam}/staff/panel/sessions?id=${academicDeleteTarget.id}`;
            if (academicDeleteTarget.type === 'day')
                endpoint = `/api/${domainParam}/staff/panel/days?id=${academicDeleteTarget.id}`;
            if (academicDeleteTarget.type === 'period')
                endpoint = `/api/${domainParam}/staff/panel/periods?id=${academicDeleteTarget.id}`;
            if (academicDeleteTarget.type === 'class_subject')
                endpoint = `/api/${domainParam}/staff/panel/class-subjects?id=${academicDeleteTarget.id}`;
            if (academicDeleteTarget.type === 'routine')
                endpoint = `/api/${domainParam}/staff/panel/period-class-subjects?id=${academicDeleteTarget.id}`;
            if (academicDeleteTarget.type === 'dept_head')
                endpoint = `/api/${domainParam}/staff/panel/dept-heads?id=${academicDeleteTarget.id}`;
            const res = await fetch(endpoint, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.error || 'Failed to delete record.');
            setAcademicActionMsg({ type: 'success', text: data.message || 'Record deleted successfully.' });
            setAcademicDeleteTarget(null);
            fetchAcademics();
        }
        catch (err: any) {
            setAcademicActionMsg({ type: 'error', text: err.message });
        }
        finally {
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
                setShowDeleteWebsiteModal(false);
                if (data.website) {
                    setWebsite((prev: any) => ({ ...prev, ...data.website }));
                }
                setSaveSuccess(data.message || 'Website scheduled for permanent deletion in 30 days.');
                if (refetchCreator)
                    await refetchCreator();
            }
            else {
                setDeleteWebsiteError(data.error || 'Failed to schedule website deletion');
            }
        }
        catch {
            setDeleteWebsiteError('Network error scheduling website deletion');
        }
        finally {
            setDeleting(false);
        }
    };
    const handleCancelScheduledDeletion = async () => {
        setDeleting(true);
        setSaveError('');
        setSaveSuccess('');
        try {
            const res = await fetch('/api/marketing/creator/websites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'cancel_delete_website',
                    id: website.id,
                    creatorId: Number(creatorId),
                }),
            });
            const data = await res.json();
            if (data.success) {
                if (data.website) {
                    setWebsite((prev: any) => ({ ...prev, ...data.website }));
                }
                setSaveSuccess(data.message || 'Scheduled deletion cancelled.');
                if (refetchCreator)
                    await refetchCreator();
            }
            else {
                setSaveError(data.error || 'Failed to cancel scheduled deletion.');
            }
        }
        catch {
            setSaveError('Network error cancelling scheduled deletion.');
        }
        finally {
            setDeleting(false);
        }
    };
    if (loading) {
        return <LoadingScreen fullScreen={false} label="Loading website configuration..."/>;
    }
    if (loadError || !website) {
        return (<div className="w-full py-12 text-center space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Website Not Found</h2>
        <p className="text-xs text-slate-500">{loadError || 'The requested website could not be found.'}</p>
        <Link href={`/creator/${creatorId}/workspace`} className="inline-block px-3 py-1.5 rounded bg-slate-900 text-white font-medium text-xs hover:bg-slate-800">
          Return to Workspace
        </Link>
      </div>);
    }
    const cleanSub = (website.subdomain || website.slug || '').split('.')[0];
    const isDevHost = baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+/.test(baseDomain) || baseDomain.includes(':');
    const tenantProto = isDevHost ? 'http' : 'https';
    const liveUrl = website.custom_domain && website.custom_domain_verified
        ? `https://${website.custom_domain}`
        : `${tenantProto}://${cleanSub}.${baseDomain}`;
    const localPreviewPath = `/${cleanSub}`;
    return (<div className="w-full space-y-4 text-slate-800 text-xs pb-16">
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Link href={`/creator/${creatorId}/workspace`} className="text-slate-500 hover:text-slate-800 font-medium">
              Websites
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">{website.name}</span>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${!isMaintenanceMode
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
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
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors">
            Visit Live Site
          </a>

          <button type="button" onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveSuccess && (<div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <span>{saveSuccess}</span>
          <button type="button" onClick={() => setSaveSuccess('')} className="text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>)}

      {saveError && (<div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <span>{saveError}</span>
          <button type="button" onClick={() => setSaveError('')} className="text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>)}

      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
            { id: 'domains', label: 'Domains & DNS' },
            { id: 'modules', label: 'Package & Modules' },
            { id: 'staffs', label: `Staff Members (${staffsList.length})` },
            { id: 'academics', label: 'Academic Setup' },
            { id: 'verification', label: 'Verification & KYC' },
            { id: 'general', label: 'Institutional Profile' },
            { id: 'branding', label: 'Appearance & Themes' },
            { id: 'portals', label: 'Direct Portals' },
            { id: 'danger', label: 'Danger Zone' },
        ].map((tab: any) => (<button key={tab.id} type="button" onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'staffs' && website?.id)
                    fetchStaffs(website.id);
                if (tab.id === 'academics')
                    fetchAcademics();
            }} className={`px-3.5 py-2 font-medium text-xs border-b-2 whitespace-nowrap transition-colors cursor-pointer ${activeTab === tab.id
                ? 'border-slate-900 text-slate-900 bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
            {tab.label}
          </button>))}
      </div>

      {website?.deletion_scheduled_at && (<div className="p-3 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-wrap items-center justify-between gap-2">
          <span>
            This website is scheduled for automatic permanent deletion on{' '}
            <span className="font-semibold">{new Date(website.deletion_scheduled_at).toLocaleDateString()}</span>.
          </span>
          <button type="button" onClick={() => setActiveTab('danger')} className="px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-medium cursor-pointer">
            Manage Schedule
          </button>
        </div>)}

      {activeTab === 'domains' && (<div className="space-y-4">
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
                <input type="text" value={subdomain} onChange={(e: any) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'))} className="flex-1 bg-white border border-slate-300 rounded-l px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"/>
                <span className="px-3 py-1.5 rounded-r bg-slate-100 border border-l-0 border-slate-300 text-slate-600 font-mono text-xs select-none">
                  .{baseDomain}
                </span>
              </div>

              {subdomainStatus.message && (<div className="text-[11px] font-medium">
                  {subdomainStatus.state === 'available' && (<span className="text-emerald-700">{subdomainStatus.message}</span>)}
                  {subdomainStatus.state === 'taken' && (<span className="text-rose-600">{subdomainStatus.message}</span>)}
                  {subdomainStatus.state === 'checking' && (<span className="text-slate-500">Checking availability...</span>)}
                  {subdomainStatus.state === 'idle' && (<span className="text-slate-400">{subdomainStatus.message}</span>)}
                </div>)}

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-600 flex items-center justify-between">
                <span className="text-[11px]">Direct Address:</span>
                <a href={`${tenantProto}://${cleanSub}.${baseDomain}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-slate-900 hover:underline font-medium">
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

              {website.custom_domain && (<span className={`text-[10px] font-medium px-2 py-0.5 rounded border flex items-center gap-1.5 ${website.custom_domain_verified
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${website.custom_domain_verified ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}/>
                  {website.custom_domain_verified ? 'DNS Verified & Primary Live Domain' : 'DNS Setup & Propagation Pending'}
                </span>)}
            </div>

            <div className="grid grid-cols-4 gap-2 border border-slate-100 bg-slate-50/70 p-2.5 rounded text-[11px]">
              <div className={`flex items-center gap-2 p-1.5 rounded ${!website.custom_domain ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600'}`}>
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>Enter Domain</span>
              </div>
              <div className={`flex items-center gap-2 p-1.5 rounded ${website.custom_domain && !website.custom_domain_verified
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-600'}`}>
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>DNS Records</span>
              </div>
              <div className={`flex items-center gap-2 p-1.5 rounded ${website.custom_domain && verifyingDns
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-600'}`}>
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                <span>Verify DNS</span>
              </div>
              <div className={`flex items-center gap-2 p-1.5 rounded ${website.custom_domain_verified ? 'bg-white font-semibold text-emerald-900 shadow-xs' : 'text-slate-600'}`}>
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  4
                </span>
                <span>Confirm Live</span>
              </div>
            </div>

            {domainFeedback.text && (<div className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${domainFeedback.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : domainFeedback.type === 'info'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                <div className="flex items-center gap-2">
                  <span>{domainFeedback.text}</span>
                </div>
                <button type="button" onClick={() => setDomainFeedback({ type: '', text: '' })} className="text-xs hover:underline cursor-pointer">
                  Dismiss
                </button>
              </div>)}

            {website.custom_domain && website.custom_domain_verified && (<div className="bg-emerald-50/60 border border-emerald-200 rounded p-4 space-y-3">
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
                  <a href={`https://${website.custom_domain}`} target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs cursor-pointer inline-flex items-center gap-1.5">
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
                    <button type="button" onClick={() => setShowDnsDetails((prev: any) => !prev)} className="px-2.5 py-1 rounded border border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-50 font-medium text-xs cursor-pointer">
                      {showDnsDetails ? 'Hide DNS Setup' : 'View DNS Records'}
                    </button>
                    <button type="button" onClick={() => handleVerifyDns(false)} disabled={verifyingDns} className="px-2.5 py-1 rounded border border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-50 font-medium text-xs cursor-pointer disabled:opacity-50">
                      {verifyingDns ? 'Checking...' : 'Re-check DNS Health'}
                    </button>
                    <button type="button" onClick={() => setShowDisconnectConfirm(true)} className="px-2.5 py-1 rounded border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 font-medium text-xs cursor-pointer">
                      Disconnect Domain
                    </button>
                  </div>
                </div>
              </div>)}

            {website.package && website.package.is_available_custom_domain === false ? (<div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-3 max-w-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 text-sm font-bold">
                    🔒
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
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
                  <Link href={`/creator/${creatorId}/workspace/new`} className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs cursor-pointer inline-flex items-center gap-1.5">
                    <span>Upgrade Package</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>) : ((!website.custom_domain || !website.custom_domain_verified) && (<form onSubmit={handleConnectCustomDomain} className="space-y-3 max-w-lg">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Custom Domain Host (Must Verify DNS Before Adding)</label>
                    <p className="text-[11px] text-slate-500">
                      Enter your domain without http:// or https:// (for example, school.edu or portal.campus.org), generate DNS records, verify DNS propagation, and then activate.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="text" aria-label="Custom Domain Host" value={customDomainInput} onChange={(e: any) => setCustomDomainInput(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"/>
                    <button type="submit" disabled={saving} className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50 whitespace-nowrap">
                      {saving ? 'Generating...' : 'Generate & Check DNS'}
                    </button>
                  </div>

                  {customDomainStatus.message && (<div className="text-[11px] font-medium">
                      {customDomainStatus.state === 'available' && (<span className="text-emerald-700">{customDomainStatus.message}</span>)}
                      {customDomainStatus.state === 'taken' && (<span className="text-rose-600">{customDomainStatus.message}</span>)}
                      {customDomainStatus.state === 'invalid' && (<span className="text-slate-500">{customDomainStatus.message}</span>)}
                      {customDomainStatus.state === 'checking' && (<span className="text-slate-500">Checking availability...</span>)}
                    </div>)}
                </form>))}

            {(pendingCustomDomain || website.custom_domain) && (showDnsDetails || !website.custom_domain_verified) && (() => {
                const targetDomain = pendingCustomDomain || website.custom_domain;
                const targetToken = pendingVerificationToken || website.custom_domain_record?.verification_token || 'hiesci-verification';
                const targetParts = targetDomain.split('.');
                const fallbackDnsRecords = [
                    {
                        type: targetParts.length === 2 ? 'A' : 'CNAME',
                        name: targetParts.length === 2 ? '@' : targetParts[0],
                        value: targetParts.length === 2 ? aTarget : cnameTarget,
                        ttl: '3600',
                        description: 'Primary hostname routing record',
                    },
                    {
                        type: 'TXT',
                        name: `_hiesci-challenge${targetParts.length === 2 ? '' : '.' + targetParts[0]}`,
                        value: targetToken,
                        ttl: '3600',
                        description: 'Domain ownership verification challenge',
                    },
                ];
                const resolvedRecords = domainDnsRecords.length > 0 ? domainDnsRecords : fallbackDnsRecords;
                const isTargetAlreadyVerifiedOnServer = Boolean(!pendingCustomDomain && website.custom_domain_verified);
                return (<div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Required DNS Records for: <span className="font-mono text-slate-800">{targetDomain}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Add the following DNS records in your domain registrar or DNS management console (Cloudflare, Namecheap, GoDaddy, etc.):
                      </p>
                    </div>

                    <button type="button" onClick={() => {
                    const allTxt = resolvedRecords
                        .map((r: any) => `${r.type}\t${r.name}\t${r.value}\t${r.ttl}`)
                        .join('\n');
                    handleCopyText(allTxt, 'all');
                }} className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer">
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
                        {resolvedRecords.map((record: any, idx: any) => (<tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${record.type === 'CNAME'
                        ? 'bg-purple-100 text-purple-800'
                        : record.type === 'A'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'}`}>
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
                              <button type="button" onClick={() => handleCopyText(record.value, `val-${idx}`)} className="px-2 py-0.5 rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-[10px] font-sans font-medium cursor-pointer">
                                {copiedRecordKey === `val-${idx}` ? 'Copied!' : 'Copy Value'}
                              </button>
                            </td>
                          </tr>))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Note: After adding the records in your DNS console, propagation typically takes 2 to 15 minutes, but may take up to 24 hours depending on your registrar.
                  </p>
                </div>

                {!isTargetAlreadyVerifiedOnServer && (<div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          Step 3 & 4: Verify DNS & Add Custom Domain
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Verify live DNS propagation first. Custom domains can only be saved and activated after DNS verification passes.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleVerifyDns(false)} disabled={verifyingDns} className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                          {verifyingDns ? 'Checking DNS Records...' : 'Verify DNS Records'}
                        </button>

                        {dnsVerificationResult?.canBypassInDev && (<button type="button" onClick={() => handleVerifyDns(true)} disabled={verifyingDns} className="px-3 py-1.5 rounded border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-medium text-xs cursor-pointer disabled:opacity-50">
                            Simulate DNS Verified (Dev Mode)
                          </button>)}
                      </div>
                    </div>

                    {dnsVerificationResult && !dnsVerificationResult.verified && (<div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                        {dnsVerificationResult.message}
                      </div>)}

                    {dnsVerificationResult?.verified && (<div className="p-3 rounded bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-emerald-900">
                            DNS Records Verified for {targetDomain}
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            Your domain ownership and DNS routing passed verification. Click below to add and activate this custom domain.
                          </p>
                        </div>
                        <button type="button" onClick={handleConfirmCustomDomain} disabled={confirmingDomain} className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer disabled:opacity-50 shadow-xs">
                          {confirmingDomain ? 'Activating...' : 'Add & Activate Custom Domain'}
                        </button>
                      </div>)}
                  </div>)}
              </div>);
            })()}

            {showDisconnectConfirm && (<div className="p-3.5 rounded bg-rose-50 border border-rose-200 space-y-2 text-xs">
                <div className="font-semibold text-rose-900">Disconnect Custom Domain?</div>
                <p className="text-rose-700">
                  Are you sure you want to disconnect <code>{website.custom_domain}</code>? Incoming visitor traffic will automatically revert to your platform subdomain (<code>{subdomain}.{baseDomain}</code>).
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button type="button" onClick={handleDisconnectCustomDomain} disabled={saving} className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                    {saving ? 'Disconnecting...' : 'Yes, Disconnect Domain'}
                  </button>
                  <button type="button" onClick={() => setShowDisconnectConfirm(false)} className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>)}
          </div>
        </div>)}

      {activeTab === 'modules' && (<div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Current Package Plan
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${website?.subscription_is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {website?.subscription_status || website?.package?.subscription_status || 'Inactive'}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {website?.package?.name || 'No Package Linked'}
                </h2>
                {website?.package?.subscription_period_end && (<div className="text-[11px] text-slate-500 font-mono">
                    Billing Cycle: {website.package.subscription_billing_cycle || 'Monthly'} • Valid Until:{' '}
                    {new Date(website.package.subscription_period_end).toLocaleDateString()}
                  </div>)}
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  {website?.package?.short_description || website?.package?.description || 'Comprehensive institutional management and campus portal automation suite.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/creator/${creatorId}/workspace/new`} className="px-3.5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer inline-flex items-center gap-1.5">
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
                <div className={`p-3 rounded border flex items-center justify-between gap-2 ${website?.package?.is_available_student_panel
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold">Student Portal</div>
                    <div className="text-[11px] opacity-80">Online student dashboard & grades</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${website?.package?.is_available_student_panel
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'}`}>
                    {website?.package?.is_available_student_panel ? 'Included' : 'Locked'}
                  </span>
                </div>

                <div className={`p-3 rounded border flex items-center justify-between gap-2 ${website?.package?.is_available_teacher_panel
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold">Teacher Portal</div>
                    <div className="text-[11px] opacity-80">Faculty marks, routine & assignments</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${website?.package?.is_available_teacher_panel
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'}`}>
                    {website?.package?.is_available_teacher_panel ? 'Included' : 'Locked'}
                  </span>
                </div>

                <div className={`p-3 rounded border flex items-center justify-between gap-2 ${website?.package?.is_available_custom_domain
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/60 border-amber-200 text-amber-950'}`}>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold">Custom Domain</div>
                    <div className="text-[11px] opacity-80">Institutional root domain & SSL</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${website?.package?.is_available_custom_domain
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'}`}>
                    {website?.package?.is_available_custom_domain ? 'Included' : 'Locked'}
                  </span>
                </div>
              </div>
            </div>

            {Array.isArray(website?.package?.features) && website.package.features.length > 0 && (<div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-900">
                  Additional Included Features
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {website.package.features.map((feat: any, idx: any) => (<span key={idx} className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs inline-flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{typeof feat === 'string' ? feat : feat?.name || JSON.stringify(feat)}</span>
                    </span>))}
                </div>
              </div>)}
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
                  <button type="button" onClick={() => setModuleViewType('all')} className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${moduleViewType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                    All Modules ({(website?.allowed_home_modules?.length || 0) + (website?.allowed_control_modules?.length || 0)})
                  </button>
                  <button type="button" onClick={() => setModuleViewType('home')} className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${moduleViewType === 'home' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Public Home Modules ({website?.allowed_home_modules?.length || 0})
                  </button>
                  <button type="button" onClick={() => setModuleViewType('control')} className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${moduleViewType === 'control' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Staff Control Modules ({website?.allowed_control_modules?.length || 0})
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Search Modules by Name or Path</label>
                <input type="text" aria-label="Search Modules by Name or Path" value={moduleSearch} onChange={(e: any) => setModuleSearch(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div className="w-48 shrink-0">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Filter by Category</label>
                <select aria-label="Filter by Category" value={moduleCategoryFilter} onChange={(e: any) => setModuleCategoryFilter(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800">
                  <option value="all">All Categories</option>
                  {Array.from(new Set([
                ...(website?.allowed_home_modules || []).map((m: any) => m.category).filter(Boolean),
                ...(website?.allowed_control_modules || []).map((m: any) => m.category).filter(Boolean),
            ])).map((cat: any) => (<option key={cat} value={cat}>
                      {cat}
                    </option>))}
                </select>
              </div>

              {(moduleSearch || moduleCategoryFilter !== 'all') && (<div className="self-end pb-0.5">
                  <button type="button" onClick={() => {
                    setModuleSearch('');
                    setModuleCategoryFilter('all');
                }} className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer">
                    Reset Filters
                  </button>
                </div>)}
            </div>

            {(moduleViewType === 'all' || moduleViewType === 'home') && (<div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Public Institutional Website Modules
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {(website?.allowed_home_modules || []).filter((m: any) => {
                    if (moduleCategoryFilter !== 'all' && m.category?.toLowerCase() !== moduleCategoryFilter.toLowerCase())
                        return false;
                    if (moduleSearch.trim()) {
                        const q = moduleSearch.trim().toLowerCase();
                        return (m.name?.toLowerCase().includes(q) ||
                            m.category?.toLowerCase().includes(q) ||
                            m.description?.toLowerCase().includes(q) ||
                            m.path?.toLowerCase().includes(q));
                    }
                    return true;
                }).length} of {website?.allowed_home_modules?.length || 0}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(website?.allowed_home_modules || [])
                    .filter((m: any) => {
                    if (moduleCategoryFilter !== 'all' && m.category?.toLowerCase() !== moduleCategoryFilter.toLowerCase())
                        return false;
                    if (moduleSearch.trim()) {
                        const q = moduleSearch.trim().toLowerCase();
                        return (m.name?.toLowerCase().includes(q) ||
                            m.category?.toLowerCase().includes(q) ||
                            m.description?.toLowerCase().includes(q) ||
                            m.path?.toLowerCase().includes(q));
                    }
                    return true;
                })
                    .map((mod: any) => (<div key={mod.id || mod.path} className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors">
                        <div className="space-y-1.5">


                          <h5 className="text-sm font-bold text-slate-900">{mod.name}</h5>


                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {mod.description || 'Public institutional module active for student and visitor navigation.'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-500">Public Portal Page</span>
                          <a href={website?.custom_domain && website.custom_domain_verified
                        ? `https://${website.custom_domain}${mod.path || '/'}`
                        : `http://${cleanSub}.${baseDomain}${mod.path || '/'}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-800 hover:text-slate-950 inline-flex items-center gap-1 hover:underline cursor-pointer">
                            <span>Open Page</span>
                            <span>↗</span>
                          </a>
                        </div>
                      </div>))}
                </div>
              </div>)}

            {(moduleViewType === 'all' || moduleViewType === 'control') && (<div className="space-y-3 pt-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Administrative Staff Control Modules
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {(website?.allowed_control_modules || []).filter((m: any) => {
                    if (moduleCategoryFilter !== 'all' && m.category?.toLowerCase() !== moduleCategoryFilter.toLowerCase())
                        return false;
                    if (moduleSearch.trim()) {
                        const q = moduleSearch.trim().toLowerCase();
                        return (m.name?.toLowerCase().includes(q) ||
                            m.category?.toLowerCase().includes(q) ||
                            m.description?.toLowerCase().includes(q) ||
                            m.path?.toLowerCase().includes(q));
                    }
                    return true;
                }).length} of {website?.allowed_control_modules?.length || 0}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(website?.allowed_control_modules || [])
                    .filter((m: any) => {
                    if (moduleCategoryFilter !== 'all' && m.category?.toLowerCase() !== moduleCategoryFilter.toLowerCase())
                        return false;
                    if (moduleSearch.trim()) {
                        const q = moduleSearch.trim().toLowerCase();
                        return (m.name?.toLowerCase().includes(q) ||
                            m.category?.toLowerCase().includes(q) ||
                            m.description?.toLowerCase().includes(q) ||
                            m.path?.toLowerCase().includes(q));
                    }
                    return true;
                })
                    .map((mod: any) => (<div key={mod.id || mod.path} className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors">
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
                          <a href={website?.custom_domain && website.custom_domain_verified
                        ? `https://${website.custom_domain}${mod.path || '/staff-panel'}`
                        : (baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1')
                            ? `/${cleanSub}${mod.path || '/staff-panel'}`
                            : `http://${cleanSub}.${baseDomain}${mod.path || '/staff-panel'}`)} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-800 hover:text-slate-950 inline-flex items-center gap-1 hover:underline cursor-pointer">
                            <span>Open Workstation</span>
                            <span>↗</span>
                          </a>
                        </div>
                      </div>))}
                </div>
              </div>)}
          </div>
        </div>)}

      {activeTab === 'staffs' && (<div className="space-y-4">
          {staffActionMsg.text && (<div className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${staffActionMsg.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              <span>{staffActionMsg.text}</span>
              <button type="button" onClick={() => setStaffActionMsg({ type: '', text: '' })} className="hover:underline">
                Dismiss
              </button>
            </div>)}

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
              <button type="button" onClick={() => fetchStaffs(website?.id)} disabled={loadingStaffs} className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer disabled:opacity-50">
                {loadingStaffs ? 'Refreshing...' : 'Refresh'}
              </button>
              <button type="button" onClick={() => setShowAddStaffModal(true)} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer">
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
                {staffsList.filter((s: any) => s.is_active).length}
              </span>
              <span className="text-[10px] text-slate-500">Allowed system login</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Setup Complete</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">
                {staffsList.filter((s: any) => s.is_registered).length} of {staffsList.length}
              </span>
              <span className="text-[10px] text-slate-500">Verified credentials</span>
            </div>
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Sessions</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">
                {staffsList.reduce((acc: any, s: any) => acc + (s.activeSessions || 0), 0)}
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
                  {staffsList.length === 0 ? (<tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        {loadingStaffs
                    ? 'Loading staff members...'
                    : 'No staff members onboarded yet. Click "+ Add Staff Member" to add one and send a verification email.'}
                      </td>
                    </tr>) : (staffsList.map((s: any) => {
                const allowedPerms = Object.entries(s.permissions || {}).filter(([_, p]: any) => p.can_view);
                return (<tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5">
                            <div className="font-medium text-slate-900">{s.name}</div>
                            <div className="text-[11px] text-slate-500">{s.email}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{s.phone || s.number}</div>
                          </td>

                          <td className="py-2.5">
                            {s.grade_name ? (<span className="text-xs font-medium text-slate-800">{s.grade_name}</span>) : (<span className="text-xs text-slate-400">Standard / Unassigned</span>)}
                          </td>

                          <td className="py-2.5">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${s.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                {s.is_active ? 'Active' : 'Inactive'}
                              </span>

                              {s.locked_until && new Date(s.locked_until) > new Date() && (<span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">
                                  Account Locked
                                </span>)}

                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${s.is_registered
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {s.is_registered ? 'Setup Complete' : 'Pending Verification'}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-700">
                                {s.activeSessions || 0} device(s)
                              </span>
                              {s.activeSessions > 0 && (<button type="button" onClick={() => handleRevokeStaffSessions(s.id)} className="text-[10px] text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer">
                                  Revoke
                                </button>)}
                            </div>
                          </td>

                          <td className="py-2.5">
                            {allowedPerms.length === 0 ? (<span className="text-xs text-slate-400 italic">No modules assigned</span>) : (<div className="flex flex-wrap gap-1 max-w-xs">
                                {allowedPerms.slice(0, 4).map(([slug]: any) => (<span key={slug} className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-mono">
                                    {slug}
                                  </span>))}
                                {allowedPerms.length > 4 && (<span className="text-[9px] text-slate-500 font-medium self-center">
                                    +{allowedPerms.length - 4} more
                                  </span>)}
                              </div>)}
                          </td>

                          <td className="py-2.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {!s.is_registered && (<button type="button" disabled={resendingStaffId === s.id} onClick={() => handleResendVerification(s.id, s.name, s.email)} className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[11px] cursor-pointer disabled:opacity-50">
                                  {resendingStaffId === s.id ? 'Sending...' : 'Resend Email'}
                                </button>)}

                              <button type="button" onClick={() => handleOpenEditPerms(s)} className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[11px] cursor-pointer">
                                Permissions
                              </button>

                              <button type="button" onClick={() => handleOpenEditProfile(s)} className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[11px] cursor-pointer">
                                Edit
                              </button>

                              <button type="button" onClick={() => handleToggleStaffActive(s.id)} className={`px-2 py-1 rounded font-medium text-[11px] cursor-pointer border ${s.is_active
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                                {s.is_active ? 'Deactivate' : 'Activate'}
                              </button>

                              <button type="button" onClick={() => handleDeleteStaff(s.id, s.name)} className="px-2 py-1 rounded text-rose-600 hover:text-rose-800 text-[11px] font-medium cursor-pointer">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>);
            }))}
                </tbody>
              </table>
            </div>
          </div>

          {showAddStaffModal && (<div className="bg-white rounded border border-slate-200 p-4 space-y-3 shadow-sm mb-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Add Staff Member</h3>
                  <p className="text-xs text-slate-500">Provide staff credentials and send verification setup email.</p>
                </div>
                <button type="button" onClick={() => setShowAddStaffModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-medium cursor-pointer">
                  Close
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                    <input type="text" required value={staffForm.name} onChange={(e: any) => setStaffForm({ ...staffForm, name: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                    <input type="email" required value={staffForm.email} onChange={(e: any) => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone *</label>
                    <input type="tel" required value={staffForm.number} onChange={(e: any) => setStaffForm({ ...staffForm, number: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Pay Grade Scale</label>
                    <select value={staffForm.gradeId} onChange={(e: any) => setStaffForm({ ...staffForm, gradeId: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800">
                      <option value="">Unassigned / Default</option>
                      {payScalesList.map((g: any) => (<option key={g.id} value={g.id}>
                          {g.name} (Basic: ৳{g.basic_salary})
                        </option>))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Residential Address</label>
                    <input type="text" value={staffForm.address} onChange={(e: any) => setStaffForm({ ...staffForm, address: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
                  </div>

                  <div className="sm:col-span-2 space-y-2 border-t border-slate-100 pt-2">
                    <label className="block text-xs font-medium text-slate-700">Password & Invitation Mode</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                        <input type="radio" name="passwordMode" value="invite" checked={staffForm.passwordMode === 'invite'} onChange={() => setStaffForm({ ...staffForm, passwordMode: 'invite' })}/>
                        <span>Send verification email invitation (Staff creates password via email link)</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                        <input type="radio" name="passwordMode" value="manual" checked={staffForm.passwordMode === 'manual'} onChange={() => setStaffForm({ ...staffForm, passwordMode: 'manual' })}/>
                        <span>Set initial password manually (Staff still receives verification email)</span>
                      </label>
                    </div>

                    {staffForm.passwordMode === 'manual' && (<div className="mt-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Initial Password *</label>
                        <input type="password" required={staffForm.passwordMode === 'manual'} minLength={6} value={staffForm.password} onChange={(e: any) => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full max-w-sm bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
                      </div>)}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-900">
                      Initial Module Access Permissions
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button type="button" onClick={() => {
                    const full: any = {};
                    modulesList.forEach((m: any) => {
                        full[m.slug] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                    });
                    setStaffForm({ ...staffForm, permissions: full });
                }} className="text-slate-600 hover:text-slate-900 underline cursor-pointer">
                        All Access
                      </button>
                      <span>|</span>
                      <button type="button" onClick={() => {
                    const viewOnly: any = {};
                    modulesList.forEach((m: any) => {
                        viewOnly[m.slug] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
                    });
                    setStaffForm({ ...staffForm, permissions: viewOnly });
                }} className="text-slate-600 hover:text-slate-900 underline cursor-pointer">
                        View Only
                      </button>
                      <span>|</span>
                      <button type="button" onClick={() => setStaffForm({ ...staffForm, permissions: {} })} className="text-slate-400 hover:text-slate-600 underline cursor-pointer">
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {modulesList.map((m: any) => {
                    const perm = staffForm.permissions[m.slug] || {};
                    return (<div key={m.slug} className="p-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                          <div>
                            <span className="font-medium text-slate-800">{m.name}</span>
                            <span className="text-[10px] text-slate-400 block">{m.category || m.path || 'Workstation'}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={Boolean(perm.can_view)} onChange={(e: any) => {
                            const next: any = { ...perm, can_view: e.target.checked };
                            setStaffForm({
                                ...staffForm,
                                permissions: { ...staffForm.permissions, [m.slug]: next },
                            });
                        }}/>
                              View
                            </label>
                            <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={Boolean(perm.can_create)} onChange={(e: any) => {
                            const next: any = { ...perm, can_create: e.target.checked };
                            if (e.target.checked)
                                next.can_view = true;
                            setStaffForm({
                                ...staffForm,
                                permissions: { ...staffForm.permissions, [m.slug]: next },
                            });
                        }}/>
                              Create
                            </label>
                            <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={Boolean(perm.can_edit)} onChange={(e: any) => {
                            const next: any = { ...perm, can_edit: e.target.checked };
                            if (e.target.checked)
                                next.can_view = true;
                            setStaffForm({
                                ...staffForm,
                                permissions: { ...staffForm.permissions, [m.slug]: next },
                            });
                        }}/>
                              Edit
                            </label>
                            <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={Boolean(perm.can_delete)} onChange={(e: any) => {
                            const next: any = { ...perm, can_delete: e.target.checked };
                            if (e.target.checked)
                                next.can_view = true;
                            setStaffForm({
                                ...staffForm,
                                permissions: { ...staffForm.permissions, [m.slug]: next },
                            });
                        }}/>
                              Delete
                            </label>
                          </div>
                        </div>);
                })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowAddStaffModal(false)} className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingStaff} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                    {submittingStaff ? 'Creating & Sending Verification...' : 'Create Staff & Send Verification Email'}
                  </button>
                </div>
              </form>
            </div>)}

          {showEditPermsModal && targetStaff && (<div className="bg-white rounded border border-slate-200 p-4 space-y-3 shadow-sm mb-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Module Permissions: {targetStaff.name}
                  </h3>
                  <p className="text-xs text-slate-500">Configure access rights for institutional modules.</p>
                </div>
                <button type="button" onClick={() => setShowEditPermsModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-medium cursor-pointer">
                  Close
                </button>
              </div>

              <form onSubmit={handleSavePermissions} className="space-y-3">
                <div className="flex items-center justify-end gap-2 text-[11px]">
                  <button type="button" onClick={() => {
                    const all: any = {};
                    modulesList.forEach((m: any) => {
                        all[m.slug] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
                    });
                    setEditPermsMap(all);
                }} className="text-slate-600 hover:text-slate-900 underline cursor-pointer">
                    View Only All
                  </button>
                  <span>|</span>
                  <button type="button" onClick={() => {
                    const all: any = {};
                    modulesList.forEach((m: any) => {
                        all[m.slug] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                    });
                    setEditPermsMap(all);
                }} className="text-slate-600 hover:text-slate-900 underline cursor-pointer">
                    Full Access All
                  </button>
                  <span>|</span>
                  <button type="button" onClick={() => setEditPermsMap({})} className="text-slate-400 hover:text-slate-600 underline cursor-pointer">
                    Clear
                  </button>
                </div>

                <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {modulesList.map((m: any) => {
                    const perm = editPermsMap[m.slug] || {};
                    return (<div key={m.slug} className="p-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                        <div>
                          <span className="font-medium text-slate-800">{m.name}</span>
                          <span className="text-[10px] text-slate-400 block">{m.category || m.path || 'Workstation'}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={Boolean(perm.can_view)} onChange={(e: any) => {
                            const next: any = { ...perm, can_view: e.target.checked };
                            setEditPermsMap({ ...editPermsMap, [m.slug]: next });
                        }}/>
                            View
                          </label>
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={Boolean(perm.can_create)} onChange={(e: any) => {
                            const next: any = { ...perm, can_create: e.target.checked };
                            if (e.target.checked)
                                next.can_view = true;
                            setEditPermsMap({ ...editPermsMap, [m.slug]: next });
                        }}/>
                            Create
                          </label>
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={Boolean(perm.can_edit)} onChange={(e: any) => {
                            const next: any = { ...perm, can_edit: e.target.checked };
                            if (e.target.checked)
                                next.can_view = true;
                            setEditPermsMap({ ...editPermsMap, [m.slug]: next });
                        }}/>
                            Edit
                          </label>
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={Boolean(perm.can_delete)} onChange={(e: any) => {
                            const next: any = { ...perm, can_delete: e.target.checked };
                            if (e.target.checked)
                                next.can_view = true;
                            setEditPermsMap({ ...editPermsMap, [m.slug]: next });
                        }}/>
                            Delete
                          </label>
                        </div>
                      </div>);
                })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowEditPermsModal(false)} className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingPerms} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                    {savingPerms ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </form>
            </div>)}

          {showEditProfileModal && targetStaff && (<div className="bg-white rounded border border-slate-200 p-4 space-y-3 shadow-sm mb-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Edit Profile: {targetStaff.name}
                  </h3>
                  <p className="text-xs text-slate-500">Update staff contact and employment details.</p>
                </div>
                <button type="button" onClick={() => setShowEditProfileModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-medium cursor-pointer">
                  Close
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input type="text" required value={editProfileForm.name} onChange={(e: any) => setEditProfileForm({ ...editProfileForm, name: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input type="email" required value={editProfileForm.email} onChange={(e: any) => setEditProfileForm({ ...editProfileForm, email: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="tel" required value={editProfileForm.number} onChange={(e: any) => setEditProfileForm({ ...editProfileForm, number: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pay Grade Scale</label>
                  <select value={editProfileForm.gradeId} onChange={(e: any) => setEditProfileForm({ ...editProfileForm, gradeId: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800">
                    <option value="">Unassigned</option>
                    {payScalesList.map((g: any) => (<option key={g.id} value={g.id}>
                        {g.name}
                      </option>))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Residential Address</label>
                  <input type="text" value={editProfileForm.address} onChange={(e: any) => setEditProfileForm({ ...editProfileForm, address: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowEditProfileModal(false)} className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingProfile} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>)}
        </div>)}

      {activeTab === 'academics' && (<div className="space-y-4">
          {academicActionMsg.text && (<div className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${academicActionMsg.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              <span>{academicActionMsg.text}</span>
              <button type="button" onClick={() => setAcademicActionMsg({ type: '', text: '' })} className="hover:underline cursor-pointer">
                Dismiss
              </button>
            </div>)}

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
              <button type="button" onClick={() => fetchAcademics()} disabled={loadingAcademics} className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer disabled:opacity-50">
                {loadingAcademics ? 'Refreshing...' : 'Refresh'}
              </button>

              {academicsSubTab === 'departments' && (<button type="button" onClick={() => {
                    setDeptModal({ open: true, editing: null });
                    setDeptForm({
                        name: '',
                        code: '',
                        order_no: academicDepts.length + 1,
                        description: '',
                        is_active: true,
                    });
                }} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer">
                  + Add Department
                </button>)}

              {academicsSubTab === 'classes' && (<button type="button" onClick={() => {
                    setClassModal({ open: true, editing: null });
                    setClassForm({
                        name: '',
                        code: '',
                        department_id: '',
                        max_seats: 40,
                        description: '',
                    });
                }} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer">
                  + Add {academicConfig.labels.class}
                </button>)}

              {academicsSubTab === 'sections' && (<button type="button" onClick={() => {
                    setSectionModal({ open: true, editing: null });
                    setSectionForm({
                        class_id: academicClasses[0]?.id ? String(academicClasses[0].id) : '',
                        department_id: academicDepts[0]?.id ? String(academicDepts[0].id) : '',
                        session_id: academicSessions[0]?.id ? String(academicSessions[0].id) : '',
                        name: '',
                        capacity: 40,
                        room_number: '',
                    });
                }} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer">
                  + Add {academicConfig.labels.section}
                </button>)}

              {academicsSubTab === 'subjects' && (<button type="button" onClick={() => {
                    setSubjectModal({ open: true, editing: null });
                    setSubjectForm({
                        class_id: academicClasses[0]?.id ? String(academicClasses[0].id) : '',
                        name: '',
                        code: '',
                        type: 'Theory',
                        description: '',
                    });
                }} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer">
                  + Add Subject
                </button>)}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Sessions</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{academicSessions.length}</span>
              <span className="text-[10px] text-slate-500">Academic years</span>
            </div>
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
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Schedule</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{academicDays.length}d / {academicPeriods.length}p</span>
              <span className="text-[10px] text-slate-500">Days &amp; Periods</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-2 pt-2 rounded-t">
            {[
                { id: 'hierarchy', label: 'Primary Hierarchy Config' },
                { id: 'sessions', label: `${academicConfig.labels.session}s (${academicSessions.length})` },
                { id: 'departments', label: `${academicConfig.labels.department}s (${academicDepts.length})` },
                { id: 'classes', label: `${academicConfig.labels.class}es (${academicClasses.length})` },
                { id: 'sections', label: `${academicConfig.labels.section}s (${academicSections.length})` },
                { id: 'subjects', label: `Subjects (${academicSubjects.length})` },
                { id: 'schedule', label: `Days & Periods (${academicDays.length}/${academicPeriods.length})` },
                { id: 'routine', label: `Routine (${academicRoutines.length})` },
            ].map((sub: any) => (<button key={sub.id} type="button" onClick={() => setAcademicsSubTab(sub.id)} className={`px-3 py-1.5 font-medium text-xs border-b-2 transition-colors cursor-pointer ${academicsSubTab === sub.id
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                {sub.label}
              </button>))}
          </div>

          <div className="bg-white border border-slate-200 rounded-b p-4 shadow-2xs">
            {loadingAcademics ? (<div className="py-12 flex justify-center items-center text-xs text-slate-500">
                Loading academic structure...
              </div>) : academicsSubTab === 'hierarchy' ? (<form onSubmit={handleSaveAcademicConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {[
                        { id: 'CLASS_SEC', title: 'Class -> Section', dept: false, sess: true, cls: true, sec: true, reqDept: false, reqSess: true, reqCls: true, reqSec: false },
                        { id: 'DEPT_SESSION_SEC', title: 'Dept -> Session -> Section', dept: true, sess: true, cls: false, sec: true, reqDept: true, reqSess: true, reqCls: false, reqSec: false },
                        { id: 'DEPT_CLASS_SEC', title: 'Dept -> Class -> Section', dept: true, sess: true, cls: true, sec: true, reqDept: true, reqSess: true, reqCls: true, reqSec: false },
                        { id: 'CUSTOM', title: 'Custom Hierarchy', dept: academicConfig.use_department, sess: academicConfig.use_session, cls: academicConfig.use_class, sec: academicConfig.use_section, reqDept: academicConfig.require_department, reqSess: academicConfig.require_session, reqCls: academicConfig.require_class, reqSec: academicConfig.require_section },
                    ].map((preset: any) => (<button key={preset.id} type="button" onClick={() => setAcademicConfig((prev: any) => ({
                        ...prev,
                        hierarchy_type: preset.id,
                        use_department: preset.dept,
                        use_session: preset.sess,
                        use_class: preset.cls,
                        use_section: preset.sec,
                        require_department: preset.reqDept,
                        require_session: preset.reqSess,
                        require_class: preset.reqCls,
                        require_section: preset.reqSec,
                    }))} className={`p-3 rounded border text-left cursor-pointer ${academicConfig.hierarchy_type === preset.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <div className="text-xs font-semibold text-slate-900">{preset.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{preset.id}</div>
                      </button>))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                        { useKey: 'use_department', reqKey: 'require_department', title: 'Departments' },
                        { useKey: 'use_session', reqKey: 'require_session', title: 'Sessions' },
                        { useKey: 'use_class', reqKey: 'require_class', title: 'Classes' },
                        { useKey: 'use_section', reqKey: 'require_section', title: 'Sections' },
                    ].map((dim: any) => (<div key={dim.useKey} className="border border-slate-200 rounded p-2.5 space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                          <input type="checkbox" checked={Boolean(academicConfig[dim.useKey])} onChange={(e: any) => setAcademicConfig({
                            ...academicConfig,
                            hierarchy_type: 'CUSTOM',
                            [dim.useKey]: e.target.checked,
                            [dim.reqKey]: e.target.checked ? academicConfig[dim.reqKey] : false,
                        })}/>
                          <span>Use {dim.title}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 pl-4">
                          <input type="checkbox" disabled={!academicConfig[dim.useKey]} checked={Boolean(academicConfig[dim.reqKey])} onChange={(e: any) => setAcademicConfig({
                            ...academicConfig,
                            hierarchy_type: 'CUSTOM',
                            [dim.reqKey]: e.target.checked,
                        })}/>
                          <span>Mandatory</span>
                        </label>
                      </div>))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Department Label</label>
                    <input type="text" value={academicConfig.labels.department} onChange={(e: any) => setAcademicConfig({ ...academicConfig, labels: { ...academicConfig.labels, department: e.target.value } })} className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Session Label</label>
                    <input type="text" value={academicConfig.labels.session} onChange={(e: any) => setAcademicConfig({ ...academicConfig, labels: { ...academicConfig.labels, session: e.target.value } })} className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Class Label</label>
                    <input type="text" value={academicConfig.labels.class} onChange={(e: any) => setAcademicConfig({ ...academicConfig, labels: { ...academicConfig.labels, class: e.target.value } })} className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Section Label</label>
                    <input type="text" value={academicConfig.labels.section} onChange={(e: any) => setAcademicConfig({ ...academicConfig, labels: { ...academicConfig.labels, section: e.target.value } })} className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"/>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={savingAcademicConfig} className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50">
                    {savingAcademicConfig ? 'Saving...' : 'Save Primary Hierarchy'}
                  </button>
                </div>
              </form>) : academicsSubTab === 'sessions' ? (<div className="space-y-4">
                <form onSubmit={handleCreateSession} className="flex flex-wrap items-end gap-2 bg-slate-50 border border-slate-200 rounded p-3">
                  <div className="flex-1 min-w-44">
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">{academicConfig.labels.session} Name</label>
                    <input type="text" value={sessionForm.name} onChange={(e: any) => setSessionForm({ ...sessionForm, name: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"/>
                  </div>
                  <select aria-label="Session Status" value={sessionForm.status} onChange={(e: any) => setSessionForm({ ...sessionForm, status: e.target.value })} className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white cursor-pointer">
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button type="submit" disabled={submittingAcademic} className="px-3.5 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold cursor-pointer disabled:opacity-50">
                    Add Session
                  </button>
                </form>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded">
                  {academicSessions.length === 0 ? (<p className="p-4 text-xs text-slate-500 text-center">No sessions configured yet.</p>) : academicSessions.map((s: any) => (<div key={s.id} className="p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {editingSessionId === s.id ? (<div className="flex flex-wrap items-center gap-2 flex-1">
                          <input type="text" value={editingSessionForm.name} onChange={(e: any) => setEditingSessionForm({ ...editingSessionForm, name: e.target.value })} className="px-2 py-1 border border-slate-300 rounded text-xs"/>
                          <select value={editingSessionForm.status} onChange={(e: any) => setEditingSessionForm({ ...editingSessionForm, status: e.target.value })} className="px-2 py-1 border border-slate-300 rounded text-xs">
                            <option value="active">Active</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                          </select>
                          <button type="button" onClick={() => handleUpdateSession(s.id)} className="px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] cursor-pointer">Save</button>
                          <button type="button" onClick={() => setEditingSessionId(null)} className="px-2 py-1 rounded border border-slate-300 text-[11px] cursor-pointer">Cancel</button>
                        </div>) : (<>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{s.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${(s.status || 'active') === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : s.status === 'upcoming' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500'}`}>
                              {s.status || 'active'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => {
                                setEditingSessionId(s.id);
                                setEditingSessionForm({ name: s.name, status: s.status || 'active' });
                            }} className="text-slate-600 hover:underline cursor-pointer">Edit</button>
                            <button type="button" onClick={() => setAcademicDeleteTarget({ type: 'session', id: s.id, name: s.name })} className="text-rose-600 hover:underline cursor-pointer">Delete</button>
                          </div>
                        </>)}
                    </div>))}
                </div>
              </div>) : academicsSubTab === 'schedule' ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 border border-slate-200 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-900">Working Days (website_days)</div>
                    <button type="button" onClick={handleResetStandardDays} disabled={submittingAcademic} className="text-[11px] text-slate-600 hover:underline cursor-pointer">
                      Reset Standard 7 Days
                    </button>
                  </div>
                  <form onSubmit={handleCreateDay} className="grid grid-cols-4 gap-2">
                    <input type="text" aria-label="Day Name" value={dayForm.name} onChange={(e: any) => setDayForm({ ...dayForm, name: e.target.value })} className="col-span-2 px-2 py-1 border border-slate-300 rounded text-xs"/>
                    <input type="number" aria-label="Day Order" value={dayForm.day_order} onChange={(e: any) => setDayForm({ ...dayForm, day_order: e.target.value })} className="px-2 py-1 border border-slate-300 rounded text-xs"/>
                    <button type="submit" disabled={submittingAcademic} className="px-2 py-1 rounded bg-slate-900 text-white text-xs cursor-pointer">Add Day</button>
                  </form>
                  <div className="divide-y divide-slate-100">
                    {academicDays.map((d: any) => (<div key={d.id} className="py-1.5 flex items-center justify-between text-xs">
                        <span>{d.name} (#{d.day_order})</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleToggleDayStatus(d)} className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer border ${d.status === 'off' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {d.status === 'off' ? 'Off Day' : 'Working'}
                          </button>
                          <button type="button" onClick={() => setAcademicDeleteTarget({ type: 'day', id: d.id, name: d.name })} className="text-rose-600 hover:underline cursor-pointer">Delete</button>
                        </div>
                      </div>))}
                  </div>
                </div>
                <div className="space-y-3 border border-slate-200 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-900">Daily Periods &amp; Breaks (website_periods)</div>
                    <button type="button" onClick={handleSyncPeriodsToActiveDays} disabled={submittingAcademic} className="text-[11px] text-slate-600 hover:underline cursor-pointer">
                      Sync to Active Days
                    </button>
                  </div>
                  <form onSubmit={handleCreatePeriod} className="grid grid-cols-4 gap-2">
                    <select aria-label="Period Day" value={periodForm.day_id} onChange={(e: any) => setPeriodForm({ ...periodForm, day_id: e.target.value })} className="col-span-2 px-2 py-1 border border-slate-300 rounded text-xs cursor-pointer">
                      <option value="">Select Day</option>
                      {academicDays.map((d: any) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                    <input type="text" aria-label="Period Name" value={periodForm.name} onChange={(e: any) => setPeriodForm({ ...periodForm, name: e.target.value })} className="col-span-2 px-2 py-1 border border-slate-300 rounded text-xs"/>
                    <input type="time" aria-label="Start Time" value={periodForm.start_time} onChange={(e: any) => setPeriodForm({ ...periodForm, start_time: e.target.value })} className="col-span-2 px-2 py-1 border border-slate-300 rounded text-xs"/>
                    <input type="time" aria-label="End Time" value={periodForm.end_time} onChange={(e: any) => setPeriodForm({ ...periodForm, end_time: e.target.value })} className="col-span-2 px-2 py-1 border border-slate-300 rounded text-xs"/>
                    <label className="col-span-2 flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={periodForm.is_break} onChange={(e: any) => setPeriodForm({ ...periodForm, is_break: e.target.checked })}/>
                      <span>Break / Recess</span>
                    </label>
                    <label className="col-span-2 flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={periodForm.apply_to_all_active_days} onChange={(e: any) => setPeriodForm({ ...periodForm, apply_to_all_active_days: e.target.checked })}/>
                      <span>All Active Days</span>
                    </label>
                    <button type="submit" disabled={submittingAcademic} className="col-span-4 px-2 py-1 rounded bg-slate-900 text-white text-xs cursor-pointer">Add Period</button>
                  </form>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {academicPeriods.map((p: any) => (<div key={p.id} className="py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {editingPeriodId === p.id ? (<div className="flex flex-wrap items-center gap-1.5 flex-1">
                            <input type="text" value={editingPeriodForm.name} onChange={(e: any) => setEditingPeriodForm({ ...editingPeriodForm, name: e.target.value })} className="px-2 py-0.5 border border-slate-300 rounded text-xs w-28"/>
                            <input type="time" value={editingPeriodForm.start_time} onChange={(e: any) => setEditingPeriodForm({ ...editingPeriodForm, start_time: e.target.value })} className="px-1.5 py-0.5 border border-slate-300 rounded text-xs"/>
                            <input type="time" value={editingPeriodForm.end_time} onChange={(e: any) => setEditingPeriodForm({ ...editingPeriodForm, end_time: e.target.value })} className="px-1.5 py-0.5 border border-slate-300 rounded text-xs"/>
                            <label className="inline-flex items-center gap-1 text-[11px] cursor-pointer">
                              <input type="checkbox" checked={Boolean(editingPeriodForm.is_break)} onChange={(e: any) => setEditingPeriodForm({ ...editingPeriodForm, is_break: e.target.checked })}/>
                              Break
                            </label>
                            <button type="button" onClick={() => handleUpdatePeriod(p.id)} className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] cursor-pointer">Save</button>
                            <button type="button" onClick={() => setEditingPeriodId(null)} className="px-2 py-0.5 rounded border border-slate-300 text-[10px] cursor-pointer">Cancel</button>
                          </div>) : (<>
                            <span>{p.day_name ? `${p.day_name}: ` : ''}{p.name} ({p.start_time} - {p.end_time}){p.is_break ? ' [Break]' : ''}</span>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => {
                                  setEditingPeriodId(p.id);
                                  setEditingPeriodForm({ name: p.name, start_time: p.start_time, end_time: p.end_time, is_break: Boolean(p.is_break) });
                              }} className="text-slate-600 hover:underline cursor-pointer">Edit</button>
                              <button type="button" onClick={() => setAcademicDeleteTarget({ type: 'period', id: p.id, name: p.name })} className="text-rose-600 hover:underline cursor-pointer">Delete</button>
                            </div>
                          </>)}
                      </div>))}
                  </div>
                </div>
              </div>) : academicsSubTab === 'routine' ? (<div className="space-y-4">
                <form onSubmit={handleCreateRoutineSlot} className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-slate-50 border border-slate-200 rounded p-3 items-end">
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">Day</label>
                    <select aria-label="Routine Day" value={routineForm.day_id} onChange={(e: any) => setRoutineForm({ ...routineForm, day_id: e.target.value, period_id: '' })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white">
                      <option value="">All Working Days</option>
                      {academicDays.map((d: any) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">Period *</label>
                    <select aria-label="Routine Period" value={routineForm.period_id} onChange={(e: any) => setRoutineForm({ ...routineForm, period_id: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white">
                      <option value="">Select Period</option>
                      {academicPeriods
                        .filter((p: any) => !routineForm.day_id || String(p.day_id) === String(routineForm.day_id))
                        .map((p: any) => (<option key={p.id} value={p.id}>{p.day_name} - {p.name} ({p.start_time})</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">Class Subject *</label>
                    <select aria-label="Routine Class Subject" value={routineForm.class_subject_id} onChange={(e: any) => setRoutineForm({ ...routineForm, class_subject_id: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white">
                      <option value="">Select Subject</option>
                      {academicClassSubjects.map((cs: any) => (<option key={cs.id} value={cs.id}>{cs.class_name} - {cs.subject_name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">{academicConfig.labels.section}</label>
                    <select aria-label="Routine Section" value={routineForm.section_id} onChange={(e: any) => setRoutineForm({ ...routineForm, section_id: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white">
                      <option value="">All / Optional</option>
                      {academicSections.map((sec: any) => (<option key={sec.id} value={sec.id}>{sec.name} {sec.class_name ? `(${sec.class_name})` : ''}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">Room</label>
                    <input type="text" aria-label="Routine Room" value={routineForm.room_number} onChange={(e: any) => setRoutineForm({ ...routineForm, room_number: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"/>
                  </div>
                  <button type="submit" disabled={submittingAcademic} className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium cursor-pointer disabled:opacity-50">
                    Assign Slot
                  </button>
                </form>

                {academicRoutines.length === 0 ? (<p className="py-6 text-center text-xs text-slate-500">
                    No routine timetable slots configured yet. Ensure Classes, Subjects (Class Subjects), and Periods exist first.
                  </p>) : (<div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                          <th className="py-2 px-3">Day &amp; Period</th>
                          <th className="py-2 px-3">{academicConfig.labels.class} &amp; Subject</th>
                          <th className="py-2 px-3">{academicConfig.labels.section}</th>
                          <th className="py-2 px-3">Room</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {academicRoutines.map((r: any) => (<tr key={r.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-900">{r.day_name}</span> • {r.period_name} ({r.start_time}-{r.end_time})
                            </td>
                            <td className="py-2 px-3">{r.class_name} &gt; {r.subject_name}</td>
                            <td className="py-2 px-3">{r.section_name || 'All'}</td>
                            <td className="py-2 px-3 font-mono">{r.room_number || '—'}</td>
                            <td className="py-2 px-3 text-right">
                              <button type="button" onClick={() => setAcademicDeleteTarget({ type: 'routine', id: r.id, name: `${r.day_name} ${r.period_name} (${r.subject_name})` })} className="text-rose-600 hover:underline cursor-pointer">
                                Remove
                              </button>
                            </td>
                          </tr>))}
                      </tbody>
                    </table>
                  </div>)}
              </div>) : academicsSubTab === 'departments' ? (academicDepts.length === 0 ? (<div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-500">No departments configured yet.</p>
                  <button type="button" onClick={() => {
                    setDeptModal({ open: true, editing: null });
                    setDeptForm({
                        name: '',
                        code: '',
                        order_no: 1,
                        description: '',
                        is_active: true,
                    });
                }} className="text-xs text-blue-600 hover:underline cursor-pointer">
                    Add first academic department
                  </button>
                </div>) : (<div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Department Name</th>
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Head &amp; Info</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Classes</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicDepts.map((d: any) => {
                        const dInfo = academicDeptInfos.find((i: any) => String(i.department_id) === String(d.id));
                        const dHead = academicDeptHeads.find((h: any) => String(h.department_id) === String(d.id)) || d.dept_head;
                        return (<tr key={d.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div>{d.name}</div>
                            {d.description && <div className="text-[10px] font-normal text-slate-500 truncate max-w-xs">{d.description}</div>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px]">{d.code || '—'}</td>
                          <td className="py-2.5 px-3">
                            {dHead?.name ? (<div className="text-[11px] font-medium text-slate-800">{dHead.name} ({dHead.designation || 'Head'})</div>) : (<span className="text-[10px] text-slate-400">No head assigned</span>)}
                            {dInfo?.motto && <div className="text-[10px] text-slate-500 truncate max-w-xs">Motto: {dInfo.motto}</div>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${d.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                              {d.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{d.class_count || 0}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => handleOpenDeptProfile(d)} className="px-2 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
                                Info &amp; Head
                              </button>
                              <button type="button" onClick={() => {
                        setDeptModal({ open: true, editing: d });
                        setDeptForm({
                            name: d.name,
                            code: d.code || '',
                            order_no: d.order_no ?? 0,
                            description: d.description || '',
                            is_active: Boolean(d.is_active),
                        });
                    }} className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer">
                                Edit
                              </button>
                              <button type="button" onClick={() => setAcademicDeleteTarget({ type: 'department', id: d.id, name: d.name })} className="px-2 py-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                </div>)) : academicsSubTab === 'classes' ? (academicClasses.length === 0 ? (<div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-500">No classes configured yet.</p>
                  <button type="button" onClick={() => {
                    setClassModal({ open: true, editing: null });
                    setClassForm({
                        name: '',
                        code: '',
                        department_id: '',
                        max_seats: 40,
                        description: '',
                    });
                }} className="text-xs text-blue-600 hover:underline cursor-pointer">
                    Add first {academicConfig.labels.class}
                  </button>
                </div>) : (<div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">{academicConfig.labels.class} Name</th>
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Max Seats</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicClasses.map((c: any) => (<tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{c.name}</td>
                          <td className="py-2.5 px-3 font-mono text-[10px]">{c.code || '—'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{c.max_seats ?? 40} seats</td>
                          <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{c.description || '—'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => {
                        setClassModal({ open: true, editing: c });
                        setClassForm({
                            name: c.name,
                            code: c.code || '',
                            max_seats: c.max_seats ?? 40,
                            description: c.description || '',
                        });
                    }} className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer">
                                Edit
                              </button>
                              <button type="button" onClick={() => setAcademicDeleteTarget({ type: 'class', id: c.id, name: c.name })} className="px-2 py-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                </div>)) : academicsSubTab === 'sections' ? (academicSections.length === 0 ? (<div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-500">No sections configured yet.</p>
                  <button type="button" onClick={() => {
                    setSectionModal({ open: true, editing: null });
                    setSectionForm({
                        name: '',
                        capacity: 40,
                        room_number: '',
                    });
                }} className="text-xs text-blue-600 hover:underline cursor-pointer">
                    Add first {academicConfig.labels.section}
                  </button>
                </div>) : (<div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">{academicConfig.labels.section} Name</th>
                        <th className="py-2.5 px-3">Capacity</th>
                        <th className="py-2.5 px-3">Room / Venue</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicSections.map((s: any) => (<tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{s.name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{s.capacity} seats</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.room_number || '—'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => {
                        setSectionModal({ open: true, editing: s });
                        setSectionForm({
                            name: s.name,
                            capacity: s.capacity ?? 40,
                            room_number: s.room_number || '',
                        });
                    }} className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer">
                                Edit
                              </button>
                              <button type="button" onClick={() => setAcademicDeleteTarget({ type: 'section', id: s.id, name: s.name })} className="px-2 py-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                </div>)) : (<div className="space-y-6">
                  {academicSubjects.length === 0 ? (<div className="py-8 text-center space-y-2">
                      <p className="text-xs text-slate-500">No subjects configured yet.</p>
                      <button type="button" onClick={() => {
                        setSubjectModal({ open: true, editing: null });
                        setSubjectForm({
                            class_id: academicClasses[0]?.id ? String(academicClasses[0].id) : '',
                            name: '',
                            code: '',
                            type: 'Theory',
                            description: '',
                        });
                    }} className="text-xs text-blue-600 hover:underline cursor-pointer">
                        Add first subject
                      </button>
                    </div>) : (<div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-3">Subject Name</th>
                            <th className="py-2.5 px-3">Code</th>
                            <th className="py-2.5 px-3">{academicConfig.labels.class}</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {academicSubjects.map((sub: any) => (<tr key={sub.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{sub.name}</td>
                              <td className="py-2.5 px-3 font-mono text-[10px]">{sub.code || '—'}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">
                                {sub.class_name ? sub.class_name : <span className="text-slate-400 italic">Standalone / General</span>}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${sub.type === 'Practical' ? 'bg-emerald-50 text-emerald-700' : sub.type === 'Both' ? 'bg-purple-50 text-purple-700' : sub.type === 'Optional' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                  {sub.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{sub.description || '—'}</td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button type="button" onClick={() => {
                            setSubjectModal({ open: true, editing: sub });
                            setSubjectForm({
                                class_id: sub.class_id ? String(sub.class_id) : '',
                                name: sub.name,
                                code: sub.code || '',
                                type: sub.type || 'Theory',
                                description: sub.description || '',
                            });
                        }} className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer">
                                    Edit
                                  </button>
                                  <button type="button" onClick={() => setAcademicDeleteTarget({ type: 'subject', id: sub.id, name: sub.name })} className="px-2 py-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>))}
                        </tbody>
                      </table>
                    </div>)}

                  {academicClasses.length > 0 && academicSubjects.length > 0 && (<div className="border-t border-slate-200 pt-4 space-y-3">
                      <div className="text-xs font-semibold text-slate-900">Class Subject Marks &amp; Optionality Mapping (website_class_subjects)</div>
                      <form onSubmit={handleSaveClassSubject} className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-slate-50 border border-slate-200 rounded p-3 items-end">
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">{academicConfig.labels.class} *</label>
                          <select aria-label="Map Class" value={classSubjectForm.class_id} onChange={(e: any) => setClassSubjectForm({ ...classSubjectForm, class_id: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white">
                            <option value="">Select Class</option>
                            {academicClasses.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">Subject *</label>
                          <select aria-label="Map Subject" value={classSubjectForm.subject_id} onChange={(e: any) => setClassSubjectForm({ ...classSubjectForm, subject_id: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white">
                            <option value="">Select Subject</option>
                            {academicSubjects.map((s: any) => (<option key={s.id} value={s.id}>{s.name} ({s.code})</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">Full Marks</label>
                          <input type="number" aria-label="Full Marks" value={classSubjectForm.full_marks} onChange={(e: any) => setClassSubjectForm({ ...classSubjectForm, full_marks: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-mono bg-white"/>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">Pass Marks</label>
                          <input type="number" aria-label="Pass Marks" value={classSubjectForm.pass_marks} onChange={(e: any) => setClassSubjectForm({ ...classSubjectForm, pass_marks: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-mono bg-white"/>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs pb-1.5 cursor-pointer">
                          <input type="checkbox" checked={Boolean(classSubjectForm.is_optional)} onChange={(e: any) => setClassSubjectForm({ ...classSubjectForm, is_optional: e.target.checked })}/>
                          <span>Optional</span>
                        </label>
                        <button type="submit" disabled={submittingAcademic} className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium cursor-pointer disabled:opacity-50">
                          Map Subject
                        </button>
                      </form>

                      {academicClassSubjects.length > 0 && (<div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                                <th className="py-2 px-3">{academicConfig.labels.class}</th>
                                <th className="py-2 px-3">Subject</th>
                                <th className="py-2 px-3">Full / Pass</th>
                                <th className="py-2 px-3">Optional</th>
                                <th className="py-2 px-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {academicClassSubjects.map((cs: any) => (<tr key={cs.id}>
                                  <td className="py-2 px-3 font-medium">{cs.class_name}</td>
                                  <td className="py-2 px-3">{cs.subject_name} ({cs.subject_code})</td>
                                  <td className="py-2 px-3 font-mono">
                                    {editingClassSubjectId === cs.id ? (<div className="flex items-center gap-1">
                                        <input type="number" value={editingClassSubjectMarks.full_marks} onChange={(e: any) => setEditingClassSubjectMarks({ ...editingClassSubjectMarks, full_marks: e.target.value })} className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs"/>
                                        <span>/</span>
                                        <input type="number" value={editingClassSubjectMarks.pass_marks} onChange={(e: any) => setEditingClassSubjectMarks({ ...editingClassSubjectMarks, pass_marks: e.target.value })} className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs"/>
                                      </div>) : `${cs.full_marks} / ${cs.pass_marks}`}
                                  </td>
                                  <td className="py-2 px-3">
                                    {editingClassSubjectId === cs.id ? (<input type="checkbox" checked={Boolean(editingClassSubjectMarks.is_optional)} onChange={(e: any) => setEditingClassSubjectMarks({ ...editingClassSubjectMarks, is_optional: e.target.checked })}/>) : (cs.is_optional ? 'Optional' : 'Core')}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {editingClassSubjectId === cs.id ? (<div className="inline-flex gap-1.5">
                                        <button type="button" onClick={() => handleUpdateClassSubject(cs.id)} className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] cursor-pointer">Save</button>
                                        <button type="button" onClick={() => setEditingClassSubjectId(null)} className="px-2 py-0.5 rounded border border-slate-300 text-[10px] cursor-pointer">Cancel</button>
                                      </div>) : (<div className="inline-flex gap-2">
                                        <button type="button" onClick={() => {
                                setEditingClassSubjectId(cs.id);
                                setEditingClassSubjectMarks({ full_marks: cs.full_marks, pass_marks: cs.pass_marks, is_optional: Boolean(cs.is_optional) });
                            }} className="text-slate-600 hover:underline cursor-pointer">Edit</button>
                                        <button type="button" onClick={() => setAcademicDeleteTarget({ type: 'class_subject', id: cs.id, name: `${cs.class_name} - ${cs.subject_name}` })} className="text-rose-600 hover:underline cursor-pointer">Remove</button>
                                      </div>)}
                                  </td>
                                </tr>))}
                            </tbody>
                          </table>
                        </div>)}
                    </div>)}
                </div>)}
          </div>

          {deptModal.open && (<div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    {deptModal.editing ? 'Edit Department' : 'Create Department'}
                  </h3>
                  <button type="button" onClick={() => setDeptModal({ open: false, editing: null })} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveDept} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Department Name *
                    </label>
                    <input type="text" aria-label="Department Name" value={deptForm.name} onChange={(e: any) => setDeptForm({ ...deptForm, name: e.target.value })} required className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Department Code
                      </label>
                      <input type="text" aria-label="Department Code" value={deptForm.code} onChange={(e: any) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono uppercase"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Order Sequence
                      </label>
                      <input type="number" aria-label="Order Sequence" value={deptForm.order_no} onChange={(e: any) => setDeptForm({ ...deptForm, order_no: e.target.value })} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea rows={2} aria-label="Department Description" value={deptForm.description} onChange={(e: any) => setDeptForm({ ...deptForm, description: e.target.value })} className="w-full text-xs p-2 rounded border border-slate-300 text-slate-900 focus:outline-hidden"/>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="deptIsActive" checked={deptForm.is_active} onChange={(e: any) => setDeptForm({ ...deptForm, is_active: e.target.checked })} className="rounded border-slate-300 cursor-pointer"/>
                    <label htmlFor="deptIsActive" className="text-xs text-slate-700 cursor-pointer">
                      Operational / Active Department
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setDeptModal({ open: false, editing: null })} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={submittingAcademic} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50">
                      {submittingAcademic ? 'Saving...' : deptModal.editing ? 'Update Department' : 'Create Department'}
                    </button>
                  </div>
                </form>
              </div>
            </div>)}

          {classModal.open && (<div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {classModal.editing ? 'Edit Class' : 'Create Class'}
                  </h3>
                  <button type="button" onClick={() => setClassModal({ open: false, editing: null })} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveClass} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Class / Grade Title *
                    </label>
                    <input type="text" aria-label="Class Name" value={classForm.name} onChange={(e: any) => setClassForm({ ...classForm, name: e.target.value })} required className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Class Code
                      </label>
                      <input type="text" aria-label="Class Code" value={classForm.code} onChange={(e: any) => setClassForm({ ...classForm, code: e.target.value.toUpperCase() })} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono uppercase"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Max Seats
                      </label>
                      <input type="number" aria-label="Max Seats" value={classForm.max_seats} onChange={(e: any) => setClassForm({ ...classForm, max_seats: e.target.value })} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea rows={2} aria-label="Class Description" value={classForm.description} onChange={(e: any) => setClassForm({ ...classForm, description: e.target.value })} className="w-full text-xs p-2 rounded border border-slate-300 text-slate-900 focus:outline-hidden"/>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setClassModal({ open: false, editing: null })} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={submittingAcademic} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50">
                      {submittingAcademic ? 'Saving...' : classModal.editing ? 'Update Class' : 'Create Class'}
                    </button>
                  </div>
                </form>
              </div>
            </div>)}

          {deptProfileModal.open && deptProfileModal.department && (<div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Department Info &amp; Head: {deptProfileModal.department.name}
                  </h3>
                  <button type="button" onClick={() => setDeptProfileModal({ open: false, department: null })} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveDeptProfileAndHead} className="space-y-4">
                  <div className="space-y-2 border border-slate-200 rounded p-3 bg-slate-50/50">
                    <div className="text-xs font-semibold text-slate-800">Department Information (website_department_information)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-600 mb-1">Motto</label>
                        <input type="text" value={deptProfileForm.motto} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, motto: e.target.value })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 mb-1">Expected Cost</label>
                        <input type="number" step="0.01" value={deptProfileForm.expected_cost} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, expected_cost: e.target.value })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Summary</label>
                      <input type="text" value={deptProfileForm.summary} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, summary: e.target.value })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"/>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Full Description</label>
                      <textarea rows={2} value={deptProfileForm.description} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, description: e.target.value })} className="w-full text-xs p-2 rounded border border-slate-300 bg-white"/>
                    </div>
                  </div>

                  <div className="space-y-2 border border-slate-200 rounded p-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">Department Head (website_dept_heads)</span>
                      {deptProfileForm.head_id && (<button type="button" onClick={() => setAcademicDeleteTarget({ type: 'dept_head', id: deptProfileForm.head_id, name: deptProfileForm.head_name })} className="text-[11px] text-rose-600 hover:underline cursor-pointer">
                          Remove Head
                        </button>)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-600 mb-1">Head Full Name</label>
                        <input type="text" value={deptProfileForm.head_name} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, head_name: e.target.value })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 mb-1">Designation</label>
                        <input type="text" value={deptProfileForm.head_designation} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, head_designation: e.target.value })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 mb-1">Title</label>
                        <input type="text" value={deptProfileForm.head_title} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, head_title: e.target.value })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 mb-1">Email</label>
                        <input type="email" value={deptProfileForm.head_email} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, head_email: e.target.value })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 mb-1">Phone</label>
                        <input type="text" value={deptProfileForm.head_phone} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, head_phone: e.target.value })} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 mb-1">Photo Upload (Optional)</label>
                        <input type="file" accept="image/*" onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, head_image_file: e.target.files?.[0] || null })} className="w-full text-[11px] bg-white"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Message / Bio</label>
                      <textarea rows={2} value={deptProfileForm.head_message} onChange={(e: any) => setDeptProfileForm({ ...deptProfileForm, head_message: e.target.value })} className="w-full text-xs p-2 rounded border border-slate-300 bg-white"/>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setDeptProfileModal({ open: false, department: null })} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={submittingAcademic} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white cursor-pointer disabled:opacity-50">
                      {submittingAcademic ? 'Saving...' : 'Save Info & Head'}
                    </button>
                  </div>
                </form>
              </div>
            </div>)}

          {sectionModal.open && (<div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {sectionModal.editing ? `Edit ${academicConfig.labels.section}` : `Create ${academicConfig.labels.section}`}
                  </h3>
                  <button type="button" onClick={() => setSectionModal({ open: false, editing: null })} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveSection} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {academicConfig.labels.section} Name *
                    </label>
                    <input type="text" aria-label="Section Name" value={sectionForm.name} onChange={(e: any) => setSectionForm({ ...sectionForm, name: e.target.value })} required className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Max Capacity
                      </label>
                      <input type="number" aria-label="Max Capacity" value={sectionForm.capacity} onChange={(e: any) => setSectionForm({ ...sectionForm, capacity: e.target.value })} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Room / Venue
                      </label>
                      <input type="text" aria-label="Room Number" value={sectionForm.room_number} onChange={(e: any) => setSectionForm({ ...sectionForm, room_number: e.target.value })} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"/>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setSectionModal({ open: false, editing: null })} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={submittingAcademic} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50">
                      {submittingAcademic ? 'Saving...' : sectionModal.editing ? 'Update Section' : 'Create Section'}
                    </button>
                  </div>
                </form>
              </div>
            </div>)}

          {subjectModal.open && (<div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {subjectModal.editing ? 'Edit Subject' : 'Create Subject'}
                  </h3>
                  <button type="button" onClick={() => setSubjectModal({ open: false, editing: null })} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveSubject} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Parent {academicConfig.labels.class} {academicConfig.use_class && academicConfig.require_class ? '*' : '(Optional)'}
                    </label>
                    <select aria-label="Parent Class" value={subjectForm.class_id} onChange={(e: any) => setSubjectForm({ ...subjectForm, class_id: e.target.value })} required={Boolean(academicConfig.use_class && academicConfig.require_class)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden cursor-pointer">
                      <option value="">Standalone / General Subject</option>
                      {academicClasses.map((c: any) => (<option key={c.id} value={c.id}>
                          {c.name} {c.department_name ? `(${c.department_name})` : ''}
                        </option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Subject Name *
                    </label>
                    <input type="text" aria-label="Subject Name" value={subjectForm.name} onChange={(e: any) => setSubjectForm({ ...subjectForm, name: e.target.value })} required className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Subject Code
                      </label>
                      <input type="text" aria-label="Subject Code" value={subjectForm.code} onChange={(e: any) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden font-mono uppercase"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Course Type
                      </label>
                      <select aria-label="Course Type" value={subjectForm.type} onChange={(e: any) => setSubjectForm({ ...subjectForm, type: e.target.value })} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-hidden cursor-pointer">
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
                    <textarea rows={2} aria-label="Subject Description" value={subjectForm.description} onChange={(e: any) => setSubjectForm({ ...subjectForm, description: e.target.value })} className="w-full text-xs p-2 rounded border border-slate-300 text-slate-900 focus:outline-hidden"/>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setSubjectModal({ open: false, editing: null })} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={submittingAcademic} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50">
                      {submittingAcademic ? 'Saving...' : subjectModal.editing ? 'Update Subject' : 'Create Subject'}
                    </button>
                  </div>
                </form>
              </div>
            </div>)}

          {academicDeleteTarget && (<div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-lg max-w-sm w-full p-4 shadow-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Delete {academicDeleteTarget.type.toUpperCase()}?
                </h4>
                <p className="text-xs text-slate-600">
                  Are you sure you want to remove &quot;{academicDeleteTarget.name}&quot;? Dependent records will be unassigned.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setAcademicDeleteTarget(null)} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 cursor-pointer">
                    Cancel
                  </button>
                  <button type="button" onClick={handleConfirmDeleteAcademic} disabled={deletingAcademic} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50">
                    {deletingAcademic ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>)}
        </div>)}

      {activeTab === 'verification' && (<form onSubmit={handleSaveVerification} className="space-y-4">
          {verificationMsg.text && (<div className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${verificationMsg.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              <span>{verificationMsg.text}</span>
              <button type="button" onClick={() => setVerificationMsg({ type: '', text: '' })} className="hover:underline cursor-pointer">
                Dismiss
              </button>
            </div>)}

          <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Institutional Verification &amp; KYC (website_information)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creator NID documents, EIIN certificate, UGC accreditation, and official registration metadata stored in website_information.
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${
                isVerificationLocked
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : verificationStatus === 'rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                Status: {verificationStatus || 'pending'}{isVerificationLocked ? ' (Locked)' : ''}
              </span>
            </div>

            {isVerificationLocked && (<div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs">
                Verified by platform administration. Your Verification &amp; KYC details and uploaded documents are locked and cannot be edited by the creator.
              </div>)}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Creator NID Number</label>
                <input type="text" disabled={isVerificationLocked} value={creatorNid} onChange={(e: any) => setCreatorNid(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">EIIN Certificate Number</label>
                <input type="text" disabled={isVerificationLocked} value={eiinCertificate} onChange={(e: any) => setEiinCertificate(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Principal / Authorized Head</label>
                <input type="text" disabled={isVerificationLocked} value={principalName} onChange={(e: any) => setPrincipalName(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Board / UGC / Ministry Affiliation</label>
                <input type="text" disabled={isVerificationLocked} value={boardAffiliation} onChange={(e: any) => setBoardAffiliation(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"/>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Registered Verification Address</label>
                <textarea rows={2} disabled={isVerificationLocked} value={verificationAddress} onChange={(e: any) => setVerificationAddress(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"/>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Verification Notes</label>
                <textarea rows={2} disabled={isVerificationLocked} value={verificationNotes} onChange={(e: any) => setVerificationNotes(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"/>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {[
                { label: 'Creator NID Front Image', url: nidFrontUrl, pubId: nidFrontId, file: nidFrontFile, setFile: setNidFrontFile, accept: 'image/*' },
                { label: 'Creator NID Back Image', url: nidBackUrl, pubId: nidBackId, file: nidBackFile, setFile: setNidBackFile, accept: 'image/*' },
                { label: 'EIIN Certificate', url: eiinCertUrl, pubId: eiinCertId, file: eiinCertFile, setFile: setEiinCertFile, accept: 'image/*,application/pdf,.pdf' },
                { label: 'UGC / Accreditation Certificate', url: ugcCertUrl, pubId: ugcCertId, file: ugcCertFile, setFile: setUgcCertFile, accept: 'image/*,application/pdf,.pdf' },
                { label: 'Additional Certificate', url: additionalCertUrl, pubId: additionalCertId, file: additionalCertFile, setFile: setAdditionalCertFile, accept: 'image/*,application/pdf,.pdf' },
              ].map((docItem: any) => (<div key={docItem.label} className="border border-slate-200 rounded p-3 space-y-2 bg-slate-50/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">{docItem.label}</span>
                    {docItem.pubId && <span className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">ID: {docItem.pubId}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {docItem.url ? (
                      docItem.url.toLowerCase().includes('.pdf') || docItem.url.includes('/raw/') ? (
                        <a href={docItem.url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded bg-slate-900 text-white text-[11px] font-medium">
                          View Uploaded PDF
                        </a>
                      ) : (
                        <a href={docItem.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img src={docItem.url} alt={docItem.label} className="w-16 h-12 object-cover rounded border border-slate-200 bg-white"/>
                        </a>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Not uploaded</span>
                    )}
                    {!isVerificationLocked ? (<div className="flex-1 space-y-1">
                        <input type="file" accept={docItem.accept} onChange={(e: any) => docItem.setFile(e.target.files?.[0] || null)} className="w-full text-[11px] text-slate-600"/>
                        {docItem.file && <div className="text-[10px] text-emerald-700 font-mono truncate">Selected: {docItem.file.name}</div>}
                      </div>) : (<span className="text-[11px] text-emerald-700 font-medium">Locked</span>)}
                  </div>
                </div>))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              {isVerificationLocked ? (<span className="px-3 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  Verified &amp; Read-Only
                </span>) : (<button type="submit" disabled={savingVerification} className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                  {savingVerification ? 'Saving...' : 'Save Verification Documents'}
                </button>)}
            </div>
          </div>
        </form>)}

      {activeTab === 'general' && (<div className="space-y-4">
          {brandingMsg.text && (<div className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${brandingMsg.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              <span>{brandingMsg.text}</span>
              <button type="button" onClick={() => setBrandingMsg({ type: '', text: '' })} className="hover:underline">
                Dismiss
              </button>
            </div>)}

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
                  {logoId && (<span className="text-[10px] text-slate-400 font-mono">
                      Cloudinary ID: {logoId}
                    </span>)}
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                    {logoPreview || logo ? (<img src={logoPreview || logo} alt="Institution Logo" className="max-w-full max-h-full object-contain"/>) : (<span className="text-[10px] text-slate-400 text-center">No Logo Set</span>)}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoFileChange} className="hidden" id="logo-file-input"/>

                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer">
                        {logo ? 'Change Logo Image' : 'Select Logo Image'}
                      </button>

                      {logoPreview && (<button type="button" onClick={handleUploadLogoToCloudinary} disabled={uploadingLogo} className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                          {uploadingLogo ? 'Uploading to Cloudinary...' : 'Upload Now'}
                        </button>)}

                      {logo && !logoPreview && (<button type="button" onClick={handleRemoveLogo} disabled={uploadingLogo} className="px-2.5 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium text-xs cursor-pointer disabled:opacity-50">
                          Remove Logo
                        </button>)}
                    </div>

                    {logoFile && (<div className="text-[11px] text-slate-500 font-mono">
                        Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
                      </div>)}

                    <div className="text-[10px] text-slate-400">
                      Recommended: Transparent PNG, WEBP, or SVG. Minimum 200x200 px. Files upload directly to Cloudinary.
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-3 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Website Favicon</span>
                  {faviconId && (<span className="text-[10px] text-slate-400 font-mono">
                      Cloudinary ID: {faviconId}
                    </span>)}
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    {faviconPreview || favicon ? (<img src={faviconPreview || favicon} alt="Favicon" className="w-8 h-8 object-contain"/>) : (<span className="text-[10px] text-slate-400 text-center">No Favicon</span>)}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input ref={faviconInputRef} type="file" accept="image/x-icon,image/png,image/svg+xml,image/jpeg" onChange={handleFaviconFileChange} className="hidden" id="favicon-file-input"/>

                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => faviconInputRef.current?.click()} className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer">
                        {favicon ? 'Change Favicon' : 'Select Favicon'}
                      </button>

                      {faviconPreview && (<button type="button" onClick={handleUploadFaviconToCloudinary} disabled={uploadingFavicon} className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                          {uploadingFavicon ? 'Uploading to Cloudinary...' : 'Upload Now'}
                        </button>)}

                      {favicon && !faviconPreview && (<button type="button" onClick={handleRemoveFavicon} disabled={uploadingFavicon} className="px-2.5 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium text-xs cursor-pointer disabled:opacity-50">
                          Remove Favicon
                        </button>)}
                    </div>

                    {faviconFile && (<div className="text-[11px] text-slate-500 font-mono">
                        Selected: {faviconFile.name} ({(faviconFile.size / 1024).toFixed(1)} KB)
                      </div>)}

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
                <input type="text" required value={name} onChange={(e: any) => setName(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Institution Category Type</label>
                <select value={institutionType} onChange={(e: any) => setInstitutionType(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800">
                  {INSTITUTION_TYPES.map((t: any) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">EIIN / Government Registration Number</label>
                <input type="text" value={eeinNumber} onChange={(e: any) => setEeinNumber(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Campus Operating Currency *</label>
                <select value={currency} onChange={(e: any) => setCurrency(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800">
                  {CURRENCIES.map((c: any) => (<option key={c.code} value={c.code}>{c.label}</option>))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">Applied to student fees, invoices, salary scales, and payments.</p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Motto / Tagline Statement</label>
                <input type="text" value={tagline} onChange={(e: any) => setTagline(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Official Contact Email</label>
                <input type="email" value={contactEmail} onChange={(e: any) => setContactEmail(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Official Contact Phone</label>
                <input type="tel" value={contactPhone} onChange={(e: any) => setContactPhone(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"/>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Physical Campus Address</label>
                <input type="text" value={address} onChange={(e: any) => setAddress(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Google Maps Embed URL</label>
                <input type="url" value={mapUrl} onChange={(e: any) => setMapUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
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
                <textarea rows={2} value={mission} onChange={(e: any) => setMission(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vision Statement</label>
                <textarea rows={2} value={vision} onChange={(e: any) => setVision(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Institutional History</label>
                <textarea rows={3} value={history} onChange={(e: any) => setHistory(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
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
                <input type="url" value={facebookUrl} onChange={(e: any) => setFacebookUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Twitter / X URL</label>
                <input type="url" value={twitterUrl} onChange={(e: any) => setTwitterUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Instagram URL</label>
                <input type="url" value={instagramUrl} onChange={(e: any) => setInstagramUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">YouTube URL</label>
                <input type="url" value={youtubeUrl} onChange={(e: any) => setYoutubeUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">LinkedIn URL</label>
                <input type="url" value={linkedinUrl} onChange={(e: any) => setLinkedinUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button type="button" onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Institutional Profile'}
              </button>
            </div>
          </div>
        </div>)}

      {activeTab === 'branding' && (<div className="bg-white border border-slate-200 rounded p-4 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">Visual Styling & Accent Colors</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure institutional primary and secondary palette tokens.</p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Primary Brand Accent</label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c: any) => (<button key={c.hex} type="button" onClick={() => setPrimaryColor(c.hex)} className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs font-medium cursor-pointer ${primaryColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-slate-900 bg-slate-100 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'}`}>
                    <span className="w-3 h-3 rounded-xs border border-black/10 inline-block" style={{ backgroundColor: c.hex }}/>
                    <span>{c.name}</span>
                  </button>))}

                <div className="flex items-center gap-2 pl-2">
                  <input type="color" value={primaryColor} onChange={(e: any) => setPrimaryColor(e.target.value)} className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"/>
                  <span className="font-mono text-xs text-slate-600">{primaryColor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Secondary Brand Accent</label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c: any) => (<button key={`sec-${c.hex}`} type="button" onClick={() => setSecondaryColor(c.hex)} className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs font-medium cursor-pointer ${secondaryColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-slate-900 bg-slate-100 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'}`}>
                    <span className="w-3 h-3 rounded-xs border border-black/10 inline-block" style={{ backgroundColor: c.hex }}/>
                    <span>{c.name}</span>
                  </button>))}

                <div className="flex items-center gap-2 pl-2">
                  <input type="color" value={secondaryColor} onChange={(e: any) => setSecondaryColor(e.target.value)} className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"/>
                  <span className="font-mono text-xs text-slate-600">{secondaryColor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Theme Layout Mode</label>
              <select value={theme} onChange={(e: any) => setTheme(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800">
                <option value="default">Default Academic Clean</option>
                <option value="modern">Modern Campus Grid</option>
                <option value="slate">Deep Slate Prestige</option>
                <option value="classic">Classic University Blue</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button type="button" onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Appearance'}
              </button>
            </div>
          </div>
        </div>)}

      {activeTab === 'portals' && (<div className="bg-white border border-slate-200 rounded p-4 space-y-3">
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
            ].map((p: any) => {
                const fullPortUrl = `${localPreviewPath}${p.subPath === '/' ? '' : p.subPath}`;
                return (<div key={p.title} className="p-3 border border-slate-200 rounded hover:border-slate-300 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 text-xs">{p.title}</div>
                    <p className="text-[11px] text-slate-500">{p.desc}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400">{p.subPath}</span>
                    <a href={fullPortUrl} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:underline font-medium text-xs">
                      Open Portal &rarr;
                    </a>
                  </div>
                </div>);
            })}
          </div>
        </div>)}

      {activeTab === 'danger' && (() => {
            const isSubActive = Boolean(website?.subscription_id &&
                (website.subscription_is_active !== undefined
                    ? website.subscription_is_active
                    : (String(website.subscription_status || '').toLowerCase() === 'active' &&
                        (!website.subscription_period_end || new Date(website.subscription_period_end) > new Date())))) &&
                String(website?.status || '').toLowerCase() === 'active';
            const scheduledDelDate = website?.deletion_scheduled_at ? new Date(website.deletion_scheduled_at) : null;
            return (<div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Maintenance Mode &amp; Public Notice</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toggle between Normal (Live) and Maintenance mode. If your subscription is not active, maintenance mode is automatically enforced and cannot be turned off.
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${isSubActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                Subscription: {website.subscription_status || 'Inactive'}
              </span>
            </div>

            {!isSubActive && (<div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-800 text-xs">
                Your subscription is currently <span className="font-semibold uppercase">{website.subscription_status || 'inactive'}</span>. The website is locked in Maintenance Mode until an active subscription is restored.
              </div>)}

            <div className="flex items-center justify-between p-3 rounded border bg-slate-50 border-slate-200">
              <div>
                <span className="font-semibold text-slate-800 block text-xs">
                  {isMaintenanceMode ? 'Campus Website Under Maintenance' : 'Campus Website is Live & Operational'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isMaintenanceMode
                ? 'Public routes show the maintenance notice.'
                : 'All public circulars, admissions, and portals are live.'}
                </span>
              </div>
              <button type="button" onClick={() => handleToggleMaintenanceMode(!isMaintenanceMode)} disabled={saving || (isMaintenanceMode && !isSubActive)} className={`px-3 py-1.5 rounded font-medium text-xs cursor-pointer border transition-colors disabled:opacity-50 ${isMaintenanceMode
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'}`}>
                {isMaintenanceMode ? 'Switch to Live Mode' : 'Enable Maintenance Mode'}
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Public Maintenance Notice Message
              </label>
              <textarea rows={3} value={maintenanceMessage} onChange={(e: any) => setMaintenanceMessage(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"/>
              <div className="flex justify-end">
                <button type="button" onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Maintenance Notice'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-rose-200 rounded p-4 space-y-3">
            <div className="border-b border-rose-100 pb-2">
              <h2 className="text-sm font-semibold text-rose-900">Schedule Website Deletion (30-Day Grace Period)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Websites are never deleted instantly. Scheduling deletion sets a 30-day countdown before permanent removal of all student records, notices, modules, and domains.
              </p>
            </div>

            {scheduledDelDate ? (<div className="p-3 rounded border border-amber-300 bg-amber-50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-amber-950 block">
                    Scheduled for Automatic Deletion on {scheduledDelDate.toLocaleDateString()}
                  </span>
                  <span className="text-[11px] text-amber-800">
                    All records will be permanently purged after the 30-day schedule unless cancelled before then.
                  </span>
                </div>
                <button type="button" onClick={handleCancelScheduledDeletion} disabled={deleting} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                  {deleting ? 'Cancelling...' : 'Cancel Scheduled Deletion'}
                </button>
              </div>) : (<div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Schedule deletion for {website.name} ({cleanSub})</span>
                <button type="button" onClick={() => {
                setDeleteWebsiteError('');
                setShowDeleteWebsiteModal(true);
            }} disabled={deleting} className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer disabled:opacity-50">
                  Schedule Deletion (30 Days)
                </button>
              </div>)}
          </div>

          {showDeleteWebsiteModal && (<div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Schedule 30-Day Website Deletion
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-900">{website.name}</span> will be scheduled for automatic permanent deletion after 30 days. You can cancel the scheduled deletion at any time within those 30 days.
                    </p>
                  </div>
                </div>

                {deleteWebsiteError && (<div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {deleteWebsiteError}
                  </div>)}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" disabled={deleting} onClick={() => {
                    setShowDeleteWebsiteModal(false);
                    setDeleteWebsiteError('');
                }} className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors cursor-pointer disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="button" disabled={deleting} onClick={handleConfirmDeleteWebsite} className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                    <span>{deleting ? 'Scheduling...' : 'Confirm 30-Day Schedule'}</span>
                  </button>
                </div>
              </div>
            </div>)}
        </div>);
        })()}
    </div>);
}
