'use client';

import { useCreator } from '../layout';
import {
  BiBell,
  BiRocket,
  BiCalendar,
  BiCheckCircle,
} from 'react-icons/bi';

export default function CreatorUpdatesPage() {
  const { updates = [] } = useCreator();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Changelog</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Updates
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Discover the latest features, portfolio theme releases, visual editor speed improvements, and edge hosting updates.
          </p>
        </div>
      </div>

      {/* Updates Timeline */}
      {updates.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-400 shadow-xs">
          No platform changelog entries posted yet. Check back soon!
        </div>
      ) : (
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 before:z-0">
          {updates.map((up, idx) => (
            <div key={up.id} className="relative z-10 pl-10 space-y-2 group">
              {/* Dot indicator */}
              <div className="absolute left-2 top-2 w-3.5 h-3.5 rounded-full bg-white border-3 border-slate-900 group-hover:scale-125 transition-transform" />

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Release Note
                    </span>
                    <span className="font-mono text-xs text-slate-500 flex items-center gap-1">
                      <BiCalendar className="text-slate-400" />
                      {new Date(up.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-700 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    v2.{updates.length - idx}.0
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">{up.title}</h3>
                  <div
                    className="text-xs text-slate-600 leading-relaxed space-y-2"
                    dangerouslySetInnerHTML={{ __html: up.description }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
