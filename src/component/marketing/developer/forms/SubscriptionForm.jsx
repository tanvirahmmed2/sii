'use client';

import { useState } from 'react';
import { BiCheckShield, BiCheck, BiX } from 'react-icons/bi';

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
      const res = await fetch('/api/developer/subscriptions', {
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BiCheckShield className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Assign Creator Subscription</h3>
            <p className="text-xs text-slate-500">Grant or adjust recurring package subscriptions for platform users.</p>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Package ID</label>
            <input
              type="number"
              required
              placeholder="e.g. 1"
              value={formData.package_id}
              onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subscription Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="ACTIVE">Active</option>
              <option value="TRIALING">Trialing</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Current Period Expiry Date</label>
            <input
              type="date"
              required
              value={formData.current_period_end}
              onChange={(e) => setFormData({ ...formData, current_period_end: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="cancel_at_period_end"
              checked={formData.cancel_at_period_end}
              onChange={(e) => setFormData({ ...formData, cancel_at_period_end: e.target.checked })}
              className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary mr-2"
            />
            <label htmlFor="cancel_at_period_end" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Auto-cancel when billing cycle ends
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
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-slate-900 text-xs font-bold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            <BiCheck className="text-base" />
            <span>{loading ? 'Creating...' : 'Grant Subscription'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
