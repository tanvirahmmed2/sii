'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUsers, FiArrowLeft, FiCalendar, FiMapPin, FiMail, FiUserCheck, FiSearch } from 'react-icons/fi';

const RegistrarEventParticipantsPage = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [eventRes, participantsRes] = await Promise.all([
          axios.get(`/api/events/${id}`),
          axios.get(`/api/events/${id}/participants`)
        ]);
        setEvent(eventRes.data?.paylod?.event || null);
        setParticipants(participantsRes.data?.paylod?.participants || []);
      } catch (err) {
        console.error('Error loading event participants:', err);
        toast.error('Failed to load event participants.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const filteredParticipants = participants.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/staff/registrar/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <FiArrowLeft />
            <span>Back to Events List</span>
          </Link>
        </div>

        {/* Event Header Banner */}
        {event && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-6 items-start md:items-center">
            {event.image && (
              <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-2 flex-1">
              <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full w-fit">
                Event Participants Overview
              </span>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <FiCalendar className="text-primary" />
                  {new Date(event.event_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <FiMapPin className="text-primary" />
                  {event.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <FiUsers className="text-primary" />
                  {participants.length} Registered Students
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-xs">
          <FiSearch className="text-slate-400 text-lg" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Participants Table */}
        {loading ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xs animate-pulse text-center">
            <div className="h-6 w-1/3 bg-slate-200 rounded mx-auto mb-4"></div>
            <div className="h-40 bg-slate-100 rounded-xl"></div>
          </div>
        ) : filteredParticipants.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">#</th>
                    <th className="px-6 py-3.5">Student Name</th>
                    <th className="px-6 py-3.5">Reg. Number</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Registration Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredParticipants.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-primary-light/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                        <FiUserCheck className="text-primary text-sm" />
                        <span>{p.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded-md text-[11px]">
                          {p.registration_number || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <FiMail className="text-slate-400" />
                          {p.email}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {p.joined_at ? new Date(p.joined_at).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-xs">
            <FiUsers className="text-4xl text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No Participants Registered Yet</h3>
            <p className="text-slate-500 text-xs mt-1">
              Students who register for this event from their student portal will appear in this registry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrarEventParticipantsPage;
