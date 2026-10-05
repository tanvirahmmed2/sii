'use client';

import { useState } from 'react';

export default function LeadForm({ onSuccess, onCancel, apiEndpoint = '/api/marketing/developer/leads' }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'WEBSITE',
    status: 'NEW',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          source: 'WEBSITE',
          status: 'NEW',
          notes: '',
        });
        if (onSuccess) onSuccess(data.record);
      } else {
        setError(data.error || 'Failed to capture lead');
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
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Capture Sales Lead</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record an inbound business prospect, enterprise evaluation, or agency outreach.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Prospect Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Thomas Wayne"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="thomas@waynecorp.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
            <input
              type="text"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Company / Organization</label>
            <input
              type="text"
              placeholder="Wayne Enterprises"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Inbound Channel / Source</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            >
              <option value="WEBSITE">Website Form</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="DIRECT_REFERRAL">Direct Referral</option>
              <option value="PHONE">Phone Call</option>
              <option value="EMAIL">Inbound Email</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Lead Notes &amp; Project Requirements</label>
          <textarea
            rows={3}
            placeholder="Key discussion points, expected package scale, deployment schedule..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
          />
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
            {loading ? 'Saving...' : 'Save Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
