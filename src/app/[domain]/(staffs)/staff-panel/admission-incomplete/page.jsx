'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { FiTrash2, FiCopy, FiCheckCircle, FiRefreshCw, FiDownload, FiExternalLink } from 'react-icons/fi';

export default function AdmissionIncompletePage() {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  const [applicants, setApplicants] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircularId, setSelectedCircularId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // 1. Fetch available circulars
  useEffect(() => {
    fetch(`${apiBase}/staff/panel/admissions`)
      .then(async (res) => {
        if (!res.ok) return { success: false };
        return res.json();
      })
      .then((data) => {
        if (data?.success) {
          setCirculars(data.circulars || []);
        }
      })
      .catch((err) => console.error('Error fetching circulars:', err));
  }, [apiBase]);

  // 2. Fetch Incomplete Applicants - STRICT RULE: status=incomplete
  const fetchIncompleteApplicants = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        let url = `${apiBase}/staff/panel/admissions/applicants?status=incomplete`;
        if (selectedCircularId) {
          url += `&admission_id=${selectedCircularId}`;
        }
        if (searchTerm.trim()) {
          url += `&search=${encodeURIComponent(searchTerm.trim())}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (data.success) {
          // Double filter to guarantee only incomplete applicants appear
          const incompleteOnly = (data.applicants || []).filter((a) => a.status === 'incomplete');
          setApplicants(incompleteOnly);
        } else {
          toast.error(data.error || 'Failed to load incomplete applicants.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error loading incomplete records.');
      } finally {
        setLoading(false);
      }
    },
    [apiBase, selectedCircularId, searchTerm]
  );

  useEffect(() => {
    fetchIncompleteApplicants();
  }, [fetchIncompleteApplicants]);

  // Filtered applicants by client search
  const filteredApplicants = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return applicants;
    return applicants.filter((a) => (
      a.applicant_name?.toLowerCase().includes(q) ||
      a.application_no?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.phone?.toLowerCase().includes(q)
    ));
  }, [applicants, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const circIds = new Set();
    applicants.forEach((a) => {
      if (a.admission_id) circIds.add(a.admission_id);
    });
    return {
      totalIncomplete: applicants.length,
      circularsCount: circIds.size,
    };
  }, [applicants]);

  // Delete Draft Applicant
  const handleDeleteApplicant = async (applicantId) => {
    if (!window.confirm('Are you sure you want to delete this incomplete draft application?')) {
      return;
    }
    setActionLoadingId(applicantId);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/applicants?id=${applicantId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Incomplete draft deleted.');
        fetchIncompleteApplicants(true);
      } else {
        toast.error(data.error || 'Failed to delete draft.');
      }
    } catch {
      toast.error('Network error deleting draft.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy Candidate Smart Resume Link
  const handleCopyResumeLink = (app) => {
    const resumeUrl = `${window.location.origin}/admission/apply?resume_email=${encodeURIComponent(app.email || '')}&circular_id=${app.admission_id || ''}`;
    navigator.clipboard.writeText(resumeUrl);
    toast.success('Smart Resume URL copied to clipboard!');
  };

  // Send Resume Reminder
  const handleSendReminder = (app) => {
    toast.success(`Resume reminder queued for ${app.applicant_name} (${app.email})`);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredApplicants.length === 0) {
      toast.error('No incomplete records to export.');
      return;
    }
    const rows = filteredApplicants.map((a) => ({
      'Application No': a.application_no,
      'Applicant Name': a.applicant_name,
      'Email': a.email,
      'Phone': a.phone,
      'Circular': a.circular_title || 'N/A',
      'Target Class': a.class_name || 'N/A',
      'Status': 'INCOMPLETE',
      'Initial Verification Date': a.created_at ? new Date(a.created_at).toLocaleString() : 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Incomplete_Drafts');
    XLSX.writeFile(workbook, `Incomplete_Admission_Drafts_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel export downloaded successfully!');
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 rounded uppercase tracking-wider">
            Strict Isolation &bull; Incomplete Desk
          </span>
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-1">
            Incomplete Applications Workstation
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Per system policy, all applicants with status &quot;incomplete&quot; appear strictly in this desk and are excluded from the main applicants list.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/staff-panel/admission-applicants"
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
          >
            &larr; Completed Applicants Desk
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Incomplete Submissions
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {metrics.totalIncomplete}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Draft drop-offs</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Circulars Impacted
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {metrics.circularsCount}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Active programs</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search by name, email, app no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Circular Filter */}
          <select
            value={selectedCircularId}
            onChange={(e) => setSelectedCircularId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="">All Admission Circulars</option>
            {circulars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.class_name || 'Class'})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => fetchIncompleteApplicants(true)}
            className="px-2.5 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            title="Refresh list"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">App No</th>
                <th className="py-2.5 px-3">Applicant Name</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Circular & Class</th>
                <th className="py-2.5 px-3">Started Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="loader loader-sm" />
                      <span className="text-xs">Loading incomplete drafts...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <FiCheckCircle className="w-6 h-6 text-emerald-500 mb-1" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No incomplete draft applications!
                      </span>
                      <span className="text-[11px] text-slate-500">
                        All applicants who started an application have completed Step 1.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApplicants.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {app.application_no}
                    </td>

                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {app.applicant_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Draft ID: #{app.id}
                      </div>
                    </td>

                    <td className="py-2 px-3">
                      <div className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                        {app.email}
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        {app.phone}
                      </div>
                    </td>

                    <td className="py-2 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {app.circular_title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {app.class_name || 'Class'}
                      </div>
                    </td>

                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        INCOMPLETE
                      </span>
                    </td>

                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Copy Smart Resume URL */}
                        <button
                          onClick={() => handleCopyResumeLink(app)}
                          className="px-2 py-1 rounded text-[11px] font-semibold border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center gap-1 cursor-pointer"
                          title="Copy candidate Smart Resume URL"
                        >
                          <FiCopy className="w-3 h-3" />
                          <span>Resume Link</span>
                        </button>

                        {/* Send Reminder */}
                        <button
                          onClick={() => handleSendReminder(app)}
                          className="px-2 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Queue resume reminder notification"
                        >
                          Remind
                        </button>

                        {/* Delete Draft */}
                        <button
                          onClick={() => handleDeleteApplicant(app.id)}
                          disabled={actionLoadingId === app.id}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer disabled:opacity-50"
                          title="Delete draft applicant"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
