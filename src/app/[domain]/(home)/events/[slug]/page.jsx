'use client';

import React, { useEffect, useState, use, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const EventDetailPage = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const slug = params?.slug;
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [isStudentUser, setIsStudentUser] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint(`events/${encodeURIComponent(slug)}`));
        if (res.ok) {
          const data = await res.json();
          const fetchedEvent = data.paylod?.event || data.payload?.event || null;
          setEvent(fetchedEvent);

          if (fetchedEvent?.id) {
            try {
              const studentRes = await axios.get(getApiEndpoint('student/events'));
              if (studentRes.data?.success) {
                setIsStudentUser(true);
                const joinedIds = studentRes.data.paylod?.joinedEventIds || studentRes.data.payload?.joinedEventIds || [];
                setIsJoined(joinedIds.includes(String(fetchedEvent.id)));
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

  const handleToggleParticipation = async () => {
    if (!event?.id) return;
    setActionLoading(true);
    const action = isJoined ? 'leave' : 'join';

    try {
      const res = await axios.post(getApiEndpoint('student/events'), {
        event_id: event.id,
        action
      });

      if (res.data?.success) {
        toast.success(res.data.paylod?.message || res.data.payload?.message || (isJoined ? 'Registration cancelled.' : 'Registration confirmed!'));
        setIsJoined(!isJoined);
      }
    } catch (err) {
      console.error('Error toggling participation:', err);
      toast.error(err.response?.data?.message || 'Failed to update event participation status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading event details...</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-6 rounded border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Event Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The requested academic event could not be found or was archived.</p>
          <Link
            href={tenantUrl('/events')}
            className="inline-block px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.event_date);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div>
          <Link
            href={tenantUrl('/events')}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to Events Calendar
          </Link>
        </div>

        <article className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {event.image && (
            <div className="w-full h-64 sm:h-80 bg-slate-100 dark:bg-slate-800 relative">
              <Image
                fill
                src={event.image}
                alt={event.title}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 inline-block">
                Campus Calendar
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {event.title}
              </h1>

              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
                <span>Date: <strong className="text-slate-900 dark:text-slate-100">{eventDate.toLocaleDateString('en-US', { dateStyle: 'full', timeZone: 'UTC' })}</strong></span>
                <span>Time: <strong className="text-slate-900 dark:text-slate-100">{eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })}</strong></span>
                {event.location && (
                  <span>Venue: <strong className="text-slate-900 dark:text-slate-100">{event.location}</strong></span>
                )}
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap border-t border-slate-100 dark:border-slate-800 pt-4">
              {event.description}
            </div>

            {/* Student Registration Box */}
            {isStudentUser && (
              <div className="p-4 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {isJoined ? 'Participant Status: Registered' : 'Student Participation'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isJoined ? 'Your seat has been reserved.' : 'Enroll your attendance from your student credentials.'}
                  </p>
                </div>
                <button
                  onClick={handleToggleParticipation}
                  disabled={actionLoading}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                    isJoined
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : 'bg-primary hover:bg-primary-dark text-white'
                  } disabled:opacity-50`}
                >
                  {actionLoading ? 'Updating...' : isJoined ? 'Cancel Attendance' : 'Register Attendance'}
                </button>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

export default EventDetailPage;
