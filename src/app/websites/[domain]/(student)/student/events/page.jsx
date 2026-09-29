'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiCalendar, FiMapPin, FiClock, FiCheckCircle, 
  FiUserPlus, FiUserMinus, FiImage, FiSearch
} from 'react-icons/fi';

const StudentEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [joinedEventIds, setJoinedEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/student/events');
      if (res.data?.success) {
        setEvents(res.data.paylod?.events || []);
        setJoinedEventIds(res.data.paylod?.joinedEventIds || []);
      }
    } catch (err) {
      console.error('Error fetching student events:', err);
      toast.error('Failed to load campus events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleToggleParticipation = async (eventId, isJoined) => {
    setActionLoading(eventId);
    const action = isJoined ? 'leave' : 'join';

    try {
      const res = await axios.post('/api/student/events', {
        event_id: eventId,
        action
      });

      if (res.data?.success) {
        toast.success(res.data.paylod?.message || (isJoined ? 'Event registration cancelled.' : 'Event registration successful!'));
        if (isJoined) {
          setJoinedEventIds(prev => prev.filter(id => String(id) !== String(eventId)));
        } else {
          setJoinedEventIds(prev => [...prev, String(eventId)]);
        }
      }
    } catch (err) {
      console.error('Error updating participation:', err);
      toast.error(err.response?.data?.message || 'Failed to update event participation status.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredEvents = events.filter((e) =>
    e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiCalendar /> Campus Life
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Campus Events & Seminars</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Discover upcoming institutional events, workshops, sports tournaments, and register your participation.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/70 shadow-xs">
        <FiSearch className="text-slate-400 text-base" />
        <input
          type="text"
          placeholder="Search events by title or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Events Listing */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs animate-pulse flex flex-col gap-4">
              <div className="w-full h-48 bg-slate-100 rounded-2xl"></div>
              <div className="w-3/4 h-6 bg-slate-100 rounded-lg"></div>
              <div className="w-full h-12 bg-slate-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map((item) => {
            const isJoined = joinedEventIds.includes(String(item.id));
            const eventDate = new Date(item.event_date);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl border ${
                  isJoined ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200/70'
                } shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-200 group`}
              >
                {/* Event Poster Image */}
                <div className="relative w-full h-48 sm:h-52 bg-slate-100 overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                      <FiImage className="text-4xl text-slate-300" />
                      <span className="text-xs font-medium mt-1">Campus Event</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold shadow-xs flex items-center gap-1.5 border border-white/20">
                    <FiCalendar className="text-emerald-400" />
                    <span>{eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
                  </div>

                  {isJoined && (
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-xs flex items-center gap-1">
                      <FiCheckCircle />
                      <span>Registered</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-6 flex flex-col gap-3 flex-1">
                  <h2 className="text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                    {item.title}
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-3">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-4 items-center border-t border-slate-100 pt-4 mt-auto text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <FiMapPin className="text-emerald-600 text-sm" />
                      {item.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FiClock className="text-emerald-600 text-sm" />
                      {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    {isJoined ? 'You are registered for this event' : 'Open for student registration'}
                  </span>

                  <button
                    onClick={() => handleToggleParticipation(item.id, isJoined)}
                    disabled={actionLoading === item.id}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isJoined
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    } disabled:opacity-50`}
                  >
                    {actionLoading === item.id ? (
                      <span>Processing...</span>
                    ) : isJoined ? (
                      <>
                        <FiUserMinus />
                        <span>Cancel Registration</span>
                      </>
                    ) : (
                      <>
                        <FiUserPlus />
                        <span>Register Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/70 shadow-xs">
          <FiCalendar className="text-4xl text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No Events Found</h3>
          <p className="text-slate-400 text-xs mt-1">
            There are currently no active events matching your query. Please check back later.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentEventsPage;
