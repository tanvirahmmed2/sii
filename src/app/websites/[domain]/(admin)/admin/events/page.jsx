'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiPlus, FiCalendar, FiMapPin, FiImage, FiEdit3, 
  FiTrash2, FiUsers, FiClock, FiSearch, FiEye
} from 'react-icons/fi';
import Image from 'next/image';

const AdminEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/events');
      setEvents(res.data?.paylod?.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await axios.delete(`/api/events/${id}`);
      toast.success('Event deleted successfully.');
      fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error('Failed to delete event.');
    }
  };

  const filteredEvents = events.filter((e) =>
    e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen  p-4 md:p-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
              Events & Seminars
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">
              Manage institutional events, create new entries, update details, or view student registrations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/events/participants"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <FiUsers className="text-base" />
              <span>All Participants</span>
            </Link>
            <Link
              href="/admin/events/new"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <FiPlus className="text-base" />
              <span>Create Event</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-xs">
          <FiSearch className="text-slate-400 text-lg" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs animate-pulse flex flex-col gap-4">
                <div className="w-full h-40 bg-slate-200 rounded-xl"></div>
                <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
                <div className="w-full h-12 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredEvents.map((item) => {
              const d = new Date(item.event_date);
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between hover:border-emerald-200/60 transition-all group">
                  
                  <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                    {item.image ? (
                      <Image width={500} height={500}
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <FiImage className="text-4xl" />
                        <span className="text-xs font-semibold mt-1">No Image Poster</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5">
                      <FiCalendar />
                      <span>{d.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap gap-3 items-center text-xs font-semibold text-slate-500 mt-auto pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <FiMapPin className="text-primary" />
                        {item.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiClock className="text-primary" />
                        {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                      </span>
                    </div>
                  </div>

                  {/* Card Action Buttons: Update, Delete, View */}
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/events/participants?eventId=${item.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-50 text-primary text-xs font-bold rounded-lg transition-colors"
                    >
                      <FiEye />
                      <span>View</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/events/edit/${item.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        <FiEdit3 />
                        <span>Update</span>
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <FiTrash2 />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-xs">
            <FiCalendar className="text-4xl text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No Events Found</h3>
            <p className="text-slate-500 text-xs mt-1 mb-4">
              There are currently no events listed.
            </p>
            <Link
              href="/admin/events/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              <FiPlus />
              <span>Create New Event</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEventsPage;
