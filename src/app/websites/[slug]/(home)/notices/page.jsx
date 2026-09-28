'use client';

import React, { useEffect, useState } from 'react';
import NoticeCard from '@/component/cards/NoticeCard';
import { FiBookOpen } from 'react-icons/fi';

const NoticesPage = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/notices');
        if (res.ok) {
          const data = await res.json();
          setNotices(data.paylod.notices || []);
        }
      } catch (err) {
        console.error('Failed to fetch notices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Notices &amp; Announcements
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Access the latest administrative notice boards, exams updates, schedules, and circulars directly.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs animate-pulse flex items-center justify-between gap-4">
                <div className="flex flex-col gap-2 w-2/3">
                  <div className="w-48 h-4 bg-slate-200 rounded"></div>
                  <div className="w-24 h-3 bg-slate-200 rounded"></div>
                </div>
                <div className="w-24 h-8 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : notices.length > 0 ? (
          <div className="flex flex-col gap-2">
            {notices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-md mx-auto shadow-xs mt-8">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
              <FiBookOpen />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No notices found</h3>
            <p className="text-slate-500 text-xs mt-1">
              There are currently no circulars or administrative notices published.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticesPage;
