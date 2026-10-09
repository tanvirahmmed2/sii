'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function SearchFilteredStudentsPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
        toast.success(`Found ${(data.payload?.students || []).length} students.`);
      } else {
        toast.error(data.error || 'Failed to search students.');
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
    setStatusFilter('all');
  };

  const filtered = students.filter((s) => {
    if (statusFilter !== 'all' && s.verification_status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.registration_no?.toLowerCase().includes(term) ||
      s.roll_no?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term) ||
      s.student_unique_id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Advanced Multi-Criteria Student Search
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, section, and profile verification status to find specific student groups.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        title="Multi-Criteria Academic Filter"
        description="Select session, class, and section to initiate query"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🔍"
          title="Filter by Session, Class & Section to Search Roster"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to run the multi-filter student search."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
          {/* Active Filter Bar & Additional Refinements */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Filtered:
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
              <span className="text-xs text-slate-400">({filtered.length} matches)</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Verification Statuses</option>
                <option value="verified">Verified</option>
                <option value="submitted">Submitted</option>
                <option value="pending_setup">Pending Setup</option>
                <option value="rejected">Rejected</option>
              </select>

              <input
                type="text"
                placeholder="Search Reg, Roll, Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No students match the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Reg No</th>
                    <th className="px-3 py-2.5">Roll No</th>
                    <th className="px-3 py-2.5">Student Unique ID</th>
                    <th className="px-3 py-2.5">Full Name</th>
                    <th className="px-3 py-2.5">Class / Section</th>
                    <th className="px-3 py-2.5">Contact Number</th>
                    <th className="px-3 py-2.5">Verification</th>
                    <th className="px-3 py-2.5">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
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
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {s.number || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            s.verification_status === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : s.verification_status === 'submitted'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {s.verification_status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            s.is_active
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {s.is_active ? 'Active' : 'Dropped Out'}
                        </span>
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
