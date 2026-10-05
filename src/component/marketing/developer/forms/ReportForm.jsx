'use client';

import { useState } from 'react';

export default function ReportForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_email: '',
    subject: '',
    description: '',
    category: 'GENERAL',
    status: 'OPEN',
    priority: 'MEDIUM',
    admin_response: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/marketing/developer/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_record',
          data: formData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          reporter_name: '',
          reporter_email: '',
          subject: '',
          description: '',
          category: 'GENERAL',
          status: 'OPEN',
          priority: 'MEDIUM',
          admin_response: '',
        });
        if (onSuccess) onSuccess(data.record);
      } else {
        setError(data.error || 'Failed to file report');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 mb-4">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">File Moderation Report</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Record abuse, copyright notice, or terms of service violation.</p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 mb-3 rounded bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Reporter Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Legal Compliance / User Name"
              value={formData.reporter_name}
              onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Reporter Email</label>
            <input
              type="email"
              required
              placeholder="reporter@domain.com"
              value={formData.reporter_email}
              onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Report Subject</label>
          <input
            type="text"
            required
            placeholder="e.g. Copyright notice regarding tenant asset"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            >
              <option value="GENERAL">General</option>
              <option value="MODERATION">Content Moderation</option>
              <option value="SPAM">Spam / Phishing</option>
              <option value="COPYRIGHT">Copyright / DMCA</option>
              <option value="ABUSE">Harassment / Abuse</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Description</label>
          <textarea
            rows={3}
            required
            placeholder="Detailed description of the issue or incident..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Filing...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
