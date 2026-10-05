'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX, FiMapPin, FiClock } from 'react-icons/fi';

const AnnouncementPopup = () => {
  const [announcement, setAnnouncement] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchActiveAnnouncement = async () => {
      try {
        const response = await axios.get('/api/announcements');
        const active = response.data?.payload?.announcement || response.data?.paylod?.announcement || response.data?.announcement;
        
        if (active && (!active.expires_at || new Date(active.expires_at) > new Date())) {
          setAnnouncement(active);
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 1000);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Failed to load website announcement:', error);
      }
    };

    fetchActiveAnnouncement();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!announcement || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in transition-opacity duration-300">
      <div 
        className="relative w-full max-w-md bg-white rounded-sm p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 transform scale-100 animate-zoom-in transition-all duration-300"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-tertiary-dark hover:text-secondary hover:bg-primary-light rounded-full transition-colors cursor-pointer"
          aria-label="Close Announcement"
        >
          <FiX className="text-lg" />
        </button>


        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-tertiary tracking-tight leading-snug">
            {announcement.name}
          </h2>
          <div 
            className="text-sm leading-relaxed max-h-50 overflow-y-auto pr-1.5 prose prose-slate max-w-none text-left"
            dangerouslySetInnerHTML={{ __html: announcement.description }}
          />
        </div>

        {(announcement.location || announcement.expires_at) && (
          <div className="flex flex-col gap-1.5 border-t border-slate-50 pt-3 text-[10px] text-slate-400 font-semibold">
            {announcement.location && (
              <div className="flex items-center gap-1.5">
                <FiMapPin className="text-slate-400 shrink-0" />
                <span>Location: <strong className="text-slate-600">{announcement.location}</strong></span>
              </div>
            )}
            {announcement.expires_at && (
              <div className="flex items-center gap-1.5 text-primary">
                <span className='w-full flex flex-row gap-2'>Active until: {new Date(announcement.expires_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementPopup;
