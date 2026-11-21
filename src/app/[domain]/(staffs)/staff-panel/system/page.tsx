'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
const HIERARCHY_PRESETS = [
    {
        type: 'CLASS_SEC',
        title: 'Class > Section (with Session)',
        subtitle: 'Standard School / High School',
        description: 'Students enroll directly into Classes and optional Sections under an Academic Year / Session.',
        path: ['Session / Year', 'Class', 'Section (optional)'],
        config: {
            use_department: false,
            require_department: false,
            use_session: true,
            require_session: true,
            use_class: true,
            require_class: true,
            use_section: true,
            require_section: false
        }
    },
    {
        type: 'DEPT_CLASS_SEC',
        title: 'Department > Class > Section',
        subtitle: 'Group / Shift / Version School or College',
        description: 'Classes belong to specific Departments (e.g., Science/Arts/Commerce, Morning/Day Shift, Bangla/English Version).',
        path: ['Department (Shift/Version)', 'Class', 'Section (optional)'],
        config: {
            use_department: true,
            require_department: true,
            use_session: true,
            require_session: true,
            use_class: true,
            require_class: true,
            use_section: true,
            require_section: false
        }
    },
    {
        type: 'DEPT_SESSION_SEC',
        title: 'Department > Session > Section',
        subtitle: 'Higher Ed / University / Academy',
        description: 'Direct enrollment into academic Departments and Sessions / Semesters without rigid grade levels.',
        path: ['Department', 'Session (Batch/Year)', 'Section (optional)'],
        config: {
            use_department: true,
            require_department: true,
            use_session: true,
            require_session: true,
            use_class: false,
            require_class: false,
            use_section: true,
            require_section: false
        }
    },
    {
        type: 'CUSTOM',
        title: 'Custom Modular Configuration',
        subtitle: 'Tailored Structure',
        description: 'Hand-pick exactly which entities are visible and required during admissions and student registrations.',
        path: ['Custom Selected Fields'],
        config: null
    }
];
export default function SystemManagementPage() {
    const routeParams: any = useParams();
    const domain = routeParams?.domain || '';
    const apiBase = useMemo(() => (domain ? `/api/${domain}` : '/api'), [domain]);
    const [activeTab, setActiveTab] = useState<any>('hierarchy');
    const [loading, setLoading] = useState<any>(true);
    const [savingHierarchy, setSavingHierarchy] = useState<any>(false);
    const [savingGeneral, setSavingGeneral] = useState<any>(false);
    const [toastMessage, setToastMessage] = useState<any>(null);
    const [toastError, setToastError] = useState<any>(null);
    const [copiedKey, setCopiedKey] = useState<any>(null);
    const [systemData, setSystemData] = useState<any>(null);
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
            section: 'Section'
        }
    });
    const [profileForm, setProfileForm] = useState<any>({
        name: '',
        institution_type: 'school',
        eiin_number: '',
        currency: 'BDT',
        contact_email: '',
        contact_phone: '',
        address: '',
        facebook_url: '',
        twitter_url: '',
        instagram_url: '',
        youtube_url: '',
        linkedin_url: '',
        primary_color: '#1e40af',
        secondary_color: '#0ea5e9',
        theme: 'default',
        logo: '',
        favicon: '',
        is_maintenance_mode: false,
        maintenance_message: 'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.'
    });
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
    const loadSystemData = useCallback(async () => {
        try {
            const res = await fetch(`${apiBase}/staff/panel/system`);
            const data = await res.json();
            if (data.success) {
                setSystemData(data);
                const w = data.website || {};
                setProfileForm({
                    name: w.name || '',
                    institution_type: w.institution_type || 'school',
                    eiin_number: w.eiin_number || '',
                    currency: w.currency || 'BDT',
                    contact_email: w.contact_email || '',
                    contact_phone: w.contact_phone || '',
                    address: w.address || '',
                    facebook_url: w.facebook_url || '',
                    twitter_url: w.twitter_url || '',
                    instagram_url: w.instagram_url || '',
                    youtube_url: w.youtube_url || '',
                    linkedin_url: w.linkedin_url || '',
                    primary_color: w.primary_color || '#1e40af',
                    secondary_color: w.secondary_color || '#0ea5e9',
                    theme: w.theme || 'default',
                    logo: w.logo || '',
                    favicon: w.favicon || '',
                    is_maintenance_mode: Boolean(w.is_maintenance_mode),
                    maintenance_message: w.maintenance_message || 'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.'
                });
                if (data.academicConfig) {
                    const c = data.academicConfig;
                    setHierarchyConfig({
                        hierarchy_type: c.hierarchy_type || 'CLASS_SEC',
                        use_department: Boolean(c.use_department),
                        use_session: Boolean(c.use_session),
                        use_class: Boolean(c.use_class),
                        use_section: Boolean(c.use_section),
                        require_department: Boolean(c.require_department),
                        require_session: Boolean(c.require_session),
                        require_class: Boolean(c.require_class),
                        require_section: Boolean(c.require_section),
                        labels: {
                            department: c.labels?.department || 'Department',
                            session: c.labels?.session || 'Academic Year',
                            class: c.labels?.class || 'Class',
                            section: c.labels?.section || 'Section'
                        }
                    });
                }
            }
            else {
                showToast(data.error || 'Failed to load system architecture.', true);
            }
        }
        catch (err: any) {
            showToast('Error communicating with system server.', true);
        }
        finally {
            setLoading(false);
        }
    }, [apiBase, showToast]);
    useEffect(() => {
        let active = true;
        fetch(`${apiBase}/staff/panel/system`)
            .then((res: any) => res.json())
            .then((data: any) => {
            if (!active)
                return;
            if (data.success) {
                setSystemData(data);
                const w = data.website || {};
                setProfileForm({
                    name: w.name || '',
                    institution_type: w.institution_type || 'school',
                    eiin_number: w.eiin_number || '',
                    currency: w.currency || 'BDT',
                    contact_email: w.contact_email || '',
                    contact_phone: w.contact_phone || '',
                    address: w.address || '',
                    facebook_url: w.facebook_url || '',
                    twitter_url: w.twitter_url || '',
                    instagram_url: w.instagram_url || '',
                    youtube_url: w.youtube_url || '',
                    linkedin_url: w.linkedin_url || '',
                    primary_color: w.primary_color || '#1e40af',
                    secondary_color: w.secondary_color || '#0ea5e9',
                    theme: w.theme || 'default',
                    logo: w.logo || '',
                    favicon: w.favicon || '',
                    is_maintenance_mode: Boolean(w.is_maintenance_mode),
                    maintenance_message: w.maintenance_message || 'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.'
                });
                if (data.academicConfig) {
                    const c = data.academicConfig;
                    setHierarchyConfig({
                        hierarchy_type: c.hierarchy_type || 'CLASS_SEC',
                        use_department: Boolean(c.use_department),
                        use_session: Boolean(c.use_session),
                        use_class: Boolean(c.use_class),
                        use_section: Boolean(c.use_section),
                        require_department: Boolean(c.require_department),
                        require_session: Boolean(c.require_session),
                        require_class: Boolean(c.require_class),
                        require_section: Boolean(c.require_section),
                        labels: {
                            department: c.labels?.department || 'Department',
                            session: c.labels?.session || 'Academic Year',
                            class: c.labels?.class || 'Class',
                            section: c.labels?.section || 'Section'
                        }
                    });
                }
            }
            setLoading(false);
        })
            .catch((err: any) => {
            if (!active)
                return;
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [apiBase]);
    const handleSelectPreset = (preset: any) => {
        if (preset.type === 'CUSTOM') {
            setHierarchyConfig((prev: any) => ({
                ...prev,
                hierarchy_type: 'CUSTOM'
            }));
            return;
        }
        setHierarchyConfig((prev: any) => ({
            ...prev,
            hierarchy_type: preset.type,
            ...preset.config
        }));
    };
    const handleToggleHierarchyField = (key: any) => {
        setHierarchyConfig((prev: any) => {
            const nextVal = !prev[key];
            const updated: any = { ...prev, [key]: nextVal };
            if (key.startsWith('use_') && !nextVal) {
                const reqKey = key.replace('use_', 'require_');
                updated[reqKey] = false;
            }
            updated.hierarchy_type = 'CUSTOM';
            return updated;
        });
    };
    const handleLabelChange = (field: any, val: any) => {
        setHierarchyConfig((prev: any) => ({
            ...prev,
            labels: {
                ...prev.labels,
                [field]: val
            }
        }));
    };
    const handleSaveHierarchy = async () => {
        try {
            setSavingHierarchy(true);
            const res = await fetch(`${apiBase}/staff/panel/academic-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(hierarchyConfig)
            });
            const data = await res.json();
            if (data.success) {
                showToast('Academic hierarchy configuration saved successfully.');
                if (data.config) {
                    setHierarchyConfig((prev: any) => ({
                        ...prev,
                        ...data.config,
                        labels: {
                            department: data.config.labels?.department || prev.labels.department,
                            session: data.config.labels?.session || prev.labels.session,
                            class: data.config.labels?.class || prev.labels.class,
                            section: data.config.labels?.section || prev.labels.section
                        }
                    }));
                }
            }
            else {
                showToast(data.error || 'Failed to save academic hierarchy.', true);
            }
        }
        catch (err: any) {
            showToast('Error communicating with server.', true);
        }
        finally {
            setSavingHierarchy(false);
        }
    };
    const handleProfileChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setProfileForm((prev: any) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    const handleSaveProfile = async () => {
        try {
            setSavingGeneral(true);
            const res = await fetch(`${apiBase}/staff/panel/system`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileForm)
            });
            const data = await res.json();
            if (data.success) {
                showToast('System configuration updated successfully.');
                loadSystemData();
            }
            else {
                showToast(data.error || 'Failed to update system configuration.', true);
            }
        }
        catch (err: any) {
            showToast('Error communicating with server.', true);
        }
        finally {
            setSavingGeneral(false);
        }
    };
    const handleCopy = (text: any, key: any) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        showToast('Link copied to clipboard!');
        setTimeout(() => setCopiedKey(null), 2500);
    };
    if (loading) {
        return (<div className="w-full py-20 flex flex-col items-center justify-center gap-3">
        <div className="loader loader-md"/>
        <span className="text-xs text-slate-500 font-mono">Loading system studio...</span>
      </div>);
    }
    const website = systemData?.website || {};
    const domains = systemData?.domains || [];
    const modules = systemData?.modules || [];
    const portals = systemData?.portals || {};
    return (<div className="w-full space-y-4">
      {toastMessage && (<div className="p-3.5 rounded text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-xs">
          <span className="font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>)}

      {toastError && (<div className="p-3.5 rounded text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between shadow-xs">
          <span className="font-medium">{toastError}</span>
          <button onClick={() => setToastError(null)} className="text-[10px] font-mono cursor-pointer hover:underline">DISMISS</button>
        </div>)}

      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg font-mono">
              {website.name ? website.name.substring(0, 2).toUpperCase() : 'SI'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{website.name || 'Institution Portal'}</h2>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {website.status || 'Active'}
                </span>
                {profileForm.is_maintenance_mode && (<span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Maintenance Mode
                  </span>)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Slug: <span className="font-mono text-slate-700">{website.slug}</span> | Subdomain: <span className="font-mono text-slate-700">{website.subdomain || website.slug}</span> | Plan: <span className="font-semibold text-slate-700">{website.package_name || 'Standard'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button onClick={loadSystemData} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer">
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
            { id: 'hierarchy', label: 'Academic Hierarchy' },
            { id: 'general', label: 'Institutional Profile' },
            { id: 'domains', label: 'Domains & DNS' },
            { id: 'branding', label: 'Appearance & Themes' },
            { id: 'modules', label: `Package & Modules (${modules.length})` },
            { id: 'portals', label: 'Direct Portals' }
        ].map((tab: any) => (<button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`px-3.5 py-2 font-medium text-xs border-b-2 whitespace-nowrap transition-colors cursor-pointer ${activeTab === tab.id
                ? 'border-slate-900 text-slate-900 bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
            {tab.label}
          </button>))}
      </div>

      {activeTab === 'hierarchy' && (<div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Modular Student Management Architecture</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose the academic hierarchy model that matches your institution&apos;s workflow. Forms, admissions, and student rosters automatically adapt to your chosen model.
                </p>
              </div>
              <button type="button" onClick={handleSaveHierarchy} disabled={savingHierarchy} className="px-4 py-2 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 cursor-pointer self-start sm:self-center shrink-0">
                {savingHierarchy ? 'Saving Architecture...' : 'Save Architecture Preset'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {HIERARCHY_PRESETS.filter((p: any) => p.type !== 'CUSTOM').map((preset: any) => {
                const isSelected = hierarchyConfig.hierarchy_type === preset.type;
                return (<div key={preset.type} onClick={() => handleSelectPreset(preset)} className={`p-4 rounded-lg border-2 transition-all cursor-pointer flex flex-col justify-between ${isSelected
                        ? 'border-blue-600 bg-blue-50/30 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {preset.subtitle}
                        </span>
                        {isSelected && (<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                            ACTIVE
                          </span>)}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{preset.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Data Flow Hierarchy</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {preset.path.map((node: any, nIdx: any) => (<React.Fragment key={nIdx}>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium font-mono">
                              {node}
                            </span>
                            {nIdx < preset.path.length - 1 && (<span className="text-slate-400 text-xs font-bold">&gt;</span>)}
                          </React.Fragment>))}
                      </div>
                    </div>
                  </div>);
            })}
            </div>

            <div className="pt-2">
              <div onClick={() => handleSelectPreset(HIERARCHY_PRESETS.find((p: any) => p.type === 'CUSTOM'))} className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${hierarchyConfig.hierarchy_type === 'CUSTOM'
                ? 'border-blue-600 bg-blue-50/20'
                : 'border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">Custom Toggle Mode</h4>
                      {hierarchyConfig.hierarchy_type === 'CUSTOM' && (<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                          ACTIVE
                        </span>)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enable or disable individual academic dimensions and designate which are mandatory during registrations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Hierarchy Dimensions & Mandatory Rules
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Department</span>
                    <input type="checkbox" aria-label="Use Department" checked={hierarchyConfig.use_department} onChange={() => handleToggleHierarchyField('use_department')} className="rounded text-blue-600 w-4 h-4 cursor-pointer"/>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Faculty, Shift, or Academic Version group.
                  </p>
                  <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 cursor-pointer">
                    <input type="checkbox" aria-label="Require Department" disabled={!hierarchyConfig.use_department} checked={hierarchyConfig.require_department} onChange={() => handleToggleHierarchyField('require_department')} className="rounded text-blue-600 w-3.5 h-3.5 cursor-pointer disabled:opacity-40"/>
                    <span>Required Field</span>
                  </label>
                </div>

                <div className="p-3 rounded border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Session / Year</span>
                    <input type="checkbox" aria-label="Use Session" checked={hierarchyConfig.use_session} onChange={() => handleToggleHierarchyField('use_session')} className="rounded text-blue-600 w-4 h-4 cursor-pointer"/>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Academic batch (e.g., 2025-2026).
                  </p>
                  <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 cursor-pointer">
                    <input type="checkbox" aria-label="Require Session" disabled={!hierarchyConfig.use_session} checked={hierarchyConfig.require_session} onChange={() => handleToggleHierarchyField('require_session')} className="rounded text-blue-600 w-3.5 h-3.5 cursor-pointer disabled:opacity-40"/>
                    <span>Required Field</span>
                  </label>
                </div>

                <div className="p-3 rounded border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Class / Grade</span>
                    <input type="checkbox" aria-label="Use Class" checked={hierarchyConfig.use_class} onChange={() => handleToggleHierarchyField('use_class')} className="rounded text-blue-600 w-4 h-4 cursor-pointer"/>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Standard class level or semester.
                  </p>
                  <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 cursor-pointer">
                    <input type="checkbox" aria-label="Require Class" disabled={!hierarchyConfig.use_class} checked={hierarchyConfig.require_class} onChange={() => handleToggleHierarchyField('require_class')} className="rounded text-blue-600 w-3.5 h-3.5 cursor-pointer disabled:opacity-40"/>
                    <span>Required Field</span>
                  </label>
                </div>

                <div className="p-3 rounded border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Section / Group</span>
                    <input type="checkbox" aria-label="Use Section" checked={hierarchyConfig.use_section} onChange={() => handleToggleHierarchyField('use_section')} className="rounded text-blue-600 w-4 h-4 cursor-pointer"/>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Subdivision batch or stream.
                  </p>
                  <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 cursor-pointer">
                    <input type="checkbox" aria-label="Require Section" disabled={!hierarchyConfig.use_section} checked={hierarchyConfig.require_section} onChange={() => handleToggleHierarchyField('require_section')} className="rounded text-blue-600 w-3.5 h-3.5 cursor-pointer disabled:opacity-40"/>
                    <span>Required Field</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Custom Academic Terminology
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize the labels displayed across the staff panel, student portal, and admission forms.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Department Label
                  </label>
                  <input type="text" value={hierarchyConfig.labels.department} onChange={(e: any) => handleLabelChange('department', e.target.value)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Session Label
                  </label>
                  <input type="text" value={hierarchyConfig.labels.session} onChange={(e: any) => handleLabelChange('session', e.target.value)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Class Label
                  </label>
                  <input type="text" value={hierarchyConfig.labels.class} onChange={(e: any) => handleLabelChange('class', e.target.value)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Section Label
                  </label>
                  <input type="text" value={hierarchyConfig.labels.section} onChange={(e: any) => handleLabelChange('section', e.target.value)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="button" onClick={handleSaveHierarchy} disabled={savingHierarchy} className="px-5 py-2 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50 cursor-pointer">
                  {savingHierarchy ? 'Saving Changes...' : 'Save Hierarchy & Labels'}
                </button>
              </div>
            </div>
          </div>
        </div>)}

      {activeTab === 'general' && (<div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Institutional Identity & Contact</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official accreditation, address, and profile data displayed on the institutional site and receipts.
              </p>
            </div>
            <button type="button" onClick={handleSaveProfile} disabled={savingGeneral} className="px-4 py-2 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 cursor-pointer">
              {savingGeneral ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Institution Name <span className="text-rose-500">*</span>
              </label>
              <input type="text" name="name" value={profileForm.name} onChange={handleProfileChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Institution Category
              </label>
              <select name="institution_type" value={profileForm.institution_type} onChange={handleProfileChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden cursor-pointer">
                {INSTITUTION_TYPES.map((t: any) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                EIIN / Accreditation Code
              </label>
              <input type="text" name="eiin_number" value={profileForm.eiin_number} onChange={handleProfileChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Accounting & Fees Currency
              </label>
              <select name="currency" value={profileForm.currency} onChange={handleProfileChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden cursor-pointer">
                {CURRENCIES.map((c: any) => (<option key={c.code} value={c.code}>{c.label}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Contact Email
              </label>
              <input type="email" name="contact_email" value={profileForm.contact_email} onChange={handleProfileChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Contact Phone
              </label>
              <input type="text" name="contact_phone" value={profileForm.contact_phone} onChange={handleProfileChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Campus Physical Address
            </label>
            <textarea name="address" rows={2} value={profileForm.address} onChange={handleProfileChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Social Media Channels
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Facebook URL</label>
                <input type="text" name="facebook_url" value={profileForm.facebook_url} onChange={handleProfileChange} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Twitter / X URL</label>
                <input type="text" name="twitter_url" value={profileForm.twitter_url} onChange={handleProfileChange} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">YouTube URL</label>
                <input type="text" name="youtube_url" value={profileForm.youtube_url} onChange={handleProfileChange} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" onClick={handleSaveProfile} disabled={savingGeneral} className="px-5 py-2 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50 cursor-pointer">
              {savingGeneral ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </div>)}

      {activeTab === 'domains' && (<div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Institutional Domains & Routing</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The primary hostnames assigned to your tenant campus.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Default Subdomain</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ROUTING ACTIVE
                  </span>
                </div>
                <p className="text-sm font-mono font-bold text-slate-900">
                  {website.subdomain || website.slug}
                </p>
                <p className="text-xs text-slate-500">
                  Built-in multi-tenant root access for this institution.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Custom Domain</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${website.custom_domain ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                    {website.custom_domain ? 'CONFIGURED' : 'UNASSIGNED'}
                  </span>
                </div>
                <p className="text-sm font-mono font-bold text-slate-900">
                  {website.custom_domain || 'None (Using Subdomain)'}
                </p>
                <p className="text-xs text-slate-500">
                  CNAME pointer configured at institutional DNS registrar.
                </p>
              </div>
            </div>

            {domains.length > 0 && (<div className="pt-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Registered Domain Records ({domains.length})
                </h4>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Domain</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Primary</th>
                        <th className="py-2.5 px-3">Verified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {domains.map((d: any) => (<tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{d.domain}</td>
                          <td className="py-2.5 px-3 text-slate-600">{d.domain_type}</td>
                          <td className="py-2.5 px-3">{d.is_primary ? 'Yes' : 'No'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${d.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {d.is_verified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                </div>
              </div>)}
          </div>
        </div>)}

      {activeTab === 'branding' && (<div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Appearance, Colors & Maintenance</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize institution brand identity, color themes, and public availability mode.
              </p>
            </div>
            <button type="button" onClick={handleSaveProfile} disabled={savingGeneral} className="px-4 py-2 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 cursor-pointer">
              {savingGeneral ? 'Saving...' : 'Save Appearance'}
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] font-semibold text-slate-700">
              Primary Brand Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((color: any) => (<button key={color.hex} type="button" onClick={() => setProfileForm((prev: any) => ({ ...prev, primary_color: color.hex }))} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs cursor-pointer ${profileForm.primary_color === color.hex
                    ? 'border-slate-900 font-bold bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color.hex }}/>
                  <span>{color.name}</span>
                </button>))}
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Custom Color Hex
              </label>
              <input type="text" name="primary_color" value={profileForm.primary_color} onChange={handleProfileChange} className="w-48 font-mono text-xs px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Platform Maintenance Mode
            </h4>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
              <input type="checkbox" name="is_maintenance_mode" checked={profileForm.is_maintenance_mode} onChange={handleProfileChange} className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"/>
              <span>Activate Maintenance Mode (Restricts public access while maintenance is ongoing)</span>
            </label>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Maintenance Notice for Visitors
              </label>
              <textarea name="maintenance_message" rows={2} value={profileForm.maintenance_message} onChange={handleProfileChange} className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden"/>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" onClick={handleSaveProfile} disabled={savingGeneral} className="px-5 py-2 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50 cursor-pointer">
              {savingGeneral ? 'Saving Changes...' : 'Save Appearance & Mode'}
            </button>
          </div>
        </div>)}

      {activeTab === 'modules' && (<div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Subscribed Package & Enabled Modules</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Plan boundaries and accessible feature scopes available to your institution.
                </p>
              </div>
              <span className="px-3 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
                {website.package_name || 'Standard Tier'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded border border-slate-200 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Max Students</span>
                <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {website.package_max_students || 'Unlimited'}
                </p>
              </div>

              <div className="p-3 rounded border border-slate-200 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Max Teachers</span>
                <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {website.package_max_teachers || 'Unlimited'}
                </p>
              </div>

              <div className="p-3 rounded border border-slate-200 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Mail</span>
                <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {website.package_monthly_mail || 0}
                </p>
              </div>

              <div className="p-3 rounded border border-slate-200 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly SMS</span>
                <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {website.package_monthly_sms || 0}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Operational Control Modules ({modules.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {modules.map((m: any) => (<div key={m.id} className="p-3 rounded border border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{m.name}</p>
                      <span className="text-[10px] font-mono text-slate-400">{m.path || m.category}</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"/>
                  </div>))}
              </div>
            </div>
          </div>
        </div>)}

      {activeTab === 'portals' && (<div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Direct Institutional Portals</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quick entry points for students, faculty, staff, and officers on this tenant domain.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Student Access Portal</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                    PUBLIC
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-600 break-all bg-slate-50 p-2 rounded border border-slate-100">
                  {portals.student || '/auth/student'}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleCopy(portals.student, 'student')} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
                    {copiedKey === 'student' ? 'Copied!' : 'Copy URL'}
                  </button>
                  {portals.student && (<a href={portals.student} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium">
                      Open Portal
                    </a>)}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Faculty / Teacher Portal</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                    SECURE
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-600 break-all bg-slate-50 p-2 rounded border border-slate-100">
                  {portals.teacher || '/auth/access/teacher/login'}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleCopy(portals.teacher, 'teacher')} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
                    {copiedKey === 'teacher' ? 'Copied!' : 'Copy URL'}
                  </button>
                  {portals.teacher && (<a href={portals.teacher} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium">
                      Open Portal
                    </a>)}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Staff Administration Portal</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                    INTERNAL
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-600 break-all bg-slate-50 p-2 rounded border border-slate-100">
                  {portals.staff || '/auth/access/staff/login'}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleCopy(portals.staff, 'staff')} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
                    {copiedKey === 'staff' ? 'Copied!' : 'Copy URL'}
                  </button>
                  {portals.staff && (<a href={portals.staff} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium">
                      Open Portal
                    </a>)}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Officer / Executive Portal</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                    EXECUTIVE
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-600 break-all bg-slate-50 p-2 rounded border border-slate-100">
                  {portals.officer || '/auth/access/officer/login'}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleCopy(portals.officer, 'officer')} className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
                    {copiedKey === 'officer' ? 'Copied!' : 'Copy URL'}
                  </button>
                  {portals.officer && (<a href={portals.officer} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium">
                      Open Portal
                    </a>)}
                </div>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
