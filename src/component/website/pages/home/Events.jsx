'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import EventCard from 'src/component/website/cards/EventCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const Events = () => {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(getApiEndpoint('events/home'));
        if (res.ok) {
          const data = await res.json();
          setEvents(data.payload?.events || data.paylod?.events || []);
        }
      } catch (err) {
        console.error('Error fetching home events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [getApiEndpoint]);

  return (
    <section className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              Academic Calendar
            </span>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Upcoming Campus Events
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assemblies, symposiums, athletic matches, and cultural exhibitions.
            </p>
          </div>

          <Link
            href={tenantUrl('/events')}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 self-start sm:self-auto"
          >
            All Events ({events.length}) &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading scheduled events...
          </div>
        ) : events.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No events scheduled at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Events;