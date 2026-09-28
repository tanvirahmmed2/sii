'use client';

import { useState, useEffect } from 'react';
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
} from 'react-icons/bi';

export default function PackageForm({
  initialData = null,
  onSuccess,
  onCancel,
  apiEndpoint = '/api/developer/packages',
}) {
  const isEditing = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    app_id: initialData?.app_id ? String(initialData.app_id) : '',
    monthly_price_usd:
      initialData?.monthly_price_usd !== undefined
        ? String(initialData.monthly_price_usd)
        : initialData?.price_in_cents
        ? String((Number(initialData.price_in_cents) / 100).toFixed(2))
        : '29.00',
    yearly_price_usd:
      initialData?.yearly_price_usd !== undefined
        ? String(initialData.yearly_price_usd)
        : '290.00',
    monthly_price_bdt:
      initialData?.monthly_price_bdt !== undefined
        ? String(initialData.monthly_price_bdt)
        : '3000.00',
    yearly_price_bdt:
      initialData?.yearly_price_bdt !== undefined
        ? String(initialData.yearly_price_bdt)
        : '30000.00',
    max_websites:
      initialData?.max_websites !== undefined
        ? initialData.max_websites
        : initialData?.max_portfolios !== undefined
        ? initialData.max_portfolios
        : 1,
    is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
  });

  const [apps, setApps] = useState([]);
  const [selectedModules, setSelectedModules] = useState(
    initialData?.allowed_modules || initialData?.modules || []
  );
  const [customModuleInput, setCustomModuleInput] = useState('');
  const [loadingApps, setLoadingApps] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch registered applications
  useEffect(() => {
    let isMounted = true;
    fetch('/api/developer/apps')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data.records)) {
          setApps(data.records);
        }
      })
      .catch((err) => {
        console.error('Error fetching apps:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingApps(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize initial data changes
  useEffect(() => {
    if (!initialData) return;

    const timer = setTimeout(() => {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        app_id: initialData.app_id ? String(initialData.app_id) : '',
        monthly_price_usd:
          initialData.monthly_price_usd !== undefined
            ? String(initialData.monthly_price_usd)
            : initialData.price_in_cents
            ? String((Number(initialData.price_in_cents) / 100).toFixed(2))
            : '29.00',
        yearly_price_usd:
          initialData.yearly_price_usd !== undefined
            ? String(initialData.yearly_price_usd)
            : '290.00',
        monthly_price_bdt:
          initialData.monthly_price_bdt !== undefined
            ? String(initialData.monthly_price_bdt)
            : '3000.00',
        yearly_price_bdt:
          initialData.yearly_price_bdt !== undefined
            ? String(initialData.yearly_price_bdt)
            : '30000.00',
        max_websites:
          initialData.max_websites !== undefined
            ? initialData.max_websites
            : initialData.max_portfolios !== undefined
            ? initialData.max_portfolios
            : 1,
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
      });
      setSelectedModules(initialData.allowed_modules || initialData.modules || []);
    }, 0);

    return () => clearTimeout(timer);
  }, [initialData]);

  // Find currently selected app and its registered modules
  const selectedApp = apps.find((a) => String(a.id) === String(formData.app_id));
  const currentAppModules = selectedApp?.modules || [];

  const handleAppChange = (newAppId) => {
    setFormData((prev) => ({ ...prev, app_id: newAppId }));
    setError('');
    const targetApp = apps.find((a) => String(a.id) === String(newAppId));
    if (targetApp && Array.isArray(targetApp.modules) && targetApp.modules.length > 0) {
      setSelectedModules(targetApp.modules.map((m) => m.name));
    } else {
      setSelectedModules([]);
    }
  };

  const toggleModule = (moduleTitle) => {
    setSelectedModules((prev) => {
      if (prev.includes(moduleTitle)) {
        return prev.filter((m) => m !== moduleTitle);
      } else {
        return [...prev, moduleTitle];
      }
    });
  };

  const handleSelectAllModules = () => {
    if (currentAppModules.length > 0) {
      setSelectedModules(currentAppModules.map((m) => m.name));
    }
  };

  const handleDeselectAllModules = () => {
    setSelectedModules([]);
  };

  const handleAddCustomModule = (e) => {
    e?.preventDefault?.();
    const trimmed = customModuleInput.trim();
    if (!trimmed) return;

    if (!selectedModules.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedModules((prev) => [...prev, trimmed]);
    }
    setCustomModuleInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.app_id) {
      setError('Please select a linked ecosystem application for this package.');
      return;
    }
    if (!formData.name.trim()) {
      setError('Please enter a package name.');
      return;
    }

    setLoading(true);

    const monthlyUsd = Math.max(0, parseFloat(formData.monthly_price_usd) || 0);
    const yearlyUsd = Math.max(0, parseFloat(formData.yearly_price_usd) || 0);
    const monthlyBdt = Math.max(0, parseFloat(formData.monthly_price_bdt) || 0);
    const yearlyBdt = Math.max(0, parseFloat(formData.yearly_price_bdt) || 0);

    const payloadData = {
      name: formData.name.trim(),
      description: formData.description,
      app_id: Number(formData.app_id),
      monthly_price_usd: monthlyUsd,
      yearly_price_usd: yearlyUsd,
      monthly_price_bdt: monthlyBdt,
      yearly_price_bdt: yearlyBdt,
      price_in_cents: Math.round(monthlyUsd * 100),
      currency: 'USD',
      billing_interval: 'MONTHLY',
      max_websites: Math.max(1, parseInt(formData.max_websites, 10) || 1),
      max_portfolios: Math.max(1, parseInt(formData.max_websites, 10) || 1),
      is_active: Boolean(formData.is_active),
      allowed_modules: selectedModules,
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
        body: JSON.stringify(isEditing ? { id: initialData.id, ...payloadData } : payloadData),
      });

      const data = await res.json();
      if (data.success) {
        if (!isEditing) {
          setFormData({
            name: '',
            description: '',
            app_id: '',
            monthly_price_usd: '29.00',
            yearly_price_usd: '290.00',
            monthly_price_bdt: '3000.00',
            yearly_price_bdt: '30000.00',
            max_websites: 1,
            is_active: true,
          });
          setSelectedModules([]);
        }
        if (onSuccess) onSuccess(data.record || data.package);
      } else {
        setError(data.error || 'Failed to save package');
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
                ? `Updating package #${initialData.id} rates, app linkage, and allowed website modules.`
                : 'Configure subscription tiers, 4-tier USD/BDT pricing, quotas, and allowed website modules.'}
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
        {/* 1. APP SELECTION FIRST */}
        <div className="p-5 rounded-2xl bg-secondary/5 dark:bg-secondary/10 border border-secondary/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Linked Ecosystem Application <span className="text-rose-500">*</span>
            </label>
            {selectedApp && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                {currentAppModules.length} Modules Available
              </span>
            )}
          </div>
          <select
            required
            value={formData.app_id}
            onChange={(e) => handleAppChange(e.target.value)}
            disabled={loadingApps}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-semibold cursor-pointer disabled:opacity-50"
          >
            <option value="">
              {loadingApps ? 'Loading applications...' : '-- Select an Application (Required) --'}
            </option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.title} (#{app.id})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Packages are tied to specific applications. Selecting an application dynamically reveals its registered feature modules.
          </p>
        </div>

        {/* 2. BASIC INFORMATION (Name & Quota & Active) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Package Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pro Studio Pass"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Website Quota (Max Websites) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              required
              value={formData.max_websites}
              onChange={(e) => setFormData({ ...formData, max_websites: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all font-medium"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Maximum websites a creator can publish</p>
          </div>
        </div>

        {/* 3. 4 SEPARATE PRICING FIELDS (USD & BDT) */}
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BiDollarCircle className="text-secondary text-base" />
              <span>Multi-Currency Pricing Configuration</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Configure independent monthly and yearly billing rates for USD ($) and BDT (৳).
            </p>
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
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">e.g., $29.00 / month</p>
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
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">e.g., $290.00 / year</p>
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
                  placeholder="3000.00"
                  value={formData.monthly_price_bdt}
                  onChange={(e) => setFormData({ ...formData, monthly_price_bdt: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">e.g., ৳3,000.00 / month</p>
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
                  placeholder="30000.00"
                  value={formData.yearly_price_bdt}
                  onChange={(e) => setFormData({ ...formData, yearly_price_bdt: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">e.g., ৳30,000.00 / year</p>
            </div>
          </div>
        </div>

        {/* Description & Visibility */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Description &amp; Highlights
            </label>
            <textarea
              rows={3}
              placeholder="Highlight package limits, priority features, and targeted creator tier..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-secondary focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-secondary transition-all"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="relative flex items-center gap-3 cursor-pointer p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary cursor-pointer"
              />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Active &amp; Available</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Visible during checkout for creators</div>
              </div>
            </label>
          </div>
        </div>

        {/* 4. DYNAMIC MODULES SELECTION */}
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <BiLayer className="text-secondary text-lg" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Allowed Website Modules {selectedApp ? `for ${selectedApp.title}` : ''}
                </h4>
                {selectedApp && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                    {selectedModules.length} of {currentAppModules.length} enabled
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Enable or disable specific website builder sections and tenant capabilities unlocked for this tier.
              </p>
            </div>

            {selectedApp && currentAppModules.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAllModules}
                  className="px-2.5 py-1 text-[11px] font-bold text-secondary hover:bg-secondary/10 rounded-lg transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-slate-600 text-xs">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllModules}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {!formData.app_id ? (
            <div className="p-8 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-dashed border-amber-200 dark:border-amber-900/40 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center text-xl">
                <BiLayer />
              </div>
              <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Select an Application to View Modules
              </h5>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 max-w-sm mx-auto">
                Choose an ecosystem application above to reveal and unlock its registered website builder modules for this tier.
              </p>
            </div>
          ) : currentAppModules.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No modules registered for this application yet.
              </p>
              <p className="text-[11px] text-slate-400">
                You can assign modules to {selectedApp?.title} in the Applications manager, or add custom modules below.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {currentAppModules.map((mod) => {
                const isSelected = selectedModules.includes(mod.name);
                return (
                  <button
                    key={mod.id || mod.slug}
                    type="button"
                    onClick={() => toggleModule(mod.name)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-secondary text-slate-900 dark:text-white shadow-xs'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`text-lg shrink-0 mt-0.5 ${
                        isSelected ? 'text-secondary' : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {isSelected ? <BiCheckSquare /> : <BiSquare />}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold truncate text-slate-800 dark:text-slate-100">{mod.name}</div>
                      {mod.description && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                          {mod.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Add Custom Module Section if app is selected */}
          {formData.app_id && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center gap-2">
              <input
                type="text"
                placeholder="Add custom module title (e.g. AI Content Assistant, Custom Domain)..."
                value={customModuleInput}
                onChange={(e) => setCustomModuleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomModule();
                  }
                }}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
              <button
                type="button"
                onClick={handleAddCustomModule}
                disabled={!customModuleInput.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-black text-xs font-bold shadow-xs disabled:opacity-40 transition-all cursor-pointer shrink-0"
              >
                <BiPlus className="text-base" />
                <span>Add Module</span>
              </button>
            </div>
          )}
        </div>

        {/* Form Action Controls */}
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
                  ? 'Updating...'
                  : 'Creating...'
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
