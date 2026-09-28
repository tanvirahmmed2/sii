'use client';

import { useState } from 'react';
import { BiDesktop, BiCheck, BiX } from 'react-icons/bi';

export default function WebsiteForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    creator_id: 101,
    name: '',
    subdomain: '',
    custom_domain: '',
    status: 'ACTIVE',
    storage_used_mb: 0,
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
      const res = await fetch('/api/developer/websites', {
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
            <BiDesktop className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Provision Website Portfolio Space</h3>
            <p className="text-xs text-slate-500">Create a distinct website container, assign subdomains and domains.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Creator Account ID</label>
            <input
              type="number"
              required
              placeholder="e.g. 101"
              value={formData.creator_id}
              onChange={(e) => setFormData({ ...formData, creator_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Site / Website Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Connor Portfolio"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subdomain Slug</label>
            <input
              type="text"
              placeholder="e.g. sarah-connor"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Custom Domain (Optional)</label>
            <input
              type="text"
              placeholder="e.g. sarahconnor.design"
              value={formData.custom_domain}
              onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Storage Quota (MB)</label>
            <input
              type="number"
              min={0}
              value={formData.storage_used_mb}
              onChange={(e) => setFormData({ ...formData, storage_used_mb: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="website_published"
            checked={formData.is_published}
            onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
            className="w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary"
          />
          <label htmlFor="website_published" className="text-xs font-semibold text-slate-700 cursor-pointer">
            Publish portfolio immediately (online)
          </label>
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
            <span>{loading ? 'Provisioning...' : 'Provision Website'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
