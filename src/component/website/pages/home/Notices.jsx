'use client';

import React, { useEffect, useState } from 'react';
import { FiInfo, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import NoticeCard from '@/component/website/cards/NoticeCard';

const Notices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/notices/home');
        if (res.ok) {
          const data = await res.json();
          setNotices(data.paylod?.notices || data.payload?.notices || []);
        }
      } catch (err) {
        console.error('Error fetching home notices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  return (
    <section className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">
            Notice Board
          </h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm">
            Stay informed with the latest updates, circulars, and notices released by the registrar office.
          </p>
        </div>

        {loading ? (
          <div className="w-full py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notices.length === 0 ? (
          <div className="w-full py-12 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center p-6">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-sm mb-3">
              <FiInfo />
            </div>
            <p className="text-slate-400 text-xs font-medium">No announcements published at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            href="/notices"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-secondary text-xs font-bold transition-all shadow-xs hover:shadow-md"
          >
            <span>View All Notices</span>
            <FiArrowRight className="text-sm" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Notices;