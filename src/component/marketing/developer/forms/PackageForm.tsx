'use client';
import { useState, useEffect, useMemo } from 'react';
interface ShowcaseFeatureItem {
    id?: number;
    title: string;
    slug?: string;
    display_order: number;
    is_active: boolean;
}

function parseInitialPackageFeatures(data: any): ShowcaseFeatureItem[] {
    if (Array.isArray(data?.package_features) && data.package_features.length > 0) {
        return data.package_features
            .map((f: any, idx: number) => ({
                id: f.id,
                title: String(f.title || f.name || '').trim(),
                slug: f.slug,
                display_order: Number(f.display_order ?? idx + 1),
                is_active: f.is_active !== false,
            }))
            .filter((f: ShowcaseFeatureItem) => Boolean(f.title));
    }
    let raw: any[] = [];
    if (Array.isArray(data?.features)) raw = data.features;
    else if (typeof data?.features === 'string') {
        try {
            const parsed = JSON.parse(data.features);
            if (Array.isArray(parsed)) raw = parsed;
        } catch {}
    }
    return raw
        .map((f: any, idx: number) => ({
            title: String(typeof f === 'string' ? f : f?.title || f?.name || '').trim(),
            display_order: idx + 1,
            is_active: true,
        }))
        .filter((f: ShowcaseFeatureItem) => Boolean(f.title));
}

function buildInitialFormData(initialData: any) {
    return {
        name: initialData?.name || '',
        short_description: initialData?.short_description || '',
        tagline: initialData?.tagline || '',
        description: initialData?.description || '',
        bdt_per_month: initialData?.bdt_per_month !== undefined
            ? String(initialData.bdt_per_month)
            : '3500.00',
        usd_per_month: initialData?.usd_per_month !== undefined
            ? String(initialData.usd_per_month)
            : '29.00',
        eur_per_month: initialData?.eur_per_month !== undefined
            ? String(initialData.eur_per_month)
            : '26.00',
        gbp_per_month: initialData?.gbp_per_month !== undefined
            ? String(initialData.gbp_per_month)
            : '23.00',
        aud_per_month: initialData?.aud_per_month !== undefined
            ? String(initialData.aud_per_month)
            : '44.00',
        cad_per_month: initialData?.cad_per_month !== undefined
            ? String(initialData.cad_per_month)
            : '40.00',
        discount_percentage: initialData?.discount_percentage !== undefined
            ? String(initialData.discount_percentage)
            : '15.00',
        max_students: initialData?.max_students ?? 500,
        max_teachers: initialData?.max_teachers ?? 30,
        max_staff: initialData?.max_staff ?? 20,
        max_storage_mb: initialData?.max_storage_mb ?? 5120,
        is_available_student_panel: initialData?.is_available_student_panel !== false,
        is_available_teacher_panel: initialData?.is_available_teacher_panel !== false,
        is_available_custom_domain: Boolean(initialData?.is_available_custom_domain),
        grace_period: initialData?.grace_period !== undefined ? Number(initialData.grace_period) : 3,
        is_popular: Boolean(initialData?.is_popular),
        is_public: initialData?.is_public !== undefined ? Boolean(initialData.is_public) : true,
        is_active: initialData?.is_active !== undefined ? Boolean(initialData.is_active) : true,
        sort_order: initialData?.sort_order ?? 0,
        package_features: parseInitialPackageFeatures(initialData),
    };
}
function getInitialHomeIds(initialData: any) {
    if (!initialData)
        return [];
    if (Array.isArray(initialData.home_module_ids)) {
        return initialData.home_module_ids.map(Number).filter((n: any) => !isNaN(n) && n > 0);
    }
    if (Array.isArray(initialData.home_modules)) {
        return initialData.home_modules
            .map((m: any) => Number(m.id || m))
            .filter((n: any) => !isNaN(n) && n > 0);
    }
    return [];
}
function getInitialControlIds(initialData: any) {
    if (!initialData)
        return [];
    if (Array.isArray(initialData.control_module_ids)) {
        return initialData.control_module_ids.map(Number).filter((n: any) => !isNaN(n) && n > 0);
    }
    if (Array.isArray(initialData.control_modules)) {
        return initialData.control_modules
            .map((m: any) => Number(m.id || m))
            .filter((n: any) => !isNaN(n) && n > 0);
    }
    return [];
}
export default function PackageForm({ initialData = null, onSuccess, onCancel, apiEndpoint = '/api/marketing/developer/packages', }: any) {
    const isEditing = Boolean(initialData?.id);
    const [formData, setFormData] = useState<any>(() => buildInitialFormData(initialData));
    const [newFeatureTitle, setNewFeatureTitle] = useState<string>('');
    const [homeModules, setHomeModules] = useState<any>([]);
    const [controlModules, setControlModules] = useState<any>([]);
    const [selectedHomeIds, setSelectedHomeIds] = useState<any>(() => getInitialHomeIds(initialData));
    const [selectedControlIds, setSelectedControlIds] = useState<any>(() => getInitialControlIds(initialData));
    const [activeModuleTab, setActiveModuleTab] = useState<any>('control');
    const [loadingModules, setLoadingModules] = useState<any>(true);
    const [homeSearch, setHomeSearch] = useState<any>('');
    const [controlSearch, setControlSearch] = useState<any>('');
    const [controlCategoryFilter, setControlCategoryFilter] = useState<any>('ALL');
    const [loading, setLoading] = useState<any>(false);
    const [error, setError] = useState<any>('');
    const [successMessage, setSuccessMessage] = useState<any>('');
    useEffect(() => {
        let isMounted = true;
        fetch('/api/marketing/developer/tenant-modules?type=all')
            .then((res: any) => res.json())
            .then((data: any) => {
            if (!isMounted)
                return;
            const hMods = Array.isArray(data.home_modules) ? data.home_modules : [];
            const cMods = Array.isArray(data.control_modules) ? data.control_modules : [];
            setHomeModules(hMods);
            setControlModules(cMods);
            if (!initialData) {
                setSelectedHomeIds((prev: any) => prev.length === 0 ? hMods.filter((m: any) => m.is_active).map((m: any) => Number(m.id)) : prev);
                setSelectedControlIds((prev: any) => prev.length === 0 ? cMods.filter((m: any) => m.is_active).map((m: any) => Number(m.id)) : prev);
            }
        })
            .catch((err: any) => {
            console.error('Error fetching tenant modules:', err);
        })
            .finally(() => {
            if (isMounted)
                setLoadingModules(false);
        });
        return () => {
            isMounted = false;
        };
    }, [initialData]);
    const toggleHomeModule = (id: any) => {
        const num = Number(id);
        setSelectedHomeIds((prev: any) => prev.includes(num) ? prev.filter((i: any) => i !== num) : [...prev, num]);
    };
    const toggleControlModule = (id: any) => {
        const num = Number(id);
        setSelectedControlIds((prev: any) => prev.includes(num) ? prev.filter((i: any) => i !== num) : [...prev, num]);
    };
    const controlCategories = useMemo(() => {
        return Array.from(new Set(controlModules.map((m: any) => m.category).filter(Boolean))).sort();
    }, [controlModules]);
    const filteredHomeModules = useMemo(() => {
        if (!homeSearch.trim())
            return homeModules;
        const q = homeSearch.toLowerCase();
        return homeModules.filter((m: any) => m.name?.toLowerCase().includes(q) ||
            m.slug?.toLowerCase().includes(q) ||
            m.path?.toLowerCase().includes(q) ||
            m.description?.toLowerCase().includes(q));
    }, [homeModules, homeSearch]);
    const filteredControlModules = useMemo(() => {
        return controlModules.filter((m: any) => {
            const matchesCategory = controlCategoryFilter === 'ALL' || m.category === controlCategoryFilter;
            const q = controlSearch.toLowerCase();
            const matchesSearch = !q ||
                m.name?.toLowerCase().includes(q) ||
                m.slug?.toLowerCase().includes(q) ||
                m.path?.toLowerCase().includes(q) ||
                m.description?.toLowerCase().includes(q);
            return matchesCategory && matchesSearch;
        });
    }, [controlModules, controlSearch, controlCategoryFilter]);
    const handleAddFeature = (e: any) => {
        e.preventDefault();
        const title = newFeatureTitle.trim();
        if (!title) return;
        setFormData((prev: any) => {
            const list: ShowcaseFeatureItem[] = Array.isArray(prev.package_features) ? prev.package_features : [];
            if (list.some((f) => f.title.toLowerCase() === title.toLowerCase())) {
                return prev;
            }
            return {
                ...prev,
                package_features: [
                    ...list,
                    {
                        title,
                        display_order: list.length + 1,
                        is_active: true,
                    },
                ],
            };
        });
        setNewFeatureTitle('');
    };
    const handleRemoveFeature = (indexToRemove: number) => {
        setFormData((prev: any) => ({
            ...prev,
            package_features: (prev.package_features || []).filter((_: any, idx: number) => idx !== indexToRemove),
        }));
    };
    const handleFeatureChange = (index: number, field: 'title' | 'is_active', value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            package_features: (prev.package_features || []).map((f: any, idx: number) =>
                idx === index ? { ...f, [field]: value } : f
            ),
        }));
    };
    const handleStoragePreset = (mb: any) => {
        setFormData((prev: any) => ({
            ...prev,
            max_storage_mb: mb,
        }));
    };
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        if (!formData.name.trim()) {
            setError('Package name is required.');
            return;
        }
        if (selectedHomeIds.length === 0) {
            setError('You must attach at least one home module to the package.');
            return;
        }
        if (selectedControlIds.length === 0) {
            setError('You must attach at least one control module to the package.');
            return;
        }
        setLoading(true);
        const bdtPerMonth = Math.max(0, parseFloat(formData.bdt_per_month) || 0);
        const usdPerMonth = Math.max(0, parseFloat(formData.usd_per_month) || 0);
        const eurPerMonth = Math.max(0, parseFloat(formData.eur_per_month) || 0);
        const gbpPerMonth = Math.max(0, parseFloat(formData.gbp_per_month) || 0);
        const audPerMonth = Math.max(0, parseFloat(formData.aud_per_month) || 0);
        const cadPerMonth = Math.max(0, parseFloat(formData.cad_per_month) || 0);
        const maxStorageMb = Math.max(100, parseInt(formData.max_storage_mb, 10) || 5120);
        const payload = {
            name: formData.name.trim(),
            short_description: formData.short_description.trim(),
            tagline: formData.tagline.trim(),
            description: formData.description.trim(),
            bdt_per_month: bdtPerMonth,
            usd_per_month: usdPerMonth,
            eur_per_month: eurPerMonth,
            gbp_per_month: gbpPerMonth,
            aud_per_month: audPerMonth,
            cad_per_month: cadPerMonth,
            discount_percentage: Math.min(100, Math.max(0, parseFloat(formData.discount_percentage) || 0)),
            max_students: Math.max(1, parseInt(formData.max_students, 10) || 500),
            max_teachers: Math.max(1, parseInt(formData.max_teachers, 10) || 30),
            max_staff: Math.max(1, parseInt(formData.max_staff, 10) || 20),
            max_storage_mb: maxStorageMb,
            package_features: (formData.package_features || [])
                .map((f: any, idx: number) => ({
                    title: String(f.title || '').trim(),
                    display_order: idx + 1,
                    is_active: f.is_active !== false,
                }))
                .filter((f: any) => Boolean(f.title)),
            is_available_student_panel: Boolean(formData.is_available_student_panel),
            is_available_teacher_panel: Boolean(formData.is_available_teacher_panel),
            is_available_custom_domain: Boolean(formData.is_available_custom_domain),
            grace_period: Math.max(0, parseInt(formData.grace_period, 10) || 3),
            sort_order: parseInt(formData.sort_order, 10) || 0,
            is_popular: Boolean(formData.is_popular),
            is_public: Boolean(formData.is_public),
            is_active: Boolean(formData.is_active),
            home_module_ids: selectedHomeIds,
            control_module_ids: selectedControlIds,
        };
        try {
            const targetUrl = isEditing && initialData?.id
                ? apiEndpoint !== '/api/marketing/developer/packages'
                    ? apiEndpoint
                    : `/api/marketing/developer/packages?id=${initialData.id}`
                : apiEndpoint;
            const res = await fetch(targetUrl, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isEditing ? { id: initialData.id, ...payload } : payload),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage(isEditing ? 'Package updated successfully.' : 'Package created successfully.');
                if (!isEditing) {
                    setFormData(buildInitialFormData(null));
                }
                if (onSuccess)
                    onSuccess(data.record || data.package);
            }
            else {
                setError(data.error || 'Failed to save package plan');
            }
        }
        catch (err: any) {
            setError(err.message || 'Network error occurred while saving package.');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {isEditing ? `Edit Package: ${initialData.name}` : 'Create Platform Package'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditing
            ? `Updating package #${initialData.id} rates, capacity quotas, fee models, and linked modules.`
            : 'Configure subscription pricing, capacity quotas, fee models, and linked home & control modules.'}
          </p>
        </div>
        {onCancel && (<button type="button" onClick={onCancel} className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 cursor-pointer">
            Close
          </button>)}
      </div>

      {error && (<div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">
          {error}
        </div>)}

      {successMessage && (<div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium">
          {successMessage}
        </div>)}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Package Name <span className="text-rose-500">*</span>
            </label>
            <input type="text" required value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Plan Tagline
            </label>
            <input type="text" value={formData.tagline} onChange={(e: any) => setFormData({ ...formData, tagline: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Short Description
          </label>
          <input type="text" value={formData.short_description} onChange={(e: any) => setFormData({ ...formData, short_description: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
        </div>

        <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Multi-Currency Monthly Pricing Configuration
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Monthly rates for BDT (৳), USD ($), EUR (€), GBP (£), AUD (A$), and CAD (C$). Annual billing calculates 12 months dynamically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Discount %:</span>
              <input type="number" min="0" max="100" step="0.5" value={formData.discount_percentage} onChange={(e: any) => setFormData({ ...formData, discount_percentage: e.target.value })} className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-800"/>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  BDT Monthly (৳)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                  BDT / mo
                </span>
              </div>
              <input type="number" step="0.01" min="0" required value={formData.bdt_per_month} onChange={(e: any) => setFormData({ ...formData, bdt_per_month: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <p className="text-[10px] text-slate-400 mt-1">Taka rate per month</p>
            </div>

            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  USD Monthly ($)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                  USD / mo
                </span>
              </div>
              <input type="number" step="0.01" min="0" required value={formData.usd_per_month} onChange={(e: any) => setFormData({ ...formData, usd_per_month: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <p className="text-[10px] text-slate-400 mt-1">Dollar rate per month</p>
            </div>

            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  EUR Monthly (€)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-blue-50 text-blue-700 border-blue-200">
                  EUR / mo
                </span>
              </div>
              <input type="number" step="0.01" min="0" required value={formData.eur_per_month} onChange={(e: any) => setFormData({ ...formData, eur_per_month: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <p className="text-[10px] text-slate-400 mt-1">Euro rate per month</p>
            </div>

            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  GBP Monthly (£)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200">
                  GBP / mo
                </span>
              </div>
              <input type="number" step="0.01" min="0" required value={formData.gbp_per_month} onChange={(e: any) => setFormData({ ...formData, gbp_per_month: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <p className="text-[10px] text-slate-400 mt-1">British Pound rate per month</p>
            </div>

            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  AUD Monthly (A$)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-purple-50 text-purple-700 border-purple-200">
                  AUD / mo
                </span>
              </div>
              <input type="number" step="0.01" min="0" required value={formData.aud_per_month} onChange={(e: any) => setFormData({ ...formData, aud_per_month: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <p className="text-[10px] text-slate-400 mt-1">Australian Dollar rate per month</p>
            </div>

            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  CAD Monthly (C$)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-teal-50 text-teal-700 border-teal-200">
                  CAD / mo
                </span>
              </div>
              <input type="number" step="0.01" min="0" required value={formData.cad_per_month} onChange={(e: any) => setFormData({ ...formData, cad_per_month: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <p className="text-[10px] text-slate-400 mt-1">Canadian Dollar rate per month</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              School Capacity Quotas &amp; Limit Allocations
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Account thresholds provisioned for client educational institutions subscribing to this package tier.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Students
              </label>
              <input type="number" min={1} required value={formData.max_students} onChange={(e: any) => setFormData({ ...formData, max_students: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Student records</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Teachers
              </label>
              <input type="number" min={1} required value={formData.max_teachers} onChange={(e: any) => setFormData({ ...formData, max_teachers: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Faculty staff</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Staff
              </label>
              <input type="number" min={1} required value={formData.max_staff} onChange={(e: any) => setFormData({ ...formData, max_staff: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Admin personnel</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Storage (MB)
                </label>
                <span className="text-[10px] font-mono text-slate-500">
                  {(Number(formData.max_storage_mb || 0) / 1024).toFixed(1)} GB
                </span>
              </div>
              <input type="number" min={100} required value={formData.max_storage_mb} onChange={(e: any) => setFormData({ ...formData, max_storage_mb: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {[
            { label: '1GB', mb: 1024 },
            { label: '5GB', mb: 5120 },
            { label: '10GB', mb: 10240 },
            { label: '20GB', mb: 20480 },
            { label: '50GB', mb: 51200 },
            { label: '100GB', mb: 102400 },
        ].map((preset: any) => (<button key={preset.mb} type="button" onClick={() => handleStoragePreset(preset.mb)} className={`text-[9px] px-1 py-0.2 rounded border transition-colors cursor-pointer ${Number(formData.max_storage_mb) === preset.mb
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-medium'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    {preset.label}
                  </button>))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Feature Availability &amp; Access Controls
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Dedicated portals and custom branding options provisioned with this package tier.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-start gap-2.5 p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input type="checkbox" checked={formData.is_available_student_panel} onChange={(e: any) => setFormData({ ...formData, is_available_student_panel: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"/>
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Student Portal Access
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Grants student attendance, grades, routine, and fee payment panel.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input type="checkbox" checked={formData.is_available_teacher_panel} onChange={(e: any) => setFormData({ ...formData, is_available_teacher_panel: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"/>
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Teacher Portal Access
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Grants teachers classroom attendance, assignments, and gradebooks.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input type="checkbox" checked={formData.is_available_custom_domain} onChange={(e: any) => setFormData({ ...formData, is_available_custom_domain: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"/>
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Custom Domain Mapping
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enables institutions to attach their custom domain name.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Showcase Package Features
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Informational highlights shown to customers for this package. Slugs are generated automatically by the server.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
            <div className="sm:col-span-10">
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Feature Title
              </label>
              <input type="text" value={newFeatureTitle} onChange={(e: any) => setNewFeatureTitle(e.target.value)} onKeyDown={(e: any) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddFeature(e);
            }
        }} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
            </div>
            <div className="sm:col-span-2">
              <button type="button" onClick={handleAddFeature} className="w-full px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium cursor-pointer">
                Add Feature
              </button>
            </div>
          </div>

          {(formData.package_features || []).length > 0 ? (<div className="space-y-2 pt-1">
              {formData.package_features.map((feature: ShowcaseFeatureItem, idx: number) => (<div key={feature.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="sm:col-span-10">
                    <input type="text" value={feature.title} onChange={(e: any) => handleFeatureChange(idx, 'title', e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-end gap-2">
                    <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={feature.is_active !== false} onChange={(e: any) => handleFeatureChange(idx, 'is_active', e.target.checked)} className="rounded border-slate-300 cursor-pointer"/>
                      <span>Active</span>
                    </label>
                    <button type="button" onClick={() => handleRemoveFeature(idx)} className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-medium cursor-pointer">
                      Remove
                    </button>
                  </div>
                </div>))}
            </div>) : (<p className="text-xs text-slate-400 italic">No showcase features added yet.</p>)}
        </div>

        <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Module Entitlements &amp; System Features
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Assign public portal modules and staff workstation panels included in this package.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded">
              <button type="button" onClick={() => setActiveModuleTab('control')} className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${activeModuleTab === 'control'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}>
                Control Panels ({selectedControlIds.length}/{controlModules.length})
              </button>
              <button type="button" onClick={() => setActiveModuleTab('home')} className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${activeModuleTab === 'home'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}>
                Home Features ({selectedHomeIds.length}/{homeModules.length})
              </button>
            </div>
          </div>

          {activeModuleTab === 'control' && (<div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={controlCategoryFilter} onChange={(e: any) => setControlCategoryFilter(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200">
                    <option value="ALL">All Categories ({controlCategories.length})</option>
                    {controlCategories.map((c: any) => (<option key={c} value={c}>
                        {c}
                      </option>))}
                  </select>
                  <div>
                    <label className="sr-only">Search control modules</label>
                    <input type="text" value={controlSearch} onChange={(e: any) => setControlSearch(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 w-44"/>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setSelectedControlIds(controlModules.map((m: any) => Number(m.id)))} className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer">
                    Select All
                  </button>
                  <button type="button" onClick={() => setSelectedControlIds([])} className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer">
                    Clear All
                  </button>
                </div>
              </div>

              {loadingModules ? (<div className="py-8 text-center text-xs text-slate-400">Loading control modules...</div>) : filteredControlModules.length === 0 ? (<div className="py-6 text-center text-xs text-slate-400">No control modules matched.</div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
                  {filteredControlModules.map((mod: any) => {
                    const isSelected = selectedControlIds.includes(Number(mod.id));
                    return (<button key={mod.id} type="button" onClick={() => toggleControlModule(mod.id)} className={`flex items-start justify-between p-2.5 rounded border text-left transition-colors cursor-pointer ${isSelected
                            ? 'bg-white dark:bg-slate-900 border-slate-900 dark:border-white text-slate-900 dark:text-white'
                            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-medium text-xs truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span>{mod.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 block mt-0.5 truncate">
                            {mod.path}
                          </span>
                        </div>
                        <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border shrink-0 ${isSelected
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {isSelected ? 'Included' : 'Add'}
                        </span>
                      </button>);
                })}
                </div>)}
            </div>)}

          {activeModuleTab === 'home' && (<div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="sr-only">Search home modules</label>
                  <input type="text" value={homeSearch} onChange={(e: any) => setHomeSearch(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 w-48"/>
                </div>

                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setSelectedHomeIds(homeModules.map((m: any) => Number(m.id)))} className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer">
                    Select All
                  </button>
                  <button type="button" onClick={() => setSelectedHomeIds([])} className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer">
                    Clear All
                  </button>
                </div>
              </div>

              {loadingModules ? (<div className="py-8 text-center text-xs text-slate-400">Loading home modules...</div>) : filteredHomeModules.length === 0 ? (<div className="py-6 text-center text-xs text-slate-400">No home modules matched.</div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
                  {filteredHomeModules.map((mod: any) => {
                    const isSelected = selectedHomeIds.includes(Number(mod.id));
                    return (<button key={mod.id} type="button" onClick={() => toggleHomeModule(mod.id)} className={`flex items-start justify-between p-2.5 rounded border text-left transition-colors cursor-pointer ${isSelected
                            ? 'bg-white dark:bg-slate-900 border-slate-900 dark:border-white text-slate-900 dark:text-white'
                            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-medium text-xs truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            <span>{mod.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 block mt-0.5 truncate">
                            {mod.path}
                          </span>
                        </div>
                        <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border shrink-0 ${isSelected
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {isSelected ? 'Included' : 'Add'}
                        </span>
                      </button>);
                })}
                </div>)}
            </div>)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Description &amp; Highlights
            </label>
            <textarea rows={3} value={formData.description} onChange={(e: any) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"/>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Grace Period (Days)
                </label>
                <input type="number" min="0" value={formData.grace_period} onChange={(e: any) => setFormData({ ...formData, grace_period: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-800"/>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sort Order
                </label>
                <input type="number" value={formData.sort_order} onChange={(e: any) => setFormData({ ...formData, sort_order: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-800"/>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2 cursor-pointer p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                <input type="checkbox" checked={formData.is_public} onChange={(e: any) => setFormData({ ...formData, is_public: e.target.checked })} className="mt-0.5 rounded border-slate-300 cursor-pointer"/>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Public Plan (Shown on /packages)
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Uncheck for custom/private plans exclusively used in developer subscriptions
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                <input type="checkbox" checked={formData.is_popular} onChange={(e: any) => setFormData({ ...formData, is_popular: e.target.checked })} className="rounded border-slate-300 cursor-pointer"/>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Popular / Featured Tier
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                <input type="checkbox" checked={formData.is_active} onChange={(e: any) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded border-slate-300 cursor-pointer"/>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Active &amp; Published
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (<button type="button" onClick={onCancel} className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              Cancel
            </button>)}
          <button type="submit" disabled={loading} className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer">
            {loading
            ? isEditing
                ? 'Updating Package...'
                : 'Creating Package...'
            : isEditing
                ? 'Update Package'
                : 'Create Package'}
          </button>
        </div>
      </form>
    </div>);
}
