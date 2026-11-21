'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { FiUserPlus, FiUser, FiMail, FiPhone, FiCalendar, FiDollarSign, FiAward, FiUpload, FiTrash2, FiPlus, FiCheck, FiX, FiArrowLeft, FiList, FiCheckCircle, FiLock, FiMapPin, FiLayers, FiCopy, FiExternalLink } from 'react-icons/fi';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' }
];
export default function TeacherRegistrationPage() {
    const params: any = useParams();
    const router = useRouter();
    const { tenantUrl, slug } = useTenantWebsite();
    const domain = params?.domain || slug || '';
    const apiBase = domain ? `/api/${domain}` : '/api';
    const fileInputRef = useRef<any>(null);
    const [designations, setDesignations] = useState<any>([]);
    const [loadingDesignations, setLoadingDesignations] = useState<any>(true);
    const [departments, setDepartments] = useState<any>([]);
    const [loadingDepartments, setLoadingDepartments] = useState<any>(true);
    const [payrolls, setPayrolls] = useState<any>([]);
    const [loadingPayrolls, setLoadingPayrolls] = useState<any>(true);
    const [formData, setFormData] = useState<any>({
        name: '',
        email: '',
        number: '',
        emergency_contact: '',
        gender: 'male',
        blood_group: 'O+',
        date_of_birth: '',
        religion: 'Islam',
        address: '',
        permanent_address: '',
        joining_date: new Date().toISOString().split('T')[0],
        payroll_id: '',
        department_id: '',
        designation_id: '',
        photo_url: '',
        photo_id: '',
        password: '',
        is_active: true
    });
    const [qualifications, setQualifications] = useState<any>([
        { degree: '', institute: '', board: '', passing_year: '', result: '' }
    ]);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState<any>(null);
    const [photoPreview, setPhotoPreview] = useState<any>('');
    const [uploadingPhoto, setUploadingPhoto] = useState<any>(false);
    const [submitting, setSubmitting] = useState<any>(false);
    const [toastMessage, setToastMessage] = useState<any>(null);
    const [toastError, setToastError] = useState<any>(null);
    const [quickDesigModal, setQuickDesigModal] = useState<any>(false);
    const [newDesigTitle, setNewDesigTitle] = useState<any>('');
    const [newDesigDesc, setNewDesigDesc] = useState<any>('');
    const [creatingDesig, setCreatingDesig] = useState<any>(false);
    const [createdResult, setCreatedResult] = useState<any>(null);
    const [linkCopied, setLinkCopied] = useState<any>(false);
    const showToast = useCallback((msg: any, isErr: any = false) => {
        if (isErr) {
            setToastError(msg);
            setTimeout(() => setToastError(null), 4500);
        }
        else {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 3500);
        }
    }, []);
    const loadDesignations = useCallback(async () => {
        try {
            setLoadingDesignations(true);
            const res = await fetch(`${apiBase}/staff/panel/teacher/designations`);
            const data = await res.json();
            if (data.success && Array.isArray(data.designations)) {
                setDesignations(data.designations);
                if (data.designations.length > 0) {
                    setFormData((prev: any) => {
                        if (!prev.designation_id || !data.designations.some((d: any) => String(d.id) === String(prev.designation_id))) {
                            return { ...prev, designation_id: String(data.designations[0].id) };
                        }
                        return prev;
                    });
                }
            }
        }
        catch (err: any) {
            console.error(err);
        }
        finally {
            setLoadingDesignations(false);
        }
    }, [apiBase]);
    const loadDepartments = useCallback(async () => {
        try {
            setLoadingDepartments(true);
            const res = await fetch(`${apiBase}/staff/panel/departments`);
            const data = await res.json();
            if (data.success && Array.isArray(data.departments)) {
                setDepartments(data.departments);
            }
        }
        catch (err: any) {
            console.error(err);
        }
        finally {
            setLoadingDepartments(false);
        }
    }, [apiBase]);
    const loadPayrolls = useCallback(async () => {
        try {
            setLoadingPayrolls(true);
            const res = await fetch(`${apiBase}/staff/panel/teacher-payrolls`);
            const data = await res.json();
            if (data.success && Array.isArray(data.payrolls)) {
                setPayrolls(data.payrolls.filter((p: any) => p.is_active));
            }
        }
        catch (err: any) {
            console.error(err);
        }
        finally {
            setLoadingPayrolls(false);
        }
    }, [apiBase]);
    useEffect(() => {
        let active = true;
        fetch(`${apiBase}/staff/panel/teacher/designations`)
            .then((res: any) => res.json())
            .then((data: any) => {
            if (!active)
                return;
            if (data.success && Array.isArray(data.designations)) {
                setDesignations(data.designations);
                if (data.designations.length > 0) {
                    setFormData((prev: any) => {
                        if (!prev.designation_id || !data.designations.some((d: any) => String(d.id) === String(prev.designation_id))) {
                            return { ...prev, designation_id: String(data.designations[0].id) };
                        }
                        return prev;
                    });
                }
            }
        })
            .catch((err: any) => console.error(err));
        fetch(`${apiBase}/staff/panel/departments`)
            .then((res: any) => res.json())
            .then((data: any) => {
            if (!active)
                return;
            if (data.success && Array.isArray(data.departments)) {
                setDepartments(data.departments);
            }
        })
            .catch((err: any) => console.error(err));
        fetch(`${apiBase}/staff/panel/teacher-payrolls`)
            .then((res: any) => res.json())
            .then((data: any) => {
            if (!active)
                return;
            if (data.success && Array.isArray(data.payrolls)) {
                setPayrolls(data.payrolls.filter((p: any) => p.is_active));
            }
        })
            .catch((err: any) => console.error(err));
        return () => {
            active = false;
        };
    }, [apiBase]);
    const handleInputChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    const handleQualChange = (index: any, field: any, value: any) => {
        setQualifications((prev: any) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };
    const addQualificationRow = () => {
        setQualifications((prev: any) => [
            ...prev,
            { degree: '', institute: '', board: '', passing_year: '', result: '' }
        ]);
    };
    const removeQualificationRow = (index: any) => {
        setQualifications((prev: any) => prev.filter((_: any, i: any) => i !== index));
    };
    const handlePhotoSelect = (e: any) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file (PNG, JPG, WebP).', true);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size exceeds 5MB limit.', true);
            return;
        }
        if (photoPreview && photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview);
        }
        setSelectedPhotoFile(file);
        const localUrl = URL.createObjectURL(file);
        setPhotoPreview(localUrl);
        setFormData((prev: any) => ({
            ...prev,
            photo_url: localUrl,
            photo_id: ''
        }));
        showToast('Photo selected. It will be uploaded after teacher record is created.');
    };
    const removePhoto = () => {
        if (photoPreview && photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview);
        }
        setSelectedPhotoFile(null);
        setPhotoPreview('');
        setFormData((prev: any) => ({ ...prev, photo_url: '', photo_id: '' }));
        if (fileInputRef.current)
            fileInputRef.current.value = '';
    };
    const handleQuickCreateDesignation = async (e: any) => {
        e.preventDefault();
        if (!newDesigTitle.trim()) {
            showToast('Designation title is required.', true);
            return;
        }
        try {
            setCreatingDesig(true);
            const res = await fetch(`${apiBase}/staff/panel/teacher/designations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newDesigTitle.trim(),
                    description: newDesigDesc.trim() || null,
                    display_order: designations.length + 1,
                    is_active: true
                })
            });
            const data = await res.json();
            if (data.success && data.designation?.id) {
                const created = data.designation;
                setDesignations((prev: any) => [...prev, created]);
                setFormData((prev: any) => ({ ...prev, designation_id: String(created.id) }));
                setNewDesigTitle('');
                setNewDesigDesc('');
                setQuickDesigModal(false);
                showToast(`Designation "${created.title}" created successfully.`);
            }
            else {
                showToast(data.error || 'Failed to create designation.', true);
            }
        }
        catch (err: any) {
            console.error(err);
            showToast('Network error while creating designation.', true);
        }
        finally {
            setCreatingDesig(false);
        }
    };
    const handleCopyActivationLink = (url: any) => {
        if (!url)
            return;
        navigator.clipboard.writeText(url);
        setLinkCopied(true);
        showToast('Activation link copied to clipboard!');
        setTimeout(() => setLinkCopied(false), 3000);
    };
    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            number: '',
            emergency_contact: '',
            gender: 'male',
            blood_group: 'O+',
            date_of_birth: '',
            religion: 'Islam',
            address: '',
            permanent_address: '',
            joining_date: new Date().toISOString().split('T')[0],
            payroll_id: '',
            department_id: '',
            designation_id: designations.length > 0 ? String(designations[0].id) : '',
            photo_url: '',
            photo_id: '',
            password: '',
            is_active: true
        });
        setQualifications([
            { degree: '', institute: '', board: '', passing_year: '', result: '' }
        ]);
        setSelectedPhotoFile(null);
        setPhotoPreview('');
        setCreatedResult(null);
    };
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            showToast('Teacher full name is required.', true);
            return;
        }
        if (!formData.email.trim()) {
            showToast('Teacher email address is required.', true);
            return;
        }
        if (!formData.number.trim()) {
            showToast('Teacher phone number is required.', true);
            return;
        }
        if (!formData.designation_id || !Number(formData.designation_id)) {
            showToast('Teacher designation is required. Please assign a designation to the teacher.', true);
            return;
        }
        const validQuals = qualifications.filter((q: any) => q.degree && q.degree.trim() && q.institute && q.institute.trim());
        try {
            setSubmitting(true);
            const postData = new FormData();
            Object.keys(formData).forEach((key: any) => {
                if (key === 'department_id') {
                    if (formData.department_id && Number(formData.department_id)) {
                        postData.append('department_id', Number(formData.department_id) as any);
                    }
                }
                else if (key === 'designation_id') {
                    postData.append('designation_id', Number(formData.designation_id) as any);
                }
                else if (key === 'payroll_id') {
                    if (formData.payroll_id && Number(formData.payroll_id)) {
                        postData.append('payroll_id', Number(formData.payroll_id) as any);
                    }
                }
                else if (key === 'photo_url') {
                    if (formData.photo_url && !formData.photo_url.startsWith('blob:')) {
                        postData.append('photo_url', formData.photo_url as any);
                    }
                }
                else if (key === 'salary') {
                }
                else if (formData[key] !== null && formData[key] !== undefined) {
                    postData.append(key, formData[key] as any);
                }
            });
            postData.append('qualifications', JSON.stringify(validQuals) as any);
            if (selectedPhotoFile) {
                postData.append('photo', selectedPhotoFile as any);
            }
            const res = await fetch(`${apiBase}/staff/panel/teacher`, {
                method: 'POST',
                body: postData
            });
            const data = await res.json();
            if (!data.success || !data.teacher?.id) {
                showToast(data.error || 'Failed to register teacher.', true);
                return;
            }
            setCreatedResult({
                teacher: data.teacher,
                verificationUrl: data.verificationUrl,
                emailSent: Boolean(data.emailSent),
                message: data.message
            });
            showToast(data.message || `Teacher "${formData.name}" registered successfully.`);
        }
        catch (err: any) {
            console.error(err);
            showToast('Network error while registering teacher.', true);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<div className="w-full space-y-4">
      {toastMessage && (<div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiCheck className="w-4 h-4"/>
          <span>{toastMessage}</span>
        </div>)}
      {toastError && (<div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiX className="w-4 h-4"/>
          <span>{toastError}</span>
        </div>)}

      {createdResult && (<div className="p-4 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <FiCheckCircle className="w-5 h-5 text-emerald-600 shrink-0"/>
              <div>
                <h3 className="text-sm font-bold">Faculty Member Successfully Registered</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {createdResult.teacher.name} ({createdResult.teacher.email})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={resetForm} className="px-3 py-1.5 rounded text-xs font-medium border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/60 transition">
                Register Another Teacher
              </button>
              <Link href={tenantUrl('/staff-panel/teacher-list')} className="px-3.5 py-1.5 rounded text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1">
                <span>Teacher Directory</span>
                <FiArrowLeft className="w-3.5 h-3.5 rotate-180"/>
              </Link>
            </div>
          </div>

          {createdResult.verificationUrl && (<div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                  Account Activation & Password Setup Link:
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleCopyActivationLink(createdResult.verificationUrl)} className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition">
                    <FiCopy className="w-3 h-3"/>
                    <span>{linkCopied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                  <a href={createdResult.verificationUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-blue-600 hover:underline">
                    <span>Open</span>
                    <FiExternalLink className="w-3 h-3"/>
                  </a>
                </div>
              </div>
              <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-200 dark:border-slate-700">
                {createdResult.verificationUrl}
              </div>
              <p className="text-[10px] text-slate-500">
                {createdResult.emailSent
                    ? 'This invitation link was also dispatched to the teacher email address.'
                    : 'Email sending skipped or offline. Provide this direct link to the faculty member to complete their profile setup.'}
              </p>
            </div>)}
        </div>)}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href={tenantUrl('/staff-panel/teacher-list')} className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <FiArrowLeft className="w-3.5 h-3.5"/>
              <span>Teacher Directory</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">New Teacher Onboarding</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiUserPlus className="w-5 h-5 text-blue-600"/>
            <span>Teacher Registration Studio</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Register new institutional faculty members, assign designations, and configure academic qualifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={tenantUrl('/staff-panel/teacher-designations')} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <FiAward className="w-3.5 h-3.5"/>
            <span>Manage Designations</span>
          </Link>
          <Link href={tenantUrl('/staff-panel/teacher-list')} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition">
            <FiList className="w-3.5 h-3.5"/>
            <span>View All Teachers</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FiUser className="w-4 h-4 text-blue-600"/>
            <span>1. Personal & Contact Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-center">
              {formData.photo_url ? (<div className="relative group w-32 h-32 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-sm">
                  <img src={formData.photo_url} alt="Teacher preview" className="w-full h-full object-cover"/>
                  <button type="button" onClick={removePhoto} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs gap-1">
                    <FiTrash2 className="w-4 h-4 text-rose-400"/>
                    <span>Remove</span>
                  </button>
                </div>) : (<div className="w-32 h-32 rounded-lg bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                  <FiUser className="w-12 h-12"/>
                  <span className="text-[10px] mt-1 font-medium">No Photo</span>
                </div>)}

              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePhotoSelect} className="hidden"/>

              <button type="button" disabled={uploadingPhoto || submitting} onClick={() => fileInputRef.current?.click()} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50">
                <FiUpload className="w-3.5 h-3.5"/>
                <span>{selectedPhotoFile ? 'Change Photo' : 'Select Photo'}</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-1">
                {selectedPhotoFile ? 'Selected — ready to save' : 'Recommended: 300x300 JPG or PNG'}
              </p>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input type="text" required name="name" aria-label="Teacher Full Name" value={formData.name} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"/>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input type="email" required name="email" aria-label="Teacher Email Address" value={formData.email} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"/>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Primary Phone Number <span className="text-rose-500">*</span>
                </label>
                <input type="text" required name="number" aria-label="Teacher Phone Number" value={formData.number} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"/>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Contact
                </label>
                <input type="text" name="emergency_contact" aria-label="Emergency Contact Number" value={formData.emergency_contact} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"/>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <select name="gender" aria-label="Gender" value={formData.gender} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer">
                  {GENDERS.map((g: any) => (<option key={g.value} value={g.value}>{g.label}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Blood Group
                </label>
                <select name="blood_group" aria-label="Blood Group" value={formData.blood_group} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer">
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((bg: any) => (<option key={bg} value={bg}>{bg}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth
                </label>
                <input type="date" name="date_of_birth" aria-label="Date of Birth" value={formData.date_of_birth} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"/>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Religion
                </label>
                <input type="text" name="religion" aria-label="Religion" value={formData.religion} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"/>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Initial Demo Password (Optional)
                </label>
                <input type="password" name="password" aria-label="Initial Demo Password" value={formData.password} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"/>
                <p className="text-[10px] text-slate-400 mt-1">
                  Leave blank to auto-generate a secure random initial password.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <FiMapPin className="w-3 h-3 text-slate-400"/>
                <span>Present / Residential Address</span>
              </label>
              <textarea rows={2} name="address" aria-label="Present Address" value={formData.address} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 resize-none"/>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <FiMapPin className="w-3 h-3 text-slate-400"/>
                <span>Permanent Address</span>
              </label>
              <textarea rows={2} name="permanent_address" aria-label="Permanent Address" value={formData.permanent_address} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 resize-none"/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FiAward className="w-4 h-4 text-emerald-600"/>
            <span>2. Institutional Role & Employment</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FiLayers className="w-3.5 h-3.5 text-blue-600"/>
                  <span>Department (Optional)</span>
                </span>
                <Link href={tenantUrl('/staff-panel/departments')} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                  Manage
                </Link>
              </label>
              <select name="department_id" aria-label="Department" value={formData.department_id} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer">
                <option value="">-- None / Unassigned --</option>
                {departments.map((d: any) => (<option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(${d.code})` : ''}
                  </option>))}
              </select>
              {departments.length === 0 && !loadingDepartments && (<p className="text-[10px] text-amber-600 mt-1">
                  No departments found.{' '}
                  <Link href={tenantUrl('/staff-panel/departments')} className="underline font-semibold">
                    Create a department
                  </Link>
                </p>)}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <FiAward className="w-3.5 h-3.5 text-emerald-600"/>
                  <span>Designation <span className="text-rose-500">*</span></span>
                </label>
                <button type="button" onClick={() => setQuickDesigModal(true)} className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5">
                  <FiPlus className="w-2.5 h-2.5"/>
                  <span>Quick Add</span>
                </button>
              </div>
              <select name="designation_id" aria-label="Designation" required value={formData.designation_id} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer">
                <option value="">-- Choose Designation --</option>
                {designations.map((d: any) => (<option key={d.id} value={d.id}>
                    {d.title} {d.display_order ? `(#${d.display_order})` : ''}
                  </option>))}
              </select>
              {designations.length === 0 && !loadingDesignations && (<div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600">
                  <span>No designations found.</span>
                  <button type="button" onClick={() => setQuickDesigModal(true)} className="underline font-semibold text-emerald-700 dark:text-emerald-400">
                    Add one now
                  </button>
                </div>)}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Joining Date
              </label>
              <input type="date" name="joining_date" aria-label="Joining Date" value={formData.joining_date} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"/>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FiDollarSign className="w-3.5 h-3.5 text-emerald-600"/>
                  <span>Payroll Scale / Grade</span>
                </span>
                <Link href={tenantUrl('/staff-panel/teacher-payrolls')} target="_blank" className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                  Manage
                </Link>
              </label>
              <select name="payroll_id" aria-label="Payroll Scale" value={formData.payroll_id} onChange={handleInputChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer">
                <option value="">-- No Payroll Scale (Unassigned) --</option>
                {payrolls.map((p: any) => (<option key={p.id} value={p.id}>
                    {p.title} ({p.grade_code || 'Scale'}) — Basic: ৳{Number(p.basic_salary).toLocaleString()}
                  </option>))}
              </select>
              {payrolls.length === 0 && !loadingPayrolls && (<p className="text-[10px] text-amber-600 mt-1">
                  No payroll scales found.{' '}
                  <Link href={tenantUrl('/staff-panel/teacher-payrolls')} className="underline font-semibold">
                    Create in Payroll
                  </Link>
                </p>)}
            </div>

            <div className="flex flex-col justify-center pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="rounded border-slate-300 text-slate-900 focus:ring-0 w-4 h-4 cursor-pointer"/>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">Activate Immediately</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-0.5 ml-6">
                {formData.is_active
            ? 'Faculty account activates immediately upon creation.'
            : 'Faculty will be inactive pending email link verification.'}
              </p>
            </div>
          </div>

          {(() => {
            const selectedPayroll = payrolls.find((p: any) => String(p.id) === String(formData.payroll_id));
            if (!selectedPayroll)
                return null;
            return (<div className="mt-3 p-3 rounded border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 dark:border-emerald-800/40 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-950 dark:text-emerald-300 text-xs">
                      {selectedPayroll.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-200/60 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200">
                      {selectedPayroll.grade_code || 'STANDARD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="text-slate-600 dark:text-slate-300">
                      Gross: <strong className="text-slate-900 dark:text-white">৳{Number(selectedPayroll.gross_salary || 0).toLocaleString()}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      Deductions: <strong>-৳{Number(selectedPayroll.total_deductions || 0).toLocaleString()}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      Net Monthly: ৳{Number(selectedPayroll.net_salary || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Basic</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.basic_salary || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">House Rent</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.house_rent || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Medical</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.medical_allowance || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Transport</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.transport_allowance || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Other Allow.</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">৳{Number(selectedPayroll.other_allowance || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">PF Ded.</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">৳{Number(selectedPayroll.provident_fund || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Tax Ded.</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">৳{Number(selectedPayroll.tax_deduction || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>);
        })()}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FiCheckCircle className="w-4 h-4 text-purple-600"/>
              <span>3. Educational Degrees & Qualifications (Optional)</span>
            </h2>

            <button type="button" onClick={addQualificationRow} className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
              <FiPlus className="w-3 h-3"/>
              <span>Add Degree</span>
            </button>
          </div>

          <div className="space-y-3">
            {qualifications.map((qual: any, idx: any) => (<div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 items-end">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Degree / Certificate
                  </label>
                  <input type="text" aria-label="Degree or Certificate" value={qual.degree} onChange={(e: any) => handleQualChange(idx, 'degree', e.target.value)} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"/>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Institute / University
                  </label>
                  <input type="text" aria-label="Institute or University" value={qual.institute} onChange={(e: any) => handleQualChange(idx, 'institute', e.target.value)} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"/>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Board / Department
                  </label>
                  <input type="text" aria-label="Board or Department" value={qual.board} onChange={(e: any) => handleQualChange(idx, 'board', e.target.value)} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"/>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Passing Year
                  </label>
                  <input type="number" min="1950" max="2035" aria-label="Passing Year" value={qual.passing_year} onChange={(e: any) => handleQualChange(idx, 'passing_year', e.target.value)} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"/>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    GPA / Result
                  </label>
                  <input type="text" aria-label="GPA or Result" value={qual.result} onChange={(e: any) => handleQualChange(idx, 'result', e.target.value)} className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"/>
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  {qualifications.length > 1 && (<button type="button" onClick={() => removeQualificationRow(idx)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer" title="Remove Degree">
                      <FiTrash2 className="w-4 h-4"/>
                    </button>)}
                </div>
              </div>))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs">
          <Link href={tenantUrl('/staff-panel/teacher-list')} className="px-4 py-2 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            Cancel
          </Link>
          <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 transition shadow-sm cursor-pointer">
            <FiCheck className="w-4 h-4"/>
            <span>{submitting ? 'Registering Teacher...' : 'Complete Teacher Registration'}</span>
          </button>
        </div>
      </form>

      {quickDesigModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FiAward className="w-4 h-4 text-emerald-600"/>
                <span>Quick Add Designation</span>
              </h3>
              <button type="button" onClick={() => setQuickDesigModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded">
                <FiX className="w-4 h-4"/>
              </button>
            </div>

            <form onSubmit={handleQuickCreateDesignation} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Designation Title <span className="text-rose-500">*</span>
                </label>
                <input type="text" required autoFocus aria-label="New Designation Title" value={newDesigTitle} onChange={(e: any) => setNewDesigTitle(e.target.value)} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"/>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea rows={2} aria-label="New Designation Description" value={newDesigDesc} onChange={(e: any) => setNewDesigDesc(e.target.value)} className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 resize-none"/>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setQuickDesigModal(false)} className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  Cancel
                </button>
                <button type="submit" disabled={creatingDesig} className="px-4 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition cursor-pointer">
                  {creatingDesig ? 'Creating...' : 'Create & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
