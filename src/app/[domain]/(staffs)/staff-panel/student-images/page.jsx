'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentImagesPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const params = new URLSearchParams({ session_id: sessionId, class_id: classId });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        setStudents(data.payload?.students || []);
        setHasFiltered(true);
        toast.success(`Loaded ${(data.payload?.students || []).length} students.`);
      } else {
        toast.error(data.error || 'Failed to fetch student photos.');
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
    setPreviewImage(null);
  };

  const filtered = students.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.registration_no?.toLowerCase().includes(term) ||
      s.roll_no?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Student Photo Directory
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to inspect uploaded student identification photos.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        title="Filter Student Photos"
        description="Select session, class, and section to view photo gallery"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🖼️"
          title="Filter by Session, Class & Section to View Photos"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to display student photo galleries."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
          {/* Active Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Active Filter:
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
              <span className="text-xs text-slate-400">({filtered.length} students)</span>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search by Reg, Roll, Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No students found for this session, class, and section.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 flex flex-col items-center text-center space-y-2 hover:border-primary/50 transition-colors"
                >
                  <div
                    onClick={() => s.primary_photo_url && setPreviewImage(s.primary_photo_url)}
                    className={`w-20 h-24 rounded border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center ${
                      s.primary_photo_url ? 'cursor-pointer hover:opacity-90' : ''
                    }`}
                  >
                    {s.primary_photo_url ? (
                      <img
                        src={s.primary_photo_url}
                        alt={s.name || s.registration_no}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No Photo</span>
                    )}
                  </div>
                  <div className="w-full min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                      {s.name || 'Unnamed'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Reg: {s.registration_no}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Roll: {s.roll_no || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enlarged Photo Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl">
            <img src={previewImage} alt="Enlarged" className="w-full max-h-[75vh] object-contain rounded" />
            <div className="text-center pt-2">
              <span className="text-[11px] text-slate-400 font-medium">Click anywhere to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
