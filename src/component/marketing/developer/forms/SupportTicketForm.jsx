'use client';

import { useState } from 'react';

export default function SupportTicketForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    ticket_number: '',
    requester_name: '',
    requester_email: '',
    subject: '',
    category: 'TECHNICAL',
    priority: 'MEDIUM',
    status: 'OPEN',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const ticket_number = formData.ticket_number || 'TCK-' + Date.now().toString().slice(-6);

    try {
      const res = await fetch('/api/marketing/developer/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_record',
          data: { ...formData, ticket_number },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          ticket_number: '',
          requester_name: '',
          requester_email: '',
          subject: '',
          category: 'TECHNICAL',
          priority: 'MEDIUM',
          status: 'OPEN',
        });
        if (onSuccess) onSuccess(data.record);
      } else {
        setError(data.error || 'Failed to open support ticket');
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
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Create Support Ticket</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Log customer issues, DNS routing questions, or billing trouble tickets.</p>
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
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Requester Name</label>
            <input
              type="text"
              required
              placeholder="e.g. David Hassel"
              value={formData.requester_name}
              onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Requester Email</label>
            <input
              type="email"
              required
              placeholder="david@example.com"
              value={formData.requester_email}
              onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Issue Subject</label>
          <input
            type="text"
            required
            placeholder="e.g. SSL certificate failed on custom apex domain"
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
              <option value="TECHNICAL">Technical (Bug/DNS)</option>
              <option value="BILLING">Billing & Subscription</option>
              <option value="PORTFOLIO">Portfolio Builder</option>
              <option value="ACCOUNT">Account Access</option>
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
              <option value="PENDING">Pending Staff</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
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
            {loading ? 'Creating...' : 'Open Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
