'use client';

import React, { useEffect, useState, useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiSearch, FiStar, FiCheckCircle } from 'react-icons/fi';
import EventCard from 'src/component/website/cards/EventCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const EventsPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'popular' | 'rsvp'

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(getApiEndpoint('home/events'));
        if (res.ok) {
          const data = await res.json();
          setEvents(data.payload?.events || data.paylod?.events || data.events || []);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
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
    let list = events.filter((e) => {
      const q = search.toLowerCase();
      return (
        !q ||
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    });

    if (filterTab === 'popular') {
      list = [...list].sort((a, b) => (b.interested_count || 0) - (a.interested_count || 0));
    } else if (filterTab === 'rsvp') {
      list = list.filter((e) => Boolean(e.is_applicable));
    }

    return list;
  }, [events, search, filterTab]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 space-y-8 transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-dark dark:text-primary-light text-[11px] font-semibold uppercase tracking-wider">
              <FiCalendar className="text-xs" />
              <span>Campus Calendar</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-white tracking-tight">
              Campus Events &amp; Academic Seminars
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl font-normal leading-relaxed">
              Stay informed on forthcoming workshops, examinations, athletic tournaments, assemblies, and student competitions.
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            Total Events: <span className="text-primary font-bold">{events.length}</span>
          </div>
        </motion.div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40'
              }`}
            >
              All Events ({events.length})
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setFilterTab('popular')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterTab === 'popular'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40'
              }`}
            >
              <FiStar className="text-secondary" />
              <span>Most Interested</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setFilterTab('rsvp')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterTab === 'rsvp'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40'
              }`}
            >
              <FiCheckCircle className="text-primary" />
              <span>RSVP Open</span>
            </motion.button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search events by title or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-style w-full pl-9 pr-4 py-2 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Listing */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
              >
                <div className="w-full aspect-[16/9] bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded-sm" />
                <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded-sm" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.4) }}
              >
                <EventCard
                  event={event}
                  onInterestChange={handleInterestChange}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <FiCalendar className="text-xl" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              No matching events found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
              {search
                ? `No events match "${search}". Try adjusting your search query or filters.`
                : 'There are currently no events registered on the campus calendar.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
