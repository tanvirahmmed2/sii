'use client';

import React, { useState, useEffect } from 'react';
import {
  BiPalette,
  BiSave,
  BiX,
  BiLoaderAlt,
  BiCheckCircle,
  BiLinkExternal,
  BiImage,
  BiLayer,
} from 'react-icons/bi';

export default function ThemeForm({ initialData = {}, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || initialData?.name || '',
    slug: initialData?.slug || '',
    category: initialData?.category || 'Modern',
    link: initialData?.link || '',
    description: initialData?.description || '',
    preview_image: initialData?.preview_image || '',
    app_id: initialData?.app_id || '',
    is_active: initialData?.is_active ?? true,
    is_premium: initialData?.is_premium ?? false,
    theme_config: typeof initialData?.theme_config === 'object'
      ? JSON.stringify(initialData.theme_config, null, 2)
      : (initialData?.theme_config || '{}'),
  });

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Load available apps for category dropdown
    async function loadApps() {
      try {
        const res = await fetch('/api/marketing/developer/apps');
        const data = await res.json();
        if (data.success && Array.isArray(data.apps)) {
          setApps(data.apps);
        }
      } catch (err) {
        // Fallback to marketing apps
        try {
          const res = await fetch('/api/apps');
          const data = await res.json();
          if (data.success && Array.isArray(data.apps)) {
            setApps(data.apps);
          }
        } catch (e) {}
      }
    }
    loadApps();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const endpoint = initialData?.slug
        ? `/api/marketing/developer/themes/${encodeURIComponent(initialData.slug)}`
        : '/api/marketing/developer/themes';
      const method = initialData?.slug ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        app_id: formData.app_id ? Number(formData.app_id) : null,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg('Theme saved successfully!');
        if (onSuccess) {
          onSuccess(data.record || data.theme || data);
        }
      } else {
        setError(data.error || 'Failed to save theme.');
      }
    } catch (err) {
      setError(err.message || 'Network error saving theme.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
          <BiCheckCircle className="text-base" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Theme Title *
          </label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Modern School Academy"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Category
          </label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g. Education, Portfolio, Ecommerce"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Associated App */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Associated App Module
          </label>
          <select
            name="app_id"
            value={formData.app_id}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="">-- General / Multi-purpose --</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.title || app.name} ({app.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Demo Live Preview Link */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Demo / Live Preview URL
          </label>
          <input
            type="url"
            name="link"
            value={formData.link}
            onChange={handleChange}
            placeholder="https://preview.educraft.io/demo-theme"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Preview Image URL */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Preview Image URL
          </label>
          <input
            type="text"
            name="preview_image"
            value={formData.preview_image}
            onChange={handleChange}
            placeholder="https://res.cloudinary.com/.../preview.png or /icon.png"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Theme Description
          </label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            placeholder="Comprehensive description of layout, typography, components, and target institutions..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Theme Config (JSON) */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
            <span>Theme Configuration (JSON Variables)</span>
            <span className="text-[10px] text-slate-400 font-normal">Primary/Secondary colors, fonts, navbar layout</span>
          </label>
          <textarea
            name="theme_config"
            rows={4}
            value={formData.theme_config}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-emerald-400 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Active / Visible in Catalog
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            name="is_premium"
            checked={formData.is_premium}
            onChange={handleChange}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Premium Tier Only
          </span>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <BiLoaderAlt className="animate-spin text-base" />
          ) : (
            <BiSave className="text-base" />
          )}
          <span>{initialData?.slug ? 'Update Theme' : 'Create Theme'}</span>
        </button>
      </div>
    </form>
  );
}
