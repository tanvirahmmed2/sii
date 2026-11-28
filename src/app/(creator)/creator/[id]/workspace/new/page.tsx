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

const HIERARCHY_PRESETS = [
  {
    type: 'CLASS_SEC',
    title: 'Class > Section (with Session)',
    subtitle: 'Standard School / High School',
    description: 'Students enroll into Classes and optional Sections under an Academic Year / Session.',
    path: ['Session / Year', 'Class', 'Section'],
    config: {
      use_department: false,
      require_department: false,
      use_session: true,
      require_session: true,
      use_class: true,
      require_class: true,
      use_section: true,
      require_section: false,
    },
  },
  {
    type: 'DEPT_CLASS_SEC',
    title: 'Department > Class > Section',
    subtitle: 'Group / Shift / College Track',
    description: 'Classes belong to Departments such as Science, Arts, Commerce, or Morning/Day Shifts.',
    path: ['Department', 'Class', 'Section'],
    config: {
      use_department: true,
      require_department: true,
      use_session: true,
      require_session: true,
      use_class: true,
      require_class: true,
      use_section: true,
      require_section: false,
    },
  },
  {
    type: 'DEPT_SESSION_SEC',
    title: 'Department > Session > Section',
    subtitle: 'University / Higher Education',
    description: 'Enrollment runs directly by Department and Session/Semester without rigid Class levels.',
    path: ['Department', 'Session', 'Section'],
    config: {
      use_department: true,
      require_department: true,
      use_session: true,
      require_session: true,
      use_class: false,
      require_class: false,
      use_section: true,
      require_section: false,
    },
  },
  {
    type: 'CUSTOM',
    title: 'Custom Modular Hierarchy',
    subtitle: 'Custom Structure',
    description: 'Pick exact active & mandatory academic levels and custom institutional labels.',
    path: ['Custom Toggle Matrix'],
    config: null,
  },
];

const INITIAL_DAYS = [
  { name: 'Sunday', day_order: 1, status: 'on' },
  { name: 'Monday', day_order: 2, status: 'on' },
  { name: 'Tuesday', day_order: 3, status: 'on' },
  { name: 'Wednesday', day_order: 4, status: 'on' },
  { name: 'Thursday', day_order: 5, status: 'on' },
  { name: 'Friday', day_order: 6, status: 'off' },
  { name: 'Saturday', day_order: 7, status: 'off' },
];

interface AssetState {
  file: File | null;
  previewUrl: string;
  isPdf: boolean;
  name: string;
  size: string;
  error: string;
}

const EMPTY_ASSET: AssetState = {
  file: null,
  previewUrl: '',
  isPdf: false,
  name: '',
  size: '',
  error: '',
};

function VerificationUploadCard({
  label,
  required,
  helperText,
  asset,
  accept = 'image/*,application/pdf,.pdf',
  onSelectFile,
  onRemove,
}: {
  label: string;
  required?: boolean;
  helperText?: string;
  asset: AssetState;
  accept?: string;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {helperText && <span className="block text-[10px] text-slate-500">{helperText}</span>}

      {!asset.file ? (
        <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer transition min-h-[96px]">
          <span className="text-xs font-medium text-slate-700">
            Select {label}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, WEBP or PDF up to 10MB (uploaded on create)</span>
          <input
            type="file"
            accept={accept}
            onChange={(e: any) => {
              const file = e.target.files?.[0];
              if (file) onSelectFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>
      ) : (
        <div className="p-2.5 border border-emerald-200 bg-emerald-50/50 rounded space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {!asset.isPdf && asset.previewUrl ? (
                <img
                  src={asset.previewUrl}
                  alt={label}
                  className="w-10 h-10 rounded object-cover border border-slate-200 bg-white shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-medium font-mono shrink-0">
                  PDF
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-900 truncate">{asset.name || 'Selected File'}</div>
                <div className="text-[10px] text-emerald-700 font-mono truncate">
                  Ready to upload {asset.size ? `• ${asset.size}` : ''}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-medium cursor-pointer shrink-0"
            >
              Remove
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-emerald-100 pt-1.5 text-[11px]">
            {asset.previewUrl ? (
              <a href={asset.previewUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">
                Preview File
              </a>
            ) : (
              <span className="text-slate-500">Selected</span>
            )}
            <label className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer">
              <span>Replace</span>
              <input
                type="file"
                accept={accept}
                onChange={(e: any) => {
                  const file = e.target.files?.[0];
                  if (file) onSelectFile(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
      {asset.error && <div className="text-[11px] text-rose-600 font-medium">{asset.error}</div>}
    </div>
  );
}

export default function CreateWebsitePage() {
  const router = useRouter();
  const routeParams: any = useParams();
  const searchParams = useSearchParams();
  const querySubId = searchParams.get('subscriptionId');
  const { creatorId: contextCreatorId, creator, subscriptions = [], activeSubscriptions = [], refetch } = useCreator();
  const creatorId = routeParams?.id || contextCreatorId;

  const activeSubs =
    activeSubscriptions.length > 0
      ? activeSubscriptions
      : subscriptions.filter((s: any) => s.is_active === true);

  const hasAvailableSlot = activeSubs.some((s: any) => {
    const allowed = Number(s.websitesAllowed ?? s.max_websites ?? 1);
    const used = Number(s.websitesUsed ?? s.websites_count ?? 0);
    return used < allowed;
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [baseDomain, setBaseDomain] = useState<string>(
    typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:3000'
  );
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>(querySubId || '');

  const [name, setName] = useState<string>('');
  const [institutionType, setInstitutionType] = useState<string>('school');
  const [eeinNumber, setEeinNumber] = useState<string>('');
  const [tagline, setTagline] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>(creator?.email || '');
  const [contactPhone, setContactPhone] = useState<string>(creator?.phone || '');
  const [address, setAddress] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#1e40af');
  const [secondaryColor, setSecondaryColor] = useState<string>('#0ea5e9');
  const [theme, setTheme] = useState<string>('default');
  const [currency, setCurrency] = useState<string>('BDT');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoData, setLogoData] = useState<string>('');
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconData, setFaviconData] = useState<string>('');
  const [facebookUrl, setFacebookUrl] = useState<string>('');
  const [twitterUrl, setTwitterUrl] = useState<string>('');
  const [instagramUrl, setInstagramUrl] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.'
  );

  const [creatorNid, setCreatorNid] = useState<string>('');
  const [nidFront, setNidFront] = useState<AssetState>({ ...EMPTY_ASSET });
  const [nidBack, setNidBack] = useState<AssetState>({ ...EMPTY_ASSET });
  const [eiinCertificate, setEiinCertificate] = useState<string>('');
  const [eiinCertAsset, setEiinCertAsset] = useState<AssetState>({ ...EMPTY_ASSET });
  const [ugcCertAsset, setUgcCertAsset] = useState<AssetState>({ ...EMPTY_ASSET });
  const [additionalCertAsset, setAdditionalCertAsset] = useState<AssetState>({ ...EMPTY_ASSET });
  const [verificationAddress, setVerificationAddress] = useState<string>('');
  const [principalName, setPrincipalName] = useState<string>('');
  const [boardAffiliation, setBoardAffiliation] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const [hierarchyConfig, setHierarchyConfig] = useState<any>({
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

  const [sessions, setSessions] = useState<Array<{ name: string; status: string }>>([
    { name: '2026-2027', status: 'active' },
  ]);
  const [departments, setDepartments] = useState<Array<any>>([
    {
      key: 'Science',
      name: 'Science',
      code: 'SCI',
      description: 'Science & STEM faculty track',
      motto: '',
      expected_cost: '',
      head_name: '',
      head_designation: 'Head of Department',
      head_email: '',
      head_phone: '',
    },
  ]);
  const [classesList, setClassesList] = useState<Array<any>>([
    { key: 'Class 6', name: 'Class 6', code: 'CLS-6', department_key: '', max_seats: 40, description: '' },
  ]);
  const [sectionsList, setSectionsList] = useState<Array<any>>([
    { name: 'Section A', class_key: 'Class 6', department_key: '', session_name: '2026-2027', capacity: 40, room_number: '101' },
  ]);
  const [subjectsList, setSubjectsList] = useState<Array<any>>([
    { name: 'Mathematics', code: 'MATH-101', class_key: 'Class 6', type: 'Theory', full_marks: 100, pass_marks: 33, is_optional: false, description: '' },
  ]);
  const [daysList, setDaysList] = useState<Array<{ name: string; day_order: number; status: string }>>(INITIAL_DAYS);
  const [periodsList, setPeriodsList] = useState<Array<any>>([
    { name: '1st Period', start_time: '09:00', end_time: '09:45', is_break: false },
  ]);

  const [subdomain, setSubdomain] = useState<string>('');
  const [isSubdomainClaimed, setIsSubdomainClaimed] = useState<boolean>(false);
  const [domainStatus, setDomainStatus] = useState<any>({
    state: 'idle',
    message: '',
    fullDomain: '',
  });

  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>('');
  const [createSuccess, setCreateSuccess] = useState<string>('');

  useEffect(() => {
    if (querySubId) {
      setSelectedSubscriptionId(querySubId);
    } else if (activeSubs.length > 0 && !selectedSubscriptionId) {
      const preferred = activeSubs.find((s: any) => {
        const allowed = Number(s.websitesAllowed ?? s.max_websites ?? 1);
        const used = Number(s.websitesUsed ?? s.websites_count ?? 0);
        return allowed - used > 0;
      });
      setSelectedSubscriptionId(String(preferred?.id || activeSubs[0].id));
    }
  }, [querySubId, activeSubs, selectedSubscriptionId]);

  useEffect(() => {
    if (!creatorId) return;
    fetch(`/api/marketing/creator/websites?creatorId=${creatorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.baseDomain) setBaseDomain(data.baseDomain);
      })
      .catch(() => {});
  }, [creatorId]);

  useEffect(() => {
    if (creator?.email && !contactEmail) setContactEmail(creator.email);
    if (creator?.phone && !contactPhone) setContactPhone(creator.phone);
  }, [creator, contactEmail, contactPhone]);

  useEffect(() => {
    if (address && !verificationAddress) setVerificationAddress(address);
  }, [address, verificationAddress]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted) return;
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
          message: 'Subdomain cannot start or end with a hyphen.',
          fullDomain: `${clean}.${baseDomain}`,
        });
        setIsSubdomainClaimed(false);
        return;
      }
      setDomainStatus({ state: 'checking', message: 'Checking availability...', fullDomain: `${clean}.${baseDomain}` });
      try {
        const res = await fetch(`/api/marketing/creator/websites/check-domain?domain=${encodeURIComponent(clean)}`);
        const json = await res.json();
        if (!isMounted) return;
        if (json.available) {
          setDomainStatus({
            state: 'available',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: 'Subdomain is available. Click Claim Subdomain to lock it.',
          });
        } else {
          setDomainStatus({
            state: 'taken',
            fullDomain: json.fullDomain || `${clean}.${baseDomain}`,
            message: json.error || `"${clean}.${baseDomain}" is already taken.`,
          });
          setIsSubdomainClaimed(false);
        }
      } catch {
        if (!isMounted) return;
        setDomainStatus({
          state: 'error',
          fullDomain: `${clean}.${baseDomain}`,
          message: 'Network error checking subdomain availability.',
        });
        setIsSubdomainClaimed(false);
      }
    }, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [subdomain, baseDomain]);

  const selectedSub =
    activeSubs.find((s: any) => String(s.id) === String(selectedSubscriptionId)) ||
    (activeSubs.length > 0 ? activeSubs[0] : null);
  const selectedSubAllowed = Number(selectedSub?.websitesAllowed ?? selectedSub?.max_websites ?? 1);
  const selectedSubUsed = Number(selectedSub?.websitesUsed ?? selectedSub?.websites_count ?? 0);
  const isSelectedSubQuotaReached = selectedSub ? selectedSubUsed >= selectedSubAllowed : true;
  const noActiveSubs = activeSubs.length === 0;

  const handleImageSelect = (
    file: File,
    prevUrl: string,
    setFile: (f: File | null) => void,
    setPreviewUrl: (val: string) => void
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      setCreateError('Logo/Favicon file cannot exceed 5MB.');
      return;
    }
    if (prevUrl && prevUrl.startsWith('blob:')) {
      URL.revokeObjectURL(prevUrl);
    }
    setFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const selectVerificationFile = (
    file: File,
    currentAsset: AssetState,
    setAsset: React.Dispatch<React.SetStateAction<AssetState>>
  ) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImageOrPdf = file.type.startsWith('image/') || isPdf;
    if (!isImageOrPdf) {
      setAsset((prev) => ({ ...prev, error: 'Only image files (JPG/PNG/WEBP) or PDF documents are supported.' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAsset((prev) => ({ ...prev, error: 'File size exceeds the 10MB limit.' }));
      return;
    }
    if (currentAsset.previewUrl && currentAsset.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentAsset.previewUrl);
    }
    setAsset({
      file,
      previewUrl: URL.createObjectURL(file),
      isPdf,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      error: '',
    });
  };

  const removeVerificationAsset = (
    asset: AssetState,
    setAsset: React.Dispatch<React.SetStateAction<AssetState>>
  ) => {
    if (asset.previewUrl && asset.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(asset.previewUrl);
    }
    setAsset({ ...EMPTY_ASSET });
  };

  const handleStep1Next = (e: any) => {
    e.preventDefault();
    setCreateError('');
    if (noActiveSubs || !selectedSubscriptionId) {
      setCreateError('Please select an active subscription package.');
      return;
    }
    if (isSelectedSubQuotaReached) {
      setCreateError(`Selected subscription has reached its limit of ${selectedSubAllowed} website(s).`);
      return;
    }
    if (!name.trim() || !contactEmail.trim() || !contactPhone.trim() || !address.trim()) {
      setCreateError('Website name, official contact email, phone, and campus physical address are required.');
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep2Next = (e: any) => {
    e.preventDefault();
    setCreateError('');
    if (!creatorNid.trim()) {
      setCreateError('Creator National ID (NID) number is required.');
      return;
    }
    if (!nidFront.file || !nidBack.file) {
      setCreateError('Both Creator NID Front image and NID Back image must be selected.');
      return;
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPreset = (preset: any) => {
    if (preset.type === 'CUSTOM') {
      setHierarchyConfig((prev: any) => ({ ...prev, hierarchy_type: 'CUSTOM' }));
      return;
    }
    setHierarchyConfig((prev: any) => ({
      ...prev,
      hierarchy_type: preset.type,
      ...preset.config,
    }));
  };

  const handleToggleDimension = (key: string) => {
    setHierarchyConfig((prev: any) => {
      const nextVal = !prev[key];
      const next: any = { ...prev, [key]: nextVal, hierarchy_type: 'CUSTOM' };
      if (key.startsWith('use_') && !nextVal) {
        next[key.replace('use_', 'require_')] = false;
      }
      return next;
    });
  };

  const validateStep3 = (): string | null => {
    const validSessions = sessions.filter((s) => s.name.trim());
    const validDepts = departments.filter((d) => d.name.trim());
    const validClasses = classesList.filter((c) => c.name.trim());
    const validSections = sectionsList.filter((s) => s.name.trim());

    if (hierarchyConfig.use_session && hierarchyConfig.require_session && validSessions.length === 0) {
      return `Please add at least one ${hierarchyConfig.labels.session}.`;
    }
    if (hierarchyConfig.use_department && hierarchyConfig.require_department && validDepts.length === 0) {
      return `Please add at least one ${hierarchyConfig.labels.department}.`;
    }
    if (hierarchyConfig.use_class && hierarchyConfig.require_class && validClasses.length === 0) {
      return `Please add at least one ${hierarchyConfig.labels.class}.`;
    }
    if (hierarchyConfig.use_section && hierarchyConfig.require_section && validSections.length === 0) {
      return `Please add at least one ${hierarchyConfig.labels.section}.`;
    }
    return null;
  };

  const handleStep3Next = (e: any) => {
    e.preventDefault();
    setCreateError('');
    const err = validateStep3();
    if (err) {
      setCreateError(err);
      return;
    }
    if (!subdomain && name.trim()) {
      const generated = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 32);
      setSubdomain(generated);
    }
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async (e: any) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    const step3Err = validateStep3();
    if (step3Err) {
      setCreateError(step3Err);
      return;
    }
    if (!subdomain.trim() || !isSubdomainClaimed) {
      setCreateError('Please check availability and claim an available subdomain before creating your website.');
      return;
    }

    if (!nidFront.file || !nidBack.file) {
      setCreateError('Creator NID Front and Back images are required.');
      return;
    }

    setCreating(true);
    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    const otherDetailsPayload = {
      principal_name: principalName.trim(),
      board_affiliation: boardAffiliation.trim(),
      notes: additionalNotes.trim(),
    };

    try {
      const payloadData = {
        action: 'create_website',
        creatorId: Number(creatorId),
        subscriptionId: Number(selectedSubscriptionId),
        name: name.trim(),
        institutionType,
        eeinNumber: eeinNumber.trim(),
        tagline: tagline.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        address: address.trim(),
        primaryColor,
        secondaryColor,
        theme,
        currency,
        facebook_url: facebookUrl.trim(),
        twitter_url: twitterUrl.trim(),
        instagram_url: instagramUrl.trim(),
        youtube_url: youtubeUrl.trim(),
        linkedin_url: linkedinUrl.trim(),
        is_maintenance_mode: isMaintenanceMode,
        maintenance_message: maintenanceMessage.trim(),
        subdomain: cleanSubdomain,
        creatorNid: creatorNid.trim(),
        eiinCertificate: eiinCertificate.trim(),
        verificationAddress: (verificationAddress || address).trim(),
        otherDetails: otherDetailsPayload,
        academicConfig: hierarchyConfig,
        academics: {
          sessions: hierarchyConfig.use_session ? sessions.filter((s) => s.name.trim()) : [],
          departments: hierarchyConfig.use_department ? departments.filter((d) => d.name.trim()) : [],
          classes: hierarchyConfig.use_class ? classesList.filter((c) => c.name.trim()) : [],
          sections: hierarchyConfig.use_section ? sectionsList.filter((s) => s.name.trim()) : [],
          subjects: subjectsList.filter((s) => s.name.trim()),
          days: daysList,
          periods: periodsList.filter((p) => p.name.trim()),
        },
      };

      const formData = new FormData();
      formData.append('payload', JSON.stringify(payloadData));
      if (logoFile) formData.append('logo_file', logoFile);
      if (faviconFile) formData.append('favicon_file', faviconFile);
      formData.append('nid_front_file', nidFront.file);
      formData.append('nid_back_file', nidBack.file);
      if (eiinCertAsset.file) formData.append('eiin_certificate_file', eiinCertAsset.file);
      if (ugcCertAsset.file) formData.append('ugc_certificate_file', ugcCertAsset.file);
      if (additionalCertAsset.file) formData.append('additional_certificate_file', additionalCertAsset.file);

      const res = await fetch('/api/marketing/creator/websites', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.website?.id) {
        setCreateSuccess(`Website "${name}" created successfully! Redirecting to workspace...`);
        if (refetch) await refetch();
        const targetSub = data.subdomain || cleanSubdomain;
        setTimeout(() => {
          router.push(`/creator/${creatorId}/workspace/${targetSub}`);
        }, 1200);
      } else {
        setCreateError(data.error || 'Failed to create website.');
        setCreating(false);
      }
    } catch {
      setCreateError('Network error while creating website. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/creator/${creatorId}/workspace`} className="text-xs text-slate-500 hover:text-slate-900 font-medium underline">
              Websites
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-900">Create Website</span>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200">
              Step {currentStep} of 4
            </span>
          </div>
          <h1 className="text-base font-semibold text-slate-900">Create Educational Website</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete website details, verification documents, primary academic hierarchy, and claim your subdomain.
          </p>
        </div>

        <Link href={`/creator/${creatorId}/workspace`} className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer self-start sm:self-auto">
          Cancel &amp; Return
        </Link>
      </div>

      {!hasAvailableSlot ? (
        <div className="bg-amber-50 border border-amber-200 rounded p-6 text-center space-y-3">
          <h2 className="text-sm font-semibold text-amber-900">
            {activeSubs.length === 0 ? 'Active Subscription Package Required' : 'Website Quota Reached'}
          </h2>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            {activeSubs.length === 0
              ? 'You currently have no active paid subscription. Purchase a package before creating a website.'
              : 'All active subscription packages in your account have reached their website limits.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Link href="/packages" className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs">
              Browse Packages
            </Link>
            <Link href={`/creator/${creatorId}/purchases`} className="px-4 py-2 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-xs">
              View Purchases
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { num: 1, title: '1. Website Info', enabled: true },
                { num: 2, title: '2. Verification Docs', enabled: Boolean(name && contactEmail && contactPhone && address) },
                { num: 3, title: '3. Academic Hierarchy', enabled: Boolean(name && creatorNid && nidFront.file && nidBack.file) },
                { num: 4, title: '4. Claim Subdomain', enabled: Boolean(name && creatorNid && nidFront.file && nidBack.file) },
              ].map((st) => (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => {
                    if (st.enabled || st.num < currentStep) setCurrentStep(st.num);
                  }}
                  className={`p-2.5 rounded border text-center transition-all ${
                    currentStep === st.num
                      ? 'border-slate-900 bg-slate-900 text-white font-semibold cursor-pointer'
                      : currentStep > st.num
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 cursor-pointer'
                      : st.enabled
                      ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider">Step {st.num}</div>
                  <div className="text-xs font-medium mt-0.5">{st.title}</div>
                </button>
              ))}
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
                  <h2 className="text-sm font-semibold text-slate-900">Step 1: Complete Website Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your subscription slot and configure identity, contacts, branding, and social links.
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">1 of 4</span>
              </div>

              <form onSubmit={handleStep1Next} className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-900">
                    A. Subscription Package <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeSubs.map((sub: any) => {
                      const allowed = Number(sub.websitesAllowed ?? sub.max_websites ?? 1);
                      const used = Number(sub.websitesUsed ?? sub.websites_count ?? 0);
                      const isFull = used >= allowed;
                      const isSelected = String(selectedSubscriptionId) === String(sub.id);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => !isFull && setSelectedSubscriptionId(String(sub.id))}
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
                                <div className="font-semibold text-slate-900 text-xs">
                                  {sub.package_name || sub.name || `Package #${sub.package_id}`}
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Sub #{sub.id} • {sub.billing_interval || sub.billing_cycle || 'Monthly'}
                                </span>
                              </div>
                            </div>
                            {isFull ? (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                                Limit Full
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                                Available ({allowed - used})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                    B. Institutional Identity &amp; Location
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Institution / Website Name <span className="text-rose-500">*</span>
                      </label>
                      <input type="text" required value={name} onChange={(e: any) => setName(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Institution Type</label>
                      <select value={institutionType} onChange={(e: any) => setInstitutionType(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800">
                        {INSTITUTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">EIIN / Government Registration No.</label>
                      <input type="text" value={eeinNumber} onChange={(e: any) => setEeinNumber(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800" />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Tagline / Motto</label>
                      <input type="text" value={tagline} onChange={(e: any) => setTagline(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Official Contact Email <span className="text-rose-500">*</span>
                      </label>
                      <input type="email" required value={contactEmail} onChange={(e: any) => setContactEmail(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Official Contact Phone <span className="text-rose-500">*</span>
                      </label>
                      <input type="text" required value={contactPhone} onChange={(e: any) => setContactPhone(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800" />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Campus Physical Address <span className="text-rose-500">*</span>
                      </label>
                      <textarea rows={2} required value={address} onChange={(e: any) => setAddress(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 resize-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                    C. Branding, Logo, Favicon &amp; Theme
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700">Institution Logo (Optional)</label>
                      <div className="flex items-center gap-3">
                        {logoData && (
                          <img src={logoData} alt="Logo Preview" className="w-10 h-10 rounded object-contain border border-slate-200 bg-white" />
                        )}
                        <label className="px-3 py-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium cursor-pointer">
                          <span>{logoData ? 'Change Logo' : 'Select Logo Image'}</span>
                          <input type="file" accept="image/*" onChange={(e: any) => e.target.files?.[0] && handleImageSelect(e.target.files[0], logoData, setLogoFile, setLogoData)} className="hidden" />
                        </label>
                        {logoData && (
                          <button type="button" onClick={() => {
                            if (logoData.startsWith('blob:')) URL.revokeObjectURL(logoData);
                            setLogoFile(null);
                            setLogoData('');
                          }} className="text-[11px] text-rose-600 cursor-pointer">
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700">Website Favicon (Optional)</label>
                      <div className="flex items-center gap-3">
                        {faviconData && (
                          <img src={faviconData} alt="Favicon Preview" className="w-8 h-8 rounded object-contain border border-slate-200 bg-white" />
                        )}
                        <label className="px-3 py-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium cursor-pointer">
                          <span>{faviconData ? 'Change Favicon' : 'Select Favicon Image'}</span>
                          <input type="file" accept="image/*" onChange={(e: any) => e.target.files?.[0] && handleImageSelect(e.target.files[0], faviconData, setFaviconFile, setFaviconData)} className="hidden" />
                        </label>
                        {faviconData && (
                          <button type="button" onClick={() => {
                            if (faviconData.startsWith('blob:')) URL.revokeObjectURL(faviconData);
                            setFaviconFile(null);
                            setFaviconData('');
                          }} className="text-[11px] text-rose-600 cursor-pointer">
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-700">Primary Color</label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={`pri-${c.hex}`}
                            type="button"
                            onClick={() => setPrimaryColor(c.hex)}
                            className={`px-2 py-1 rounded border text-[11px] cursor-pointer ${
                              primaryColor.toLowerCase() === c.hex.toLowerCase()
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={primaryColor} onChange={(e: any) => setPrimaryColor(e.target.value)} className="w-7 h-7 rounded border border-slate-300 cursor-pointer" />
                        <input type="text" value={primaryColor} onChange={(e: any) => setPrimaryColor(e.target.value)} className="w-28 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-700">Secondary Color</label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={`sec-${c.hex}`}
                            type="button"
                            onClick={() => setSecondaryColor(c.hex)}
                            className={`px-2 py-1 rounded border text-[11px] cursor-pointer ${
                              secondaryColor.toLowerCase() === c.hex.toLowerCase()
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={secondaryColor} onChange={(e: any) => setSecondaryColor(e.target.value)} className="w-7 h-7 rounded border border-slate-300 cursor-pointer" />
                        <input type="text" value={secondaryColor} onChange={(e: any) => setSecondaryColor(e.target.value)} className="w-28 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Theme Preset</label>
                      <select value={theme} onChange={(e: any) => setTheme(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900">
                        <option value="default">Default Modern Hub</option>
                        <option value="academic">Academic Classic</option>
                        <option value="minimal">Minimal Clean</option>
                        <option value="vibrant">Vibrant Campus</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Operating Currency</label>
                      <select value={currency} onChange={(e: any) => setCurrency(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900">
                        <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                        <option value="USD">USD ($) - US Dollar</option>
                        <option value="EUR">EUR (€) - Euro</option>
                        <option value="GBP">GBP (£) - British Pound</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                    D. Social Media &amp; Portal Status (Optional)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Facebook URL</label>
                      <input type="url" value={facebookUrl} onChange={(e: any) => setFacebookUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">YouTube URL</label>
                      <input type="url" value={youtubeUrl} onChange={(e: any) => setYoutubeUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">LinkedIn URL</label>
                      <input type="url" value={linkedinUrl} onChange={(e: any) => setLinkedinUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Instagram URL</label>
                      <input type="url" value={instagramUrl} onChange={(e: any) => setInstagramUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Twitter / X URL</label>
                      <input type="url" value={twitterUrl} onChange={(e: any) => setTwitterUrl(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs" />
                    </div>
                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer pb-1.5">
                        <input type="checkbox" checked={isMaintenanceMode} onChange={(e: any) => setIsMaintenanceMode(e.target.checked)} className="cursor-pointer" />
                        <span>Launch initially in Maintenance Mode</span>
                      </label>
                    </div>
                  </div>
                  {isMaintenanceMode && (
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Maintenance Message</label>
                      <input type="text" value={maintenanceMessage} onChange={(e: any) => setMaintenanceMessage(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs" />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <Link href={`/creator/${creatorId}/workspace`} className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs">
                    Cancel
                  </Link>
                  <button type="submit" className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer">
                    Next: Verification Documents &rarr;
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 2 && (
            <div className="bg-white border border-slate-200 rounded p-5 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Step 2: Verification Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload Creator NID front/back images and institutional verification certificates.
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">2 of 4</span>
              </div>

              <form onSubmit={handleStep2Next} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Creator National ID (NID) Number <span className="text-rose-500">*</span>
                    </label>
                    <input type="text" required value={creatorNid} onChange={(e: any) => setCreatorNid(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">EIIN Certificate Registration No.</label>
                    <input type="text" value={eiinCertificate} onChange={(e: any) => setEiinCertificate(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800" />
                  </div>

                  <VerificationUploadCard
                    label="Creator NID Front Image"
                    required={true}
                    asset={nidFront}
                    onSelectFile={(file) => selectVerificationFile(file, nidFront, setNidFront)}
                    onRemove={() => removeVerificationAsset(nidFront, setNidFront)}
                  />

                  <VerificationUploadCard
                    label="Creator NID Back Image"
                    required={true}
                    asset={nidBack}
                    onSelectFile={(file) => selectVerificationFile(file, nidBack, setNidBack)}
                    onRemove={() => removeVerificationAsset(nidBack, setNidBack)}
                  />

                  <VerificationUploadCard
                    label="EIIN Certificate Image / PDF"
                    asset={eiinCertAsset}
                    onSelectFile={(file) => selectVerificationFile(file, eiinCertAsset, setEiinCertAsset)}
                    onRemove={() => removeVerificationAsset(eiinCertAsset, setEiinCertAsset)}
                  />

                  <VerificationUploadCard
                    label="UGC / Accreditation Certificate"
                    asset={ugcCertAsset}
                    onSelectFile={(file) => selectVerificationFile(file, ugcCertAsset, setUgcCertAsset)}
                    onRemove={() => removeVerificationAsset(ugcCertAsset, setUgcCertAsset)}
                  />

                  <div className="sm:col-span-2">
                    <VerificationUploadCard
                      label="Additional Supporting Certificate"
                      asset={additionalCertAsset}
                      onSelectFile={(file) => selectVerificationFile(file, additionalCertAsset, setAdditionalCertAsset)}
                      onRemove={() => removeVerificationAsset(additionalCertAsset, setAdditionalCertAsset)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Principal / Authorized Head Name</label>
                    <input type="text" value={principalName} onChange={(e: any) => setPrincipalName(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Education Board / Ministry / UGC Affiliation</label>
                    <input type="text" value={boardAffiliation} onChange={(e: any) => setBoardAffiliation(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800" />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Registered Official Verification Address</label>
                    <textarea rows={2} value={verificationAddress} onChange={(e: any) => setVerificationAddress(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 resize-none" />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Additional Verification Notes</label>
                    <textarea rows={2} value={additionalNotes} onChange={(e: any) => setAdditionalNotes(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 resize-none" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button type="button" onClick={() => setCurrentStep(1)} className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs cursor-pointer">
                    &larr; Back to Website Info
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer">
                    Next: Academic Hierarchy &rarr;
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 3 && (
            <div className="bg-white border border-slate-200 rounded p-5 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Step 3: Academic Hierarchy &amp; Routine Structure</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your primary academic hierarchy model first, then set up sessions, departments, classes, sections, subjects, and schedule periods.
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">3 of 4</span>
              </div>

              <form onSubmit={handleStep3Next} className="space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                    A. Primary Hierarchy Preset
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {HIERARCHY_PRESETS.map((preset) => {
                      const isSelected = hierarchyConfig.hierarchy_type === preset.type;
                      return (
                        <div
                          key={preset.type}
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-3 rounded border-2 cursor-pointer transition-all space-y-1.5 ${
                            isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">{preset.subtitle}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-medium">ACTIVE</span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-slate-900">{preset.title}</div>
                          <p className="text-[11px] text-slate-600">{preset.description}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    {[
                      { useKey: 'use_department', reqKey: 'require_department', labelKey: 'department', title: 'Department' },
                      { useKey: 'use_session', reqKey: 'require_session', labelKey: 'session', title: 'Session / Year' },
                      { useKey: 'use_class', reqKey: 'require_class', labelKey: 'class', title: 'Class / Grade' },
                      { useKey: 'use_section', reqKey: 'require_section', labelKey: 'section', title: 'Section / Batch' },
                    ].map((dim) => (
                      <div key={dim.useKey} className="p-3 rounded border border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-800">{dim.title}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(hierarchyConfig[dim.useKey])}
                            onChange={() => handleToggleDimension(dim.useKey)}
                            className="cursor-pointer"
                          />
                        </div>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!hierarchyConfig[dim.useKey]}
                            checked={Boolean(hierarchyConfig[dim.reqKey])}
                            onChange={() => handleToggleDimension(dim.reqKey)}
                            className="cursor-pointer disabled:opacity-40"
                          />
                          <span>Mandatory</span>
                        </label>
                        <input
                          type="text"
                          value={hierarchyConfig.labels[dim.labelKey]}
                          onChange={(e: any) =>
                            setHierarchyConfig((prev: any) => ({
                              ...prev,
                              labels: { ...prev.labels, [dim.labelKey]: e.target.value },
                            }))
                          }
                          aria-label={`${dim.title} label`}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {hierarchyConfig.use_session && (
                  <div className="space-y-2 border border-slate-200 rounded p-3.5 bg-slate-50/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        B. {hierarchyConfig.labels.session}s (website_sessions)
                      </span>
                      <button
                        type="button"
                        onClick={() => setSessions((prev) => [...prev, { name: '', status: 'active' }])}
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-[11px] font-medium cursor-pointer"
                      >
                        + Add {hierarchyConfig.labels.session}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {sessions.map((ses, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-7">
                            <input
                              type="text"
                              value={ses.name}
                              onChange={(e: any) =>
                                setSessions((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                              }
                              aria-label="Session name"
                              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <select
                              value={ses.status}
                              onChange={(e: any) =>
                                setSessions((prev) => prev.map((r, i) => (i === idx ? { ...r, status: e.target.value } : r)))
                              }
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs"
                            >
                              <option value="active">Active</option>
                              <option value="upcoming">Upcoming</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2 text-right">
                            <button
                              type="button"
                              onClick={() => setSessions((prev) => prev.filter((_, i) => i !== idx))}
                              className="px-2 py-1 rounded border border-rose-200 text-rose-600 text-[11px] cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hierarchyConfig.use_department && (
                  <div className="space-y-3 border border-slate-200 rounded p-3.5 bg-slate-50/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        C. {hierarchyConfig.labels.department}s, Info &amp; Heads (website_departments / info / heads)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDepartments((prev) => [
                            ...prev,
                            {
                              key: `dept-${prev.length + 1}`,
                              name: '',
                              code: '',
                              description: '',
                              motto: '',
                              expected_cost: '',
                              head_name: '',
                              head_designation: 'Head of Department',
                              head_email: '',
                              head_phone: '',
                            },
                          ])
                        }
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-[11px] font-medium cursor-pointer"
                      >
                        + Add {hierarchyConfig.labels.department}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {departments.map((dept, idx) => (
                        <div key={idx} className="p-3 rounded bg-white border border-slate-200 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                            <div className="sm:col-span-5 space-y-1">
                              <label className="block text-[10px] text-slate-600">Name *</label>
                              <input
                                type="text"
                                value={dept.name}
                                onChange={(e: any) =>
                                  setDepartments((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, name: e.target.value, key: e.target.value || d.key } : d))
                                  )
                                }
                                className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs"
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <label className="block text-[10px] text-slate-600">Code</label>
                              <input
                                type="text"
                                value={dept.code}
                                onChange={(e: any) =>
                                  setDepartments((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, code: e.target.value.toUpperCase() } : d))
                                  )
                                }
                                className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs font-mono"
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <label className="block text-[10px] text-slate-600">Expected Cost</label>
                              <input
                                type="number"
                                value={dept.expected_cost}
                                onChange={(e: any) =>
                                  setDepartments((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, expected_cost: e.target.value } : d))
                                  )
                                }
                                className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs font-mono"
                              />
                            </div>
                            <div className="sm:col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => setDepartments((prev) => prev.filter((_, i) => i !== idx))}
                                className="px-2 py-1 rounded border border-rose-200 text-rose-600 text-[11px] cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-600">Motto (Optional)</label>
                              <input
                                type="text"
                                value={dept.motto}
                                onChange={(e: any) =>
                                  setDepartments((prev) => prev.map((d, i) => (i === idx ? { ...d, motto: e.target.value } : d)))
                                }
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-600">Department Head Name (Optional)</label>
                              <input
                                type="text"
                                value={dept.head_name}
                                onChange={(e: any) =>
                                  setDepartments((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, head_name: e.target.value } : d))
                                  )
                                }
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-600">Head Email / Phone (Optional)</label>
                              <input
                                type="text"
                                value={dept.head_email}
                                onChange={(e: any) =>
                                  setDepartments((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, head_email: e.target.value } : d))
                                  )
                                }
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hierarchyConfig.use_class && (
                  <div className="space-y-2 border border-slate-200 rounded p-3.5 bg-slate-50/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        D. {hierarchyConfig.labels.class}es (website_classes)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setClassesList((prev) => [
                            ...prev,
                            { key: `cls-${prev.length + 1}`, name: '', code: '', department_key: '', max_seats: 40, description: '' },
                          ])
                        }
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-[11px] font-medium cursor-pointer"
                      >
                        + Add {hierarchyConfig.labels.class}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {classesList.map((cls, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-2 bg-white rounded border border-slate-200">
                          <div className="sm:col-span-4 space-y-1">
                            <label className="block text-[10px] text-slate-600">Name *</label>
                            <input
                              type="text"
                              value={cls.name}
                              onChange={(e: any) =>
                                setClassesList((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, name: e.target.value, key: e.target.value || c.key } : c))
                                )
                              }
                              className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[10px] text-slate-600">Code</label>
                            <input
                              type="text"
                              value={cls.code}
                              onChange={(e: any) =>
                                setClassesList((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, code: e.target.value.toUpperCase() } : c))
                                )
                              }
                              className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                            />
                          </div>
                          {hierarchyConfig.use_department && (
                            <div className="sm:col-span-3 space-y-1">
                              <label className="block text-[10px] text-slate-600">{hierarchyConfig.labels.department}</label>
                              <select
                                value={cls.department_key}
                                onChange={(e: any) =>
                                  setClassesList((prev) =>
                                    prev.map((c, i) => (i === idx ? { ...c, department_key: e.target.value } : c))
                                  )
                                }
                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                              >
                                <option value="">General</option>
                                {departments.filter((d) => d.name.trim()).map((d, di) => (
                                  <option key={di} value={d.name}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[10px] text-slate-600">Max Seats</label>
                            <input
                              type="number"
                              value={cls.max_seats}
                              onChange={(e: any) =>
                                setClassesList((prev) => prev.map((c, i) => (i === idx ? { ...c, max_seats: e.target.value } : c)))
                              }
                              className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                            />
                          </div>
                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => setClassesList((prev) => prev.filter((_, i) => i !== idx))}
                              className="px-2 py-1 rounded border border-rose-200 text-rose-600 text-[11px] cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hierarchyConfig.use_section && (
                  <div className="space-y-2 border border-slate-200 rounded p-3.5 bg-slate-50/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        E. {hierarchyConfig.labels.section}s (website_sections)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSectionsList((prev) => [
                            ...prev,
                            {
                              name: '',
                              class_key: classesList[0]?.name || '',
                              department_key: departments[0]?.name || '',
                              session_name: sessions[0]?.name || '',
                              capacity: 40,
                              room_number: '',
                            },
                          ])
                        }
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-[11px] font-medium cursor-pointer"
                      >
                        + Add {hierarchyConfig.labels.section}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {sectionsList.map((sec, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-2 bg-white rounded border border-slate-200">
                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[10px] text-slate-600">Name *</label>
                            <input
                              type="text"
                              value={sec.name}
                              onChange={(e: any) =>
                                setSectionsList((prev) => prev.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s)))
                              }
                              className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                            />
                          </div>
                          {hierarchyConfig.use_class && (
                            <div className="sm:col-span-3 space-y-1">
                              <label className="block text-[10px] text-slate-600">{hierarchyConfig.labels.class}</label>
                              <select
                                value={sec.class_key}
                                onChange={(e: any) =>
                                  setSectionsList((prev) => prev.map((s, i) => (i === idx ? { ...s, class_key: e.target.value } : s)))
                                }
                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                              >
                                <option value="">None</option>
                                {classesList.filter((c) => c.name.trim()).map((c, ci) => (
                                  <option key={ci} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[10px] text-slate-600">Capacity</label>
                            <input
                              type="number"
                              value={sec.capacity}
                              onChange={(e: any) =>
                                setSectionsList((prev) => prev.map((s, i) => (i === idx ? { ...s, capacity: e.target.value } : s)))
                              }
                              className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                            />
                          </div>
                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[10px] text-slate-600">Room Number</label>
                            <input
                              type="text"
                              value={sec.room_number}
                              onChange={(e: any) =>
                                setSectionsList((prev) => prev.map((s, i) => (i === idx ? { ...s, room_number: e.target.value } : s)))
                              }
                              className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => setSectionsList((prev) => prev.filter((_, i) => i !== idx))}
                              className="px-2 py-1 rounded border border-rose-200 text-rose-600 text-[11px] cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 border border-slate-200 rounded p-3.5 bg-slate-50/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      F. Subjects &amp; Class Mapping (website_subjects &amp; website_class_subjects)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSubjectsList((prev) => [
                          ...prev,
                          {
                            name: '',
                            code: '',
                            class_key: classesList[0]?.name || '',
                            type: 'Theory',
                            full_marks: 100,
                            pass_marks: 33,
                            is_optional: false,
                            description: '',
                          },
                        ])
                      }
                      className="px-2.5 py-1 rounded bg-slate-800 text-white text-[11px] font-medium cursor-pointer"
                    >
                      + Add Subject
                    </button>
                  </div>
                  <div className="space-y-2">
                    {subjectsList.map((sub, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-2 bg-white rounded border border-slate-200">
                        <div className="sm:col-span-3 space-y-1">
                          <label className="block text-[10px] text-slate-600">Subject Name</label>
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e: any) =>
                              setSubjectsList((prev) => prev.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s)))
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="block text-[10px] text-slate-600">Code</label>
                          <input
                            type="text"
                            value={sub.code}
                            onChange={(e: any) =>
                              setSubjectsList((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, code: e.target.value.toUpperCase() } : s))
                              )
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="block text-[10px] text-slate-600">{hierarchyConfig.labels.class}</label>
                          <select
                            value={sub.class_key}
                            onChange={(e: any) =>
                              setSubjectsList((prev) => prev.map((s, i) => (i === idx ? { ...s, class_key: e.target.value } : s)))
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                          >
                            <option value="">General</option>
                            {classesList.filter((c) => c.name.trim()).map((c, ci) => (
                              <option key={ci} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="block text-[10px] text-slate-600">Type</label>
                          <select
                            value={sub.type}
                            onChange={(e: any) =>
                              setSubjectsList((prev) => prev.map((s, i) => (i === idx ? { ...s, type: e.target.value } : s)))
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                          >
                            <option value="Theory">Theory</option>
                            <option value="Practical">Practical</option>
                            <option value="Both">Both</option>
                            <option value="Optional">Optional</option>
                          </select>
                        </div>
                        <div className="sm:col-span-1 space-y-1">
                          <label className="block text-[10px] text-slate-600">Full</label>
                          <input
                            type="number"
                            value={sub.full_marks}
                            onChange={(e: any) =>
                              setSubjectsList((prev) => prev.map((s, i) => (i === idx ? { ...s, full_marks: e.target.value } : s)))
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                          />
                        </div>
                        <div className="sm:col-span-1 space-y-1">
                          <label className="block text-[10px] text-slate-600">Pass</label>
                          <input
                            type="number"
                            value={sub.pass_marks}
                            onChange={(e: any) =>
                              setSubjectsList((prev) => prev.map((s, i) => (i === idx ? { ...s, pass_marks: e.target.value } : s)))
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                          />
                        </div>
                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => setSubjectsList((prev) => prev.filter((_, i) => i !== idx))}
                            className="px-2 py-1 rounded border border-rose-200 text-rose-600 text-[11px] cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 border border-slate-200 rounded p-3.5 bg-slate-50/40">
                  <div className="text-xs font-semibold text-slate-900">
                    G. Weekly Working Days &amp; Periods (website_days &amp; website_periods)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {daysList.map((day, idx) => (
                      <button
                        key={day.name}
                        type="button"
                        onClick={() =>
                          setDaysList((prev) =>
                            prev.map((d, i) => (i === idx ? { ...d, status: d.status === 'on' ? 'off' : 'on' } : d))
                          )
                        }
                        className={`px-3 py-1.5 rounded border text-xs font-medium cursor-pointer ${
                          day.status === 'on'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        {day.name} ({day.status === 'on' ? 'Working' : 'Off'})
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-medium text-slate-700">Initial Daily Period Slots (applied to working days)</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPeriodsList((prev) => [
                          ...prev,
                          { name: `Period ${prev.length + 1}`, start_time: '10:00', end_time: '10:45', is_break: false },
                        ])
                      }
                      className="px-2.5 py-1 rounded bg-slate-800 text-white text-[11px] font-medium cursor-pointer"
                    >
                      + Add Period
                    </button>
                  </div>
                  <div className="space-y-2">
                    {periodsList.map((per, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-2 bg-white rounded border border-slate-200">
                        <div className="sm:col-span-4 space-y-1">
                          <label className="block text-[10px] text-slate-600">Period Name</label>
                          <input
                            type="text"
                            value={per.name}
                            onChange={(e: any) =>
                              setPeriodsList((prev) => prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)))
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <label className="block text-[10px] text-slate-600">Start Time</label>
                          <input
                            type="time"
                            value={per.start_time}
                            onChange={(e: any) =>
                              setPeriodsList((prev) => prev.map((p, i) => (i === idx ? { ...p, start_time: e.target.value } : p)))
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <label className="block text-[10px] text-slate-600">End Time</label>
                          <input
                            type="time"
                            value={per.end_time}
                            onChange={(e: any) =>
                              setPeriodsList((prev) => prev.map((p, i) => (i === idx ? { ...p, end_time: e.target.value } : p)))
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-end gap-2">
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(per.is_break)}
                              onChange={(e: any) =>
                                setPeriodsList((prev) => prev.map((p, i) => (i === idx ? { ...p, is_break: e.target.checked } : p)))
                              }
                              className="cursor-pointer"
                            />
                            <span>Break</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setPeriodsList((prev) => prev.filter((_, i) => i !== idx))}
                            className="px-2 py-1 rounded border border-rose-200 text-rose-600 text-[11px] cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button type="button" onClick={() => setCurrentStep(2)} className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs cursor-pointer">
                    &larr; Back to Verification Docs
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer">
                    Next: Claim Subdomain &rarr;
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 4 && (
            <div className="bg-white border border-slate-200 rounded p-5 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Step 4: Claim Subdomain &amp; Create Website</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select and claim an available platform subdomain. Custom domains can be attached later in Edit Website once DNS verification passes.
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">4 of 4</span>
              </div>

              <form onSubmit={handleFinalSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1">
                    Available Platform Subdomain <span className="text-rose-500">*</span>
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="text"
                        required
                        value={subdomain}
                        onChange={(e: any) => {
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
                      <div>
                        {domainStatus.state === 'checking' && <span className="text-[11px] text-slate-500 font-mono">Checking availability...</span>}
                        {!isSubdomainClaimed && domainStatus.state === 'available' && (
                          <span className="text-[11px] text-emerald-700 font-medium">{domainStatus.message}</span>
                        )}
                        {domainStatus.state === 'taken' && (
                          <span className="text-[11px] text-rose-700 font-medium">{domainStatus.message}</span>
                        )}
                        {domainStatus.state === 'invalid' && (
                          <span className="text-[11px] text-amber-700 font-medium">{domainStatus.message}</span>
                        )}
                        {isSubdomainClaimed && (
                          <span className="text-[11px] font-semibold text-emerald-700">
                            Subdomain Claimed: {subdomain}.{baseDomain}
                          </span>
                        )}
                      </div>

                      {!isSubdomainClaimed && domainStatus.state === 'available' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSubdomainClaimed(true);
                            setCreateError('');
                          }}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer"
                        >
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

                <div className="p-3 rounded border border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                  Need your own domain (e.g., school.edu.bd)? After provisioning this website with a subdomain, open Edit Website &rarr; Domains &amp; DNS to add and verify DNS records for your custom domain.
                </div>

                <div className="p-3.5 rounded border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="font-semibold text-xs text-slate-900 border-b border-slate-200 pb-1">
                    Provisioning Summary
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Institution</span>
                      <span className="text-slate-900 font-medium">{name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Subdomain</span>
                      <span className="text-emerald-700 font-mono font-medium">{subdomain}.{baseDomain}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Primary Hierarchy</span>
                      <span className="text-slate-900 font-mono font-medium">{hierarchyConfig.hierarchy_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Linked Plan</span>
                      <span className="text-slate-900 font-medium">{selectedSub?.package_name || 'Active Plan'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button type="button" onClick={() => setCurrentStep(3)} className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs cursor-pointer">
                    &larr; Back to Academic Hierarchy
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !isSubdomainClaimed}
                    className="px-5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    {creating ? 'Creating Website...' : 'Create Website'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
