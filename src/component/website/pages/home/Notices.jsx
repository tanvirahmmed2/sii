'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import NoticeCard from 'src/component/website/cards/NoticeCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const Notices = () => {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch(getApiEndpoint('notices/home'));
        if (res.ok) {
          const data = await res.json();
          setNotices(data.payload?.notices || data.paylod?.notices || []);
        }
      } catch (err) {
        console.error('Error fetching home notices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, [getApiEndpoint]);

  return (
    <section className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              Official Bulletin
            </span>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Administrative Notices &amp; Circulars
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Updates released by the registrar office, exam control cell, and departments.
            </p>
          </div>

          <Link
            href={tenantUrl('/notices')}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 self-start sm:self-auto"
          >
            All Notices ({notices.length}) &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading recent notices...
          </div>
        ) : notices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No circulars or notices published at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Notices;