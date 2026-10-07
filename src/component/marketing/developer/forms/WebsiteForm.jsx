'use client';

import { useState } from 'react';

export default function WebsiteForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    creator_id: 101,
    name: '',
    subdomain: '',
    custom_domain: '',
    status: 'ACTIVE',
    storage_used_mb: 0,
    primary_color: '#1e40af',
    secondary_color: '#0ea5e9',
    is_published: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const subdomain = formData.subdomain || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    try {
      const res = await fetch('/api/marketing/developer/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_record',
          data: {
            ...formData,
            creator_id: Number(formData.creator_id),
            storage_used_mb: Number(formData.storage_used_mb),
            subdomain,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          creator_id: 101,
          name: '',
          subdomain: '',
          custom_domain: '',
          status: 'ACTIVE',
          storage_used_mb: 0,
          primary_color: '#1e40af',
          secondary_color: '#0ea5e9',
          is_published: true,
        });
        if (onSuccess) onSuccess(data.record);
      } else {
        setError(data.error || 'Failed to create website');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">Provision Website Container</h3>
          <p className="text-xs font-normal text-slate-500">Create a website instance and assign domain settings.</p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 mb-4 rounded border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-normal">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Creator ID</label>
            <input
              type="number"
              required
              placeholder="e.g. 101"
              value={formData.creator_id}
              onChange={(e) => setFormData({ ...formData, creator_id: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Website Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Portfolio"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Subdomain</label>
            <input
              type="text"
              placeholder="e.g. acme"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Custom Domain</label>
            <input
              type="text"
              placeholder="e.g. acme.com"
              value={formData.custom_domain}
              onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Storage Quota (MB)</label>
            <input
              type="number"
              min={0}
              value={formData.storage_used_mb}
              onChange={(e) => setFormData({ ...formData, storage_used_mb: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.primary_color || '#1e40af'}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.secondary_color || '#0ea5e9'}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="website_published"
            checked={formData.is_published}
            onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="website_published" className="text-xs font-normal text-slate-700 dark:text-slate-300 cursor-pointer">
            Publish portfolio immediately (online)
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Provisioning...' : 'Provision Website'}
          </button>
        </div>
      </form>
    </div>
  );
}
