'use client';

import { useState } from 'react';

export default function SubscriptionForm({ packages = [], onSuccess, onCancel }) {
  const [formData, setFormData] = useState(() => ({
    creator_id: 101,
    package_id: packages[0]?.id || 1,
    status: 'ACTIVE',
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    cancel_at_period_end: false,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/marketing/developer/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_record',
          data: {
            ...formData,
            creator_id: Number(formData.creator_id),
            package_id: Number(formData.package_id),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          creator_id: 101,
          package_id: packages[0]?.id || 1,
          status: 'ACTIVE',
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          cancel_at_period_end: false,
        });
        if (onSuccess) onSuccess(data.record);
      } else {
        setError(data.error || 'Failed to create subscription');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4 mb-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assign Creator Subscription</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Grant or adjust recurring package subscriptions for platform users.
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Creator Account ID</label>
            <input
              type="number"
              required
              placeholder="e.g. 101"
              value={formData.creator_id}
              onChange={(e) => setFormData({ ...formData, creator_id: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Package ID</label>
            <input
              type="number"
              required
              placeholder="e.g. 1"
              value={formData.package_id}
              onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subscription Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            >
              <option value="ACTIVE">Active</option>
              <option value="TRIALING">Trialing</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Current Period Expiry Date</label>
            <input
              type="date"
              required
              value={formData.current_period_end}
              onChange={(e) => setFormData({ ...formData, current_period_end: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                id="cancel_at_period_end"
                checked={formData.cancel_at_period_end}
                onChange={(e) => setFormData({ ...formData, cancel_at_period_end: e.target.checked })}
                className="rounded border-slate-300 cursor-pointer"
              />
              <span>Auto-cancel when billing cycle ends</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Creating...' : 'Grant Subscription'}
          </button>
        </div>
      </form>
    </div>
  );
}
