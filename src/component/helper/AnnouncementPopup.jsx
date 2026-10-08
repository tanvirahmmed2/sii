'use client';

import React, { useState, useEffect, useContext } from 'react';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const AnnouncementPopup = () => {
  const tenantCtx = useContext(TenantWebsiteContext);
  const [announcement, setAnnouncement] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchActiveAnnouncement = async () => {
      try {
        const url = tenantCtx?.getApiEndpoint ? tenantCtx.getApiEndpoint('announcements') : '/api/announcements';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const active =
            data.payload?.announcement ||
            data.paylod?.announcement ||
            data.announcement;

          if (active && (!active.expires_at || new Date(active.expires_at) > new Date())) {
            setAnnouncement(active);
            const timer = setTimeout(() => {
              setIsOpen(true);
            }, 800);
            return () => clearTimeout(timer);
          }
        }
      } catch (error) {
        console.error('Failed to load website announcement:', error);
      }
    };

    fetchActiveAnnouncement();
  }, [tenantCtx]);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!announcement || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-5 shadow-2xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 uppercase tracking-wider">
              Announcement
            </span>
            <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
              {announcement.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close Announcement"
          >
            Dismiss
          </button>
        </div>

        <div
          className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-56 overflow-y-auto prose dark:prose-invert prose-xs max-w-none text-left"
          dangerouslySetInnerHTML={{ __html: announcement.description }}
        />

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium rounded transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
