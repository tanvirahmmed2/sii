'use client';

import { useState } from 'react';
import axios from 'axios';
import { BiPlus, BiLoaderAlt, BiX, BiGridAlt } from 'react-icons/bi';

export default function AppCreateForm({ onSuccess, onCancel }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateDraft = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/developer/apps', {
        title: title.trim() || 'Untitled App',
        is_published: false,
      });

      if (res.data?.success && res.data?.record) {
        if (onSuccess) onSuccess(res.data.record);
      } else {
        setError(res.data?.error || 'Failed to create draft app.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Network error while creating draft.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6 transition-all">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center text-xl font-bold">
            <BiGridAlt />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Initialize New Application</h3>
            <p className="text-xs text-slate-500">
              Creates a draft record in the ecosystem. You can fill out details, attach images, and publish when ready.
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
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

      <form onSubmit={handleCreateDraft} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Application Title <span className="text-slate-400 font-normal">(optional, default: Untitled App)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Booking Engine, AI Copywriter, CRM Suite..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500">
            Automatically provisions a draft in PostgreSQL database.
          </p>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <BiLoaderAlt className="animate-spin text-base" />
                  <span>Provisioning Draft...</span>
                </>
              ) : (
                <>
                  <BiPlus className="text-base" />
                  <span>Create App Draft</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
