'use client';

import React, { useEffect, useState, useContext } from 'react';
import { Context } from '@/component/helper/Context';
import ClubNewsCard from '@/component/cards/ClubNewsCard';
import { FiActivity, FiSearch, FiX, FiFilter, FiFileText } from 'react-icons/fi';

const ClubNewsPage = () => {
  const { clubs: contextClubs } = useContext(Context);

  const [clubNewsList, setClubNewsList] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const newsRes = await fetch('/api/club-news');
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          const payload = newsData.paylod || newsData.payload || {};
          setClubNewsList(payload.clubNews || []);
        }

        // Fetch clubs list if not in context
        if (contextClubs && contextClubs.length > 0) {
          setClubs(contextClubs);
        } else {
          const clubsRes = await fetch('/api/clubs');
          if (clubsRes.ok) {
            const clubsData = await clubsRes.json();
            const payload = clubsData.paylod || clubsData.payload || {};
            setClubs(payload.clubs || []);
          }
        }
      } catch (err) {
        console.error('Error fetching club news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contextClubs]);

  const filteredNews = clubNewsList.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.club_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClub =
      selectedClubId === 'all' ||
      String(item.club_id) === String(selectedClubId);

    return matchesSearch && matchesClub;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full space-y-8">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Club Announcements & News
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Stay updated with the latest events, achievements, and notices from our student clubs and societies.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search club news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <FiX className="text-xs" />
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <FiFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
            >
              <option value="all">All Clubs ({clubNewsList.length})</option>
              {clubs.map((club) => {
                const count = clubNewsList.filter(
                  (n) => String(n.club_id) === String(club.id)
                ).length;

                return (
                  <option key={club.id} value={club.id}>
                    {club.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className='w-full'>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3 animate-pulse"
                >
                  <div className="h-44 bg-slate-200 rounded-xl w-full" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto space-y-2 shadow-2xs">
              <FiFileText className="text-slate-300 text-3xl mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Club News Found</h3>
              <p className="text-xs text-slate-400">
                {searchQuery || selectedClubId !== 'all'
                  ? 'Try adjusting your search query or club filter.'
                  : 'No news or announcements have been published for clubs yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredNews.map((newsItem) => (
                <ClubNewsCard key={newsItem.id} clubNews={newsItem} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ClubNewsPage;