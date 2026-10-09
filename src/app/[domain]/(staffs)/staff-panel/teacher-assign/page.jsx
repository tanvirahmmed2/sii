/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiBookOpen,
  FiClock,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiX,
  FiArrowLeft,
  FiUsers,
  FiRefreshCw,
  FiCalendar,
  FiLayers
} from 'react-icons/fi';

function TeacherAssignContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domain = params?.domain || '';
  const initialTeacherId = searchParams.get('teacher_id') || '';

  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(initialTeacherId);

  // Institution metadata for assignment dropdowns
  const [subjectsList, setSubjectsList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [daysList, setDaysList] = useState([]);
  const [periodsList, setPeriodsList] = useState([]);

  // Teacher current assignments
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [assignedPeriods, setAssignedPeriods] = useState([]);
  const [loading, setLoading] = useState(false);

  // Active tab: 'subjects' or 'periods'
  const [activeTab, setActiveTab] = useState('subjects');

  // Modals
  const [isSubjModalOpen, setIsSubjModalOpen] = useState(false);
  const [subjFormData, setSubjFormData] = useState({
    subject_id: '',
    class_id: '',
    is_primary: true
  });

  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodFormData, setPeriodFormData] = useState({
    day_id: '',
    period_id: '',
    class_id: '',
    section_id: ''
  });

  const [saving, setSaving] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, []);

  // Fetch teachers roster
  useEffect(() => {
    async function loadTeachers() {
      if (!domain) return;
      try {
        const res = await fetch(`/api/${domain}/staff/panel/teacher?limit=100`);
        const data = await res.json();
        if (data.success && Array.isArray(data.teachers)) {
          setTeachers(data.teachers);
          if (!selectedTeacherId && data.teachers.length > 0) {
            setSelectedTeacherId(String(data.teachers[0].id));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadTeachers();
  }, [domain, selectedTeacherId]);

  // Fetch institutional options (subjects, classes, days, periods)
  useEffect(() => {
    async function loadMeta() {
      if (!domain) return;
      try {
        // Subjects
        fetch(`/api/${domain}/staff/panel/subjects`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.subjects) setSubjectsList(d.subjects);
          })
          .catch(() => {});

        // Classes
        fetch(`/api/${domain}/staff/panel/classes`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.classes) setClassesList(d.classes);
          })
          .catch(() => {});

        // Sections
        fetch(`/api/${domain}/staff/panel/sections`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.sections) setSectionsList(d.sections);
          })
          .catch(() => {});

        // Days
        fetch(`/api/${domain}/staff/panel/days`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.days) setDaysList(d.days);
          })
          .catch(() => {});

        // Periods
        fetch(`/api/${domain}/staff/panel/periods`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.periods) setPeriodsList(d.periods);
          })
          .catch(() => {});
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    }
    loadMeta();
  }, [domain]);

  // Fetch assignments for selected teacher
  const fetchTeacherAssignments = useCallback(async (tId) => {
    if (!domain || !tId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/assign?teacher_id=${tId}`);
      const data = await res.json();
      if (data.success) {
        setAssignedSubjects(data.subjects || []);
        setAssignedPeriods(data.periods || []);
      } else {
        showToast(data.error || 'Failed to load assignments.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching assignments.', true);
    } finally {
      setLoading(false);
    }
  }, [domain, showToast]);

  useEffect(() => {
    if (selectedTeacherId) {
      fetchTeacherAssignments(selectedTeacherId);
    }
  }, [selectedTeacherId, fetchTeacherAssignments]);

  // Handle Subject assignment save
  const handleAssignSubject = async (e) => {
    e.preventDefault();
    if (!subjFormData.subject_id) {
      showToast('Please select a subject to assign.', true);
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subject',
          teacher_id: selectedTeacherId,
          subject_id: subjFormData.subject_id,
          class_id: subjFormData.class_id || null,
          is_primary: Boolean(subjFormData.is_primary)
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Subject assigned to teacher successfully.');
        setIsSubjModalOpen(false);
        fetchTeacherAssignments(selectedTeacherId);
      } else {
        showToast(data.error || 'Failed to assign subject.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', true);
    } finally {
      setSaving(false);
    }
  };

  // Handle Period assignment save
  const handleAssignPeriod = async (e) => {
    e.preventDefault();
    if (!periodFormData.period_id) {
      showToast('Please select a period.', true);
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'period',
          teacher_id: selectedTeacherId,
          period_id: periodFormData.period_id,
          day_id: periodFormData.day_id || null,
          class_id: periodFormData.class_id || null,
          section_id: periodFormData.section_id || null
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Routine period assigned to teacher successfully.');
        setIsPeriodModalOpen(false);
        fetchTeacherAssignments(selectedTeacherId);
      } else {
        showToast(data.error || 'Failed to assign period.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', true);
    } finally {
      setSaving(false);
    }
  };

  // Remove assignment
  const handleRemoveAssignment = async (type, id) => {
    if (!confirm(`Are you sure you want to remove this ${type} assignment?`)) return;
    try {
      const res = await fetch(`/api/${domain}/staff/panel/teacher/assign?type=${type}&id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Assignment removed successfully.`);
        fetchTeacherAssignments(selectedTeacherId);
      } else {
        showToast(data.error || 'Failed to remove assignment.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', true);
    }
  };

  const currentTeacher = teachers.find((t) => String(t.id) === String(selectedTeacherId));

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiCheck className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiX className="w-4 h-4" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href={`/${domain}/staff-panel/teacher-list`} className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Teacher Directory</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Faculty Assignments</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiBookOpen className="w-5 h-5 text-blue-600" />
            <span>Teacher Subject &amp; Routine Assigner</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Assign curriculum subjects, grade levels, and weekly timetable periods to each teacher.
          </p>
        </div>

        {/* Faculty Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Faculty:</span>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.designation_title || 'Teacher'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Teacher Summary Banner */}
      {currentTeacher && (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs">
          <div className="flex items-center gap-3">
            {currentTeacher.photo_url ? (
              <img
                src={currentTeacher.photo_url}
                alt={currentTeacher.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300 text-sm shrink-0">
                {currentTeacher.name?.charAt(0) || 'T'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white">{currentTeacher.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                  {currentTeacher.designation_title || 'Teacher'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{currentTeacher.email} • {currentTeacher.number}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-center">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400">Assigned Subjects</span>
              <p className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">{assignedSubjects.length}</p>
            </div>
            <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Routine Periods</span>
              <p className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">{assignedPeriods.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FiBookOpen className="w-3.5 h-3.5" />
              <span>Assigned Subjects ({assignedSubjects.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('periods')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                activeTab === 'periods'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FiClock className="w-3.5 h-3.5" />
              <span>Class Routine Periods ({assignedPeriods.length})</span>
            </button>
          </div>

          <div>
            {activeTab === 'subjects' ? (
              <button
                onClick={() => setIsSubjModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Assign Subject</span>
              </button>
            ) : (
              <button
                onClick={() => setIsPeriodModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Assign Period Routine</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Assigned Subjects Table */}
        {activeTab === 'subjects' && (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Subject Name</th>
                  <th className="px-3 py-2">Subject Code</th>
                  <th className="px-3 py-2">Target Class</th>
                  <th className="px-3 py-2 text-center">Role / Type</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                      <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                      <span>Loading assigned subjects...</span>
                    </td>
                  </tr>
                ) : assignedSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                      <FiBookOpen className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="font-medium text-slate-600 dark:text-slate-400">No subjects assigned yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Click &quot;Assign Subject&quot; above to link teaching subjects to this teacher.
                      </p>
                    </td>
                  </tr>
                ) : (
                  assignedSubjects.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                        {row.subject_name}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500">
                        {row.subject_code || 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {row.class_name ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                            {row.class_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">All Classes</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          row.is_primary
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {row.is_primary ? 'Primary Teacher' : 'Assistant / Secondary'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleRemoveAssignment('subject', row.id)}
                          className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Remove assignment"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Assigned Periods Routine Table */}
        {activeTab === 'periods' && (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Day of Week</th>
                  <th className="px-3 py-2">Period Name</th>
                  <th className="px-3 py-2">Timing</th>
                  <th className="px-3 py-2">Class / Section</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                      <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                      <span>Loading timetable periods...</span>
                    </td>
                  </tr>
                ) : assignedPeriods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                      <FiClock className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="font-medium text-slate-600 dark:text-slate-400">No routine periods assigned</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Click &quot;Assign Period Routine&quot; above to schedule this teacher for class periods.
                      </p>
                    </td>
                  </tr>
                ) : (
                  assignedPeriods.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                        {row.day_name || 'All Days'}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                        {row.period_name}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                        {row.start_time || 'N/A'} - {row.end_time || 'N/A'}
                      </td>
                      <td className="px-3 py-2">
                        {row.class_name ? (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 text-[11px]">
                            {row.class_name} {row.section_name ? `(${row.section_name})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unspecified</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleRemoveAssignment('period', row.id)}
                          className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Remove period routine"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Assign Subject */}
      {isSubjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiBookOpen className="w-4 h-4 text-blue-600" />
                <span>Assign Teaching Subject</span>
              </h3>
              <button
                onClick={() => setIsSubjModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubject} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={subjFormData.subject_id}
                  onChange={(e) => setSubjFormData({ ...subjFormData, subject_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="">-- Choose Subject --</option>
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Specific Class / Grade (Optional)
                </label>
                <select
                  value={subjFormData.class_id}
                  onChange={(e) => setSubjFormData({ ...subjFormData, class_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="">-- All Classes / General --</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subjFormData.is_primary}
                    onChange={(e) => setSubjFormData({ ...subjFormData, is_primary: e.target.checked })}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Set as Primary Subject Teacher</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubjModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 transition"
                >
                  {saving ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Assign Period Routine */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiClock className="w-4 h-4 text-purple-600" />
                <span>Assign Class Routine Period</span>
              </h3>
              <button
                onClick={() => setIsPeriodModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignPeriod} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Routine Period <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={periodFormData.period_id}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, period_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="">-- Choose Period --</option>
                  {periodsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.start_time || ''} - {p.end_time || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Day of Week
                </label>
                <select
                  value={periodFormData.day_id}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, day_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="">-- Select Day --</option>
                  {daysList.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Class
                  </label>
                  <select
                    value={periodFormData.class_id}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, class_id: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="">-- Class --</option>
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <select
                    value={periodFormData.section_id}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, section_id: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="">-- Section --</option>
                    {sectionsList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 transition"
                >
                  {saving ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherAssignPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <span>Loading teacher assignments workstation...</span>
        </div>
      }
    >
      <TeacherAssignContent />
    </Suspense>
  );
}
