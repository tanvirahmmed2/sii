'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
          fetch(getApiEndpoint(`home/clubs/${slug}`)),
          fetch(getApiEndpoint('home/club-news'))
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
        <div className="loader loader-md" />
      </div>
    );
  }

  if (!selectedClub) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4">
        <div className="max-w-md mx-auto text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
          <h2 className="text-base font-serif font-medium text-slate-900 dark:text-slate-100">Club Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-light">The requested club could not be loaded or does not exist.</p>
          <button
            onClick={() => router.push(tenantUrl('/clubs'))}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-dark transition-all shadow-xs cursor-pointer"
          >
            &larr; Back to Clubs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => router.push(tenantUrl('/clubs'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary hover:border-primary/40 transition-colors shadow-xs cursor-pointer"
          >
            &larr; Back to Student Clubs
          </button>
        </motion.div>

        {/* Club Profile */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-xs space-y-6"
        >
          {selectedClub.image && (
            <div className="w-full h-56 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
              <Image
                src={selectedClub.image}
                alt={selectedClub.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-primary-dark dark:text-primary-light uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
              Student Society
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
              {selectedClub.name}
            </h1>
            {selectedClub.motto && (
              <p className="text-sm text-primary dark:text-primary-light font-medium italic mt-1">
                &ldquo;{selectedClub.motto}&rdquo;
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 space-y-2">
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
            <div className="p-5 rounded-2xl bg-secondary/5 dark:bg-secondary/10 border border-secondary/20 space-y-1.5">
              <span className="text-[10px] font-semibold text-secondary-dark dark:text-secondary-light uppercase tracking-wider block">
                Official Society Notice
              </span>
              <div
                className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedClub.notice_info }}
              />
            </div>
          )}
        </motion.div>

        {/* Club News & Updates */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-5"
        >
          <h2 className="font-serif text-lg font-medium text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            Society Announcements &amp; Dispatches
          </h2>

          {clubNews.length > 0 ? (
            <div className="space-y-4">
              {clubNews.map((news) => (
                <Link
                  key={news.id}
                  href={tenantUrl(`/club-news/${news.slug || news.id}`)}
                  className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col sm:flex-row gap-4 items-start hover:border-primary/40 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 block group"
                >
                  {news.image_url && (
                    <div className="w-full sm:w-32 h-24 rounded-xl overflow-hidden relative shrink-0">
                      <Image fill src={news.image_url} alt={news.title} className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="128px" />
                    </div>
                  )}
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {new Date(news.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
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
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
              No recent dispatches published for this club.
            </p>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default ClubDetailsPage;
