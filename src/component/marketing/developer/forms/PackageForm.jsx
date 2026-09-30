'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BiCube,
  BiCheck,
  BiX,
  BiEdit,
  BiPlus,
  BiLayer,
  BiCheckSquare,
  BiSquare,
  BiDollarCircle,
  BiLoaderAlt,
  BiUser,
  BiGroup,
  BiSearch,
  BiStar,
  BiShieldCheck,
  BiInfoCircle,
  BiCalendarCheck,
  BiAward,
  BiBookOpen,
  BiCreditCard,
  BiLineChart,
  BiTime,
  BiBell,
  BiBuilding,
  BiBus,
  BiDesktop,
} from 'react-icons/bi';

// Dynamic icon mapper for tenant module badges
function getModuleIcon(iconName) {
  const map = {
    BiUser: <BiUser />,
    BiCalendarCheck: <BiCalendarCheck />,
    BiAward: <BiAward />,
    BiBookOpen: <BiBookOpen />,
    BiCreditCard: <BiCreditCard />,
    BiLineChart: <BiLineChart />,
    BiGroup: <BiGroup />,
    BiTime: <BiTime />,
    BiBell: <BiBell />,
    BiBuilding: <BiBuilding />,
    BiBus: <BiBus />,
    BiDesktop: <BiDesktop />,
  };
  return map[iconName] || <BiLayer />;
}

export default function PackageForm({
  initialData = null,
  onSuccess,
  onCancel,
  apiEndpoint = '/api/developer/packages',
}) {
  const isEditing = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
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
    max_storage_mb: initialData?.max_storage_mb ?? 5120,
    max_websites: initialData?.max_websites ?? initialData?.max_portfolios ?? 1,
    trial_days: initialData?.trial_days ?? 14,
    is_popular: Boolean(initialData?.is_popular),
    is_active: initialData?.is_active !== undefined ? Boolean(initialData.is_active) : true,
    sort_order: initialData?.sort_order ?? 0,
  });

  const [tenantModules, setTenantModules] = useState([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [moduleSearch, setModuleSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available Tenant Modules catalog from API
  useEffect(() => {
    let isMounted = true;
    setLoadingModules(true);

    fetch('/api/developer/tenant-modules')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data.records)) {
          setTenantModules(data.records);
        } else if (Array.isArray(data.modules)) {
          setTenantModules(data.modules);
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

  // Sync initialData changes
  useEffect(() => {
    if (!initialData) return;

    setFormData({
      name: initialData.name || '',
      slug: initialData.slug || '',
      tagline: initialData.tagline || '',
      description: initialData.description || '',
      monthly_price_usd:
        initialData.monthly_price_usd !== undefined
          ? String(initialData.monthly_price_usd)
          : initialData.monthly_price !== undefined
          ? String(initialData.monthly_price)
          : '29.00',
      yearly_price_usd:
        initialData.yearly_price_usd !== undefined
          ? String(initialData.yearly_price_usd)
          : initialData.yearly_price !== undefined
          ? String(initialData.yearly_price)
          : '290.00',
      monthly_price_bdt:
        initialData.monthly_price_bdt !== undefined
          ? String(initialData.monthly_price_bdt)
          : '3500.00',
      yearly_price_bdt:
        initialData.yearly_price_bdt !== undefined
          ? String(initialData.yearly_price_bdt)
          : '35000.00',
      discount_percentage:
        initialData.discount_percentage !== undefined
          ? String(initialData.discount_percentage)
          : '15.00',
      max_students: initialData.max_students ?? 500,
      max_teachers: initialData.max_teachers ?? 30,
      max_staff: initialData.max_staff ?? 20,
      max_storage_mb: initialData.max_storage_mb ?? 5120,
      max_websites: initialData.max_websites ?? initialData.max_portfolios ?? 1,
      trial_days: initialData.trial_days ?? 14,
      is_popular: Boolean(initialData.is_popular),
      is_active: initialData.is_active !== undefined ? Boolean(initialData.is_active) : true,
      sort_order: initialData.sort_order ?? 0,
    });

    if (Array.isArray(initialData.tenant_module_ids)) {
      setSelectedModuleIds(initialData.tenant_module_ids.map(Number));
    } else if (Array.isArray(initialData.tenant_modules)) {
      setSelectedModuleIds(initialData.tenant_modules.map((m) => Number(m.id || m)));
    }
  }, [initialData]);

  // If new package and tenant modules finish loading, default to selecting all standard modules
  useEffect(() => {
    if (!isEditing && tenantModules.length > 0 && selectedModuleIds.length === 0) {
      setSelectedModuleIds(tenantModules.map((m) => Number(m.id)));
    }
  }, [tenantModules, isEditing]);

  const toggleModule = (modId) => {
    const numericId = Number(modId);
    setSelectedModuleIds((prev) =>
      prev.includes(numericId)
        ? prev.filter((id) => id !== numericId)
        : [...prev, numericId]
    );
  };

  const handleSelectAll = () => {
    setSelectedModuleIds(tenantModules.map((m) => Number(m.id)));
  };

  const handleDeselectAll = () => {
    setSelectedModuleIds([]);
  };

  // Filtered module view for search
  const filteredTenantModules = useMemo(() => {
    if (!moduleSearch.trim()) return tenantModules;
    const term = moduleSearch.toLowerCase();
    return tenantModules.filter(
      (m) =>
        m.name?.toLowerCase().includes(term) ||
        m.description?.toLowerCase().includes(term) ||
        m.slug?.toLowerCase().includes(term)
    );
  }, [tenantModules, moduleSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please provide a package name.');
      return;
    }

    setLoading(true);

    const monthlyUsd = Math.max(0, parseFloat(formData.monthly_price_usd) || 0);
    const yearlyUsd = Math.max(0, parseFloat(formData.yearly_price_usd) || 0);
    const monthlyBdt = Math.max(0, parseFloat(formData.monthly_price_bdt) || 0);
    const yearlyBdt = Math.max(0, parseFloat(formData.yearly_price_bdt) || 0);

    const payload = {
      name: formData.name.trim(),
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
      max_storage_mb: Math.max(100, parseInt(formData.max_storage_mb, 10) || 5120),
      max_websites: Math.max(1, parseInt(formData.max_websites, 10) || 1),
      trial_days: Math.max(0, parseInt(formData.trial_days, 10) || 14),
      sort_order: parseInt(formData.sort_order, 10) || 0,
      is_popular: Boolean(formData.is_popular),
      is_active: Boolean(formData.is_active),
      tenant_module_ids: selectedModuleIds,
    };

    try {
      const targetUrl =
        isEditing && initialData?.id
          ? apiEndpoint.includes('/[slug]') || apiEndpoint.endsWith(`/${initialData.slug}`)
            ? apiEndpoint
            : `/api/developer/packages?id=${initialData.id}`
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
            max_storage_mb: 5120,
            max_websites: 1,
            trial_days: 14,
            is_popular: false,
            is_active: true,
            sort_order: 0,
          });
          setSelectedModuleIds(tenantModules.map((m) => Number(m.id)));
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs mb-8 transition-all">
      {/* Form Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
            {isEditing ? <BiEdit className="text-2xl" /> : <BiCube className="text-2xl" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditing ? `Edit Package: ${initialData.name}` : 'Create Platform Package'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEditing
                ? `Updating package #${initialData.id} rates, institutional capacity, and included tenant modules.`
                : 'Configure dual-currency BDT/USD subscription pricing, school quotas, and linked tenant modules.'}
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Form"
          >
            <BiX className="text-2xl" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. BASIC INFORMATION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Package Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Standard School Tier, Campus Pro, Enterprise"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Plan Tagline
            </label>
            <input
              type="text"
              placeholder="e.g. Ideal for growing colleges & multi-branch institutes"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all font-medium"
            />
          </div>
        </div>

        {/* 2. DUAL-CURRENCY PRICING CONFIGURATION (USD & BDT) */}
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BiDollarCircle className="text-secondary text-base" />
                <span>Multi-Currency Pricing Configuration</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Independent monthly and yearly billing rates for Dollar (USD $) and Taka (BDT ৳).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold">Discount %:</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-secondary"
                placeholder="15"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* USD Monthly */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 focus-within:border-secondary transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  USD Monthly ($)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  USD / mo
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="29.00"
                  value={formData.monthly_price_usd}
                  onChange={(e) => setFormData({ ...formData, monthly_price_usd: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Dollar rate per month</p>
            </div>

            {/* USD Yearly */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 focus-within:border-secondary transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  USD Yearly ($)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  USD / yr
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="290.00"
                  value={formData.yearly_price_usd}
                  onChange={(e) => setFormData({ ...formData, yearly_price_usd: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Annual dollar billing</p>
            </div>

            {/* BDT Monthly */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 focus-within:border-secondary transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  BDT Monthly (৳)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                  BDT / mo
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="3500.00"
                  value={formData.monthly_price_bdt}
                  onChange={(e) => setFormData({ ...formData, monthly_price_bdt: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Taka rate per month</p>
            </div>

            {/* BDT Yearly */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 focus-within:border-secondary transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  BDT Yearly (৳)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                  BDT / yr
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="35000.00"
                  value={formData.yearly_price_bdt}
                  onChange={(e) => setFormData({ ...formData, yearly_price_bdt: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Annual Taka billing</p>
            </div>
          </div>
        </div>

        {/* 3. INSTITUTION CAPACITY & QUOTAS */}
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BiGroup className="text-secondary text-base" />
              <span>School Capacity Quotas &amp; Limits</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Limits provisioned for client educational institutions subscribing to this tier.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Max Students
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Student records</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Max Teachers
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.max_teachers}
                onChange={(e) => setFormData({ ...formData, max_teachers: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Faculty staff</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Max Staff
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.max_staff}
                onChange={(e) => setFormData({ ...formData, max_staff: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Admin personnel</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Storage (MB)
              </label>
              <input
                type="number"
                min={100}
                required
                value={formData.max_storage_mb}
                onChange={(e) => setFormData({ ...formData, max_storage_mb: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {(Number(formData.max_storage_mb) / 1024).toFixed(1)} GB cloud storage
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Websites / Domains
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.max_websites}
                onChange={(e) => setFormData({ ...formData, max_websites: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Web portal allowance</span>
            </div>
          </div>
        </div>

        {/* 4. LINKED TENANT MODULES (ATTENDANCE, EXAMS, LMS, FEES, ETC.) */}
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <BiLayer className="text-secondary text-lg" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Linked Tenant System Modules
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                  {selectedModuleIds.length} of {tenantModules.length} enabled
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                School system modules unlocked for clients subscribing to this package tier (stored in package_modules).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <BiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  placeholder="Filter modules..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-secondary w-36 sm:w-44"
                />
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 text-[11px] font-bold text-secondary hover:bg-secondary/10 rounded-lg transition-colors cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-600 text-xs">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {loadingModules ? (
            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <BiLoaderAlt className="animate-spin text-xl text-secondary" />
              <span className="text-xs">Loading tenant modules catalog...</span>
            </div>
          ) : filteredTenantModules.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No tenant modules found matching &ldquo;{moduleSearch}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTenantModules.map((mod) => {
                const isSelected = selectedModuleIds.includes(Number(mod.id));
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-secondary text-slate-900 dark:text-white shadow-xs ring-1 ring-secondary/30'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`text-xl shrink-0 mt-0.5 p-1 rounded-lg ${
                        isSelected
                          ? 'bg-secondary/10 text-secondary'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {getModuleIcon(mod.icon)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-xs truncate text-slate-800 dark:text-slate-100">
                          {mod.name}
                        </span>
                        <span
                          className={`text-base shrink-0 ${
                            isSelected ? 'text-secondary' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        >
                          {isSelected ? <BiCheckSquare /> : <BiSquare />}
                        </span>
                      </div>
                      {mod.description && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {mod.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. DESCRIPTION, TRIAL & TOGGLES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Description &amp; Highlights
            </label>
            <textarea
              rows={3}
              placeholder="Highlight special inclusions, support SLAs, or institutional requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all"
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trial Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.trial_days}
                  onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-secondary"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer p-2.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                  className="w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <BiStar className="text-amber-500" />
                    <span>Popular / Featured Tier</span>
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer p-2.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <BiShieldCheck className="text-emerald-500" />
                    <span>Active &amp; Published</span>
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* 6. ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <BiLoaderAlt className="animate-spin text-base" />
            ) : isEditing ? (
              <BiCheck className="text-lg" />
            ) : (
              <BiPlus className="text-lg" />
            )}
            <span>
              {loading
                ? isEditing
                  ? 'Updating Package...'
                  : 'Creating Package...'
                : isEditing
                ? 'Update Package'
                : 'Create Package'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
