'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiCalendar, FiUsers } from 'react-icons/fi';
import Image from 'next/image';

const ClubDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const { slug } = params;

  const [selectedClub, setSelectedClub] = useState(null);
  const [clubNews, setClubNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clubRes, newsRes] = await Promise.all([
          fetch(`/api/clubs/${slug}`),
          fetch('/api/club-news')
        ]);

        let foundClub = null;
        if (clubRes.ok) {
          const clubData = await clubRes.json();
          foundClub = clubData.paylod?.club || null;
          setSelectedClub(foundClub);
        }

        if (newsRes.ok && foundClub) {
          const newsData = await newsRes.json();
          const allNews = newsData.paylod?.clubNews || [];
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
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
          <div className="w-24 h-8 bg-slate-200 rounded-lg"></div>
          <div className="w-full h-64 bg-slate-200 rounded-2xl"></div>
          <div className="w-1/2 h-8 bg-slate-200 rounded"></div>
          <div className="w-1/3 h-4 bg-slate-200 rounded"></div>
          <div className="w-full h-24 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!selectedClub) {
    return (
      <div className="w-full min-h-screen bg-slate-50 py-16 px-4">
        <div className="max-w-7xl mx-auto text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <FiUsers className="text-3xl text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Club Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">The requested club could not be found.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium cursor-pointer"
          >
            Back to Clubs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <FiArrowLeft /> Back to Clubs
          </button>
        </div>

        <div className=" space-y-6">
          
          {selectedClub.image && (
            <div className="w-full  rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
              <Image width={1000} height={1000}
                src={selectedClub.image}
                alt={selectedClub.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {selectedClub.name}
            </h1>
            {selectedClub.motto && (
              <p className="text-sm italic text-slate-500 font-medium mt-1">
                "{selectedClub.motto}"
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-2">
            <h2 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">About Club</h2>
            {selectedClub.description ? (
              <div
                className="text-sm text-slate-700 leading-relaxed space-y-3 prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedClub.description }}
              />
            ) : (
              <p className="text-sm text-slate-500">No description available for this club.</p>
            )}
          </div>

          {selectedClub.notice_info && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Club Notice</h3>
              <div
                className="text-xs text-slate-600 leading-relaxed space-y-2 prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedClub.notice_info }}
              />
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Club News & Updates
          </h2>

          {clubNews.length > 0 ? (
            <div className="space-y-4">
              {clubNews.map((news) => (
                <Link
                  key={news.id}
                  href={`/club-news/${news.slug || news.id}`}
                  className="p-4 bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-primary-light/40 rounded-xl flex flex-col sm:flex-row gap-4 items-start transition-all group block"
                >
                  {news.image_url && (
                    <img
                      src={news.image_url}
                      alt={news.title}
                      className="w-full sm:w-32 h-24 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                  )}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <FiCalendar className="text-primary" />
                      <span>{new Date(news.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">{news.title}</h3>
                    <div
                      className="text-xs text-slate-600 leading-relaxed line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: news.content }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No news published for this club yet.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default ClubDetailsPage;
