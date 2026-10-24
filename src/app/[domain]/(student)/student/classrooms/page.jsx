'use client';

import React, { useState, useEffect, useCallback, useContext } from 'react';
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block mb-1">
            Student Learning Hub
          </span>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Classrooms &amp; Learning Management System
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Access course syllabi, assignments, lecture slides, and notes for your enrolled class.
          </p>
        </div>

        {classrooms.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {classrooms.map((cr) => (
              <button
                key={cr.id}
                type="button"
                onClick={() => setSelectedClassroomId(cr.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedClassroomId === cr.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cr.name} ({cr.class_name})
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingClassrooms ? (
        <div className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md animate-pulse" />
      ) : classrooms.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">No Classrooms Available</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            There are currently no active classrooms assigned to your enrolled class and session.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Classroom Header Card */}
          {classroomData?.classroom && (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                      {classroomData.classroom.class_name || 'Enrolled Class'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                      {classroomData.classroom.session_name || 'Academic Session'}
                    </span>
                    {classroomData.classroom.room_number && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Room {classroomData.classroom.room_number}
                      </span>
                    )}
                  </div>

                  <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white pt-0.5">
                    {classroomData.classroom.name}
                  </h2>

                  {classroomData.classroom.description && (
                    <div
                      className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-none pt-1"
                      dangerouslySetInnerHTML={{ __html: classroomData.classroom.description }}
                    />
                  )}
                </div>

                {/* Counter Stats */}
                <div className="grid grid-cols-4 gap-2 text-center shrink-0 w-full md:w-auto">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md border border-slate-200 dark:border-slate-700 min-w-[70px]">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Syllabus</p>
                    <p className="text-sm font-semibold text-primary mt-0.5">
                      {classroomData.syllabus?.length || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md border border-slate-200 dark:border-slate-700 min-w-[70px]">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tasks</p>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                      {classroomData.assignments?.length || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md border border-slate-200 dark:border-slate-700 min-w-[70px]">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Lectures</p>
                    <p className="text-sm font-semibold text-secondary mt-0.5">
                      {classroomData.lectures?.length || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md border border-slate-200 dark:border-slate-700 min-w-[70px]">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Notes</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {classroomData.notes?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Tabs Strip */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Type Tabs */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Resources ({allMaterials.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('syllabus')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'syllabus'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Syllabus ({classroomData?.syllabus?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('assignments')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'assignments'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Assignments ({classroomData?.assignments?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lectures')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'lectures'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Lectures ({classroomData?.lectures?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'notes'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-primary cursor-pointer"
                >
                  <option value="">All Subjects</option>
                  {uniqueSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-primary w-48 sm:w-56"
              />
            </div>
          </div>

          {/* Materials Stream */}
          {loadingDetails ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">No Learning Items Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {search || subjectFilter
                  ? 'No course materials matched your filter criteria.'
                  : 'Instructors have not uploaded materials in this category yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isAssignment = item.type === 'assignment';
                const isSyllabus = item.type === 'syllabus';
                const isLecture = item.type === 'lecture';

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                              isAssignment
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : isSyllabus
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : isLecture
                                ? 'bg-secondary/10 text-secondary border border-secondary/20'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {isAssignment ? 'Assignment' : isSyllabus ? 'Syllabus' : isLecture ? 'Lecture' : 'Study Note'}
                          </span>

                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                            {item.subject_name || 'Subject'}
                          </span>

                          {isAssignment && item.submission_date && (
                            <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-medium border border-rose-200 dark:border-rose-800 font-mono">
                              Due: {new Date(item.submission_date).toLocaleDateString('en-GB')}
                            </span>
                          )}

                          {item.teacher_name && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              By {item.teacher_name}
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 font-mono">
                            • {new Date(item.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white pt-0.5">
                          {isAssignment ? item.topic_name : item.title}
                        </h3>
                      </div>

                      {item.pdf_url && (
                        <a
                          href={item.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 self-start"
                        >
                          Download Attachment
                        </a>
                      )}
                    </div>

                    {item.description && (
                      <div
                        className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-100 dark:border-slate-800 leading-relaxed"
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
