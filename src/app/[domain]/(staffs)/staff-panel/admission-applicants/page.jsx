'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
  FiAward,
  FiRefreshCw,
  FiDollarSign,
  FiArrowRight,
  FiX,
  FiUserCheck,
  FiFileText
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
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, selected, rejected
  const [selectedCircularId, setSelectedCircularId] = useState(initialCircularId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusCounts, setStatusCounts] = useState({ all: 0, pending: 0, selected: 0, rejected: 0 });

  // Detail modal state
  const [activeApplicant, setActiveApplicant] = useState(null);
  const [scoreModalApplicant, setScoreModalApplicant] = useState(null);
  const [scoreInput, setScoreInput] = useState('');
  const [rankInput, setRankInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  // Fetch applicants
  const fetchApplicants = async () => {
    setLoading(true);
    try {
      let url = `${apiBase}/staff/panel/admissions/applicants?status=${statusFilter}`;
      if (selectedCircularId) {
        url += `&circular_id=${selectedCircularId}`;
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
          setStatusCounts(data.status_counts);
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
  };

  useEffect(() => {
    fetchApplicants();
  }, [statusFilter, selectedCircularId, apiBase]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplicants();
  };

  // Evaluate Applicant (Select or Reject)
  const handleEvaluate = async (applicantId, newStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/applicants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_id: applicantId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Applicant marked as ${newStatus.toUpperCase()}!`);
        fetchApplicants();
        if (activeApplicant?.id === applicantId) {
          setActiveApplicant(null);
        }
      } else {
        toast.error(data.error || `Failed to update status to ${newStatus}.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating applicant status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Score & Merit Update
  const handleScoreSubmit = async (e) => {
    e.preventDefault();
    if (!scoreModalApplicant) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/applicants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_id: scoreModalApplicant.id,
          merit_score: scoreInput ? parseFloat(scoreInput) : null,
          merit_rank: rankInput ? parseInt(rankInput, 10) : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Merit score and rank saved successfully!');
        setScoreModalApplicant(null);
        fetchApplicants();
      } else {
        toast.error(data.error || 'Failed to save merit score.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving merit score.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger CSV Download
  const handleDownloadCsv = (filterType) => {
    const downloadUrl = `${apiBase}/staff/panel/admissions/applicants/export?filter=${filterType}${
      selectedCircularId ? `&circular_id=${selectedCircularId}` : ''
    }`;
    window.open(downloadUrl, '_blank');
    toast.success(`Exporting ${filterType.toUpperCase()} applicants list...`);
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiUsers className="text-sky-600 dark:text-sky-400" />
            Admission Applicants Evaluation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review applicant profiles, approve/reject candidates, assign merit scores, and export institutional lists.
          </p>
        </div>

        {/* Global CSV Download Dropdown / Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchApplicants}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh List"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Direct CSV Export Buttons */}
          <div className="flex items-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs">
            <span className="px-2 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <FiDownload className="w-3.5 h-3.5" /> CSV:
            </span>
            <button
              onClick={() => handleDownloadCsv('all')}
              className="px-2 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition font-medium"
            >
              All
            </button>
            <button
              onClick={() => handleDownloadCsv('selected')}
              className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition font-semibold"
            >
              Selected
            </button>
            <button
              onClick={() => handleDownloadCsv('pending')}
              className="px-2 py-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition font-medium"
            >
              Pending
            </button>
            <button
              onClick={() => handleDownloadCsv('rejected')}
              className="px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition font-medium"
            >
              Rejected
            </button>
          </div>
        </div>
      </div>

      {/* KPI Status Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded border text-left transition ${
            statusFilter === 'all'
              ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 ring-1 ring-sky-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>All Applicants</span>
            <FiUsers />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-1">
            {statusCounts.all}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded border text-left transition ${
            statusFilter === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 ring-1 ring-amber-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Pending Review</span>
            <FiClock />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
            {statusCounts.pending}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('selected')}
          className={`p-3.5 rounded border text-left transition ${
            statusFilter === 'selected'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Selected Candidates</span>
            <FiCheckCircle />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {statusCounts.selected}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={`p-3.5 rounded border text-left transition ${
            statusFilter === 'rejected'
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 ring-1 ring-rose-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Rejected Candidates</span>
            <FiXCircle />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">
            {statusCounts.rejected}
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative flex items-center gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search applicant name, roll, app no, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded hover:bg-slate-800 transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedCircularId}
            onChange={(e) => setSelectedCircularId(e.target.value)}
            className="text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="">All Admission Circulars</option>
            {circulars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.class_name || 'All'})
              </option>
            ))}
          </select>

          <Link
            href="/staff-panel/admission-result"
            className="text-xs px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded flex items-center gap-1.5 shadow-sm transition"
          >
            <FiAward className="w-3.5 h-3.5" /> Publish Results
          </Link>
        </div>
      </div>

      {/* Applicants List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Applicant Tracking</th>
                <th className="py-3 px-4">Candidate & Contacts</th>
                <th className="py-3 px-4">Circular & Class</th>
                <th className="py-3 px-4">Fee Payment</th>
                <th className="py-3 px-4">Merit Score</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Evaluation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                    Loading applicants...
                  </td>
                </tr>
              ) : applicants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No applicants found under this filter criteria.
                  </td>
                </tr>
              ) : (
                applicants.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {app.application_no}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Roll: <span className="font-semibold text-slate-600 dark:text-slate-300">{app.roll_no || 'Pending'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {app.photo_url ? (
                          <img
                            src={app.photo_url}
                            alt={app.applicant_name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-[10px]">
                            {app.applicant_name?.charAt(0) || 'A'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{app.applicant_name}</div>
                          <div className="text-[11px] text-slate-400">
                            {app.phone} {app.email ? `• ${app.email}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{app.circular_title}</div>
                      <div className="text-[10px] text-slate-400">{app.class_name} • {app.session_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          app.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        <FiDollarSign className="w-3 h-3" />
                        {app.payment_status}
                      </span>
                      {app.gateway_provider && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono uppercase">
                          via {app.gateway_provider}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {app.merit_score !== null ? (
                        <div className="font-bold text-sky-600 dark:text-sky-400">
                          {app.merit_score} pts {app.merit_rank ? `(#${app.merit_rank})` : ''}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setScoreModalApplicant(app);
                            setScoreInput('');
                            setRankInput('');
                          }}
                          className="text-[10px] text-slate-400 hover:text-sky-600 underline"
                        >
                          + Set Score
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded ${
                          app.status === 'selected'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-emerald-300'
                            : app.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Select Button */}
                        <button
                          onClick={() => handleEvaluate(app.id, 'selected')}
                          disabled={actionLoading || app.status === 'selected'}
                          className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                            app.status === 'selected'
                              ? 'bg-emerald-50 text-emerald-700 opacity-60 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                          }`}
                          title="Select / Approve Applicant"
                        >
                          Select
                        </button>

                        {/* Reject Button */}
                        <button
                          onClick={() => handleEvaluate(app.id, 'rejected')}
                          disabled={actionLoading || app.status === 'rejected'}
                          className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                            app.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 opacity-60 cursor-default'
                              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                          }`}
                          title="Reject Applicant"
                        >
                          Reject
                        </button>

                        {/* Score Button */}
                        <button
                          onClick={() => {
                            setScoreModalApplicant(app);
                            setScoreInput(app.merit_score !== null ? String(app.merit_score) : '');
                            setRankInput(app.merit_rank !== null ? String(app.merit_rank) : '');
                          }}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="Assign Merit Score / Rank"
                        >
                          <FiAward className="w-3.5 h-3.5" />
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => setActiveApplicant(app)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="View Full Profile"
                        >
                          <FiEye className="w-3.5 h-3.5" />
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

      {/* Applicant Details Modal */}
      {activeApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {activeApplicant.photo_url ? (
                  <img
                    src={activeApplicant.photo_url}
                    alt={activeApplicant.applicant_name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center text-lg">
                    {activeApplicant.applicant_name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {activeApplicant.applicant_name}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    App No: <strong>{activeApplicant.application_no}</strong> | Roll: <strong>{activeApplicant.roll_no || 'Pending'}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveApplicant(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Status Header Bar */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Decision Status</span>
                  <span className="font-bold text-sm uppercase text-slate-900 dark:text-white">
                    {activeApplicant.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEvaluate(activeApplicant.id, 'selected')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs"
                  >
                    Select Candidate
                  </button>
                  <button
                    onClick={() => handleEvaluate(activeApplicant.id, 'rejected')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded text-xs"
                  >
                    Reject Candidate
                  </button>
                </div>
              </div>

              {/* Personal & Academic Data Grid */}
              <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                  <strong className="block text-slate-400 text-[10px] uppercase">Candidate Email</strong>
                  <span>{activeApplicant.email || 'Not specified'}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                  <strong className="block text-slate-400 text-[10px] uppercase">Phone Number</strong>
                  <span>{activeApplicant.phone || 'Not specified'}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                  <strong className="block text-slate-400 text-[10px] uppercase">Date of Birth / Gender</strong>
                  <span>{activeApplicant.date_of_birth ? new Date(activeApplicant.date_of_birth).toLocaleDateString() : 'N/A'} • {activeApplicant.gender || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                  <strong className="block text-slate-400 text-[10px] uppercase">Blood Group / Religion</strong>
                  <span>{activeApplicant.blood_group || 'N/A'} • {activeApplicant.religion || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                  <strong className="block text-slate-400 text-[10px] uppercase">Father&apos;s Name & Contact</strong>
                  <span>{activeApplicant.father_name || 'N/A'} ({activeApplicant.father_phone || 'N/A'})</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                  <strong className="block text-slate-400 text-[10px] uppercase">Mother&apos;s Name & Contact</strong>
                  <span>{activeApplicant.mother_name || 'N/A'} ({activeApplicant.mother_phone || 'N/A'})</span>
                </div>
              </div>

              {/* Media Preview (Photo & Signature) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-semibold text-slate-900 dark:text-white block text-[11px] uppercase tracking-wider">
                  Uploaded Candidate Media
                </span>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Candidate Photo (500x500):</span>
                    {activeApplicant.photo_url ? (
                      <img
                        src={activeApplicant.photo_url}
                        alt="Candidate 500x500"
                        className="w-24 h-24 object-cover rounded border border-slate-300 dark:border-slate-600"
                      />
                    ) : (
                      <span className="text-slate-400 italic">No photo uploaded</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Candidate Signature:</span>
                    {activeApplicant.signature_url ? (
                      <img
                        src={activeApplicant.signature_url}
                        alt="Candidate Signature"
                        className="h-10 max-w-[150px] object-contain border border-slate-300 dark:border-slate-600 bg-white p-1 rounded"
                      />
                    ) : (
                      <span className="text-slate-400 italic">No signature uploaded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveApplicant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-medium text-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {scoreModalApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-sm w-full p-4 shadow-xl text-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiAward className="text-sky-600" />
              Assign Merit Score & Rank
            </h3>
            <p className="text-slate-500 text-[11px]">
              Candidate: <strong>{scoreModalApplicant.applicant_name}</strong> ({scoreModalApplicant.application_no})
            </p>

            <form onSubmit={handleScoreSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Merit Score / Marks
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 88.5"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Merit Rank (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1, 2, 3..."
                  value={rankInput}
                  onChange={(e) => setRankInput(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setScoreModalApplicant(null)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdmissionApplicantsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading applicants workstation...</div>}>
      <ApplicantsContent />
    </Suspense>
  );
}
