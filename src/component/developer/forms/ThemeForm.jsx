'use client';

import { useState, useEffect } from 'react';
import { BiPalette, BiCheck, BiX } from 'react-icons/bi';

export default function ThemeForm({ initialData = null, onSuccess, onCancel }) {
  const [apps, setApps] = useState([]);
  const [formData, setFormData] = useState({
    app_id: initialData?.app_id || '',
    name: initialData?.name || initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    category: initialData?.category || 'Modern',
    preview_image: initialData?.preview_image || initialData?.image || '',
    link: initialData?.link || '',
    is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
    is_premium: initialData?.is_premium !== undefined ? initialData.is_premium : false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(initialData?.id);

  useEffect(() => {
    if (initialData) {
      setFormData({
        app_id: initialData.app_id || '',
        name: initialData.name || initialData.title || '',
        slug: initialData.slug || '',
        description: initialData.description || '',
        category: initialData.category || 'Modern',
        preview_image: initialData.preview_image || initialData.image || '',
        link: initialData.link || '',
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
        is_premium: initialData.is_premium !== undefined ? initialData.is_premium : false,
      });
    }
  }, [initialData]);

  useEffect(() => {
    async function loadApps() {
      try {
        const res = await fetch('/api/apps');
        const data = await res.json();
        if (data.success) {
          setApps(data.apps || []);
        }
      } catch (e) {
        console.error('Failed to load apps:', e);
      }
    }
    loadApps();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      id: initialData?.id,
      title: formData.name,
      app_id: formData.app_id ? Number(formData.app_id) : null,
    };
    delete payload.slug;

    const url = isEdit
      ? `/api/developer/themes/${initialData.slug || initialData.id}`
      : '/api/developer/themes';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (!isEdit) {
          setFormData({
            app_id: '',
            name: '',
            slug: '',
            description: '',
            category: 'Modern',
            preview_image: '',
            link: '',
            is_active: true,
            is_premium: false,
          });
        }
        if (onSuccess) onSuccess(data.record);
      } else {
        setError(data.error || 'Failed to save theme');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
            <BiPalette className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {isEdit ? `Edit Theme: ${formData.name || 'Untitled'}` : 'Add Design Theme'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? 'Update theme parameters, styling, category, and app associations.'
                : 'Provide pre-built templates, color styles, and fonts for portfolio sites.'}
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <BiX className="text-xl" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Application</label>
            <select
              value={formData.app_id || ''}
              onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="">General / All Apps</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">Theme Name</label>
              {formData.name && (
                <span className="text-[10px] font-mono text-slate-400">
                  slug: /{formData.slug || 'auto'}
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Nordic Minimalist"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                const autoSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                setFormData((prev) => ({ ...prev, name: newName, slug: autoSlug || prev.slug }));
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="Modern">Modern</option>
              <option value="Minimalist">Minimalist</option>
              <option value="Executive">Executive</option>
              <option value="Creative">Creative</option>
              <option value="Technical">Technical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Preview Image URL</label>
          <input
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={formData.preview_image}
            onChange={(e) => setFormData({ ...formData, preview_image: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Theme Description</label>
          <textarea
            rows={2}
            placeholder="Design philosophy and target creator profile..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-6 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="theme_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary"
            />
            <label htmlFor="theme_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Active in theme gallery
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="theme_premium"
              checked={formData.is_premium}
              onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
              className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
            />
            <label htmlFor="theme_premium" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Requires Pro Package (Premium)
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            <BiCheck className="text-base" />
            <span>{loading ? 'Saving...' : isEdit ? 'Update Theme' : 'Save Theme'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
