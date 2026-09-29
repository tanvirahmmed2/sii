'use client';

import React, { useEffect, useState } from 'react';
import { FiInfo, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import EventCard from '@/component/website/cards/EventCard';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events/home');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.paylod?.events || data.payload?.events || []);
        }
      } catch (err) {
        console.error('Error fetching home events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <section className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="w-full mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">
            Upcoming Campus Events
          </h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm">
            Join our assemblies, academic symposiums, inter-school sports matches, and cultural exhibitions.
          </p>
        </div>

        {loading ? (
          <div className="w-full py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="w-full py-12 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center p-6">
            <div className="w-10 h-10 bg-white text-slate-400 rounded-xl flex items-center justify-center text-sm mb-3 border border-slate-100">
              <FiInfo />
            </div>
            <p className="text-slate-400 text-xs font-medium">No events scheduled at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-secondary text-xs font-bold transition-all shadow-xs hover:shadow-md"
          >
            <span>View All Events</span>
            <FiArrowRight className="text-sm" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Events;