'use client';

import { useState, useEffect, use } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import {
  BiArrowBack,
  BiCheckCircle,
  BiGridAlt,
  BiImage,
  BiRocket,
  BiRightArrowAlt,
  BiLayer,
  BiPalette,
  BiPackage,
  BiStar,
} from 'react-icons/bi';

export default function SingleAppPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams?.slug;

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!slug) return;

    const fetchAppDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/apps?slug=${encodeURIComponent(slug)}`);
        if (res.data?.success && res.data?.app) {
          setApp(res.data.app);
        } else {
          setError(res.data?.error || 'Application not found.');
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load application.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppDetail();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center mx-auto animate-spin text-2xl">
            <BiRocket />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading application details...</p>
        </div>
      </main>
    );
  }

  if (error || !app) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center mx-auto text-2xl">
            <BiGridAlt />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Application Unavailable</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || 'The requested application could not be found or has not been published.'}
          </p>
          <Link
            href="/apps"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiArrowBack /> Back to Apps Directory
          </Link>
        </div>
      </main>
    );
  }

  const images = Array.isArray(app.images) ? app.images : [];
  const currentImgObj = images[activeImageIndex] || images[0] || null;
  const activeImage = currentImgObj?.image || currentImgObj?.url || null;
  const modules = Array.isArray(app.modules) ? app.modules : [];
  const themes = Array.isArray(app.themes) ? app.themes : [];
  const packages = Array.isArray(app.packages) ? app.packages : [];

  return (
    <main className="min-h-screen bg-slate-50/70 dark:bg-slate-950/70 ">
      <div className="w-full space-y-10">


        {app.short_description && (
          <section className="bg-primary-light dark:bg-primary-dark border border-primary/20 dark:border-primary-dark/30 p-6 sm:p-8 shadow-xs space-y-3">

            <p className="text-lg text-center sm:text-2xl font-semibold py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-slate-900 dark:text-dark leading-relaxed tracking-tight">
              {app.short_description}
            </p>
          </section>
        )}

        <div className='w-full py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-10'>
          <section className="bg-white dark:bg-slate-900">
            <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/40 dark:border-slate-800 flex items-center justify-center">
              {activeImage ? (
                <Image
                  src={activeImage}
                  alt={app.title || 'App Image'}
                  fill
                  priority
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover"
                />
              ) : (
                <div className="text-slate-400 dark:text-slate-500 text-sm flex items-center gap-2">
                  <BiImage className="text-2xl" /> Visual Preview Unavailable
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto py-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${idx === activeImageIndex
                        ? 'border-secondary shadow-md scale-105'
                        : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    aria-label={`Show image ${idx + 1}`}
                  >
                    <Image
                      src={img.image || img.url}
                      alt={img.title || app.title || 'Thumbnail'}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 3. THEN: TITLE */}
          <section className="">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {app.title}
                </h1>
                
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href={`/packages?app=${app.slug}`}
                  className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Deploy Now</span>
                  <BiRightArrowAlt className="text-base" />
                </Link>
              </div>
            </div>
          </section>

          <section className="">
           

            {app.description ? (
              <div
                className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_blockquote]:border-l-4 [&_blockquote]:border-secondary [&_blockquote]:pl-4 [&_blockquote]:italic [&_p]:mb-4"
                dangerouslySetInnerHTML={{ __html: app.description }}
              />
            ) : (
              <p className="text-xs text-slate-500 italic">No detailed description provided for this application.</p>
            )}
          </section>

          {/* 5. THEN: MODULES */}
          <section className=" space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <BiLayer className="text-secondary text-2xl" />
                  <span>Integrated Website Modules</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Functional components and native modules connected directly to {app.title}.
                </p>
              </div>
            </div>

            {modules.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 hover:border-secondary/40 transition-all shadow-xs flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-semibold text-base">
                          <BiCheckCircle />
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-secondary transition-colors">
                        {mod.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                        {mod.description || 'Full functional module bundled into this application.'}
                      </p>
                    </div>
                    
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center text-xs text-slate-500">
                No specific modules currently linked to this application.
              </div>
            )}
          </section>

          {/* 6. THEN: LINK TO GO TO THEME AND PACKAGES */}
          <section className="space-y-6 pt-2">
            <div className="pb-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                Themes &amp; Packages for {app.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Select design templates and subscription tiers configured for this application.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Go to Themes Card */}
              <div className="bg-linear-to-br from-primary/10 via-white dark:via-slate-900 to-primary-dark/10 border border-primary/20 dark:border-primary/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-xs hover:shadow-lg transition-all group">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary-dark dark:text-primary-light border border-primary/20 flex items-center justify-center text-2xl font-semibold">
                    <BiPalette />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                      Explore Themes
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Browse responsive, conversion-tested themes built specifically to showcase {app.title} with fluid animations and custom styling.
                    </p>
                  </div>

                  {themes.length > 0 ? (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary-dark dark:text-primary-light border border-primary/20">
                        {themes.length} Theme{themes.length !== 1 ? 's' : ''} available
                      </span>
                      {themes.slice(0, 3).map((t) => (
                        <span key={t.id} className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {t.name || t.title}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Discover compatible themes across all catalog categories.
                    </p>
                  )}
                </div>

                <Link
                  href={`/themes?app=${app.slug}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-slate-950 dark:text-white font-semibold text-xs sm:text-sm shadow-md transition-all group-hover:gap-3 cursor-pointer"
                >
                  <span>Go to Themes</span>
                  <BiRightArrowAlt className="text-lg" />
                </Link>
              </div>

              {/* Go to Packages Card */}
              <div className="bg-linear-to-br from-secondary/10 via-white dark:via-slate-900 to-secondary-dark/10 border border-secondary/20 dark:border-secondary/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-xs hover:shadow-lg transition-all group">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center text-2xl font-semibold">
                    <BiPackage />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                      Subscription Packages
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Deploy {app.title} with automated database provisioning, live editor studio, custom domain linking, and hosting.
                    </p>
                  </div>

                  {packages.length > 0 ? (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                        {packages.length} Plan{packages.length !== 1 ? 's' : ''} available
                      </span>
                      {packages.slice(0, 2).map((p) => (
                        <span key={p.id} className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {p.name}: ${Math.round(Number(p.price_in_cents || 0) / 100)}/mo
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Explore available monthly and annual subscription plans.
                    </p>
                  )}
                </div>

                <Link
                  href={`/packages?app=${app.slug}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-semibold text-xs sm:text-sm shadow-md transition-all group-hover:gap-3 cursor-pointer"
                >
                  <span>Go to Packages</span>
                  <BiRightArrowAlt className="text-lg" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
