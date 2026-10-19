'use client';

import React, { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { ClubCard } from 'src/component/website/cards';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const ClubsPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const res = await fetch(getApiEndpoint('home/clubs'));
        if (res.ok) {
          const data = await res.json();
          setClubs(data.payload?.clubs || data.paylod?.clubs || data.clubs || []);
        }
      } catch (err) {
        console.error('Failed to fetch clubs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 space-y-8 transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">
            Student Societies
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-white tracking-tight mt-1.5">
            Student Activity Clubs &amp; Societies
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Explore specialized student organizations fostering teamwork, innovation, and extracurricular talent.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 animate-pulse space-y-4"
              >
                <div className="w-full h-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="w-full h-10 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
            ))}
          </div>
        ) : clubs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club, idx) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(idx * 0.06, 0.4) }}
              >
                <ClubCard club={club} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-2">
            <h3 className="font-serif text-base font-medium text-slate-900 dark:text-white">
              No active clubs found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              There are currently no registered clubs in the campus directory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubsPage;
