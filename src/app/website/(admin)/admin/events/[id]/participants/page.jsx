'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUsers, FiArrowLeft, FiCalendar, FiMapPin, FiMail, FiUserCheck, FiSearch, FiDownload, FiHash, FiBookOpen } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Image from 'next/image';

const AdminEventParticipantsPage = () => {
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
        setEvent(eventRes.data?.paylod?.event || eventRes.data?.payload?.event || null);
        setParticipants(participantsRes.data?.paylod?.participants || participantsRes.data?.payload?.participants || []);
      } catch (err) {
        console.error('Error loading event participants:', err);
        toast.error('Failed to load event participants.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const filteredParticipants = participants.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.registration_number?.toLowerCase().includes(term) ||
      p.class_name?.toLowerCase().includes(term) ||
      p.section_name?.toLowerCase().includes(term) ||
      String(p.roll || '').toLowerCase().includes(term)
    );
  });

  const handleDownloadXLSX = () => {
    if (!filteredParticipants || filteredParticipants.length === 0) {
      toast.error('No participants to download.');
      return;
    }

    const sheetData = [
      ['#', 'Student Name', 'Class', 'Section', 'Roll No.', 'Registration No.', 'Email', 'Registration Time'],
      ...filteredParticipants.map((p, idx) => [
        idx + 1,
        p.name || '',
        p.class_name || 'N/A',
        p.section_name || 'N/A',
        p.roll !== null && p.roll !== undefined ? p.roll : 'N/A',
        p.registration_number || 'N/A',
        p.email || '',
        p.joined_at ? new Date(p.joined_at).toLocaleString() : 'N/A'
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');

    const eventTitle = event?.title || 'Event';
    const cleanTitle = eventTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const fileName = `${cleanTitle}_Participants.xlsx`;

    XLSX.writeFile(wb, fileName);
    toast.success('Downloaded participants list as .xlsx');
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <FiArrowLeft />
            <span>Back to Events List</span>
          </Link>
        </div>

        {event && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-6 items-start md:items-center">
            {event.image && (
              <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                <Image width={500} height={500} src={event.image} alt={event.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-2 flex-1">
              <span className="text-xs font-bold text-primary bg-emerald-50 px-3 py-1 rounded-full w-fit">
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

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-xs w-full">
            <FiSearch className="text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Search by student name, class, roll, reg number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <button
            onClick={handleDownloadXLSX}
            disabled={filteredParticipants.length === 0}
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-xs transition-colors shrink-0 cursor-pointer w-full sm:w-auto justify-center"
          >
            <FiDownload className="text-sm" />
            <span>Download List (.xlsx)</span>
          </button>
        </div>

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
                    <th className="px-6 py-3.5">Class</th>
                    <th className="px-6 py-3.5">Roll No.</th>
                    <th className="px-6 py-3.5">Reg. Number</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Registration Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredParticipants.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                        <FiUserCheck className="text-primary text-sm" />
                        <span>{p.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                          <FiBookOpen className="text-primary text-xs" />
                          {p.class_name || 'N/A'} {p.section_name ? `(${p.section_name})` : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 font-bold text-primary bg-emerald-50/60 px-2.5 py-1 rounded-md text-[11px]">
                          <FiHash className="text-xs" />
                          {p.roll !== null && p.roll !== undefined ? p.roll : 'N/A'}
                        </span>
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

export default AdminEventParticipantsPage;
