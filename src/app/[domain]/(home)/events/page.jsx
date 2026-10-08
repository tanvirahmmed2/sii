'use client';

import React, { useEffect, useState, useContext } from 'react';
import EventCard from 'src/component/website/cards/EventCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const EventsPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(getApiEndpoint('events'));
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

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors">
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
          Campus Calendar
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
          Campus Events &amp; Academic Seminars
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Stay informed on forthcoming workshops, examinations, athletic tournaments, and assemblies.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
            >
              <div className="w-full h-36 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            No events scheduled
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            There are currently no events registered on the campus calendar.
          </p>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
