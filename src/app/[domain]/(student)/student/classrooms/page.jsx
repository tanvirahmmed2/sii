'use client';

import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  FiBook,
  FiFileText,
  FiLayers,
  FiVideo,
  FiFolder,
  FiCalendar,
  FiDownload,
  FiUser,
  FiSearch,
  FiFilter,
  FiMapPin,
  FiClock,
  FiChevronRight,
  FiExternalLink
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function StudentClassroomsHubPage() {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);

  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [classroomData, setClassroomData] = useState(null);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Active resource tab inside selected classroom
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'syllabus' | 'assignments' | 'lectures' | 'notes'
  const [subjectFilter, setSubjectFilter] = useState('');
  const [search, setSearch] = useState('');

  // Fetch student's classrooms
  useEffect(() => {
    async function fetchStudentClassrooms() {
      setLoadingClassrooms(true);
      try {
        const res = await fetch(getApiEndpoint('student/classrooms'));
        const data = await res.json();
        if (data.success && data.classrooms?.length > 0) {
          setClassrooms(data.classrooms);
          setSelectedClassroomId(data.classrooms[0].id);
        } else {
          setClassrooms([]);
        }
      } catch (err) {
        console.error('Error fetching student classrooms:', err);
      } finally {
        setLoadingClassrooms(false);
      }
    }

    fetchStudentClassrooms();
  }, [getApiEndpoint]);

  // Fetch materials for selected classroom
  const fetchClassroomMaterials = useCallback(async (classroomId) => {
    if (!classroomId) return;
    setLoadingDetails(true);
    try {
      const res = await fetch(getApiEndpoint(`student/classrooms/${classroomId}`));
      const data = await res.json();
      if (data.success) {
        setClassroomData(data);
      }
    } catch (err) {
      console.error('Error fetching classroom materials:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, [getApiEndpoint]);

  useEffect(() => {
    if (selectedClassroomId) {
      fetchClassroomMaterials(selectedClassroomId);
    }
  }, [selectedClassroomId, fetchClassroomMaterials]);

  // Extract unique subjects for filtering
  const allMaterials = classroomData ? [
    ...(classroomData.syllabus || []).map(item => ({ ...item, type: 'syllabus' })),
    ...(classroomData.assignments || []).map(item => ({ ...item, type: 'assignment' })),
    ...(classroomData.lectures || []).map(item => ({ ...item, type: 'lecture' })),
    ...(classroomData.notes || []).map(item => ({ ...item, type: 'note' }))
  ] : [];

  const uniqueSubjects = Array.from(
    new Set(allMaterials.map(m => m.subject_name).filter(Boolean))
  );

  // Filter items
  const filteredItems = allMaterials.filter(item => {
    if (activeTab !== 'all' && activeTab !== `${item.type}s` && activeTab !== item.type) {
      return false;
    }
    if (subjectFilter && item.subject_name !== subjectFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const textMatch =
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.topic_name && item.topic_name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.subject_name && item.subject_name.toLowerCase().includes(q)) ||
        (item.teacher_name && item.teacher_name.toLowerCase().includes(q));
      if (!textMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <FiBook className="text-sm" /> Student Learning Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Classroom &amp; Academic Learning Hub
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Access course syllabus, upcoming assignment deadlines, lecture slides, and notes for your enrolled class and session.
          </p>
        </div>
      </div>

      {loadingClassrooms ? (
        <div className="h-48 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
      ) : classrooms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center text-2xl">
            <FiBook />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">No Classrooms Available</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            There are currently no active classrooms assigned to your enrolled class and session.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Multiple Classrooms Selector if more than 1 */}
          {classrooms.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {classrooms.map((cr) => (
                <button
                  key={cr.id}
                  type="button"
                  onClick={() => setSelectedClassroomId(cr.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedClassroomId === cr.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cr.name} ({cr.class_name})
                </button>
              ))}
            </div>
          )}

          {/* Classroom Header Card */}
          {classroomData?.classroom && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                      {classroomData.classroom.class_name || 'Enrolled Class'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700">
                      {classroomData.classroom.session_name || 'Academic Session'}
                    </span>
                    {classroomData.classroom.room_number && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <FiMapPin className="text-xs text-rose-500" /> Room {classroomData.classroom.room_number}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-1">
                    {classroomData.classroom.name}
                  </h2>

                  {classroomData.classroom.description && (
                    <div
                      className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: classroomData.classroom.description }}
                    />
                  )}
                </div>

                {/* Counter Badges */}
                <div className="grid grid-cols-4 gap-2 text-center shrink-0 w-full md:w-auto">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Syllabus</p>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {classroomData.syllabus?.length || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Tasks</p>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {classroomData.assignments?.length || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Lectures</p>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                      {classroomData.lectures?.length || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Notes</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {classroomData.notes?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Type Tabs */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All ({allMaterials.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('syllabus')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'syllabus'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Syllabus ({classroomData?.syllabus?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('assignments')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'assignments'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Assignments ({classroomData?.assignments?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('lectures')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'lectures'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Lectures ({classroomData?.lectures?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'notes'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Notes ({classroomData?.notes?.length || 0})
                </button>
              </div>

              {/* Subject Filter & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                {uniqueSubjects.length > 0 && (
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">All Subjects</option>
                    {uniqueSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                )}

                <div className="relative min-w-[180px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search material..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Materials Stream */}
          {loadingDetails ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-xl">
                <FiFolder />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Content Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                {search || subjectFilter
                  ? 'No learning items matched your filter criteria.'
                  : 'Your teachers have not uploaded items in this category yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const isAssignment = item.type === 'assignment';
                const isSyllabus = item.type === 'syllabus';
                const isLecture = item.type === 'lecture';
                const isNote = item.type === 'note';

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Type Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                              isAssignment
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60'
                                : isSyllabus
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60'
                                : isLecture
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                            }`}
                          >
                            {isAssignment ? 'Assignment' : isSyllabus ? 'Syllabus' : isLecture ? 'Lecture' : 'Study Note'}
                          </span>

                          {/* Subject Badge */}
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                            {item.subject_name || 'Subject'}
                          </span>

                          {/* Due Date if assignment */}
                          {isAssignment && item.submission_date && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200/60 dark:border-rose-800/60 flex items-center gap-1">
                              <FiCalendar className="text-[10px]" /> Submission Due: {new Date(item.submission_date).toLocaleDateString()}
                            </span>
                          )}

                          {item.teacher_name && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <FiUser className="text-[10px]" /> By {item.teacher_name}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400">
                            • {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white pt-0.5">
                          {isAssignment ? item.topic_name : item.title}
                        </h3>
                      </div>

                      {/* PDF Action */}
                      {item.pdf_url && (
                        <a
                          href={item.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-colors shrink-0 self-start"
                        >
                          <FiDownload className="text-xs" /> Download Resource
                        </a>
                      )}
                    </div>

                    {/* Rendered Description using Prose and HTML */}
                    {item.description && (
                      <div
                        className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none leading-relaxed bg-slate-50/70 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
