'use client';

import React, { useEffect, useState } from 'react';
import AchievementCard from '@/component/cards/AchievementCard';
import { FiAward } from 'react-icons/fi';

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await fetch('/api/achievements');
        if (res.ok) {
          const data = await res.json();
          setAchievements(data.paylod.achievements || []);
        }
      } catch (err) {
        console.error('Error fetching achievements:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest border border-primary-light">
            Institutional Pride
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Awards &amp; Achievements
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            FIT strives to maintain high academic, sports, and research credentials. Explore some of our latest milestones.
          </p>
        </div>

        {/* Highlights List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : achievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {achievements.map((item, idx) => (
              <AchievementCard key={item.id || idx} achievement={item} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-md mx-auto shadow-xs mt-8">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
              <FiAward />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No achievements recorded yet</h3>
            <p className="text-slate-500 text-xs mt-1">
              Check back soon for upcoming institutional awards and milestone honors.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsPage;
