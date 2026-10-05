'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminSpamModerationPage() {
  const [spams, setSpams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSpams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/spams');
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
        await fetch(`/api/marketing/developer/spams?id=${spamId}`, {
          method: 'DELETE',
        });
      } else {
        const status = action === 'block_spam' ? 'BLOCKED' : 'RESOLVED';
        await fetch('/api/marketing/developer/spams', {
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
            Spam Moderation &amp; Threat Intel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated heuristic detections and reported abuse on portfolio comments, reviews, and contact forms.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchSpams}
          className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal transition-colors cursor-pointer self-start sm:self-auto"
        >
          Refresh Logs
        </button>
      </div>

      {/* Spam List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Scanning spam logs...
          </div>
        ) : spams.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs space-y-1">
            <div className="font-medium text-slate-800 dark:text-white">Clean logs!</div>
            <p>No pending spam detections or suspicious incident reports.</p>
          </div>
        ) : (
          spams.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-medium uppercase">
                    {s.targetType} SPAM
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">IP: {s.reporterIp || 'Hidden'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                      s.status === 'BLOCKED'
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : s.status === 'RESOLVED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-normal text-rose-600 dark:text-rose-400">
                  Detection Reason: <span className="text-slate-700 dark:text-slate-300">{s.reason}</span>
                </div>
                <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-mono break-all">
                  {s.contentSnippet}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAction('resolve_spam', s.id)}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal transition-colors cursor-pointer"
                >
                  Dismiss / Mark Safe
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('block_spam', s.id)}
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Block Target &amp; Blacklist IP
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('delete_spam', s.id)}
                  className="px-3 py-1.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs font-medium transition-colors cursor-pointer"
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
