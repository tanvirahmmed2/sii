'use client';

import React, { useEffect, useState, use, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiClock, FiMapPin, FiStar, FiUsers, FiCheckCircle, FiArrowLeft, FiUserCheck, FiUserPlus, FiUserMinus } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const EventDetailPage = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const slug = params?.slug;
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [interestedCount, setInterestedCount] = useState(0);
  const [isStudentUser, setIsStudentUser] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint(`home/events/${encodeURIComponent(slug)}`));
        if (res.ok) {
          const data = await res.json();
          const fetchedEvent = data.paylod?.event || data.payload?.event || null;
          setEvent(fetchedEvent);
          if (fetchedEvent) {
            setIsInterested(Boolean(fetchedEvent.is_interested));
            setIsJoined(Boolean(fetchedEvent.is_registered));
            setInterestedCount(parseInt(fetchedEvent.interested_count, 10) || 0);

            // Also check student session to see if current user is logged in as student
            try {
              const studentRes = await axios.get(getApiEndpoint('student/events'));
              if (studentRes.data?.success) {
                setIsStudentUser(true);
                const joinedIds = studentRes.data.payload?.joinedEventIds || studentRes.data.paylod?.joinedEventIds || [];
                const interestedIds = studentRes.data.payload?.interestedEventIds || studentRes.data.paylod?.interestedEventIds || [];
                setIsJoined(joinedIds.includes(String(fetchedEvent.id)));
                setIsInterested(interestedIds.includes(String(fetchedEvent.id)));
              }
            } catch {
              setIsStudentUser(false);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug, getApiEndpoint]);

  // Toggle student interest
  const handleToggleInterest = async () => {
    if (!event?.id || interestLoading) return;
    setInterestLoading(true);

    try {
      const res = await axios.post(getApiEndpoint('home/events'), {
        event_id: event.id,
        action: isInterested ? 'uninterest' : 'interest',
      });

      if (res.data?.success) {
        const nextInterested = Boolean(res.data.is_interested);
        const nextCount = parseInt(res.data.interested_count, 10) || 0;
        setIsInterested(nextInterested);
        setInterestedCount(nextCount);
        toast.success(res.data.message || (nextInterested ? 'Marked as interested!' : 'Interest removed.'));
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.data?.requireAuth) {
        toast.error('Please sign in to your student account to mark your interest in this event.', {
          icon: '🎓',
          duration: 4000,
        });
      } else {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update interest.');
      }
    } finally {
      setInterestLoading(false);
    }
  };

  // Toggle RSVP / Registration
  const handleToggleParticipation = async () => {
    if (!event?.id) return;
    setActionLoading(true);
    const action = isJoined ? 'leave' : 'join';

    try {
      const res = await axios.post(getApiEndpoint('student/events'), {
        event_id: event.id,
        action,
      });

      if (res.data?.success) {
        toast.success(
          res.data.payload?.message || res.data.paylod?.message || (isJoined ? 'Registration cancelled.' : 'Registration confirmed!')
        );
        setIsJoined(!isJoined);
      }
    } catch (err) {
      console.error('Error toggling participation:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update event participation status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-16 px-4 flex items-center justify-center">
        <div className="loader loader-md" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-16 px-4">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <FiCalendar className="text-xl" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Event Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The requested campus event could not be found or has concluded.
          </p>
          <Link
            href={tenantUrl('/events')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <FiArrowLeft className="text-xs" />
            <span>Back to Campus Calendar</span>
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href={tenantUrl('/events')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <FiArrowLeft className="text-xs" />
            <span>Back to Campus Calendar</span>
          </Link>
        </div>

        {/* Main Card */}
        <article className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md overflow-hidden">
          {/* Header Image */}
          {event.image ? (
            <div className="w-full h-64 sm:h-96 bg-slate-100 dark:bg-slate-800 relative">
              <Image
                fill
                src={event.image}
                alt={event.title}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
                priority
              />
            </div>
          ) : (
            <div className="w-full h-44 bg-gradient-to-r from-emerald-600 to-teal-700 flex items-center justify-center text-white/90">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-3xl text-emerald-200" />
                <span className="font-bold text-lg">Campus Event</span>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-10 space-y-6">
            {/* Badges & Title */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800">
                  <FiCalendar className="text-xs" />
                  Campus Event
                </span>
                {event.is_applicable ? (
                  <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200/60 dark:border-teal-800">
                    Registration Open
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    Informational Only
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                {event.title}
              </h1>

              {/* Schedule Details Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FiCalendar className="text-sm" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Date</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{formattedDate}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FiClock className="text-sm" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Time</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{formattedTime}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FiMapPin className="text-sm" />
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Location</div>
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {event.location || 'Campus Auditorium'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interest Box */}
            <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs">
                    <FiStar className="fill-white" />
                  </span>
                  <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                    {interestedCount} {interestedCount === 1 ? 'student is' : 'students are'} interested in this event!
                  </h3>
                </div>
                <p className="text-xs text-amber-900/70 dark:text-amber-300/70">
                  {isInterested
                    ? 'You have marked interest in this event. We will keep you notified of schedule updates.'
                    : 'Are you planning to attend or follow this event? Let the organizers know by clicking interested!'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleInterest}
                disabled={interestLoading}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 ${
                  isInterested
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-white hover:bg-amber-100/60 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60 border border-amber-300/80 dark:border-amber-700'
                } disabled:opacity-50`}
              >
                <FiStar className={isInterested ? 'fill-white' : ''} />
                <span>{interestLoading ? 'Updating...' : isInterested ? '★ Interested' : 'Click if Interested'}</span>
              </button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h2 className="text-sm uppercase font-bold text-slate-400 tracking-wider">About This Event</h2>
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {event.description || 'No detailed description provided for this campus event.'}
              </div>
            </div>

            {/* Student RSVP Attendance Box */}
            {event.is_applicable && (
              <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs">
                      {isJoined ? <FiUserCheck /> : <FiUserPlus />}
                    </span>
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                      {isJoined ? 'Participant Status: Enrolled & Registered' : 'Student RSVP & Participation'}
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-900/70 dark:text-emerald-300/70">
                    {isJoined
                      ? 'Your attendance has been recorded in the institution registry.'
                      : 'Enroll and confirm your official attendance using your verified student account.'}
                  </p>
                </div>

                {isStudentUser ? (
                  <button
                    onClick={handleToggleParticipation}
                    disabled={actionLoading}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 ${
                      isJoined
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    } disabled:opacity-50`}
                  >
                    {actionLoading ? (
                      <span>Updating...</span>
                    ) : isJoined ? (
                      <>
                        <FiUserMinus />
                        <span>Cancel Attendance</span>
                      </>
                    ) : (
                      <>
                        <FiUserPlus />
                        <span>Register Attendance</span>
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href={tenantUrl('/student/login')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
                  >
                    <span>Login to Register</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

export default EventDetailPage;
