'use client';

import { useState } from 'react';

export default function LiveChatMessageForm({ chats = [], onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    chat_id: chats[0]?.id || 1,
    sender_type: 'ADMIN',
    sender_name: 'Support',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/marketing/developer/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_record',
          table: 'live_chat_messages',
          data: {
            ...formData,
            chat_id: Number(formData.chat_id),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          chat_id: chats[0]?.id || 1,
          sender_type: 'ADMIN',
          sender_name: 'Support',
          message: '',
        });
        if (onSuccess) onSuccess(data.record);
      } else {
        setError(data.error || 'Failed to dispatch message');
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
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dispatch Live Chat Message</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Post a response or log an entry to an active live chat stream.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Live Chat ID</label>
            <input
              type="number"
              required
              placeholder="e.g. 1"
              value={formData.chat_id}
              onChange={(e) => setFormData({ ...formData, chat_id: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sender Type</label>
            <select
              value={formData.sender_type}
              onChange={(e) => setFormData({ ...formData, sender_type: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            >
              <option value="ADMIN">Support Staff</option>
              <option value="VISITOR">Visitor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sender Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Support"
              value={formData.sender_name}
              onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
          <textarea
            rows={3}
            required
            placeholder="Type your reply message..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
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
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Sending...' : 'Post Message'}
          </button>
        </div>
      </form>
    </div>
  );
}
