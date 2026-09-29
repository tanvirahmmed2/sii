import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BiStar, BiPalette, BiLayer } from 'react-icons/bi';

export default function Theme({ theme }) {
  if (!theme) return null;

  const t = theme;
  const isPremium = Boolean(t.is_premium ?? t.isPremium);

  // Safely parse theme_config if it's a string or jsonb object
  let config = {};
  if (typeof t.theme_config === 'string') {
    try {
      config = JSON.parse(t.theme_config);
    } catch {
      config = {};
    }
  } else if (typeof t.theme_config === 'object' && t.theme_config !== null) {
    config = t.theme_config;
  }

  // Extract color palette
  const primaryColor = config.primaryColor || '#6366f1';
  const bgColor = config.backgroundColor || '#090d16';
  const textColor = config.textColor || '#f8fafc';
  const font = config.fontFamily || t.font || 'Inter';

  const colors = Array.isArray(t.colors) && t.colors.length > 0
    ? t.colors
    : Array.isArray(config.colors) && config.colors.length > 0
    ? config.colors
    : [bgColor, primaryColor, textColor];

  const appName = t.app_title || t.category || 'General';

  return (
    <div className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Preview Viewport */}
        <div className="relative aspect-16/10 overflow-hidden bg-slate-950 flex items-center justify-center">
          {t.preview_image ? (
            <Image
              src={t.preview_image}
              alt={t.name || 'Theme Preview'}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className="w-full h-full p-6 flex flex-col justify-between relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${bgColor} 0%, #1e1b4b 50%, ${primaryColor} 100%)`,
              }}
            >
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20">
                  {appName}
                </span>
              </div>
              <div className="z-10">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white mb-2">
                  <BiPalette className="text-xl" />
                </div>
                <h4 className="text-lg font-bold text-white tracking-tight">{t.name}</h4>
              </div>
              {/* Decorative circle */}
              <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/10 shadow-xs">
              <BiLayer className="text-indigo-400" />
              <span>{appName}</span>
            </span>
          </div>

          <div className="absolute top-3 right-3 z-10">
            {isPremium ? (
              <span className="px-2.5 py-1 rounded-lg bg-linear-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-xs flex items-center gap-1">
                <BiStar className="text-slate-950 fill-current" />
                PREMIUM
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-white/10 text-white font-bold text-[10px] uppercase">
                INCLUDED
              </span>
            )}
          </div>
        </div>

        {/* Theme Details */}
        <div className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {t.name}
              </h3>
              {t.slug && (
                <span className="text-[11px] font-mono text-slate-400">/{t.slug}</span>
              )}
            </div>
            {t.category && (
              <span className="shrink-0 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                {t.category}
              </span>
            )}
          </div>

          {t.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[2rem]">
              {t.description}
            </p>
          )}

          {/* Color Palette & Font */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5" title="Theme Color Palette">
              {colors.map((c, i) => (
                <span
                  key={i}
                  className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-2xs"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            {font && (
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {font}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 pt-0">
        <Link
          href="/creator/login"
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold text-center shadow-xs shadow-indigo-200 dark:shadow-none transition-all block"
        >
          Use in Studio
        </Link>
      </div>
    </div>
  );
}