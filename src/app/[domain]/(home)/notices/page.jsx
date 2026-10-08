'use client';

import React, { useEffect, useState, useContext } from 'react';
import NoticeCard from 'src/component/website/cards/NoticeCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const NoticesPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch(getApiEndpoint('notices'));
        if (res.ok) {
          const data = await res.json();
          setNotices(data.payload?.notices || data.paylod?.notices || data.notices || []);
        }
      } catch (err) {
        console.error('Failed to fetch notices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors">
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
          Registry Bulletin
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
          Official Notices &amp; Announcements
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Access the latest circulars, examination routines, schedules, and administrative directives.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 animate-pulse flex items-center justify-between"
            >
              <div className="space-y-2 w-2/3">
                <div className="w-48 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-24 h-2.5 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="w-20 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : notices.length > 0 ? (
        <div className="space-y-2.5">
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            No notices published
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            There are currently no active administrative notices on the bulletin.
          </p>
        </div>
      )}
    </div>
  );
};

export default NoticesPage;
