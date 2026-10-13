'use client';

import React, { useState, useEffect } from 'react';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { toast } from 'react-hot-toast';

export default function StudentFilterBar({
  onFilter,
  onReset,
  loading = false,
  extraFilters = null,
  title = 'Filter Student Records',
  description = 'Filter by Department, Session, Class, and Section to view records',
  submitLabel = 'View Data',
}) {
  const { getApiEndpoint } = useTenantWebsite();

  const [departments, setDepartments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Fetch departments, sessions, classes, sections on mount
  useEffect(() => {
    let isMounted = true;
    const loadAcademicMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const [dRes, cRes, sRes, sesRes] = await Promise.all([
          fetch(getApiEndpoint('staff/panel/departments')).then((r) => r.json()).catch(() => ({})),
          fetch(getApiEndpoint('staff/panel/classes')).then((r) => r.json()).catch(() => ({})),
          fetch(getApiEndpoint('staff/panel/sections')).then((r) => r.json()).catch(() => ({})),
          fetch(getApiEndpoint('staff/panel/sessions')).then((r) => r.json()).catch(() => ({})),
        ]);

        if (!isMounted) return;

        const depts = dRes?.payload?.departments || dRes?.payload || dRes?.departments || [];
        const cls = cRes?.payload?.classes || cRes?.payload || cRes?.classes || [];
        const secs = sRes?.payload?.sections || sRes?.payload || sRes?.sections || [];
        const sess = sesRes?.payload?.sessions || sesRes?.payload || sesRes?.sessions || [];

        setDepartments(depts);
        setClasses(cls);
        setSections(secs);
        setSessions(sess);

        // Pre-select current session if available
        const currentSes = sess.find((s) => s.is_current) || sess[0];
        if (currentSes) {
          setSelectedSession(String(currentSes.id));
        }
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      } finally {
        if (isMounted) setLoadingMetadata(false);
      }
    };

    loadAcademicMetadata();
    return () => {
      isMounted = false;
    };
  }, [getApiEndpoint]);

  // Cascaded classes by selectedDepartment and selectedSession
  const availableClasses = classes.filter((c) => {
    if (selectedDepartment && c.department_id && String(c.department_id) !== String(selectedDepartment)) return false;
    if (selectedSession && c.session_id && String(c.session_id) !== String(selectedSession)) return false;
    return true;
  });

  // Cascaded sections by selectedClass
  const availableSections = sections.filter(
    (s) => !selectedClass || String(s.class_id) === String(selectedClass)
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    const deptObj = departments.find((d) => String(d.id) === String(selectedDepartment));
    const sessionObj = sessions.find((s) => String(s.id) === String(selectedSession));
    const classObj = classes.find((c) => String(c.id) === String(selectedClass));
    const sectionObj = sections.find((s) => String(s.id) === String(selectedSection));

    onFilter?.({
      departmentId: selectedDepartment || '',
      sessionId: selectedSession || '',
      classId: selectedClass || '',
      sectionId: selectedSection || '',
      departmentName: deptObj?.name || 'All Departments',
      sessionName: sessionObj?.name || 'All Sessions',
      className: classObj?.name || 'All Classes',
      sectionName: sectionObj?.name || 'All Sections',
    });
  };

  const handleReset = () => {
    setSelectedDepartment('');
    setSelectedClass('');
    setSelectedSection('');
    onReset?.();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
        {/* Department Dropdown */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Department
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedClass('');
              setSelectedSection('');
            }}
            disabled={loadingMetadata}
            className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-slate-800 dark:focus:border-slate-400 cursor-pointer disabled:opacity-50"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.code ? `(${d.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Session Dropdown */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Session
          </label>
          <select
            value={selectedSession}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              setSelectedClass('');
              setSelectedSection('');
            }}
            disabled={loadingMetadata}
            className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-slate-800 dark:focus:border-slate-400 cursor-pointer disabled:opacity-50"
          >
            <option value="">All Sessions</option>
            {sessions.map((ses) => (
              <option key={ses.id} value={ses.id}>
                {ses.name} {ses.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Class Dropdown */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection('');
            }}
            disabled={loadingMetadata}
            className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-slate-800 dark:focus:border-slate-400 cursor-pointer disabled:opacity-50"
          >
            <option value="">All Classes</option>
            {availableClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} {cls.code ? `(${cls.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Section Dropdown */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Section
          </label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={loadingMetadata || availableSections.length === 0}
            className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-slate-800 dark:focus:border-slate-400 cursor-pointer disabled:opacity-50"
          >
            <option value="">All Sections</option>
            {availableSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>

        {/* Extra Filters (if any) */}
        {extraFilters && <div>{extraFilters}</div>}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading || loadingMetadata}
            className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {loading ? 'Loading...' : submitLabel}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="py-1.5 px-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs font-medium transition-colors cursor-pointer"
            title="Clear filters"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
