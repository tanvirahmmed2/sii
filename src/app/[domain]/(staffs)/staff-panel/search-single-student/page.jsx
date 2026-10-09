'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function SearchSingleStudentPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fullDetail, setFullDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    setSelectedStudent(null);
    setFullDetail(null);

    try {
      const params = new URLSearchParams({ session_id: sessionId, class_id: classId });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        const list = data.payload?.students || [];
        setStudents(list);
        setHasFiltered(true);
        if (list[0]) {
          inspectStudent(list[0]);
        }
        toast.success(`Found ${list.length} students in this class/section.`);
      } else {
        toast.error(data.error || 'Failed to search students.');
      }
    } catch {
      toast.error('Network error loading students.');
    } finally {
      setLoading(false);
    }
  };

  const inspectStudent = async (student) => {
    setSelectedStudent(student);
    setDetailLoading(true);
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/students?id=${student.id}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setFullDetail(data.payload);
      }
    } catch {
      // Ignored
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setSelectedStudent(null);
    setFullDetail(null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Single Student Inspection &amp; Profile Lookup
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to locate and inspect complete student dossiers.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        title="Filter Roster for Single Student Lookup"
        description="Select session, class, and section to inspect individual profiles"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🔎"
          title="Filter by Session, Class & Section to Inspect a Student"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to look up student profiles."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Student Selector List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs space-y-2">
            <div className="pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Students ({students.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {filterInfo?.className}
              </span>
            </div>

            <div className="max-h-[600px] overflow-y-auto space-y-1">
              {students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => inspectStudent(s)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center justify-between ${
                    selectedStudent?.id === s.id
                      ? 'border-primary bg-primary/5 text-primary font-semibold'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {s.name || 'Unnamed Student'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Reg: {s.registration_no}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    Roll: {s.roll_no || '—'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Profile Inspector Dossier */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
            {!selectedStudent ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Select a student on the left to inspect their dossier.
              </div>
            ) : detailLoading ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Loading student dossier...
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Header card with photo and key credentials */}
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="w-24 h-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                    {selectedStudent.primary_photo_url ? (
                      <img
                        src={selectedStudent.primary_photo_url}
                        alt="Student"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl text-slate-400">👤</span>
                    )}
                  </div>

                  <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {selectedStudent.name || 'Unnamed Student'}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {selectedStudent.is_active ? 'Active' : 'Dropped Out'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-mono">
                      Registration: <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.registration_no}</strong> • Roll: <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.roll_no || '—'}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Class: <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.class_name}</strong> {selectedStudent.section_name ? `(${selectedStudent.section_name})` : ''} • Session: <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.session_name || '—'}</strong>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      UID: {selectedStudent.student_unique_id}
                    </p>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Email</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">{selectedStudent.email || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Phone</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">{selectedStudent.number || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gender</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">{selectedStudent.gender || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Blood Group</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block">{selectedStudent.blood_group || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Birth Date</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">{selectedStudent.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Religion</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">{selectedStudent.religion || '—'}</span>
                  </div>
                </div>

                {/* Addresses */}
                {fullDetail?.address && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Residence Data</span>
                    <p><strong>Present Address:</strong> {fullDetail.address.present_address || '—'}</p>
                    <p><strong>Permanent Address:</strong> {fullDetail.address.permanent_address || '—'}</p>
                    <p className="text-[11px] text-slate-500">
                      {[fullDetail.address.upazila, fullDetail.address.district, fullDetail.address.city, fullDetail.address.postal_code].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}

                {/* Guardians */}
                {fullDetail?.guardian && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Guardians</span>
                    <p><strong>Father:</strong> {fullDetail.guardian.father_name || '—'} ({fullDetail.guardian.father_phone || 'No phone'})</p>
                    <p><strong>Mother:</strong> {fullDetail.guardian.mother_name || '—'} ({fullDetail.guardian.mother_phone || 'No phone'})</p>
                    <p><strong>Guardian:</strong> {fullDetail.guardian.guardian_name || '—'} ({fullDetail.guardian.guardian_relation || '—'}) • {fullDetail.guardian.guardian_phone || '—'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
