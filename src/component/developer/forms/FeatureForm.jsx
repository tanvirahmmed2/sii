'use client';

import { useState, useEffect } from 'react';
import { BiCheckShield, BiCheck, BiX, BiEdit, BiPlus } from 'react-icons/bi';

export default function FeatureForm({
  initialData = null,
  onSuccess,
  onCancel,
  apiEndpoint = '/api/developer/features',
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
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 transition-all">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
            {isEditing ? <BiEdit className="text-2xl" /> : <BiCheckShield className="text-2xl" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {isEditing ? `Edit Feature: ${initialData.name}` : 'Add Platform Feature'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEditing
                ? `Updating feature #${initialData.id}. Only Admins and Managers have permission.`
                : 'Define builder capabilities that can be bundled into packages or subscription tiers.'}
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close Form"
          >
            <BiX className="text-2xl" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Feature Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Custom Domain Mapping"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-secondary focus:bg-white focus:ring-1 focus:ring-secondary transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:bg-white focus:ring-1 focus:ring-secondary transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">Unique programmatic key used for feature flag verification.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Description &amp; Purpose</label>
          <textarea
            rows={3}
            placeholder="Describe what creators or websites gain when this feature is unlocked in a plan..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-secondary focus:bg-white focus:ring-1 focus:ring-secondary transition-all"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            {isEditing ? <BiCheck className="text-lg" /> : <BiPlus className="text-lg" />}
            <span>{loading ? (isEditing ? 'Updating...' : 'Creating...') : isEditing ? 'Update Feature' : 'Create Feature'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
