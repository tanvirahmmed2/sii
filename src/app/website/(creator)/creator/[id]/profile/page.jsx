'use client';

import { useState } from 'react';
import { useCreator } from '../layout';
import {
  BiUser,
  BiCheckCircle,
  BiLoaderAlt,
  BiPhone,
  BiEnvelope,
  BiCalendar,
  BiCheckShield,
  BiDesktop,
} from 'react-icons/bi';

export default function CreatorProfilePage() {
  const { creator, creatorId, websites = [], refetch } = useCreator();

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
      const res = await fetch('/api/creator', {
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
        setMsg('Profile changes updated successfully!');
        await refetch();
      } else {
        setErr(json.error || 'Failed to update profile.');
      }
    } catch (e) {
      setErr('Network error while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Creator Profile</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Account
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Manage your personal creator identity, bio summary, and contact credentials.
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <BiCheckCircle className="text-lg text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card Preview (1 Col) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5 text-center flex flex-col items-center">
          <div className="relative w-20 h-20 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-700 font-bold text-2xl shadow-xs">
            {name ? name.charAt(0).toUpperCase() : <BiUser className="text-3xl text-slate-400" />}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-900">{name || 'Creator Name'}</h3>
            <p className="text-xs text-slate-500 font-mono">{creator?.email}</p>
          </div>

          <p className="text-xs text-slate-600 italic max-w-xs leading-relaxed">
            &ldquo;{bio || 'Creative developer and portfolio builder.'}&rdquo;
          </p>

          <div className="w-full pt-4 border-t border-slate-100 space-y-2.5 text-left text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <BiDesktop className="text-slate-400" />
                <span>Websites Hosted:</span>
              </span>
              <strong className="text-slate-900 font-mono font-bold">{websites.length}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <BiCalendar className="text-slate-400" />
                <span>Member Since:</span>
              </span>
              <span className="text-slate-700 font-mono">
                {creator?.created_at ? new Date(creator.created_at).toLocaleDateString() : '2026'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <BiCheckShield className="text-emerald-500" />
                <span>Account Status:</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form (2 Cols) */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-2 p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5"
        >
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Edit Profile Information</h3>
            <p className="text-xs text-slate-500">Update your public creator card and contact preferences.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Display Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 px-4 py-2 text-sm text-slate-500">
                  <BiEnvelope className="mr-2 text-slate-400" />
                  <span className="font-mono text-xs text-slate-700">{creator?.email}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Email is locked for account security.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                />
              </div>
            </div>


            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bio / Tagline
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of your creative background..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {saving ? <BiLoaderAlt className="animate-spin text-sm" /> : null}
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
