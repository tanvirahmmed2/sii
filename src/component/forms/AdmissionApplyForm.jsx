'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiLayers,
  FiAward, FiHeart, FiFileText, FiLock, FiCheckCircle, FiSend, FiKey,
  FiSearch, FiAlertCircle, FiArrowRight, FiUpload, FiCheckSquare
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export const FALLBACK_ADMISSION_FIELDS = [
  {
    field_key: 'applicant_name',
    label: 'Applicant Full Name',
    field_type: 'text',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: 'e.g. Tanvir Ahmed',
    help_text: 'Legal name as per birth certificate',
    section: 'personal',
    sort_order: 1,
    is_active: true
  },
  {
    field_key: 'phone',
    label: 'Mobile Contact Number',
    field_type: 'text',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: '^01[3-9]\\d{8}$',
    placeholder: '017XXXXXXXX',
    help_text: '11-digit Bangladeshi mobile number',
    section: 'personal',
    sort_order: 2,
    is_active: true
  },
  {
    field_key: 'gender',
    label: 'Gender',
    field_type: 'select',
    options: ['Male', 'Female', 'Other'],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: 'Select gender',
    help_text: null,
    section: 'personal',
    sort_order: 3,
    is_active: true
  },
  {
    field_key: 'date_of_birth',
    label: 'Date of Birth',
    field_type: 'date',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: 'YYYY-MM-DD',
    help_text: null,
    section: 'personal',
    sort_order: 4,
    is_active: true
  },
  {
    field_key: 'blood_group',
    label: 'Blood Group',
    field_type: 'select',
    options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'Select blood group',
    help_text: null,
    section: 'personal',
    sort_order: 5,
    is_active: true
  },
  {
    field_key: 'father_name',
    label: "Father's Full Name",
    field_type: 'text',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: "Father's legal name",
    help_text: null,
    section: 'guardian',
    sort_order: 6,
    is_active: true
  },
  {
    field_key: 'father_phone',
    label: "Father's Mobile Phone",
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: '^01[3-9]\\d{8}$',
    placeholder: '01XXXXXXXXX',
    help_text: null,
    section: 'guardian',
    sort_order: 7,
    is_active: true
  },
  {
    field_key: 'father_occupation',
    label: "Father's Occupation",
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'e.g. Teacher, Engineer, Businessman',
    help_text: null,
    section: 'guardian',
    sort_order: 8,
    is_active: true
  },
  {
    field_key: 'mother_name',
    label: "Mother's Full Name",
    field_type: 'text',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: "Mother's legal name",
    help_text: null,
    section: 'guardian',
    sort_order: 9,
    is_active: true
  },
  {
    field_key: 'mother_phone',
    label: "Mother's Mobile Phone",
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: '^01[3-9]\\d{8}$',
    placeholder: '01XXXXXXXXX',
    help_text: null,
    section: 'guardian',
    sort_order: 10,
    is_active: true
  },
  {
    field_key: 'guardian_name',
    label: 'Emergency Guardian Name',
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'Guardian name if other than parents',
    help_text: null,
    section: 'guardian',
    sort_order: 11,
    is_active: true
  },
  {
    field_key: 'guardian_phone',
    label: 'Emergency Guardian Phone',
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: '^01[3-9]\\d{8}$',
    placeholder: '01XXXXXXXXX',
    help_text: null,
    section: 'guardian',
    sort_order: 12,
    is_active: true
  },
  {
    field_key: 'present_address',
    label: 'Present Address',
    field_type: 'textarea',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: 'House, Road, Area, Thana, District',
    help_text: 'Current residential address for correspondence',
    section: 'address',
    sort_order: 13,
    is_active: true
  },
  {
    field_key: 'permanent_address',
    label: 'Permanent Address',
    field_type: 'textarea',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'Village, Post, Thana, District',
    help_text: 'Leave blank if same as present address',
    section: 'address',
    sort_order: 14,
    is_active: true
  },
  {
    field_key: 'past_school_class',
    label: 'Previous Class / Level Passed',
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'e.g. Class 5, Class 8, SSC',
    help_text: 'Mandatory for merit-based intake',
    section: 'academic',
    sort_order: 15,
    is_active: true
  },
  {
    field_key: 'past_school_result',
    label: 'Previous Grade / GPA',
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'e.g. 5.00 or 4.50',
    help_text: 'GPA obtained in last academic terminal',
    section: 'academic',
    sort_order: 16,
    is_active: true
  },
  {
    field_key: 'past_school_name',
    label: 'Previous School / Institution',
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'e.g. Govt. High School',
    help_text: null,
    section: 'academic',
    sort_order: 17,
    is_active: true
  }
];

const AdmissionApplyForm = ({ 
  circulars, 
  selectedCircular, 
  onCircularChange, 
  onSubmit, 
  submitting, 
  admissionIdParam,
  onResumeExisting,
  onGoBack,
  serverValidationErrors = []
}) => {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  // Email check & verification state (Step 1)
  const [emailToVerify, setEmailToVerify] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Modular Form Fields State
  const [formFields, setFormFields] = useState(FALLBACK_ADMISSION_FIELDS);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  // Sync server validation errors
  useEffect(() => {
    if (serverValidationErrors && serverValidationErrors.length > 0) {
      const errMap = {};
      serverValidationErrors.forEach((err) => {
        if (err.field_key) {
          errMap[err.field_key] = err.error || err.message;
        }
      });
      setFieldErrors(errMap);
    }
  }, [serverValidationErrors]);

  // Fetch modular form fields whenever circular changes
  useEffect(() => {
    const fetchFields = async () => {
      if (!selectedCircular?.id) return;
      setLoadingFields(true);
      try {
        const res = await fetch(`${apiBase}/admissions/fields?admission_id=${selectedCircular.id}`);
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.fields) && data.fields.length > 0) {
          setFormFields(data.fields);
        } else {
          setFormFields(FALLBACK_ADMISSION_FIELDS);
        }
      } catch (err) {
        console.warn('Failed to load circular fields, using defaults:', err);
        setFormFields(FALLBACK_ADMISSION_FIELDS);
      } finally {
        setLoadingFields(false);
      }
    };

    fetchFields();
  }, [selectedCircular?.id, apiBase]);

  const isCircularLocked = selectedCircular && (
    selectedCircular.status === 'closed' ||
    selectedCircular.is_result_published ||
    (selectedCircular.end_date && new Date() > new Date(selectedCircular.end_date))
  );

  const isMeritBased = selectedCircular?.selection_method === 'merit';
  const isExamBased = selectedCircular?.selection_method === 'exam';

  // Group active fields by section
  const sections = useMemo(() => {
    const active = formFields.filter((f) => f.is_active !== false);
    const groups = {
      personal: { title: '2. Candidate Personal Information', icon: FiUser, fields: [] },
      guardian: { title: '3. Parents & Guardian Information', icon: FiUser, fields: [] },
      academic: { title: '4. Academic Background', icon: FiAward, fields: [] },
      address: { title: '5. Residential Address Details', icon: FiMapPin, fields: [] },
      general: { title: '6. Additional Information', icon: FiFileText, fields: [] },
    };

    active.forEach((f) => {
      const secKey = f.section && groups[f.section] ? f.section : 'general';
      groups[secKey].fields.push(f);
    });

    return Object.entries(groups).filter(([_, group]) => group.fields.length > 0);
  }, [formFields]);

  // Handle dynamic field changes
  const handleFieldChange = (fieldKey, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
    if (fieldErrors[fieldKey]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldKey];
        return copy;
      });
    }
  };

  // Handle File Upload (read as Base64)
  const handleFileUpload = (fieldKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleFieldChange(fieldKey, reader.result);
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Step 1: Check if applicant already exists for this circular
  const handleCheckEmail = async () => {
    if (!emailToVerify.trim() || !emailToVerify.includes('@')) {
      toast.error('Please enter a valid candidate email address.');
      return;
    }
    if (!selectedCircular?.id) {
      toast.error('Please select an admission circular target first.');
      return;
    }

    setCheckingEmail(true);

    try {
      const res = await fetch(`${apiBase}/admissions/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admission_id: selectedCircular.id,
          email: emailToVerify.trim().toLowerCase()
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.exists && data.applicant) {
        const app = data.applicant;
        setIsEmailVerified(true);
        setVerifiedEmail(app.email);

        // Prepopulate existing field values
        const newVals = {
          applicant_name: app.applicant_name || '',
          email: app.email || '',
          phone: app.phone || '',
          gender: app.gender || 'Male',
          date_of_birth: app.date_of_birth ? new Date(app.date_of_birth).toISOString().split('T')[0] : '',
          present_address: app.present_address || '',
          permanent_address: app.permanent_address || '',
          father_name: app.father_name || '',
          father_phone: app.father_phone || '',
          mother_name: app.mother_name || '',
          mother_phone: app.mother_phone || '',
          past_school_name: app.last_institution || '',
          past_school_class: app.last_class || '',
          past_school_result: app.last_class_grade ? String(app.last_class_grade) : ''
        };

        if (app.custom_fields && typeof app.custom_fields === 'object') {
          Object.assign(newVals, app.custom_fields);
        }

        setFieldValues((prev) => ({ ...prev, ...newVals }));
        toast.success(`Found your application in '${app.status}' status! Resuming...`);

        if (onResumeExisting) {
          if (app.status === 'unpaid') {
            onResumeExisting({ step: 'payment', applicant: app });
            return;
          } else if (app.status === 'paid') {
            onResumeExisting({ step: 'upload', applicant: app });
            return;
          } else if (['completed', 'selected', 'rejected', 'enrolled', 'accepted'].includes(app.status)) {
            onResumeExisting({ step: 'completed', applicant: app });
            return;
          }
        }
      } else {
        toast.info('No existing record found for this circular. Please verify your email with OTP.');
        await handleSendOtp();
      }
    } catch {
      toast.error('Network error checking candidate email.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSendOtp = async () => {
    if (!emailToVerify.trim() || !emailToVerify.includes('@')) {
      toast.error('Please enter a valid candidate email address.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch(`${apiBase}/admissions/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
        toast.success(data.message || 'Verification code dispatched to your email.');
      } else {
        toast.error(data.error || 'Failed to dispatch verification code.');
      }
    } catch {
      toast.error('Network error sending verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch(`${apiBase}/admissions/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToVerify.trim(),
          code: otpCode.trim(),
          admission_id: selectedCircular?.id || null,
          applicant_name: fieldValues.applicant_name || 'Candidate',
          phone: fieldValues.phone || ''
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEmailVerified(true);
        setVerifiedEmail(emailToVerify.trim());
        setFieldValues((prev) => ({ ...prev, email: emailToVerify.trim() }));
        toast.success('Email verified successfully! Application form is unlocked.');
      } else {
        toast.error(data.error || 'Invalid verification code.');
      }
    } catch {
      toast.error('Network error verifying code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Validate form client-side before calling onSubmit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEmailVerified) {
      toast.error('You must verify your email address before submitting the application.');
      return;
    }
    if (isCircularLocked) {
      toast.error('Applications for this admission circular are closed because the deadline has passed.');
      return;
    }

    const errors = {};
    const active = formFields.filter((f) => f.is_active !== false);

    for (const f of active) {
      const val = fieldValues[f.field_key];
      const strVal = val !== undefined && val !== null ? String(val).trim() : '';

      // Required Check
      if (f.is_required) {
        if (f.field_type === 'boolean' && !val) {
          errors[f.field_key] = `${f.label} must be confirmed.`;
        } else if (!strVal) {
          errors[f.field_key] = `${f.label} is required.`;
        }
      }

      if (strVal) {
        // Number Check
        if (f.field_type === 'number' && isNaN(Number(strVal))) {
          errors[f.field_key] = `${f.label} must be a valid number.`;
        }

        // Date Check
        if (f.field_type === 'date' && isNaN(Date.parse(strVal))) {
          errors[f.field_key] = `${f.label} must be a valid date.`;
        }

        // Select Check
        if (f.field_type === 'select') {
          let opts = [];
          if (Array.isArray(f.options)) opts = f.options;
          else if (typeof f.options === 'string') {
            try { opts = JSON.parse(f.options); } catch { opts = []; }
          }
          if (opts.length > 0 && !opts.includes(strVal)) {
            errors[f.field_key] = `Please select an allowed option for ${f.label}.`;
          }
        }

        // Regex Validation
        if (f.validation_regex) {
          try {
            const re = new RegExp(f.validation_regex);
            if (!re.test(strVal)) {
              errors[f.field_key] = `${f.label} format is invalid. ${f.help_text || ''}`.trim();
            }
          } catch (_) {}
        }
      }
    }

    // Merit-based circular validation
    if (isMeritBased) {
      const pastClass = fieldValues.past_school_class || fieldValues.last_class;
      const pastGrade = fieldValues.past_school_result || fieldValues.last_class_grade;

      if (!pastClass?.trim()) {
        errors.past_school_class = 'Previous Class is required for merit-based intake.';
      }
      if (!pastGrade?.trim()) {
        errors.past_school_result = 'Previous GPA / Grade is required for merit-based intake.';
      } else if (selectedCircular.last_class_grade) {
        const minGrade = parseFloat(selectedCircular.last_class_grade);
        const enteredGrade = parseFloat(pastGrade);
        if (!isNaN(minGrade) && !isNaN(enteredGrade) && enteredGrade < minGrade) {
          errors.past_school_result = `Your GPA (${enteredGrade}) is below the required minimum GPA (${minGrade}) for this circular.`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(`Please correct the errors in the form: ${firstError}`);
      return;
    }

    // Prepare complete form payload
    const payload = {
      ...fieldValues,
      email: verifiedEmail || emailToVerify.trim(),
      custom_fields: { ...fieldValues },
      address: fieldValues.present_address || fieldValues.address,
      present_address: fieldValues.present_address || fieldValues.address,
      last_class: fieldValues.past_school_class || fieldValues.last_class,
      last_class_grade: fieldValues.past_school_result || fieldValues.last_class_grade,
      last_institution: fieldValues.past_school_name || fieldValues.last_institution
    };

    onSubmit(payload);
  };

  // Render individual input control based on field_type
  const renderFieldControl = (f) => {
    const val = fieldValues[f.field_key] ?? '';
    const err = fieldErrors[f.field_key];
    const isRequired = Boolean(f.is_required);

    let opts = [];
    if (f.field_type === 'select') {
      if (Array.isArray(f.options)) opts = f.options;
      else if (typeof f.options === 'string') {
        try { opts = JSON.parse(f.options); } catch { opts = []; }
      }
    }

    return (
      <div key={f.field_key} className="flex flex-col gap-1 w-full">
        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>
            {f.label} {isRequired && <span className="text-rose-500">*</span>}
          </span>
          {f.is_shown_in_id_card && (
            <span className="text-[9px] lowercase bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
              on ID card
            </span>
          )}
        </label>

        {f.field_type === 'text' && (
          <input
            type="text"
            required={isRequired}
            placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
            disabled={!isEmailVerified || isCircularLocked}
            value={val}
            onChange={(e) => handleFieldChange(f.field_key, e.target.value)}
            className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white outline-none transition ${
              err ? 'border-rose-500 focus:border-rose-600' : 'border-slate-300 dark:border-slate-700 focus:border-blue-500'
            }`}
          />
        )}

        {f.field_type === 'number' && (
          <input
            type="number"
            step="any"
            required={isRequired}
            placeholder={f.placeholder || '0'}
            disabled={!isEmailVerified || isCircularLocked}
            value={val}
            onChange={(e) => handleFieldChange(f.field_key, e.target.value)}
            className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none transition ${
              err ? 'border-rose-500 focus:border-rose-600' : 'border-slate-300 dark:border-slate-700 focus:border-blue-500'
            }`}
          />
        )}

        {f.field_type === 'select' && (
          <select
            required={isRequired}
            disabled={!isEmailVerified || isCircularLocked}
            value={val}
            onChange={(e) => handleFieldChange(f.field_key, e.target.value)}
            className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white outline-none cursor-pointer transition ${
              err ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <option value="">{f.placeholder || `Select ${f.label.toLowerCase()}...`}</option>
            {opts.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {f.field_type === 'date' && (
          <input
            type="date"
            required={isRequired}
            disabled={!isEmailVerified || isCircularLocked}
            value={val}
            onChange={(e) => handleFieldChange(f.field_key, e.target.value)}
            className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none transition ${
              err ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        )}

        {f.field_type === 'textarea' && (
          <textarea
            rows={2}
            required={isRequired}
            placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
            disabled={!isEmailVerified || isCircularLocked}
            value={val}
            onChange={(e) => handleFieldChange(f.field_key, e.target.value)}
            className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white outline-none transition ${
              err ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        )}

        {f.field_type === 'boolean' && (
          <label className="flex items-center gap-2 pt-1.5 cursor-pointer">
            <input
              type="checkbox"
              disabled={!isEmailVerified || isCircularLocked}
              checked={Boolean(val)}
              onChange={(e) => handleFieldChange(f.field_key, e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300">
              {f.placeholder || `Confirm ${f.label}`}
            </span>
          </label>
        )}

        {f.field_type === 'file' && (
          <div className="flex items-center gap-3">
            <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition">
              <FiUpload className="w-3.5 h-3.5" />
              <span>Choose Document</span>
              <input
                type="file"
                disabled={!isEmailVerified || isCircularLocked}
                onChange={(e) => handleFileUpload(f.field_key, e)}
                className="hidden"
              />
            </label>
            {val && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <FiCheckCircle /> Attached
              </span>
            )}
          </div>
        )}

        {err && (
          <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
            <FiAlertCircle /> {err}
          </span>
        )}

        {f.help_text && !err && (
          <span className="text-[10px] text-slate-400 mt-0.5">
            {f.help_text}
          </span>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
      {/* Target Circular Selector */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <FiLayers className="text-secondary" /> Target Admission Circular *
        </label>
        {admissionIdParam && selectedCircular ? (
          <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold">
            {selectedCircular.title} (Department: {selectedCircular.department_name || 'General'} • Class: {selectedCircular.class_name})
          </div>
        ) : (
          <select
            required
            value={selectedCircular ? selectedCircular.id : ''}
            onChange={(e) => onCircularChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="">Choose an open circular drive...</option>
            {circulars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.department_name ? `${c.department_name} • ` : ''}Class: {c.class_name} ({c.selection_method ? `${c.selection_method.toUpperCase()} BASED` : 'DIRECT'})
              </option>
            ))}
          </select>
        )}

        {selectedCircular && (
          <div className="flex flex-col gap-2.5 mt-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex flex-wrap gap-x-4 gap-y-1">
              <div>
                • Type: <span className="uppercase text-purple-600 dark:text-purple-400 font-bold">{selectedCircular.selection_method || 'manual'} based</span>
              </div>
              {selectedCircular.min_age !== null && <div>• Min Age: <strong>{selectedCircular.min_age} years</strong></div>}
              {selectedCircular.max_age !== null && <div>• Max Age: <strong>{selectedCircular.max_age} years</strong></div>}
              <div>• Deadline: <strong>{selectedCircular.end_date ? new Date(selectedCircular.end_date).toLocaleDateString() : 'N/A'}</strong></div>
              {selectedCircular.result_date && <div>• Result Date: <strong>{new Date(selectedCircular.result_date).toLocaleDateString()}</strong></div>}
              <div>• Admission Fee: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">BDT {parseFloat(selectedCircular.fee_amount || selectedCircular.fees || 0).toFixed(2)}</strong></div>
            </div>

            {/* Exam Based Info */}
            {isExamBased && (
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 p-3 rounded-xl text-xs text-purple-900 dark:text-purple-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FiCalendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Admission Test Required</span>
                </div>
                <p className="text-[11px] text-purple-800/90 dark:text-purple-300/90">
                  Exam Date: {selectedCircular.exam_date || selectedCircular.admission_exam_date ? new Date(selectedCircular.exam_date || selectedCircular.admission_exam_date).toLocaleDateString() : 'Will be notified'} | Venue: {selectedCircular.exam_venue || 'Main Campus'}
                </p>
                {selectedCircular.exam_subjects?.length > 0 && (
                  <p className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
                    Subjects: {selectedCircular.exam_subjects.map(s => `${s.title} (${s.mark} marks)`).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Merit Based Info */}
            {isMeritBased && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FiAward className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Merit-Based Selection (Past Academic Ranking)</span>
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                  Applicants are ranked and selected strictly by previous academic GPA/marks.
                  {selectedCircular.last_class_grade ? ` Minimum required GPA: ${selectedCircular.last_class_grade}` : ''}
                </p>
              </div>
            )}

            {isCircularLocked && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <FiLock className="text-rose-600 shrink-0 text-sm" />
                <span>Notice: Applications for this circular are closed as the deadline has passed.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 1: Email Verification & Smart Lookup Gate */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FiMail className="text-blue-600" /> Step 1: Candidate Email Verification &amp; Resume *
          </h3>
          {isEmailVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <FiCheckCircle className="text-sm" /> Verified
            </span>
          )}
        </div>

        {!isEmailVerified ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your email address. If you have already applied for this circular, the system will instantly retrieve your application and resume at your exact progress stage.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="email"
                placeholder="candidate@example.com"
                value={emailToVerify}
                onChange={(e) => {
                  setEmailToVerify(e.target.value);
                  setOtpSent(false);
                }}
                className="w-full sm:flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-mono"
              />

              <button
                type="button"
                onClick={handleCheckEmail}
                disabled={checkingEmail || !emailToVerify.trim() || !selectedCircular}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs"
              >
                {checkingEmail ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <FiSearch className="w-3.5 h-3.5" />
                    <span>Check / Verify Email</span>
                  </>
                )}
              </button>
            </div>

            {/* OTP Code Entry if Sent */}
            {otpSent && (
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl space-y-3">
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-200 block">
                  Enter 6-Digit Email Verification Code:
                </span>
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full sm:w-48 text-center text-sm font-mono tracking-[0.3em] font-bold px-3 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otpCode.trim().length !== 6}
                    className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {verifyingOtp ? 'Verifying...' : 'Confirm OTP & Unlock Form'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-auto"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
            <span>Verified Candidate Email: <strong>{verifiedEmail}</strong></span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">Form Unlocked</span>
          </div>
        )}
      </div>

      {/* DYNAMIC MODULAR SECTIONS (Unlocked when email is verified) */}
      <div className={!isEmailVerified ? 'opacity-40 pointer-events-none transition-opacity' : 'transition-opacity'}>
        {sections.map(([secKey, group]) => {
          const IconComp = group.icon;
          return (
            <div
              key={secKey}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4 mb-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <IconComp className="text-blue-600" /> {group.title}
                </h3>
                {secKey === 'academic' && isMeritBased && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full uppercase">
                    Required for Merit Evaluation
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.fields.map((f) => renderFieldControl(f))}
              </div>
            </div>
          );
        })}

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!isEmailVerified || submitting || isCircularLocked}
            className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 text-xs flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Validating &amp; Saving Profile...</span>
              </>
            ) : (
              <span>Proceed to Application Fee Payment &rarr;</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default AdmissionApplyForm;
