'use client';

import { useState } from 'react';
import { useCreator } from '../layout';

export default function CreatorUpdatesPage() {
  const { updates = [], refetch } = useCreator();
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = updates.filter((u: any) => !u.is_read).length;

  const handleMarkRead = async (updateId: number) => {
    setMarkingId(updateId);
    try {
      const res = await fetch('/api/marketing/creator/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', updateId }),
      });
      const data = await res.json();
      if (data.success && typeof refetch === 'function') {
        await refetch();
      }
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch('/api/marketing/creator/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      const data = await res.json();
      if (data.success && typeof refetch === 'function') {
        await refetch();
      }
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-medium text-slate-900">Platform Updates & Changelog</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            New features, platform improvements, and release announcements delivered directly to your account.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            {markingAll ? 'Updating...' : 'Mark All Read'}
          </button>
        )}
      </div>

      {updates.length === 0 ? (
        <div className="p-8 rounded bg-white border border-slate-200 text-center text-xs text-slate-400">
          No platform update entries posted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((up: any) => (
            <div
              key={up.id}
              className={`p-4 rounded bg-white border space-y-2 ${
                !up.is_read ? 'border-slate-400' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {up.version || 'Release'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {up.release_date
                      ? new Date(up.release_date).toLocaleDateString()
                      : up.created_at
                      ? new Date(up.created_at).toLocaleDateString()
                      : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!up.is_read ? (
                    <>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                        New
                      </span>
                      <button
                        type="button"
                        disabled={markingId === up.id}
                        onClick={() => handleMarkRead(up.id)}
                        className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[10px] font-medium cursor-pointer"
                      >
                        {markingId === up.id ? '...' : 'Mark Read'}
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded border bg-slate-50 text-slate-500 border-slate-200">
                      Read
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-medium text-slate-900">{up.title}</h3>
                {up.description && (
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {up.description}
                  </p>
                )}
                {up.changelog && (
                  <div className="mt-2 p-3 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {up.changelog}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
