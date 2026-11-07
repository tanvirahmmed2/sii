'use client';

import { useState, useEffect, useMemo } from 'react';

export default function PackageForm({
  initialData = null,
  onSuccess,
  onCancel,
  apiEndpoint = '/api/marketing/developer/packages',
}) {
  const isEditing = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    short_description: initialData?.short_description || '',
    tagline: initialData?.tagline || '',
    description: initialData?.description || '',
    monthly_price_usd:
      initialData?.monthly_price_usd !== undefined
        ? String(initialData.monthly_price_usd)
        : initialData?.monthly_price !== undefined
        ? String(initialData.monthly_price)
        : '29.00',
    yearly_price_usd:
      initialData?.yearly_price_usd !== undefined
        ? String(initialData.yearly_price_usd)
        : initialData?.yearly_price !== undefined
        ? String(initialData.yearly_price)
        : '290.00',
    monthly_price_bdt:
      initialData?.monthly_price_bdt !== undefined
        ? String(initialData.monthly_price_bdt)
        : '3500.00',
    yearly_price_bdt:
      initialData?.yearly_price_bdt !== undefined
        ? String(initialData.yearly_price_bdt)
        : '35000.00',
    discount_percentage:
      initialData?.discount_percentage !== undefined
        ? String(initialData.discount_percentage)
        : '15.00',
    max_students: initialData?.max_students ?? 500,
    max_teachers: initialData?.max_teachers ?? 30,
    max_staff: initialData?.max_staff ?? 20,
    max_storage: initialData?.max_storage || '5 GB',
    max_storage_mb: initialData?.max_storage_mb ?? 5120,
    is_available_student_panel: initialData?.is_available_student_panel !== false,
    is_available_teacher_panel: initialData?.is_available_teacher_panel !== false,
    is_available_custom_domain: Boolean(initialData?.is_available_custom_domain),
    grace_period: initialData?.grace_period !== undefined ? Number(initialData.grace_period) : 3,
    is_popular: Boolean(initialData?.is_popular),
    is_public: initialData?.is_public !== undefined ? Boolean(initialData.is_public) : true,
    is_active: initialData?.is_active !== undefined ? Boolean(initialData.is_active) : true,
    sort_order: initialData?.sort_order ?? 0,
  });

  const [homeModules, setHomeModules] = useState([]);
  const [controlModules, setControlModules] = useState([]);
  const [selectedHomeIds, setSelectedHomeIds] = useState([]);
  const [selectedControlIds, setSelectedControlIds] = useState([]);
  const [activeModuleTab, setActiveModuleTab] = useState('control'); 
  const [loadingModules, setLoadingModules] = useState(true);
  const [homeSearch, setHomeSearch] = useState('');
  const [controlSearch, setControlSearch] = useState('');
  const [controlCategoryFilter, setControlCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoadingModules(true);

    fetch('/api/marketing/developer/tenant-modules?type=all')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data.home_modules)) {
          setHomeModules(data.home_modules);
        }
        if (Array.isArray(data.control_modules)) {
          setControlModules(data.control_modules);
        }
      })
      .catch((err) => {
        console.error('Error fetching tenant modules:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingModules(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialData) {
      if (Array.isArray(initialData.home_module_ids)) {
        setSelectedHomeIds(initialData.home_module_ids.map(Number));
      } else if (Array.isArray(initialData.home_modules)) {
        setSelectedHomeIds(initialData.home_modules.map((m) => Number(m.id || m)).filter(Boolean));
      }

      if (Array.isArray(initialData.control_module_ids)) {
        setSelectedControlIds(initialData.control_module_ids.map(Number));
      } else if (Array.isArray(initialData.control_modules)) {
        setSelectedControlIds(initialData.control_modules.map((m) => Number(m.id || m)).filter(Boolean));
      }
    } else if (!isEditing) {
      if (homeModules.length > 0 && selectedHomeIds.length === 0) {
        setSelectedHomeIds(homeModules.filter((m) => m.is_active).map((m) => Number(m.id)));
      }
      if (controlModules.length > 0 && selectedControlIds.length === 0) {
        setSelectedControlIds(controlModules.filter((m) => m.is_active).map((m) => Number(m.id)));
      }
    }
  }, [initialData, homeModules, controlModules, isEditing]);

  const toggleHomeModule = (id) => {
    const num = Number(id);
    setSelectedHomeIds((prev) =>
      prev.includes(num) ? prev.filter((i) => i !== num) : [...prev, num]
    );
  };

  const toggleControlModule = (id) => {
    const num = Number(id);
    setSelectedControlIds((prev) =>
      prev.includes(num) ? prev.filter((i) => i !== num) : [...prev, num]
    );
  };

  const controlCategories = useMemo(() => {
    return Array.from(new Set(controlModules.map((m) => m.category).filter(Boolean))).sort();
  }, [controlModules]);

  const filteredHomeModules = useMemo(() => {
    if (!homeSearch.trim()) return homeModules;
    const q = homeSearch.toLowerCase();
    return homeModules.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.slug?.toLowerCase().includes(q) ||
        m.path?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
    );
  }, [homeModules, homeSearch]);

  const filteredControlModules = useMemo(() => {
    return controlModules.filter((m) => {
      const matchesCategory =
        controlCategoryFilter === 'ALL' || m.category === controlCategoryFilter;
      const q = controlSearch.toLowerCase();
      const matchesSearch =
        !q ||
        m.name?.toLowerCase().includes(q) ||
        m.slug?.toLowerCase().includes(q) ||
        m.path?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [controlModules, controlSearch, controlCategoryFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Package name is required.');
      return;
    }

    setLoading(true);

    const monthlyUsd = Math.max(0, parseFloat(formData.monthly_price_usd) || 0);
    const yearlyUsd = Math.max(0, parseFloat(formData.yearly_price_usd) || 0);
    const monthlyBdt = Math.max(0, parseFloat(formData.monthly_price_bdt) || 0);
    const yearlyBdt = Math.max(0, parseFloat(formData.yearly_price_bdt) || 0);
    const maxStorageMb = Math.max(100, parseInt(formData.max_storage_mb, 10) || 5120);
    const maxStorage = formData.max_storage.trim() || `${Math.round(maxStorageMb / 1024)} GB`;

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      short_description: formData.short_description.trim(),
      tagline: formData.tagline.trim(),
      description: formData.description.trim(),
      monthly_price_usd: monthlyUsd,
      yearly_price_usd: yearlyUsd,
      monthly_price_bdt: monthlyBdt,
      yearly_price_bdt: yearlyBdt,
      monthly_price: monthlyUsd,
      yearly_price: yearlyUsd,
      discount_percentage: Math.min(100, Math.max(0, parseFloat(formData.discount_percentage) || 0)),
      max_students: Math.max(1, parseInt(formData.max_students, 10) || 500),
      max_teachers: Math.max(1, parseInt(formData.max_teachers, 10) || 30),
      max_staff: Math.max(1, parseInt(formData.max_staff, 10) || 20),
      max_storage: maxStorage,
      max_storage_mb: maxStorageMb,
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
      const targetUrl =
        isEditing && initialData?.id
          ? apiEndpoint.includes('/[slug]') || apiEndpoint.endsWith(`/${initialData.slug}`)
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
        if (!isEditing) {
          setFormData({
            name: '',
            slug: '',
            short_description: '',
            tagline: '',
            description: '',
            monthly_price_usd: '29.00',
            yearly_price_usd: '290.00',
            monthly_price_bdt: '3500.00',
            yearly_price_bdt: '35000.00',
            discount_percentage: '15.00',
            max_students: 500,
            max_teachers: 30,
            max_staff: 20,
            max_storage: '5 GB',
            max_storage_mb: 5120,
            is_available_student_panel: true,
            is_available_teacher_panel: true,
            is_available_custom_domain: false,
            grace_period: 3,
            is_popular: false,
            is_public: true,
            is_active: true,
            sort_order: 0,
          });
        }
        if (onSuccess) onSuccess(data.record || data.package);
      } else {
        setError(data.error || 'Failed to save package plan');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred while saving package.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {isEditing ? `Edit Package: ${initialData.name}` : 'Create Platform Package'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditing
              ? `Updating package #${initialData.id} rates, institutional capacity, and linked modules.`
              : 'Configure subscription pricing, capacity quotas, portal availability, and linked home & control modules.'}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Package Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Starter Academy, Pro School, Enterprise"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Short Description
            </label>
            <input
              type="text"
              placeholder="Brief summary for checkout cards"
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Plan Tagline
            </label>
            <input
              type="text"
              placeholder="e.g. Ideal for coaching centers & madrasahs"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Multi-Currency Pricing Configuration
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Independent monthly and yearly billing rates for Dollar (USD $) and Taka (BDT ৳).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Discount %:</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-800"
                placeholder="15"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  USD Monthly ($)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                  USD / mo
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="29.00"
                value={formData.monthly_price_usd}
                onChange={(e) => setFormData({ ...formData, monthly_price_usd: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">Dollar rate per month</p>
            </div>

            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  USD Yearly ($)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                  USD / yr
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="290.00"
                value={formData.yearly_price_usd}
                onChange={(e) => setFormData({ ...formData, yearly_price_usd: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">Annual dollar billing</p>
            </div>

            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  BDT Monthly (৳)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                  BDT / mo
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="3500.00"
                value={formData.monthly_price_bdt}
                onChange={(e) => setFormData({ ...formData, monthly_price_bdt: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">Taka rate per month</p>
            </div>

            <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  BDT Yearly (৳)
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                  BDT / yr
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="35000.00"
                value={formData.yearly_price_bdt}
                onChange={(e) => setFormData({ ...formData, yearly_price_bdt: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">Annual Taka billing</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              School Capacity Quotas &amp; Storage Limits
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Limits provisioned for client educational institutions subscribing to this package tier.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Students
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Student records</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Teachers
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.max_teachers}
                onChange={(e) => setFormData({ ...formData, max_teachers: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Faculty staff</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Staff
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.max_staff}
                onChange={(e) => setFormData({ ...formData, max_staff: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Admin personnel</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Storage Limit
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 5 GB, 25 GB"
                  value={formData.max_storage}
                  onChange={(e) => setFormData({ ...formData, max_storage: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Cloud media &amp; asset storage</span>
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
              <input
                type="checkbox"
                checked={formData.is_available_student_panel}
                onChange={(e) => setFormData({ ...formData, is_available_student_panel: e.target.checked })}
                className="mt-0.5 rounded border-slate-300 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Student Portal Access
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Allows students and parents to view attendance, report cards, fees, and take CBT online exams.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_available_teacher_panel}
                onChange={(e) => setFormData({ ...formData, is_available_teacher_panel: e.target.checked })}
                className="mt-0.5 rounded border-slate-300 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Teacher Faculty Panel
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Enables dedicated teacher portal for syllabus entry, marks submission, lesson plans, and homework.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_available_custom_domain}
                onChange={(e) => setFormData({ ...formData, is_available_custom_domain: e.target.checked })}
                className="mt-0.5 rounded border-slate-300 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Custom Domain (*.edu.bd)
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Permits mapping institutional domain (school.edu.bd / .com) with automatic SSL certificates.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Package Module Entitlements
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Connect public frontend routes (package_home_modules) and staff control workstations (package_control_modules).
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveModuleTab('control')}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  activeModuleTab === 'control'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Control Modules ({selectedControlIds.length}/{controlModules.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveModuleTab('home')}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  activeModuleTab === 'home'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Home Modules ({selectedHomeIds.length}/{homeModules.length})
              </button>
            </div>
          </div>

          {activeModuleTab === 'control' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={controlCategoryFilter}
                    onChange={(e) => setControlCategoryFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">All Categories ({controlCategories.length})</option>
                    {controlCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Search control modules..."
                    value={controlSearch}
                    onChange={(e) => setControlSearch(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 w-44"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedControlIds(controlModules.map((m) => Number(m.id)))}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedControlIds([])}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {loadingModules ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading control modules...</div>
              ) : filteredControlModules.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No control modules matched.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
                  {filteredControlModules.map((mod) => {
                    const isSelected = selectedControlIds.includes(Number(mod.id));
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleControlModule(mod.id)}
                        className={`flex items-start justify-between p-2.5 rounded border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 border-slate-900 dark:border-white text-slate-900 dark:text-white'
                            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-medium text-xs truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span>{mod.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 block mt-0.5 truncate">
                            {mod.path}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded border shrink-0 ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isSelected ? 'Included' : 'Add'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeModuleTab === 'home' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Search home modules..."
                  value={homeSearch}
                  onChange={(e) => setHomeSearch(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 w-48"
                />

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedHomeIds(homeModules.map((m) => Number(m.id)))}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHomeIds([])}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {loadingModules ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading home modules...</div>
              ) : filteredHomeModules.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No home modules matched.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
                  {filteredHomeModules.map((mod) => {
                    const isSelected = selectedHomeIds.includes(Number(mod.id));
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleHomeModule(mod.id)}
                        className={`flex items-start justify-between p-2.5 rounded border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 border-slate-900 dark:border-white text-slate-900 dark:text-white'
                            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-medium text-xs truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            <span>{mod.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 block mt-0.5 truncate">
                            {mod.path}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded border shrink-0 ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isSelected ? 'Included' : 'Add'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Description &amp; Highlights
            </label>
            <textarea
              rows={3}
              placeholder="Highlight special inclusions, support SLAs, or institutional requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Grace Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.grace_period}
                  onChange={(e) => setFormData({ ...formData, grace_period: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2 cursor-pointer p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 cursor-pointer"
                />
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
                <input
                  type="checkbox"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                  className="rounded border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Popular / Featured Tier
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Active &amp; Published
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
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
    </div>
  );
}
