'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiCalendar, FiMapPin, FiClock, FiUserPlus, FiUserMinus } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

const EventDetailPage = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const slug = params?.slug;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [isStudentUser, setIsStudentUser] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          const fetchedEvent = data.paylod?.event || data.payload?.event || null;
          setEvent(fetchedEvent);

          if (fetchedEvent?.id) {
            try {
              const studentRes = await axios.get('/api/student/events');
              if (studentRes.data?.success) {
                setIsStudentUser(true);
                const joinedIds = studentRes.data.paylod?.joinedEventIds || studentRes.data.payload?.joinedEventIds || [];
                setIsJoined(joinedIds.includes(String(fetchedEvent.id)));
              }
            } catch (e) {
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
  }, [slug]);

  const handleToggleParticipation = async () => {
    if (!event?.id) return;
    setActionLoading(true);
    const action = isJoined ? 'leave' : 'join';

    try {
      const res = await axios.post('/api/student/events', {
        event_id: event.id,
        action
      });

      if (res.data?.success) {
        toast.success(res.data.paylod?.message || res.data.payload?.message || (isJoined ? 'Registration cancelled.' : 'Registration successful!'));
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
      <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-xs font-semibold">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-xs text-center space-y-4">
          <FiCalendar className="text-4xl text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
          <p className="text-slate-500 text-xs">The requested event could not be found or has been removed.</p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all"
          >
            <FiArrowLeft /> Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.event_date);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <FiArrowLeft />
            <span>Back to Events Calendar</span>
          </Link>
        </div>

        <article className="overflow-hidden w-full flex flex-col gap-4">
          {event.image && (
            <div className="w-full  bg-slate-100 overflow-hidden relative">
              <Image width={1000} height={1000}
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="w-full flex flex-col gap-4">
            <div className="space-y-4">
             

              <h1 className="text-2xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-snug">
                {event.title}
              </h1>

              <div className="flex flex-wrap gap-6 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold text-slate-700">
                <span className="flex items-center gap-2">
                  <FiCalendar className="text-primary text-base" />
                  {eventDate.toLocaleDateString('en-US', { dateStyle: 'full', timeZone: 'UTC' })}
                </span>
                <span className="flex items-center gap-2">
                  <FiClock className="text-primary text-base" />
                  {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                </span>
                <span className="flex items-center gap-2">
                  <FiMapPin className="text-primary text-base" />
                  {event.location}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-slate max-w-none text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-6">
              {event.description}
            </div>

            {/* Student Participation CTA */}
            {isStudentUser && (
              <div className="p-6 bg-primary-light/60 border border-primary-light rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {isJoined ? 'You are registered for this event!' : 'Interested in participating?'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isJoined ? 'Your registration is confirmed.' : 'Click below to register your attendance from your student account.'}
                  </p>
                </div>
                <button
                  onClick={handleToggleParticipation}
                  disabled={actionLoading}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isJoined
                      ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                      : 'bg-primary hover:bg-primary-dark text-white shadow-sm'
                  } disabled:opacity-50`}
                >
                  {actionLoading ? (
                    <span>Processing...</span>
                  ) : isJoined ? (
                    <>
                      <FiUserMinus />
                      <span>Cancel Registration</span>
                    </>
                  ) : (
                    <>
                      <FiUserPlus />
                      <span>Register Participation</span>
                    </>
                  )}
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
