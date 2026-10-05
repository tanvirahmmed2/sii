'use client';

import { useState } from 'react';
import { useCreator } from '../layout';

export default function CreatorProfilePage() {
  const { creator, creatorId, refetch } = useCreator();

  const [name, setName] = useState(creator?.name || '');
  const [phone, setPhone] = useState(creator?.phone || '');
  const [bio, setBio] = useState(creator?.bio || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');

    try {
      const res = await fetch('/api/marketing/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          creatorId: Number(creatorId),
          name,
          phone,
          bio,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMsg('Profile updated successfully.');
        if (refetch) await refetch();
      } else {
        setErr(json.error || 'Failed to update profile.');
      }
    } catch {
      setErr('Network error while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4">
        <h1 className="text-base font-semibold text-slate-900">Creator Profile</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Manage your account contact information and creator details.
        </p>
      </div>

      {msg && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
          {msg}
        </div>
      )}
      {err && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {err}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white border border-slate-200 rounded p-4">
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Email Address (Account Identifier)
            </label>
            <input
              type="email"
              disabled
              value={creator?.email || ''}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-500 font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Email address cannot be modified directly.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+8801XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Creator Bio & Organization
            </label>
            <textarea
              rows={3}
              placeholder="Brief bio or details about your educational institution..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="pt-2 flex items-center justify-end border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
