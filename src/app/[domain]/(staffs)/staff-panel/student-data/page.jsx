'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentDataPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const handleFilter = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const params = new URLSearchParams({
        session_id: sessionId,
        class_id: classId,
      });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        setStudents(data.payload?.students || []);
        setHasFiltered(true);
        toast.success(`Loaded ${(data.payload?.students || []).length} students.`);
      } else {
        toast.error(data.error || 'Failed to fetch students.');
      }
    } catch (err) {
      toast.error('Network error loading students.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setSelectedStudent(null);
    setDetailData(null);
  };

  const handleViewDetails = async (student) => {
    setSelectedStudent(student);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/students?id=${student.id}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setDetailData(data.payload);
      } else {
        toast.error(data.error || 'Failed to fetch student details.');
      }
    } catch {
      toast.error('Error loading details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.registration_no?.toLowerCase().includes(term) ||
      s.roll_no?.toLowerCase().includes(term) ||
      s.student_unique_id?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Students Data Registry
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to view complete enrollment rosters and student profiles.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={handleFilter}
        onReset={handleReset}
        loading={loading}
        title="Filter Students Data"
        description="Select academic session, class, and section to load enrolled students"
      />

      {/* Data display: show after filter only */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🎓"
          title="Filter by Session, Class & Section to View Data"
          description="Select an Academic Session and Class in the filter toolbar above, then click 'View Data' to display students."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
          {/* Active Filter Badge & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Filtered Roster:
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
              <span className="text-xs text-slate-400">
                ({filteredStudents.length} of {students.length} students)
              </span>
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

          {/* IN-PAGE STUDENT DETAILS VIEW */}
          {selectedStudent && (
            <div className="bg-white dark:bg-slate-900 border-2 border-primary/30 rounded-xl p-5 space-y-4 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Student Record Details
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedStudent.registration_no} • {selectedStudent.student_unique_id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  ✕ Close Details
                </button>
              </div>

              {detailLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading student details...</div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Academic & Identity Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Registration No</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">{selectedStudent.registration_no}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Roll Number</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">{selectedStudent.roll_no || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Class &amp; Section</span>
                      <span className="text-slate-900 dark:text-white">{selectedStudent.class_name} {selectedStudent.section_name ? `(${selectedStudent.section_name})` : ''}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Session</span>
                      <span className="text-slate-900 dark:text-white">{selectedStudent.session_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Student Name</span>
                      <span className="text-slate-900 dark:text-white">{selectedStudent.name || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Email</span>
                      <span className="text-slate-900 dark:text-white">{selectedStudent.email || 'Not provided'}</span>
                    </div>
                  </div>

                  {/* Address Information */}
                  {detailData?.address && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Address Information</span>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Present:</strong> {detailData.address.present_address || '—'}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Permanent:</strong> {detailData.address.permanent_address || '—'}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {[detailData.address.upazila, detailData.address.district, detailData.address.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Guardian Information */}
                  {detailData?.guardian && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Guardian Information</span>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Father:</strong> {detailData.guardian.father_name || '—'} ({detailData.guardian.father_phone || 'No phone'})
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Mother:</strong> {detailData.guardian.mother_name || '—'} ({detailData.guardian.mother_phone || 'No phone'})
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Primary Guardian:</strong> {detailData.guardian.guardian_name || '—'} ({detailData.guardian.guardian_relation || '—'}) • {detailData.guardian.guardian_phone || '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Student Table */}
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No students found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Reg No</th>
                    <th className="px-3 py-2.5">Roll</th>
                    <th className="px-3 py-2.5">Student Unique ID</th>
                    <th className="px-3 py-2.5">Full Name</th>
                    <th className="px-3 py-2.5">Class / Section</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 font-mono font-medium text-slate-900 dark:text-white">
                        {s.registration_no}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {s.roll_no || '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-500">
                        {s.student_unique_id}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                        {s.name || <span className="text-slate-400 italic">Not set</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {s.class_name} {s.section_name ? `(${s.section_name})` : ''}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.verification_status === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : s.verification_status === 'submitted'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {s.verification_status === 'pending_setup' ? 'Pending Setup' : s.verification_status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            selectedStudent?.id === s.id
                              ? setSelectedStudent(null)
                              : handleViewDetails(s)
                          }
                          className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer transition ${
                            selectedStudent?.id === s.id
                              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {selectedStudent?.id === s.id ? '✕ Close Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
