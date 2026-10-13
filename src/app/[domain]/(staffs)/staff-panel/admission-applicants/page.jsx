'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  FiUsers,
  FiSearch,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAward,
  FiRefreshCw,
  FiDollarSign,
  FiLayers,
  FiCheck,
  FiX,
  FiTrash2,
  FiCalendar
} from 'react-icons/fi';

function ApplicantsContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';
  const initialCircularId = searchParams.get('circular_id') || '';

  const [applicants, setApplicants] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCircularId, setSelectedCircularId] = useState(initialCircularId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusCounts, setStatusCounts] = useState({ all: 0, pending: 0, completed: 0, selected: 0, rejected: 0 });
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [publishing, setPublishing] = useState(false);

  // Inline Score & Rank Edit State (NO popup modal)
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [scoreInput, setScoreInput] = useState('');
  const [rankInput, setRankInput] = useState('');

  const [sortBy, setSortBy] = useState('created_at'); // 'created_at' | 'merit' | 'score'

  // Fetch circulars for filter dropdown
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

  // Selected circular object
  const selectedCircular = useMemo(() => {
    return circulars.find((c) => String(c.id) === String(selectedCircularId)) || null;
  }, [circulars, selectedCircularId]);

  // Fetch applicants
  const fetchApplicants = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let url = `${apiBase}/staff/panel/admissions/applicants?status=${statusFilter}&sort_by=${sortBy}`;
      if (selectedCircularId) {
        url += `&admission_id=${selectedCircularId}`;
      }
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setApplicants(data.applicants || []);
        if (data.status_counts) {
          setStatusCounts({
            all: data.status_counts.all || 0,
            pending: data.status_counts.pending || 0,
            completed: (data.applicants || []).filter((a) => a.status === 'completed').length,
            selected: data.status_counts.selected || 0,
            rejected: data.status_counts.rejected || 0,
          });
        }
      } else {
        toast.error(data.error || 'Failed to fetch applicants.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading applicants.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, statusFilter, selectedCircularId, searchTerm, sortBy]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplicants();
  };

  // Evaluate Applicant: Accept or Reject (NO popup modal)
  const handleEvaluate = async (applicantId, newStatus) => {
    setActionLoadingId(applicantId);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/applicants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicantId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Applicant marked as ${newStatus.toUpperCase()}!`);
        fetchApplicants(true);
      } else {
        toast.error(data.error || `Failed to update status to ${newStatus}.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating applicant status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Inline Score & Rank Save
  const handleSaveScore = async (applicantId) => {
    setActionLoadingId(applicantId);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/applicants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicantId,
          score: scoreInput ? parseFloat(scoreInput) : null,
          merit_position: rankInput ? parseInt(rankInput, 10) : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Merit score and position updated!');
        setEditingScoreId(null);
        fetchApplicants(true);
      } else {
        toast.error(data.error || 'Failed to update score.');
      }
    } catch {
      toast.error('Network error updating score.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Publish Results (manual publish)
  const handlePublishResults = async () => {
    if (!selectedCircularId && circulars.length > 0) {
      toast.error('Please select an admission circular target to publish results.');
      return;
    }

    const targetCircularId = selectedCircularId || circulars[0]?.id;
    if (!targetCircularId) {
      toast.error('No admission circular found to publish results.');
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/results/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admission_id: targetCircularId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Results published successfully! Rejected applicants removed.');
        fetchApplicants(true);
      } else {
        toast.error(data.error || 'Failed to publish results.');
      }
    } catch {
      toast.error('Network error during result publication.');
    } finally {
      setPublishing(false);
    }
  };

  // Download Excel Sheet (.xlsx)
  const handleDownloadExcel = () => {
    if (applicants.length === 0) {
      toast.error('No applicant records available to download.');
      return;
    }

    const exportRows = applicants.map((a) => ({
      'Application No': a.application_no,
      'Roll No': a.roll_no || 'N/A',
      'Applicant Name': a.applicant_name,
      'Email': a.email,
      'Phone': a.phone,
      'Gender': a.gender || 'N/A',
      'Date of Birth': a.date_of_birth ? a.date_of_birth.substring(0, 10) : 'N/A',
      'Circular': a.circular_title || 'N/A',
      'Target Class': a.class_name || 'N/A',
      'Father Name': a.father_name || 'N/A',
      'Father Phone': a.father_phone || 'N/A',
      'Mother Name': a.mother_name || 'N/A',
      'Guardian Name': a.guardian_name || 'N/A',
      'Present Address': a.present_address || 'N/A',
      'Permanent Address': a.permanent_address || 'N/A',
      'Last Class': a.last_class || 'N/A',
      'Last Class Grade': a.last_class_grade || a.previous_gpa || 'N/A',
      'Last Institution': a.last_institution || a.previous_school || 'N/A',
      'Payment Status': a.payment_status?.toUpperCase() || 'UNPAID',
      'Application Status': a.status?.toUpperCase() || 'PENDING',
      'Merit Score': a.score || '0.00',
      'Merit Rank': a.merit_position || 'N/A',
      'Applied Date': a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A',
      'Photo URL': a.photo_url || '',
      'Signature URL': a.signature_url || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Applicants');
    XLSX.writeFile(workbook, `Admission_Applicants_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel sheet downloaded successfully!');
  };

  const filteredApplicants = useMemo(() => {
    return applicants.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });
  }, [applicants, statusFilter]);

  return (
    <div className="w-full space-y-4">
      {/* Top Banner and KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded border text-left transition cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 ring-1 ring-sky-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>All Applicants</span>
            <FiUsers />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-1">
            {applicants.length}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('completed')}
          className={`p-3.5 rounded border text-left transition cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 ring-1 ring-blue-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Completed (Paid &amp; Uploaded)</span>
            <FiCheckCircle />
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono mt-1">
            {applicants.filter((a) => a.status === 'completed').length}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('selected')}
          className={`p-3.5 rounded border text-left transition cursor-pointer ${
            statusFilter === 'selected'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Accepted Students</span>
            <FiAward />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {applicants.filter((a) => a.status === 'selected' || a.status === 'accepted').length}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={`p-3.5 rounded border text-left transition cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 ring-1 ring-rose-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Rejected Candidates</span>
            <FiXCircle />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">
            {applicants.filter((a) => a.status === 'rejected').length}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded border text-left transition cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 ring-1 ring-amber-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Pending Review</span>
            <FiClock />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
            {applicants.filter((a) => a.status === 'pending').length}
          </div>
        </button>
      </div>

      {/* Action Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search applicant name, app no, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Circular Selector */}
          <select
            value={selectedCircularId}
            onChange={(e) => setSelectedCircularId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
          >
            <option value="">All Admission Circulars</option>
            {circulars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.class_name || 'Class'}) {c.selection_method ? `[${c.selection_method.toUpperCase()}]` : ''}
              </option>
            ))}
          </select>

          {/* Sort By Selector (Merit / Date / Score) */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer font-medium"
          >
            <option value="created_at">Sort: Applied Date</option>
            <option value="merit">Sort: Merit (Past GPA / Score)</option>
            <option value="score">Sort: Highest Exam Score</option>
          </select>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => fetchApplicants(false)}
            title="Refresh list"
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <FiRefreshCw className="text-sm" />
          </button>

          {/* Download Excel Sheet */}
          <button
            onClick={handleDownloadExcel}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Download full applicants data as Excel sheet (.xlsx)"
          >
            <FiDownload className="text-sm" />
            <span>Download Excel Sheet</span>
          </button>

          {/* Publish Results Button */}
          <button
            onClick={handlePublishResults}
            disabled={publishing}
            className="px-3.5 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Publish results for accepted students and delete rejected students"
          >
            {publishing ? (
              <>
                <div className="loader loader-xs loader-white" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <FiAward className="text-sm" />
                <span>Publish Results</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exam-Based Intake Active Workstation Banner */}
      {selectedCircular?.selection_method === 'exam' && (
        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
            <FiAward className="text-base text-purple-600 shrink-0" />
            <span>
              <strong>Exam-based intake active</strong> for '{selectedCircular.title}'. Class Seat Capacity: <strong>{selectedCircular.capacity}</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/staff-panel/admission-exam-marks-upload?admission_id=${selectedCircularId}`}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 rounded font-semibold hover:bg-purple-50 transition"
            >
              Upload Exam Marks (.xlsx)
            </Link>
            <Link
              href={`/staff-panel/admission-exam-marks-process?admission_id=${selectedCircularId}`}
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition"
            >
              Process &amp; Auto-Select by Seats
            </Link>
          </div>
        </div>
      )}

      {/* Wide Single-Row Table (overflow does not matter) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">App Tracking No</th>
                <th className="py-2.5 px-3">Roll No</th>
                <th className="py-2.5 px-3">Candidate Name</th>
                <th className="py-2.5 px-3">Photo (300x300)</th>
                <th className="py-2.5 px-3">Signature (150x50)</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Gender</th>
                <th className="py-2.5 px-3">Date of Birth</th>
                <th className="py-2.5 px-3">Target Intake &amp; Class</th>
                <th className="py-2.5 px-3">Father Name &amp; Phone</th>
                <th className="py-2.5 px-3">Mother Name &amp; Phone</th>
                <th className="py-2.5 px-3">Guardian Info</th>
                <th className="py-2.5 px-3">Present Address</th>
                <th className="py-2.5 px-3">Permanent Address</th>
                <th className="py-2.5 px-3">Previous School &amp; GPA</th>
                <th className="py-2.5 px-3">Payment Status</th>
                <th className="py-2.5 px-3">Application Status</th>
                <th className="py-2.5 px-3">Score &amp; Merit Rank</th>
                <th className="py-2.5 px-3 text-right sticky right-0 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="20" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="loader loader-sm" />
                      <span className="text-xs">Loading admission applicants...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan="20" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <FiUsers className="text-3xl text-slate-300 dark:text-slate-600 mb-1" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">No applicant records found</span>
                      <span className="text-[11px] text-slate-400">Applications submitted from /admission will appear here</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApplicants.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {app.application_no}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {app.roll_no || 'N/A'}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {app.applicant_name}
                    </td>

                    {/* Photo (300x300) */}
                    <td className="py-2 px-3">
                      {app.photo_url ? (
                        <a href={app.photo_url} target="_blank" rel="noreferrer" title="Click to view 300x300 photo">
                          <img
                            src={app.photo_url}
                            alt="Photo"
                            className="w-9 h-9 rounded object-cover border border-slate-200 dark:border-slate-700 hover:scale-125 transition-transform"
                          />
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No Photo</span>
                      )}
                    </td>

                    {/* Signature (150x50) */}
                    <td className="py-2 px-3">
                      {app.signature_url ? (
                        <a href={app.signature_url} target="_blank" rel="noreferrer" title="Click to view 150x50 signature">
                          <img
                            src={app.signature_url}
                            alt="Signature"
                            className="h-6 max-w-[80px] object-contain border border-slate-200 dark:border-slate-700 bg-white p-0.5 rounded hover:scale-125 transition-transform"
                          />
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No Signature</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {app.email}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {app.phone}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {app.gender || 'N/A'}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                      <span>{app.circular_title || 'Circular'}</span>
                      <span className="text-slate-400 text-[10px] block">Class: {app.class_name || 'General'}</span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      <span>{app.father_name || 'N/A'}</span>
                      {app.father_phone && <span className="text-slate-400 text-[10px] block font-mono">{app.father_phone}</span>}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      <span>{app.mother_name || 'N/A'}</span>
                      {app.mother_phone && <span className="text-slate-400 text-[10px] block font-mono">{app.mother_phone}</span>}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      <span>{app.guardian_name || app.father_name || 'N/A'}</span>
                      <span className="text-slate-400 text-[10px] block font-mono">{app.guardian_phone || app.father_phone || 'N/A'}</span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={app.present_address}>
                      {app.present_address || 'N/A'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={app.permanent_address}>
                      {app.permanent_address || 'N/A'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {app.last_class || 'N/A'}
                      </span>
                      <span className="text-slate-400 text-[10px] block font-mono">
                        GPA: {app.last_class_grade !== null && app.last_class_grade !== undefined ? app.last_class_grade : (app.previous_gpa || 'N/A')}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[140px]" title={app.last_institution || app.previous_school}>
                        {app.last_institution || app.previous_school || 'N/A'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          app.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                        }`}
                      >
                        {app.payment_status || 'UNPAID'}
                      </span>
                    </td>

                    {/* Application Status: Shows "completed", "selected", "rejected", "pending" */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          app.status === 'completed'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
                            : app.status === 'selected' || app.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                            : app.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                        }`}
                      >
                        {app.status || 'pending'}
                      </span>
                    </td>

                    {/* Score & Merit Rank */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {editingScoreId === app.id ? (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Score"
                            value={scoreInput}
                            onChange={(e) => setScoreInput(e.target.value)}
                            className="w-16 px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Rank"
                            value={rankInput}
                            onChange={(e) => setRankInput(e.target.value)}
                            className="w-14 px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded text-xs"
                          />
                          <button
                            onClick={() => handleSaveScore(app.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            title="Save Score"
                          >
                            <FiCheck />
                          </button>
                          <button
                            onClick={() => setEditingScoreId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                            title="Cancel"
                          >
                            <FiX />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingScoreId(app.id);
                            setScoreInput(app.score !== null ? String(app.score) : '');
                            setRankInput(app.merit_position !== null ? String(app.merit_position) : '');
                          }}
                          className="cursor-pointer hover:underline text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                          title="Click to edit Score / Rank"
                        >
                          <span>{app.score !== null ? `${parseFloat(app.score).toFixed(2)} pts` : 'No score'}</span>
                          {app.merit_position && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                              Rank #{app.merit_position}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions: Direct Accept / Reject Buttons (NO popup modal) */}
                    <td className="py-2.5 px-3 text-right sticky right-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-xs">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEvaluate(app.id, 'selected')}
                          disabled={actionLoadingId === app.id || app.status === 'selected' || app.status === 'accepted'}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                          title="Accept student for admission"
                        >
                          <FiCheckCircle className="text-xs" />
                          <span>Accept</span>
                        </button>

                        <button
                          onClick={() => handleEvaluate(app.id, 'rejected')}
                          disabled={actionLoadingId === app.id || app.status === 'rejected'}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                          title="Reject student application"
                        >
                          <FiXCircle className="text-xs" />
                          <span>Reject</span>
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

export default function AdmissionApplicantsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex justify-center items-center">
          <div className="loader loader-md" />
        </div>
      }
    >
      <ApplicantsContent />
    </Suspense>
  );
}
