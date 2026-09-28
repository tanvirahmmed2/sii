'use client';

import { useState } from 'react';
import { BiMessageSquareDetail, BiCheck, BiX } from 'react-icons/bi';

export default function SupportMessageForm({ tickets = [], onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    support_id: tickets[0]?.id || 1,
    sender_type: 'ADMIN',
    sender_id: 1,
    sender_name: 'Lead Staff Agent',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/developer/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_record',
          table: 'support_messages',
          data: {
            ...formData,
            support_id: Number(formData.support_id),
            sender_id: Number(formData.sender_id),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          support_id: tickets[0]?.id || 1,
          sender_type: 'ADMIN',
          sender_id: 1,
          sender_name: 'Lead Staff Agent',
          message: '',
        });
        if (onSuccess) onSuccess(data.record);
      } else {
        setError(data.error || 'Failed to dispatch ticket message');
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
            <BiMessageSquareDetail className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Add Message to Ticket</h3>
            <p className="text-xs text-slate-500">Record communication, responses, or client instructions on an open ticket.</p>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Support Ticket ID</label>
            <input
              type="number"
              required
              placeholder="e.g. 1"
              value={formData.support_id}
              onChange={(e) => setFormData({ ...formData, support_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sender Type</label>
            <select
              value={formData.sender_type}
              onChange={(e) => setFormData({ ...formData, sender_type: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="ADMIN">Staff Administrator</option>
              <option value="USER">Customer / Creator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sender Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Support Specialist"
              value={formData.sender_name}
              onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Message Content</label>
          <textarea
            rows={3}
            required
            placeholder="Write response message or troubleshooting step..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
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
            <span>{loading ? 'Adding...' : 'Add Message'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
