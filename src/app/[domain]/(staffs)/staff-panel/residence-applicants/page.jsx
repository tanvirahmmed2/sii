'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function ResidenceApplicantsPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [halls, setHalls] = useState([]);

  // Fetch unallocated students who are verified and active
  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', 'verified');
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('limit', '50');

      const url = getApiEndpoint(`/staff/panel/students?${params.toString()}`);
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setStudents(data.payload.roster || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch applicants.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHalls = async () => {
    try {
      const url = getApiEndpoint('/staff/panel/residence/halls');
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) setHalls(data.payload.halls || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHalls();
    fetchApplicants();
  }, []);

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block mb-1">
            Path: /residence-applicants
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hall Accommodation Applicants Queue
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enrolled students eligible for hall room and seat allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchApplicants}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh
          </button>
          <Link
            href="/staff-panel/residence-allocations"
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer transition shadow-2xs"
          >
            Go to Allocation Desk →
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search eligible student, reg no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchApplicants()}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
            />
            <button
              onClick={fetchApplicants}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
            >
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading eligible students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No students found matching search.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Student Name</th>
                  <th className="px-3 py-2.5">Registration No</th>
                  <th className="px-3 py-2.5">Class / Section</th>
                  <th className="px-3 py-2.5">Contact</th>
                  <th className="px-3 py-2.5">Gender</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">
                      {st.name || 'Student'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                      {st.registration_no}
                    </td>
                    <td className="px-3 py-2.5">
                      {st.class_name || 'Class —'} {st.section_name ? `(${st.section_name})` : ''}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 font-mono">
                      {st.number || st.email || '—'}
                    </td>
                    <td className="px-3 py-2.5 capitalize">
                      {st.gender || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/staff-panel/residence-allocations?search=${encodeURIComponent(st.registration_no)}`}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer transition shadow-2xs"
                      >
                        Allocate Bed →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
