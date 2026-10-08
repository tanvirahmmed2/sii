'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

function extractYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function TutorialsPage() {
  const { website, tenantUrl } = useTenantWebsite();
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);

  const fetchPublishedTutorials = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/marketing/tutorials');
      const data = await res.json();
      if (data?.success && Array.isArray(data?.tutorials)) {
        setTutorials(data.tutorials);
      } else {
        setError(data?.error || 'Failed to load video guides.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching tutorials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishedTutorials();
  }, []);

  const filteredTutorials = tutorials.filter((tut) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (tut.title || '').toLowerCase().includes(q) ||
      (tut.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full min-h-screen py-8 md:py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 max-w-4xl mx-auto text-center space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
          Digital Campus Academy
        </span>
        <h1 className="text-2xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Video Tutorials &amp; System Guides
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Step-by-step video walkthroughs on navigating student portals, submitting assignments, accessing fees ledger, and using {website?.name || 'institution'} digital services.
        </p>

        {/* Search Bar */}
        <div className="pt-4 max-w-md mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search tutorials by topic or module..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Video Masterclasses &amp; Guides
            </h2>
            <p className="text-xs text-slate-400">
              Showing {filteredTutorials.length} published guide{filteredTutorials.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPublishedTutorials}
            disabled={loading}
            className="self-start sm:self-auto px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchPublishedTutorials}
              className="underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-3 animate-pulse"
              >
                <div className="aspect-16/10 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredTutorials.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center max-w-md mx-auto space-y-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              [No Video Guides]
            </span>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
              {search ? 'No Matching Tutorials' : 'No Published Guides Available'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {search
                ? `No videos matched "${search}". Try searching a different term.`
                : 'Educational video walkthroughs will appear here once published.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between space-y-3 cursor-pointer"
                  onClick={() => setActiveVideo(tut)}
                >
                  <div className="space-y-3">
                    <div className="relative aspect-16/10 rounded overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt={tut.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs text-slate-400 font-medium">
                          [Video Tutorial]
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded text-[11px] font-semibold tracking-wider">
                          Watch Video →
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                        Institutional Walkthrough
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                        {tut.title}
                      </h3>
                      {tut.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {tut.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{website?.name || 'Campus IT'}</span>
                    {formattedDate && <span>{formattedDate}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Video Modal Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                {activeVideo.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="relative aspect-video w-full rounded overflow-hidden bg-black">
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
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  Video stream could not be loaded.
                </div>
              )}
            </div>

            {activeVideo.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                {activeVideo.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Campus Portal Quicklinks Callout */}
      <div className="max-w-6xl mx-auto bg-slate-900 text-white rounded-md p-6 sm:p-8 border border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Digital Portal Access
          </span>
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Ready to Access Your Portal?
          </h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Students, faculty, and administrative staff can login directly to view class routines, exam schedules, and attendance records.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <Link
            href={tenantUrl('/auth/student/login')}
            className="inline-block px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded text-xs font-semibold transition-colors"
          >
            Student Login →
          </Link>
          <Link
            href={tenantUrl('/auth/access')}
            className="inline-block px-4 py-2 border border-slate-700 text-white hover:bg-slate-800 rounded text-xs font-semibold transition-colors"
          >
            Staff &amp; Faculty Desk →
          </Link>
        </div>
      </div>
    </div>
  );
}
