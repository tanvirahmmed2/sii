'use client';

import React, { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import ClubNewsCard from 'src/component/website/cards/ClubNewsCard';

const ClubNewsPage = () => {
  const { clubs: contextClubs, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [clubNewsList, setClubNewsList] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const newsRes = await fetch(getApiEndpoint('club-news'));
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          const payload = newsData.paylod || newsData.payload || {};
          setClubNewsList(payload.clubNews || []);
        }

        if (contextClubs && contextClubs.length > 0) {
          setClubs(contextClubs);
        } else {
          const clubsRes = await fetch(getApiEndpoint('clubs'));
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
  }, [contextClubs, getApiEndpoint]);

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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">
              Societies Desk
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
            Club Announcements &amp; Dispatches
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Read project updates, competitions, meetings, and activity reports published by student society moderators.
          </p>
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search club articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-style w-full py-2 text-xs"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              className="input-style w-full py-2 text-xs cursor-pointer"
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
        </motion.div>

        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 animate-pulse"
                >
                  <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-2/3" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg w-full" />
                </div>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-2">
              <h3 className="font-serif text-base font-medium text-slate-800 dark:text-slate-200">No Club Dispatches Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {searchQuery || selectedClubId !== 'all'
                  ? 'No articles match the specified filters.'
                  : 'No announcements have been published by student clubs yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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