'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BiSearch,
  BiVideo,
  BiRefresh,
  BiRightArrowAlt,
  BiPlayCircle,
  BiCalendar,
  BiUser,
  BiX,
  BiLinkExternal,
} from 'react-icons/bi';

function extractYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);

  const fetchPublishedTutorials = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tutorials');
      const data = await res.json();
      if (data?.success && Array.isArray(data?.tutorials)) {
        setTutorials(data.tutorials);
      } else {
        setError(data?.error || 'Failed to load video tutorials.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching tutorials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/tutorials')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.success && Array.isArray(data?.tutorials)) {
          setTutorials(data.tutorials);
        } else {
          setError(data?.error || 'Failed to load video tutorials.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Error fetching tutorials.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTutorials = tutorials.filter((tut) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (tut.title || '').toLowerCase().includes(q) ||
      (tut.description || '').toLowerCase().includes(q) ||
      (tut.author_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50/60 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary text-white pt-20 pb-20 px-4 lg:px-8 border-b border-white/10">
        <div className="absolute inset-0 bg-linear-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-4">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
            Learn How to Build, Customize &amp; Scale
          </h1>

          <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Step-by-step masterclasses covering visual portfolio building, custom domain routing, e-commerce storefronts, and team workflows.
          </p>

          {/* Search Bar */}
          <div className="pt-6 max-w-xl mx-auto">
            <div className="relative">
              <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" />
              <input
                type="text"
                placeholder="Search tutorials by topic, feature, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:bg-white/15 transition-all shadow-lg backdrop-blur-md"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold hover:text-white px-2 py-1 rounded-md bg-white/10 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Tutorials Directory Section */}
      <section className="w-full px-4 lg:px-8 pt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BiVideo className="text-primary text-2xl" /> Video Masterclasses
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredTutorials.length} published guide{filteredTutorials.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPublishedTutorials}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiRefresh className={`text-sm ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchPublishedTutorials}
              className="text-rose-600 hover:underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-pulse space-y-4"
              >
                <div className="aspect-16/10 bg-slate-100 rounded-2xl" />
                <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-slate-100 rounded-md w-full" />
                  <div className="h-3 bg-slate-100 rounded-md w-5/6" />
                </div>
                <div className="h-4 bg-slate-100 rounded-md w-1/3 pt-2" />
              </div>
            ))}
          </div>
        ) : filteredTutorials.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center my-8 shadow-xs max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto mb-4">
              <BiVideo />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {search ? 'No Matching Tutorials' : 'No Video Guides Found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? `No video tutorials matched "${search}". Try checking for typos or searching a different keyword.`
                : 'New step-by-step masterclasses are being recorded and will appear here shortly.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          /* Tutorials Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
            {filteredTutorials.map((tut) => {
              const videoId = extractYoutubeId(tut.youtube_link);
              const thumbUrl = videoId
                ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                : null;
              const formattedDate = tut.created_at
                ? new Date(tut.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;

              return (
                <div
                  key={tut.id}
                  className="group rounded-3xl bg-white border border-slate-200/80 hover:border-secondary/40 transition-all duration-300 shadow-xs hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between overflow-hidden cursor-pointer"
                  onClick={() => setActiveVideo(tut)}
                >
                  <div>
                    {/* Thumbnail / Video Preview Area */}
                    <div className="relative aspect-16/10 overflow-hidden bg-slate-900 flex items-center justify-center">
                      {thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={tut.title || 'Tutorial cover'}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                          <BiVideo className="text-4xl text-slate-500 mb-2" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Video Guide
                          </span>
                        </div>
                      )}

                      {/* Video Play Overlay */}
                      <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/90 group-hover:bg-white text-secondary flex items-center justify-center text-2xl shadow-xl group-hover:scale-110 transition-transform">
                          <BiPlayCircle />
                        </div>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-6 space-y-3">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-secondary transition-colors tracking-tight line-clamp-2">
                        {tut.title}
                      </h3>

                      {tut.description && (
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {tut.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata Footer */}
                  <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 truncate">
                      <BiUser className="text-secondary shrink-0" />
                      <span className="truncate">{tut.author_name || 'Platform Team'}</span>
                    </span>
                    {formattedDate && (
                      <span className="flex items-center gap-1 shrink-0">
                        <BiCalendar /> {formattedDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Video Modal Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/10">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {activeVideo.title}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                {activeVideo.youtube_link && (
                  <a
                    href={activeVideo.youtube_link}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:text-white hover:bg-white/20 text-sm transition-colors"
                    title="Open on YouTube"
                  >
                    <BiLinkExternal />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:text-white hover:bg-white/20 text-lg transition-colors cursor-pointer"
                  title="Close player"
                >
                  <BiX />
                </button>
              </div>
            </div>

            {/* Video Iframe Container */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
              {extractYoutubeId(activeVideo.youtube_link) ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${extractYoutubeId(
                    activeVideo.youtube_link
                  )}?autoplay=1&rel=0`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <BiPlayCircle className="text-5xl" />
                  <p className="text-sm">Video link could not be loaded</p>
                </div>
              )}
            </div>

            {activeVideo.description && (
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl pt-1">
                {activeVideo.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Creator Call To Action */}
      <section className="w-full px-4 lg:px-8 mt-20">
        <div className="bg-linear-to-r from-slate-900 to-slate-950 rounded-3xl p-8 sm:p-12 text-white border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h3 className="text-2xl font-semibold tracking-tight">
              Ready to master your creator presence?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Create your account in seconds, connect your custom domain, and launch a complete online presence with step-by-step guidance.
            </p>
          </div>
          <Link
            href="/creator/login"
            className="px-6 py-3.5 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-semibold text-sm shadow-xl flex items-center gap-2 shrink-0 transition-all hover:scale-105 cursor-pointer"
          >
            <span>Get Started Now</span>
            <BiRightArrowAlt className="text-lg" />
          </Link>
        </div>
      </section>
    </main>
  );
}
