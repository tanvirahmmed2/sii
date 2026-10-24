/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const StudentEventsPage = () => {
  const { getApiEndpoint } = useTenantWebsite();
  const [events, setEvents] = useState([]);
  const [joinedEventIds, setJoinedEventIds] = useState([]);
  const [interestedEventIds, setInterestedEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [interestActionLoading, setInterestActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'interested' | 'registered'

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch(getApiEndpoint('student/events'));
        if (res.ok) {
          const resData = await res.json();
          if (!ignore && resData?.success) {
            const payload = resData.payload || resData.paylod || {};
            setEvents(payload.events || resData.events || []);
            setJoinedEventIds(payload.joinedEventIds || resData.joinedEventIds || []);
            setInterestedEventIds(payload.interestedEventIds || resData.interestedEventIds || []);
          }
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
  }, [getApiEndpoint]);

  // Toggle Interested
  const handleToggleInterest = async (eventId, isInterested) => {
    setInterestActionLoading(eventId);
    const action = isInterested ? 'uninterest' : 'interest';

    try {
      const res = await fetch(getApiEndpoint('student/events'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          action,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData?.success) {
        const nextInterested = Boolean(resData.is_interested);
        const nextCount = parseInt(resData.interested_count, 10) || 0;
        const msg = resData.payload?.message || resData.paylod?.message || (nextInterested ? 'Marked as interested!' : 'Interest removed.');
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
    } catch {
      toast.error('Failed to update event interest.');
    } finally {
      setInterestActionLoading(null);
    }
  };

  // Toggle RSVP / Registration
  const handleToggleParticipation = async (eventId, isJoined) => {
    setActionLoading(eventId);
    const action = isJoined ? 'leave' : 'join';

    try {
      const res = await fetch(getApiEndpoint('student/events'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          action,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData?.success) {
        const msg = resData.payload?.message || resData.paylod?.message || (isJoined ? 'Event registration cancelled.' : 'Event registration successful!');
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
    } catch {
      toast.error('Failed to update event registration.');
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block mb-1">
            Campus Life &amp; Student Desk
          </span>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Campus Events &amp; Seminars
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Discover upcoming events, click interested to follow, and register your participation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Interested:</span>{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">{interestedEventIds.length}</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Registered:</span>{' '}
            <span className="font-semibold text-primary font-mono">{joinedEventIds.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interested')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'interested'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Interested ({interestedEventIds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('registered')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'registered'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Registered ({joinedEventIds.length})
          </button>
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search by title, location, or overview..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-72 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-primary"
        />
      </div>

      {/* Events Listing */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs font-medium bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
          Loading campus events...
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((item) => {
            const isJoined = joinedEventIds.includes(String(item.id));
            const isInterested = interestedEventIds.includes(String(item.id));
            const eventDate = new Date(item.event_date);
            const isApplicable = Boolean(item.is_applicable);
            const interestedCount = parseInt(item.interested_count, 10) || 0;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-md border ${
                  isJoined
                    ? 'border-primary'
                    : isInterested
                    ? 'border-amber-400 dark:border-amber-700'
                    : 'border-slate-200 dark:border-slate-800'
                } overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors`}
              >
                {/* Event Image Banner if present */}
                {item.image && (
                  <div className="relative w-full h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-slate-900/80 text-white px-2.5 py-0.5 rounded text-[11px] font-mono shadow-xs">
                      {eventDate.toLocaleDateString('en-GB')}
                    </div>
                  </div>
                )}

                {/* Event Content Details */}
                <div className="p-4 space-y-2 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {!item.image && (
                        <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {eventDate.toLocaleDateString('en-GB')}
                        </span>
                      )}
                      {isInterested && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 uppercase">
                          Interested
                        </span>
                      )}
                      {isJoined && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase">
                          Registered
                        </span>
                      )}
                      {!isApplicable && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">
                          Notice Only
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h2>

                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed line-clamp-3">
                    {item.description || 'No description provided for this campus event.'}
                  </p>

                  <div className="flex flex-wrap gap-3 items-center border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-auto text-xs text-slate-600 dark:text-slate-400">
                    <span>Venue: <strong className="font-medium text-slate-800 dark:text-slate-200">{item.location || 'Auditorium'}</strong></span>
                    <span>•</span>
                    <span className="font-mono">
                      {eventDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>

                    <div className="flex items-center gap-2 ml-auto text-[11px] font-mono">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">{interestedCount} interested</span>
                      <span>•</span>
                      <span className="text-slate-500">{item.total_applicants || 0} registered</span>
                    </div>
                  </div>
                </div>

                {/* Actions Strip */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleInterest(item.id, isInterested)}
                    disabled={interestActionLoading === item.id}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isInterested
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    } disabled:opacity-50`}
                  >
                    {interestActionLoading === item.id ? 'Saving...' : isInterested ? 'Following Interest' : 'Mark Interested'}
                  </button>

                  {isApplicable ? (
                    <button
                      type="button"
                      onClick={() => handleToggleParticipation(item.id, isJoined)}
                      disabled={actionLoading === item.id}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        isJoined
                          ? 'border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          : 'bg-primary hover:bg-primary-dark text-white shadow-xs'
                      } disabled:opacity-50`}
                    >
                      {actionLoading === item.id ? (
                        'Processing...'
                      ) : isJoined ? (
                        'Cancel Registration'
                      ) : (
                        'Register Attendance'
                      )}
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800">
                      Open Event
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-10 text-center rounded-md border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white text-xs uppercase tracking-wider">No Events Found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
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
