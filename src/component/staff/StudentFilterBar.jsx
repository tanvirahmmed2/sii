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
  description = 'Filter by Academic Session, Class, and Section to view data',
  submitLabel = 'View Data',
}) {
  const { getApiEndpoint } = useTenantWebsite();

  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Fetch sessions, classes, sections on mount
  useEffect(() => {
    let isMounted = true;
    const loadAcademicMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const [cRes, sRes, sesRes] = await Promise.all([
          fetch(getApiEndpoint('staff/panel/classes')).then((r) => r.json()).catch(() => ({})),
          fetch(getApiEndpoint('staff/panel/sections')).then((r) => r.json()).catch(() => ({})),
          fetch(getApiEndpoint('staff/panel/sessions')).then((r) => r.json()).catch(() => ({})),
        ]);

        if (!isMounted) return;

        const cls = cRes?.payload?.classes || cRes?.payload || cRes?.classes || [];
        const secs = sRes?.payload?.sections || sRes?.payload || sRes?.sections || [];
        const sess = sesRes?.payload?.sessions || sesRes?.payload || sesRes?.sessions || [];

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

  // Cascaded sections by selectedClass
  const availableSections = sections.filter(
    (s) => !selectedClass || String(s.class_id) === String(selectedClass)
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedSession) {
      toast.error('Please select an Academic Session.');
      return;
    }

    if (!selectedClass) {
      toast.error('Please select a Class.');
      return;
    }

    const sessionObj = sessions.find((s) => String(s.id) === String(selectedSession));
    const classObj = classes.find((c) => String(c.id) === String(selectedClass));
    const sectionObj = sections.find((s) => String(s.id) === String(selectedSection));

    onFilter?.({
      sessionId: selectedSession,
      classId: selectedClass,
      sectionId: selectedSection || '',
      sessionName: sessionObj?.name || '',
      className: classObj?.name || '',
      sectionName: sectionObj?.name || 'All Sections',
    });
  };

  const handleReset = () => {
    setSelectedClass('');
    setSelectedSection('');
    onReset?.();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>🔍</span> {title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
        {/* Session Dropdown */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Session *
          </label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            disabled={loadingMetadata}
            className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer disabled:opacity-50"
          >
            <option value="">Select Session</option>
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
            Class *
          </label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection(''); // Reset section when class changes
            }}
            disabled={loadingMetadata}
            className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer disabled:opacity-50"
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
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
            className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer disabled:opacity-50"
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
            className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <span className="animate-spin text-xs">⏳</span>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>{submitLabel}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="py-2 px-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs transition-colors cursor-pointer"
            title="Clear filters"
          >
            ↺
          </button>
        </div>
      </form>
    </div>
  );
}
