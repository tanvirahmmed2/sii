'use client';

import { useCreator } from '../layout';

export default function CreatorUpdatesPage() {
  const { updates = [] } = useCreator();

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4">
        <h1 className="text-base font-semibold text-slate-900">Platform Updates & Changelog</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          New features, portfolio improvements, and platform announcements.
        </p>
      </div>

      {/* Updates List */}
      {updates.length === 0 ? (
        <div className="p-8 rounded bg-white border border-slate-200 text-center text-xs text-slate-400">
          No platform update entries posted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((up, idx) => (
            <div key={up.id} className="p-4 rounded bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-900">
                    Release v2.{updates.length - idx}.0
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {up.created_at ? new Date(up.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                  Update
                </span>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-900 mb-1">{up.title}</h3>
                <div
                  className="text-xs text-slate-600 leading-normal"
                  dangerouslySetInnerHTML={{ __html: up.description }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
