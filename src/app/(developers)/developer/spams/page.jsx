'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertCircleIcon, ShieldCheckIcon, CheckCircleIcon } from '@/components/ui/Icons';

export default function AdminSpamModerationPage() {
  const [spams, setSpams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSpams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/spams');
      const data = await res.json();
      if (data.success) {
        setSpams(data.spams || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpams();
  }, []);

  const handleAction = async (action, spamId) => {
    try {
      if (action === 'delete_spam') {
        await fetch(`/api/developer/spams?id=${spamId}`, {
          method: 'DELETE',
        });
      } else {
        const status = action === 'block_spam' ? 'BLOCKED' : 'RESOLVED';
        await fetch('/api/developer/spams', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spamId, status }),
        });
      }
      fetchSpams();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-rose-400">
          <Link href="/developer" className="hover:underline">← Developer Overview</Link>
          <span>/</span>
          <span>Security & Moderation</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <AlertCircleIcon className="w-6 h-6 text-rose-500" />
          <span>Spam Moderation & Threat Intel</span>
        </h1>
        <p className="text-xs text-slate-400">
          Automated heuristic detections and reported abuse on portfolio comments, reviews, and contact forms.
        </p>
      </div>

      {/* Spam List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Scanning spam logs...
          </div>
        ) : spams.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-white/10 text-slate-500 text-xs flex flex-col items-center gap-2">
            <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
            <span>Clean logs! No pending spam detections.</span>
          </div>
        ) : (
          spams.map((s) => (
            <div
              key={s.id}
              className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase">
                    {s.targetType} SPAM
                  </span>
                  <span className="text-xs font-mono text-slate-400">IP: {s.reporterIp || 'Hidden'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      s.status === 'BLOCKED'
                        ? 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
                        : s.status === 'RESOLVED'
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-950/40 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-rose-300">
                  Detection Reason: <span className="text-slate-300 font-normal">{s.reason}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 text-xs text-slate-300 font-mono">
                  {s.contentSnippet}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleAction('resolve_spam', s.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold transition-all border border-emerald-500/30"
                >
                  Dismiss / Mark Safe
                </button>
                <button
                  onClick={() => handleAction('block_spam', s.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow"
                >
                  Block Target & Blacklist IP
                </button>
                <button
                  onClick={() => handleAction('delete_spam', s.id)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition-colors"
                >
                  Purge Log
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
