'use client';

import {
  MoveVerticalIcon,
  PlusIcon,
  CheckCircleIcon,
  StarIcon,
} from '@/components/ui/Icons';

export default function Canvas({
  sections = [],
  activeSectionId,
  onSelectSection,
  onMoveUp,
  onMoveDown,
  onDeleteSection,
  themeConfig = {},
}) {
  const primaryColor = themeConfig.primaryColor || '#6366f1';

  return (
    <div className="space-y-6 pb-20">
      {sections.map((section, index) => {
        const isSelected = activeSectionId === section.id;
        const styles = section.styles || {};
        const content = section.contentData || {};
        const type = section.moduleType || section.sectionType || 'CUSTOM';

        return (
          <div
            key={section.id}
            onClick={() => onSelectSection(section.id)}
            className={`group relative rounded-2xl transition-all border cursor-pointer ${
              isSelected
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xl bg-slate-900/90'
                : 'border-white/10 hover:border-white/20 bg-slate-900/40 hover:bg-slate-900/60'
            }`}
            style={{
              paddingTop: styles.paddingTop || '48px',
              paddingBottom: styles.paddingBottom || '48px',
              textAlign: styles.textAlign || 'left',
            }}
          >
            {/* Drag handle / Action Bar */}
            <div className="absolute -top-3.5 left-4 z-20 flex items-center gap-1.5 bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg text-xs shadow-lg">
              <span className="font-bold text-indigo-400 text-[10px] uppercase tracking-wider">
                {type}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-medium text-[11px]">{section.title}</span>

              {/* Reorder Buttons */}
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp(index);
                  }}
                  className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move Section Up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={index === sections.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown(index);
                  }}
                  className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move Section Down"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSection(section.id);
                  }}
                  className="p-0.5 rounded text-rose-400 hover:text-rose-300 ml-1"
                  title="Delete Section"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Section Render Preview */}
            <div className="px-6 md:px-12 max-w-4xl mx-auto">
              {/* HERO */}
              {type === 'HERO' && (
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                    {content.headline || 'Hero Headline'}
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    {content.subheadline || 'Hero subheadline description...'}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <span
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {content.ctaText || 'Get Started'}
                    </span>
                  </div>
                </div>
              )}

              {/* ABOUT */}
              {type === 'ABOUT' && (
                <div className="space-y-3">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{section.title}</h2>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">{content.bio}</p>
                </div>
              )}

              {/* EXPERIENCE TIMELINE */}
              {type === 'EXPERIENCE' && (
                <div className="space-y-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    {content.heading || 'Experience Timeline'}
                  </h2>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2 text-left">
                    <div className="flex justify-between text-xs">
                      <strong className="text-white">Principal Software Architect</strong>
                      <span className="text-indigo-400 font-semibold">2023 - Present</span>
                    </div>
                    <div className="text-xs text-slate-400">CloudScale Technologies • San Francisco, CA</div>
                    <p className="text-xs text-slate-300">Leading development of distributed cloud platforms and websites.</p>
                  </div>
                </div>
              )}

              {/* BLOG */}
              {type === 'BLOG' && (
                <div className="space-y-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    {content.heading || 'Articles & Blog'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase">Case Study</div>
                      <div className="font-bold text-white text-sm">Low-Latency Canvas Engines</div>
                      <div className="text-xs text-slate-400">60fps visual mutations and state synchronization.</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                      <div className="text-[10px] text-purple-400 font-bold uppercase">Architecture</div>
                      <div className="font-bold text-white text-sm">PostgreSQL Multi-Tenancy</div>
                      <div className="text-xs text-slate-400">Strict table segregation and security row design.</div>
                    </div>
                  </div>
                </div>
              )}

              {/* APPOINTMENT */}
              {type === 'APPOINTMENT' && (
                <div className="space-y-4 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    {content.heading || 'Appointment Booking'}
                  </h2>
                  <div className="inline-block p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300">
                    Interactive booking calendar widget rendered for visitors
                  </div>
                </div>
              )}

              {/* REVIEWS */}
              {type === 'REVIEWS' && (
                <div className="space-y-4 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    {content.heading || 'Client Reviews & Ratings'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon key={i} className="w-3.5 h-3.5" filled />
                        ))}
                      </div>
                      <div className="font-bold text-white text-xs">&quot;World-class technical execution&quot;</div>
                      <div className="text-[11px] text-slate-400">— Marcus Thorne</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon key={i} className="w-3.5 h-3.5" filled />
                        ))}
                      </div>
                      <div className="font-bold text-white text-xs">&quot;Fluid appointment booking&quot;</div>
                      <div className="text-[11px] text-slate-400">— Sarah Lin</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTACT */}
              {type === 'CONTACT' && (
                <div className="space-y-2 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{section.title}</h2>
                  <div className="text-xs font-mono text-indigo-400">{content.email}</div>
                </div>
              )}

              {/* CUSTOM */}
              {type === 'CUSTOM' && (
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                  <p className="text-xs text-slate-300">{content.text || 'Custom layout section.'}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
