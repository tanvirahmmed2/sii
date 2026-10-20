'use client';

import React, { useEffect, useState, useContext, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCalendar, FiArrowRight, FiStar, FiCheckCircle } from 'react-icons/fi';
import EventCard from 'src/component/website/cards/EventCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const Events = () => {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'popular' | 'rsvp'

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(getApiEndpoint('events?home=true&limit=6'));
        if (res.ok) {
          const data = await res.json();
          setEvents(data.payload?.events || data.paylod?.events || data.events || []);
        }
      } catch (err) {
        console.error('Error fetching home events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [getApiEndpoint]);

  const handleInterestChange = (eventId, nextInterested, nextCount) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, is_interested: nextInterested, interested_count: nextCount }
          : e
      )
    );
  };

  const filteredEvents = useMemo(() => {
    if (!events.length) return [];
    const list = [...events];

    if (activeTab === 'popular') {
      return list.sort((a, b) => (b.interested_count || 0) - (a.interested_count || 0)).slice(0, 3);
    }

    if (activeTab === 'rsvp') {
      const applicable = list.filter((e) => Boolean(e.is_applicable));
      return (applicable.length > 0 ? applicable : list).slice(0, 3);
    }

    // Default 'upcoming': first 3
    return list.slice(0, 3);
  }, [events, activeTab]);

  return (
    <section className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        {/* Header Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/90 dark:border-slate-800 pb-5"
        >
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-wider">
              <FiCalendar className="text-xs" />
              <span>Campus Life &amp; Events</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Upcoming Campus Events
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl font-normal">
              Assemblies, cultural symposiums, sports leagues, and seminars. Students can explore details and mark their interest.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-end">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={tenantUrl('/events')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary transition-all shadow-xs"
              >
                <span>Explore All Events</span>
                {events.length > 0 && <span className="opacity-70 font-mono">({events.length})</span>}
                <FiArrowRight className="text-xs" />
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Filter Pills */}
        {events.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              Upcoming
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveTab('popular')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'popular'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              <FiStar className="text-xs text-secondary" />
              <span>Most Interested</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveTab('rsvp')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'rsvp'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              <FiCheckCircle className="text-xs text-primary" />
              <span>Open for RSVP</span>
            </motion.button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-4 animate-pulse"
              >
                <div className="w-full aspect-[16/9] bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="w-1/3 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-full h-8 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <FiCalendar className="text-xl" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
              No campus events scheduled currently
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              The academic calendar is currently being updated. Please check back shortly or explore past announcements.
            </p>
          </div>
        ) : (
          /* Events Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: Math.min(index * 0.1, 0.4) }}
              >
                <EventCard
                  event={event}
                  onInterestChange={handleInterestChange}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Events;