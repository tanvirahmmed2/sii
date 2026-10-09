'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentMeritMigrationPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // Target Migration Controls
  const [targetSessionId, setTargetSessionId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [migrating, setMigrating] = useState(false);

  // References
  const [allClasses, setAllClasses] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [allSessions, setAllSessions] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(getApiEndpoint('staff/panel/classes')).then((r) => r.json()).catch(() => ({})),
      fetch(getApiEndpoint('staff/panel/sections')).then((r) => r.json()).catch(() => ({})),
      fetch(getApiEndpoint('staff/panel/sessions')).then((r) => r.json()).catch(() => ({})),
    ]).then(([c, s, ses]) => {
      setAllClasses(c?.payload?.classes || c?.payload || []);
      setAllSections(s?.payload?.sections || s?.payload || []);
      setAllSessions(ses?.payload?.sessions || ses?.payload || []);
    });
  }, [getApiEndpoint]);

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    setSelectedIds([]);
    try {
      const params = new URLSearchParams({ session_id: sessionId, class_id: classId });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        // Sort students by roll_no or id
        const sorted = (data.payload?.students || []).sort((a, b) => {
          const rA = parseInt(a.roll_no, 10) || 99999;
          const rB = parseInt(b.roll_no, 10) || 99999;
          return rA - rB;
        });
        setStudents(sorted);
        setHasFiltered(true);
        toast.success(`Loaded ${sorted.length} students ranked by merit.`);
      } else {
        toast.error(data.error || 'Failed to fetch students.');
      }
    } catch {
      toast.error('Network error loading merit roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMigrate = async (e) => {
    e.preventDefault();

    if (selectedIds.length === 0) {
      toast.error('Please select at least one merit-ranked student to promote.');
      return;
    }

    if (!targetClassId) {
      toast.error('Please select a Target Class.');
      return;
    }

    setMigrating(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/students'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate',
          student_ids: selectedIds,
          target_session_id: targetSessionId || null,
          target_class_id: targetClassId,
          target_section_id: targetSectionId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Merit migration failed.');
      }

      toast.success(data.message || `Promoted ${selectedIds.length} merit students!`);
      if (filterInfo) loadData(filterInfo);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMigrating(false);
    }
  };

  const targetAvailableSections = allSections.filter(
    (s) => !targetClassId || String(s.class_id) === String(targetClassId)
  );

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Merit-Based Student Migration
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to review merit ranking order and promote high-performing students.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        title="Merit Roster Filter"
        description="Select session, class, and section to inspect academic merit standings"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🏆"
          title="Filter by Session, Class & Section to View Merit Roster"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to load the merit-ranked student roster."
        />
      ) : (
        <div className="space-y-4">
          {/* Target Migration Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🎯</span> Merit Placement Destination
              </h3>
              <p className="text-[11px] text-slate-500">
                Choose the target promotion session and standard for selected students
              </p>
            </div>

            <form onSubmit={handleMigrate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Target Session
                </label>
                <select
                  value={targetSessionId}
                  onChange={(e) => setTargetSessionId(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Keep Current Session</option>
                  {allSessions.map((ses) => (
                    <option key={ses.id} value={ses.id}>
                      {ses.name} {ses.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Target Class *
                </label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => {
                    setTargetClassId(e.target.value);
                    setTargetSectionId('');
                  }}
                  className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Destination Class</option>
                  {allClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.code ? `(${cls.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Target Section
                </label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Unassigned Section</option>
                  {targetAvailableSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={migrating || selectedIds.length === 0}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {migrating ? 'Processing...' : `🏆 Promote Merit (${selectedIds.length})`}
                </button>
              </div>
            </form>
          </div>

          {/* Merit Ranked Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Merit Standing Table ({students.length} students in {filterInfo?.className})
              </span>
              <span className="text-slate-500 text-[11px]">
                {selectedIds.length} students selected for merit promotion
              </span>
            </div>

            {students.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No students found in source roster.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 w-8">Select</th>
                      <th className="px-3 py-2.5">Merit Rank</th>
                      <th className="px-3 py-2.5">Roll No</th>
                      <th className="px-3 py-2.5">Reg No</th>
                      <th className="px-3 py-2.5">Student Name</th>
                      <th className="px-3 py-2.5">Class / Section</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {students.map((s, idx) => (
                      <tr
                        key={s.id}
                        onClick={() => toggleSelect(s.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedIds.includes(s.id)
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(s.id)}
                            onChange={() => toggleSelect(s.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          #{idx + 1}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {s.roll_no || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono font-medium text-slate-900 dark:text-white">
                          {s.registration_no}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          {s.name || <span className="text-slate-400 italic">Unnamed</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {s.class_name} {s.section_name ? `(${s.section_name})` : ''}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium">
                            Eligible
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
