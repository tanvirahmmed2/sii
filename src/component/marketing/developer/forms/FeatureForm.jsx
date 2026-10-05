'use client';

import { useState, useEffect } from 'react';

export default function FeatureForm({
  initialData = null,
  onSuccess,
  onCancel,
  apiEndpoint = '/api/marketing/developer/features',
}) {
  const isEditing = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    key: initialData?.key || '',
    description: initialData?.description || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCustomKey, setIsCustomKey] = useState(Boolean(initialData?.key));

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        key: initialData.key || '',
        description: initialData.description || '',
      });
      setIsCustomKey(true);
    }
  }, [initialData]);

  const handleNameChange = (val) => {
    setFormData((prev) => {
      const next = { ...prev, name: val };
      if (!isCustomKey && !isEditing) {
        next.key = val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/(^_|_$)/g, '');
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const key = (
      formData.key ||
      formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
    );

    const payloadData = {
      name: formData.name.trim(),
      key: key.trim(),
      description: formData.description.trim(),
    };
    try {
      const payload = isEditing ? { id: initialData.id, ...payloadData } : payloadData;

      const res = await fetch(apiEndpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        if (!isEditing) {
          setFormData({ name: '', key: '', description: '' });
          setIsCustomKey(false);
        }
        if (onSuccess) onSuccess(data.record || data.feature);
      } else {
        setError(data.error || 'Failed to save feature');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred while saving feature.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4 mb-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {isEditing ? `Edit Feature: ${initialData.name}` : 'Add Platform Feature'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditing
              ? `Updating feature #${initialData.id}. Only Admins and Managers have permission.`
              : 'Define builder capabilities that can be bundled into packages or subscription tiers.'}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Feature Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Custom Domain Mapping"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Key Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. custom_domain_mapping"
              value={formData.key}
              onChange={(e) => {
                setIsCustomKey(true);
                setFormData({ ...formData, key: e.target.value });
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-normal">Unique programmatic key used for feature flag verification.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Description &amp; Purpose
          </label>
          <textarea
            rows={3}
            placeholder="Describe what creators or websites gain when this feature is unlocked in a plan..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-800"
          />
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
            {loading ? (isEditing ? 'Updating...' : 'Creating...') : isEditing ? 'Update Feature' : 'Create Feature'}
          </button>
        </div>
      </form>
    </div>
  );
}
