'use client';

import React, { useEffect, useState, useContext } from 'react';
import AchievementCard from 'src/component/website/cards/AchievementCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const AchievementsPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await fetch(getApiEndpoint('achievements'));
        if (res.ok) {
          const data = await res.json();
          setAchievements(data.paylod?.achievements || data.payload?.achievements || []);
        }
      } catch (err) {
        console.error('Error fetching achievements:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Honors & Distinctions
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Institutional Awards & Milestones
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Celebrating academic honors, competitive wins, and community recognitions earned by our faculty and scholars.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Loading recorded milestones...
            </span>
          </div>
        ) : achievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((item, idx) => (
              <AchievementCard key={item.id || idx} achievement={item} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No Achievements Recorded Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              New institutional achievements and awards will be highlighted here once documented.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AchievementsPage;
