'use client';

import React, { useEffect, useState } from 'react';
import EventCard from '@/component/cards/EventCard';
import { FiCalendar } from 'react-icons/fi';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.paylod?.events || data.payload?.events || []);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full mx-auto">
        <div className="text-center mb-12">
          
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Upcoming Events & Seminars
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Stay updated with the latest workshops, academic seminars, sports meets, and cultural festivals at Fontana Institute of Technology.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs animate-pulse flex flex-col gap-4">
                <div className="w-24 h-4 bg-slate-200 rounded"></div>
                <div className="w-3/4 h-6 bg-slate-200 rounded"></div>
                <div className="w-full h-12 bg-slate-200 rounded"></div>
                <div className="w-1/2 h-4 bg-slate-200 rounded mt-auto"></div>
              </div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-md mx-auto shadow-xs mt-8">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
              <FiCalendar />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No events scheduled</h3>
            <p className="text-slate-500 text-xs mt-1">
              There are currently no upcoming events listed on the institutional panel. Please check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
