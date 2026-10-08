'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const ClubDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const { slug } = params;
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  const [selectedClub, setSelectedClub] = useState(null);
  const [clubNews, setClubNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clubRes, newsRes] = await Promise.all([
          fetch(getApiEndpoint(`clubs/${slug}`)),
          fetch(getApiEndpoint('club-news'))
        ]);

        let foundClub = null;
        if (clubRes.ok) {
          const clubData = await clubRes.json();
          foundClub = clubData.paylod?.club || clubData.payload?.club || null;
          setSelectedClub(foundClub);
        }

        if (newsRes.ok && foundClub) {
          const newsData = await newsRes.json();
          const allNews = newsData.paylod?.clubNews || newsData.payload?.clubNews || [];
          const filtered = allNews.filter(n => String(n.club_id) === String(foundClub.id));
          setClubNews(filtered);
        }
      } catch (err) {
        console.error('Error fetching club details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug, getApiEndpoint]);

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading club details...</span>
      </div>
    );
  }

  if (!selectedClub) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4">
        <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Club Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The requested club could not be loaded or does not exist.</p>
          <button
            onClick={() => router.push(tenantUrl('/clubs'))}
            className="px-3.5 py-1.5 bg-primary text-white rounded text-xs font-medium cursor-pointer"
          >
            ← Back to Clubs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div>
          <button
            onClick={() => router.push(tenantUrl('/clubs'))}
            className="text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            ← Back to Student Clubs
          </button>
        </div>

        {/* Club Profile */}
        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          {selectedClub.image && (
            <div className="w-full h-56 sm:h-72 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
              <Image
                src={selectedClub.image}
                alt={selectedClub.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 inline-block">
              Student Society
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {selectedClub.name}
            </h1>
            {selectedClub.motto && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                &ldquo;{selectedClub.motto}&rdquo;
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
            <h2 className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              About This Society
            </h2>
            {selectedClub.description ? (
              <div
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedClub.description }}
              />
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">No profile description provided for this club.</p>
            )}
          </div>

          {selectedClub.notice_info && (
            <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Official Society Notice
              </span>
              <div
                className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedClub.notice_info }}
              />
            </div>
          )}
        </div>

        {/* Club News & Updates */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            Society Announcements & Dispatches
          </h2>

          {clubNews.length > 0 ? (
            <div className="space-y-3">
              {clubNews.map((news) => (
                <Link
                  key={news.id}
                  href={tenantUrl(`/club-news/${news.slug || news.id}`)}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded flex flex-col sm:flex-row gap-3 items-start hover:border-primary transition-colors block"
                >
                  {news.image_url && (
                    <div className="w-full sm:w-28 h-20 rounded overflow-hidden relative shrink-0">
                      <Image fill src={news.image_url} alt={news.title} className="object-cover" sizes="112px" />
                    </div>
                  )}
                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {new Date(news.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
                      {news.title}
                    </h3>
                    <div
                      className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: news.content }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
              No recent dispatches published for this club.
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default ClubDetailsPage;
