/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiCalendar, FiMapPin, FiClock, FiCheckCircle, 
  FiUserPlus, FiUserMinus, FiImage, FiSearch, FiInfo, FiUsers, FiStar
} from 'react-icons/fi';
import Loader from 'src/component/common/Loader';

const StudentEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [joinedEventIds, setJoinedEventIds] = useState([]);
  const [interestedEventIds, setInterestedEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [interestActionLoading, setInterestActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'interested' | 'registered'

  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get('/api/student/events');
      if (res.data?.success) {
        const payload = res.data.payload || res.data.paylod || {};
        setEvents(payload.events || res.data.events || []);
        setJoinedEventIds(payload.joinedEventIds || res.data.joinedEventIds || []);
        setInterestedEventIds(payload.interestedEventIds || res.data.interestedEventIds || []);
      }
    } catch (err) {
      console.error('Error fetching student events:', err);
      toast.error('Failed to load campus events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await axios.get('/api/student/events');
        if (!ignore && res.data?.success) {
          const payload = res.data.payload || res.data.paylod || {};
          setEvents(payload.events || res.data.events || []);
          setJoinedEventIds(payload.joinedEventIds || res.data.joinedEventIds || []);
          setInterestedEventIds(payload.interestedEventIds || res.data.interestedEventIds || []);
        }
      } catch (err) {
        console.error('Error loading events:', err);
        if (!ignore) toast.error('Failed to load campus events.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Toggle Interested
  const handleToggleInterest = async (eventId, isInterested) => {
    setInterestActionLoading(eventId);
    const action = isInterested ? 'uninterest' : 'interest';

    try {
      const res = await axios.post('/api/student/events', {
        event_id: eventId,
        action,
      });

      if (res.data?.success) {
        const nextInterested = Boolean(res.data.is_interested);
        const nextCount = parseInt(res.data.interested_count, 10) || 0;
        const msg = res.data.payload?.message || res.data.paylod?.message || (nextInterested ? 'Marked as interested!' : 'Interest removed.');
        toast.success(msg);

        if (nextInterested) {
          setInterestedEventIds((prev) => [...prev, String(eventId)]);
        } else {
          setInterestedEventIds((prev) => prev.filter((id) => String(id) !== String(eventId)));
        }

        setEvents((prev) =>
          prev.map((e) =>
            String(e.id) === String(eventId)
              ? { ...e, is_interested: nextInterested, interested_count: nextCount }
              : e
          )
        );
      }
    } catch (err) {
      console.error('Error updating interest:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update event interest.');
    } finally {
      setInterestActionLoading(null);
    }
  };

  // Toggle RSVP / Registration
  const handleToggleParticipation = async (eventId, isJoined) => {
    setActionLoading(eventId);
    const action = isJoined ? 'leave' : 'join';

    try {
      const res = await axios.post('/api/student/events', {
        event_id: eventId,
        action,
      });

      if (res.data?.success) {
        const msg = res.data.payload?.message || res.data.paylod?.message || (isJoined ? 'Event registration cancelled.' : 'Event registration successful!');
        toast.success(msg);
        if (isJoined) {
          setJoinedEventIds((prev) => prev.filter((id) => String(id) !== String(eventId)));
          setEvents((prev) =>
            prev.map((e) =>
              String(e.id) === String(eventId)
                ? { ...e, is_registered: false, total_applicants: Math.max(0, (e.total_applicants || 1) - 1) }
                : e
            )
          );
        } else {
          setJoinedEventIds((prev) => [...prev, String(eventId)]);
          setEvents((prev) =>
            prev.map((e) =>
              String(e.id) === String(eventId)
                ? { ...e, is_registered: true, total_applicants: (parseInt(e.total_applicants, 10) || 0) + 1 }
                : e
            )
          );
        }
      }
    } catch (err) {
      console.error('Error updating participation:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update event registration.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredEvents = useMemo(() => {
    let list = events.filter((e) =>
      !searchTerm ||
      e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (activeTab === 'interested') {
      list = list.filter((e) => interestedEventIds.includes(String(e.id)));
    } else if (activeTab === 'registered') {
      list = list.filter((e) => joinedEventIds.includes(String(e.id)));
    }

    return list;
  }, [events, searchTerm, activeTab, interestedEventIds, joinedEventIds]);

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiCalendar /> Campus Life &amp; Student Desk
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
            Campus Events &amp; Seminars
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-normal mt-0.5">
            Discover upcoming events, click interested to follow, and register your participation if applicable.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-400 font-medium">Interested:</span>{' '}
            <span className="font-bold text-amber-500">{interestedEventIds.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-400 font-medium">Registered:</span>{' '}
            <span className="font-bold text-emerald-600">{joinedEventIds.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interested')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'interested'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <FiStar className="text-amber-400" />
            <span>Interested ({interestedEventIds.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('registered')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'registered'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <FiCheckCircle className="text-emerald-500" />
            <span>Registered ({joinedEventIds.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search events by title, venue, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Events Listing */}
      {loading ? (
        <div className="min-h-64 flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader size="md" />
          <p className="text-xs text-slate-500 mt-3 font-medium">Loading campus events...</p>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map((item) => {
            const isJoined = joinedEventIds.includes(String(item.id));
            const isInterested = interestedEventIds.includes(String(item.id));
            const eventDate = new Date(item.event_date);
            const isApplicable = Boolean(item.is_applicable);
            const interestedCount = parseInt(item.interested_count, 10) || 0;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border ${
                  isJoined
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                    : isInterested
                    ? 'border-amber-400/80 ring-2 ring-amber-500/10'
                    : 'border-slate-200/80 dark:border-slate-800'
                } shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-200 group`}
              >
                {/* Event Poster Image */}
                <div className="relative w-full h-48 sm:h-52 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                      <FiImage className="text-4xl text-slate-300 dark:text-slate-600" />
                      <span className="text-xs font-medium mt-1">Campus Event</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold shadow-xs flex items-center gap-1.5 border border-white/20">
                    <FiCalendar className="text-emerald-400" />
                    <span>
                      {eventDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {isInterested && (
                      <div className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs flex items-center gap-1">
                        <FiStar className="fill-white" />
                        <span>Interested</span>
                      </div>
                    )}

                    {isJoined && (
                      <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-xs flex items-center gap-1">
                        <FiCheckCircle />
                        <span>Registered</span>
                      </div>
                    )}

                    {!isApplicable && (
                      <div className="bg-slate-800/80 backdrop-blur-xs text-slate-200 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-white/10 flex items-center gap-1">
                        <FiInfo className="text-amber-400" />
                        <span>Info Only</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex flex-col gap-2.5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                      {item.title}
                    </h2>
                  </div>

                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed line-clamp-3">
                    {item.description || 'No description provided for this event.'}
                  </p>

                  <div className="flex flex-wrap gap-4 items-center border-t border-slate-100 dark:border-slate-800 pt-3.5 mt-auto text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <FiMapPin className="text-emerald-600 text-sm" />
                      {item.location || 'Campus Auditorium'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FiClock className="text-emerald-600 text-sm" />
                      {eventDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>

                    {/* Interested & Registered counts */}
                    <div className="flex items-center gap-3 ml-auto">
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                        <FiStar className="text-xs" />
                        <span>{interestedCount} interested</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <FiUsers className="text-xs" />
                        <span>{item.total_applicants || 0} registered</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* Interested button */}
                  <button
                    type="button"
                    onClick={() => handleToggleInterest(item.id, isInterested)}
                    disabled={interestActionLoading === item.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isInterested
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    } disabled:opacity-50`}
                  >
                    <FiStar className={`text-xs ${isInterested ? 'fill-white' : ''}`} />
                    <span>{interestActionLoading === item.id ? 'Saving...' : isInterested ? 'Interested' : 'Mark Interested'}</span>
                  </button>

                  {/* Participation button based on is_applicable */}
                  {isApplicable ? (
                    <button
                      onClick={() => handleToggleParticipation(item.id, isJoined)}
                      disabled={actionLoading === item.id}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isJoined
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900'
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
                          <span>Register Attendance</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium">
                      Information Only
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <FiCalendar className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-white text-base">No Events Found</h3>
          <p className="text-slate-400 text-xs mt-1">
            {activeTab === 'interested'
              ? 'You have not marked any events as interested yet.'
              : activeTab === 'registered'
              ? 'You have not registered for any events yet.'
              : 'There are currently no active campus events matching your query.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentEventsPage;
