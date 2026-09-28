'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BiPalette,
  BiStar,
  BiLinkExternal,
  BiRightArrowAlt,
  BiLayer,
  BiGridAlt,
} from 'react-icons/bi';

export default function Themes() {
  const [themes, setThemes] = useState([]);
  const [apps, setApps] = useState([]);
  const [activeApp, setActiveApp] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/api/themes');
        const data = await res.json();
        if (data.success) {
          setThemes(data.themes || []);
          setApps(data.apps || []);
        }
      } catch (err) {
        console.error('Failed to load themes for home page:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredThemes = useMemo(() => {
    if (activeApp === 'all') return themes;
    return themes.filter((t) => String(t.app_id) === String(activeApp));
  }, [themes, activeApp]);

  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            Award-winning themes engineered for maximum conversion
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Every theme is tailored for dedicated platform applications with fluid responsiveness, accessible contrast ratios, dynamic color palettes, and Google Lighthouse 95+ performance scores.
          </p>

          {/* Category Filter Pills by Apps */}
          <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
            <button
              type="button"
              onClick={() => setActiveApp('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeApp === 'all'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BiGridAlt className="text-sm" />
              <span>All Applications</span>
              <span className="text-[10px] opacity-75">({themes.length})</span>
            </button>

            {apps.map((app) => {
              const count = themes.filter((t) => String(t.app_id) === String(app.id)).length;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setActiveApp(String(app.id))}
                  className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeApp === String(app.id)
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BiLayer className="text-sm" />
                  <span>{app.title}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-purple-600 mb-3" />
            <p className="text-sm font-semibold text-slate-500">Loading themes...</p>
          </div>
        ) : filteredThemes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3 max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 text-2xl">
              <BiPalette />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No themes available in this application
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              There are currently no design themes registered under this category.
            </p>
          </div>
        ) : (
          /* Themes Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredThemes.slice(0, 6).map((theme) => {
              const isPremium = Boolean(theme.is_premium);

              // Parse theme_config
              let config = {};
              if (typeof theme.theme_config === 'string') {
                try {
                  config = JSON.parse(theme.theme_config);
                } catch {
                  config = {};
                }
              } else if (typeof theme.theme_config === 'object' && theme.theme_config !== null) {
                config = theme.theme_config;
              }

              const primaryColor = config.primaryColor || '#6366f1';
              const bgColor = config.backgroundColor || '#090d16';
              const textColor = config.textColor || '#f8fafc';
              const font = config.fontFamily || theme.font || 'Inter';

              const colors = Array.isArray(config.colors) && config.colors.length > 0
                ? config.colors
                : [bgColor, primaryColor, textColor];

              const appName = theme.app_title || theme.category || 'General';

              return (
                <div
                  key={theme.id}
                  className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Theme Mockup Viewport */}
                  <div>
                    <div className="relative h-48 bg-slate-950 overflow-hidden flex items-center justify-center">
                      {theme.preview_image ? (
                        <Image
                          src={theme.preview_image}
                          alt={theme.name || 'Theme preview'}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className="w-full h-full p-5 flex flex-col justify-between relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${bgColor} 0%, #1e1b4b 50%, ${primaryColor} 100%)`,
                          }}
                        >
                          <div className="flex items-center justify-between z-10">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/25">
                              {appName}
                            </span>
                            {isPremium ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-semibold text-[10px] tracking-wider uppercase shadow-xs flex items-center gap-1">
                                <BiStar className="text-slate-950 fill-current" />
                                <span>PREMIUM</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white font-semibold text-[10px] uppercase">
                                INCLUDED
                              </span>
                            )}
                          </div>

                          <div className="z-10">
                            <h3 className="text-xl font-semibold text-white tracking-tight drop-shadow-xs">
                              {theme.name}
                            </h3>
                          </div>

                          {/* Decorative glow circles */}
                          <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
                        </div>
                      )}

                      {/* Floating App Badge when preview_image is shown */}
                      {theme.preview_image && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                            {appName}
                          </span>
                        </div>
                      )}

                      {theme.preview_image && (
                        <div className="absolute top-3 right-3 z-10">
                          {isPremium ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-semibold text-[10px] tracking-wider uppercase shadow-xs flex items-center gap-1">
                              <BiStar className="text-slate-950 fill-current" />
                              <span>PREMIUM</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white font-semibold text-[10px] uppercase">
                              INCLUDED
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-6 space-y-4">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {theme.name}
                        </h4>
                        {theme.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 mt-1">
                            {theme.description}
                          </p>
                        )}
                      </div>

                      {/* Swatches and Font */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
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
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {font}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-6 pt-0 flex items-center gap-2.5">
                    <Link
                      href="/themes"
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Explore</span>
                      <BiLinkExternal className="text-sm" />
                    </Link>

                    <Link
                      href="/creator/login"
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold text-center shadow-xs transition-colors"
                    >
                      Use in Studio
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Themes CTA */}
        <div className="text-center pt-4">
          <Link
            href="/themes"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-lg transition-all"
          >
            <span>Browse All Themes &amp; Templates</span>
            <BiRightArrowAlt className="text-base" />
          </Link>
        </div>
      </div>
    </section>
  );
}