'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import {
  FiBook,
  FiSearch,
  FiArrowRight,
  FiFileText,
  FiLayers,
  FiVideo,
  FiFolder,
  FiMapPin,
  FiCalendar,
  FiCheckCircle
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function TeacherClassroomsDirectoryPage() {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchTeacherClassrooms() {
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint('teacher/classrooms'));
        const data = await res.json();
        if (data.success) {
          setClassrooms(data.classrooms || []);
        }
      } catch (err) {
        console.error('Error fetching teacher classrooms:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTeacherClassrooms();
  }, [getApiEndpoint]);

  const filtered = classrooms.filter((cr) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      cr.name?.toLowerCase().includes(q) ||
      cr.class_name?.toLowerCase().includes(q) ||
      cr.session_name?.toLowerCase().includes(q) ||
      cr.room_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
            <FiBook className="text-sm" /> Faculty LMS Workstation
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            My Teaching Classrooms
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Select an assigned classroom to author syllabus guidelines, issue student assignments, post lecture materials, and share study notes.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search my classrooms by class or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          {filtered.length} {filtered.length === 1 ? 'Classroom' : 'Classrooms'} Available
        </span>
      </div>

      {/* Classroom Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center text-2xl">
            <FiBook />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">No Assigned Classrooms Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {search
              ? 'No classrooms match your search keywords.'
              : 'Classrooms for your assigned classes have not been created yet by the administration.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((cr) => (
            <div
              key={cr.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                      {cr.class_name || 'Class'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                      {cr.session_name || 'Session'}
                    </span>
                  </div>
                  {cr.room_number && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      <FiMapPin className="text-xs text-rose-500" /> Room {cr.room_number}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {cr.name}
                </h3>

                {cr.description && (
                  <div
                    className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 prose prose-slate dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: cr.description }}
                  />
                )}

                {/* Sub-resource Metric Counters */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Syllabus</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                      <FiFileText className="text-xs text-indigo-500" /> {cr.syllabus_count || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Tasks</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                      <FiLayers className="text-xs text-amber-500" /> {cr.assignment_count || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Lectures</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                      <FiVideo className="text-xs text-rose-500" /> {cr.lecture_count || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Notes</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                      <FiFolder className="text-xs text-emerald-500" /> {cr.notes_count || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enter Workstation CTA */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/teacher/classrooms/${cr.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white text-xs font-semibold transition-all group-hover:bg-emerald-600 cursor-pointer shadow-xs"
                >
                  <span>Open Classroom Workstation</span>
                  <FiArrowRight className="text-xs group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
