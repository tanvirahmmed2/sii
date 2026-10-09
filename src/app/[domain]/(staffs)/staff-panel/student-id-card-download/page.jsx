'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentIdCardDownloadPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isPrintPreview, setIsPrintPreview] = useState(false);

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
        const list = data.payload?.students || [];
        setStudents(list);
        setSelectedIds(list.map((s) => s.id)); // Default select all for convenience
        setHasFiltered(true);
        toast.success(`Loaded ${list.length} students ready for ID cards.`);
      } else {
        toast.error(data.error || 'Failed to fetch students.');
      }
    } catch {
      toast.error('Network error loading students.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setSelectedIds([]);
    setIsPrintPreview(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedStudents = students.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="w-full space-y-4">
      {/* Page Header (hidden in print) */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Student ID Card Generation &amp; Download
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to generate official identification cards for batch printing.
        </p>
      </div>

      {/* Filter Bar (hidden in print) */}
      <div className="print:hidden">
        <StudentFilterBar
          onFilter={loadData}
          onReset={handleReset}
          loading={loading}
          title="Filter Students for ID Cards"
          description="Select session, class, and section to generate printable cards"
        />
      </div>

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🪪"
          title="Filter by Session, Class & Section to Generate ID Cards"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to load students and generate ID cards."
        />
      ) : (
        <div className="space-y-4">
          {/* Action Toolbar (hidden in print) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Card Generation Queue:
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/20">
                {filterInfo?.sessionName}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Class: {filterInfo?.className}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Section: {filterInfo?.sectionName}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({selectedIds.length} of {students.length} selected)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                {selectedIds.length === students.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreview(!isPrintPreview)}
                className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                {isPrintPreview ? '📋 Show Checklist' : '🪪 Show Cards Preview'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={selectedIds.length === 0}
                className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>🖨️</span> Print / Download ({selectedIds.length})
              </button>
            </div>
          </div>

          {/* Checklist Mode */}
          {!isPrintPreview && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3 print:hidden">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 w-8">
                        <input
                          type="checkbox"
                          checked={students.length > 0 && selectedIds.length === students.length}
                          onChange={toggleSelectAll}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-2.5">Reg No</th>
                      <th className="px-3 py-2.5">Roll No</th>
                      <th className="px-3 py-2.5">Student Name</th>
                      <th className="px-3 py-2.5">Class / Section</th>
                      <th className="px-3 py-2.5">Session</th>
                      <th className="px-3 py-2.5">Photo Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {students.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => toggleSelect(s.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedIds.includes(s.id)
                            ? 'bg-primary/5 dark:bg-primary/10'
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
                        <td className="px-3 py-2 font-mono font-medium text-slate-900 dark:text-white">
                          {s.registration_no}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {s.roll_no || '—'}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          {s.name || <span className="text-slate-400 italic">Not set</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {s.class_name} {s.section_name ? `(${s.section_name})` : ''}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {s.session_name || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {s.primary_photo_url ? (
                            <span className="text-[10px] text-emerald-600 font-semibold">✓ Photo Ready</span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-semibold">⚠ Default Avatar</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cards Print/Preview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-4">
            {selectedStudents.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between text-xs print:shadow-none print:border-slate-800 print:break-inside-avoid"
                style={{ width: '100%', minHeight: '260px' }}
              >
                {/* ID Card Top Banner */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-2.5 text-center">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider truncate">
                    {website?.name || 'Educational Institute'}
                  </h4>
                  <p className="text-[9px] text-blue-100 uppercase tracking-widest font-semibold">
                    Student Identity Card
                  </p>
                </div>

                {/* ID Card Body */}
                <div className="p-3 flex gap-3 items-center flex-1">
                  {/* Photo */}
                  <div className="w-20 h-24 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {s.primary_photo_url ? (
                      <img src={s.primary_photo_url} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl text-slate-400">👤</span>
                    )}
                  </div>

                  {/* Info details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                      {s.name || 'Student Name'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Reg: <strong className="text-slate-800 dark:text-slate-200">{s.registration_no}</strong>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Class: <strong className="text-slate-800 dark:text-slate-200">{s.class_name}</strong>
                    </p>
                    {s.section_name && (
                      <p className="text-[10px] text-slate-500">
                        Section: <strong className="text-slate-800 dark:text-slate-200">{s.section_name}</strong>
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 font-mono">
                      Roll: <strong className="text-slate-800 dark:text-slate-200">{s.roll_no || '—'}</strong>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Session: <strong className="text-slate-800 dark:text-slate-200">{s.session_name || '—'}</strong>
                    </p>
                  </div>
                </div>

                {/* Card Footer Bar */}
                <div className="bg-slate-50 dark:bg-slate-950 p-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[9px] text-slate-500">
                  <span className="font-mono">{s.student_unique_id}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Authorized Signature</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
