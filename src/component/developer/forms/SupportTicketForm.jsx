'use client';

import { useState } from 'react';
import { BiHeadphone, BiCheck, BiX } from 'react-icons/bi';

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
      const res = await fetch('/api/developer/support', {
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BiHeadphone className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Create Support Ticket</h3>
            <p className="text-xs text-slate-500">Log customer issues, DNS routing questions, or billing trouble tickets.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Requester Name</label>
            <input
              type="text"
              required
              placeholder="e.g. David Hassel"
              value={formData.requester_name}
              onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Requester Email</label>
            <input
              type="email"
              required
              placeholder="david@example.com"
              value={formData.requester_email}
              onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Issue Subject</label>
          <input
            type="text"
            required
            placeholder="e.g. SSL certificate failed on custom apex domain"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="TECHNICAL">Technical (Bug/DNS)</option>
              <option value="BILLING">Billing & Subscription</option>
              <option value="PORTFOLIO">Portfolio Builder</option>
              <option value="ACCOUNT">Account Access</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="OPEN">Open</option>
              <option value="PENDING">Pending Staff</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
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
            <span>{loading ? 'Creating...' : 'Open Ticket'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
