'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  FiAward,
  FiCheckCircle,
  FiGlobe,
  FiRefreshCw,
  FiLayers,
  FiUsers,
  FiArrowRight,
  FiEye,
  FiAlertTriangle,
  FiExternalLink
} from 'react-icons/fi';

function ResultsContent() {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  const [results, setResults] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [selectedCircularId, setSelectedCircularId] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [meta, setMeta] = useState({ total_published: 0, total_selected_available: 0 });

  // Load circulars
  useEffect(() => {
    fetch(`${apiBase}/staff/panel/admissions`)
      .then(async (res) => {
        if (!res.ok) return { success: false };
        return res.json();
      })
      .then((data) => {
        if (data?.success && data?.circulars) {
          setCirculars(data.circulars);
          if (data.circulars.length > 0 && !selectedCircularId) {
            setSelectedCircularId(String(data.circulars[0].id));
          }
        }
      })
      .catch((err) => console.error(err));
  }, [apiBase]);

  // Fetch results for the selected circular
  const fetchResults = async () => {
    setLoading(true);
    try {
      const url = `${apiBase}/staff/panel/admissions/results/publish${
        selectedCircularId ? `?circular_id=${selectedCircularId}` : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        setMeta({
          total_published: data.total_published || 0,
          total_selected_available: data.total_selected_available || 0,
        });
      } else {
        toast.error(data.error || 'Failed to fetch published results.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [selectedCircularId, apiBase]);

  // Handle 1-Click Auto-Publish
  const handleAutoPublish = async () => {
    if (!selectedCircularId) {
      toast.error('Please select an admission circular first.');
      return;
    }

    if (!window.confirm('Are you sure you want to auto-publish merit results? This will strictly publish only SELECTED candidates.')) {
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/results/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circular_id: selectedCircularId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Results published successfully!');
        fetchResults();
      } else {
        toast.error(data.error || 'Failed to publish results.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error auto-publishing results.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiAward className="text-amber-500" />
            Merit Results Publication Workstation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automatically rank and publish merit lists strictly for <strong>Selected</strong> candidates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchResults}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh List"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/admission/results"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded transition"
          >
            <FiGlobe className="w-3.5 h-3.5" /> Public View <FiExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <button
            onClick={handleAutoPublish}
            disabled={publishing || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm transition disabled:opacity-50"
          >
            <FiCheckCircle className="w-4 h-4" />
            {publishing ? 'Publishing...' : 'Auto-Publish Selected Results'}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Published Merit Records</span>
            <FiCheckCircle className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {meta.total_published}
            </span>
            <span className="text-xs text-emerald-600">Strictly Selected</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Eligible Selected Pool</span>
            <FiUsers className="text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {meta.total_selected_available}
            </span>
            <span className="text-xs text-sky-600">Approved by staff</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Next Operational Step</span>
            <FiArrowRight className="text-indigo-500" />
          </div>
          <Link
            href="/staff-panel/admission-enrollment"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
          >
            Register to Student Portal →
          </Link>
        </div>
      </div>

      {/* Circular Selector Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <span className="text-xs font-medium text-slate-500">Target Intake:</span>
          <select
            value={selectedCircularId}
            onChange={(e) => setSelectedCircularId(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="">All Admission Circulars</option>
            {circulars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.class_name || 'All Classes'})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 italic">
          * Unselected or rejected applicants are automatically excluded from public publication.
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Merit Rank</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Roll / Application No</th>
                <th className="py-3 px-4">Class & Session</th>
                <th className="py-3 px-4">Merit Score</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4 text-right">Published Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading published merit results...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No results published yet for this circular. Click &quot;Auto-Publish Selected Results&quot; above to publish all approved candidates.
                  </td>
                </tr>
              ) : (
                results.map((resItem, idx) => (
                  <tr key={resItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                      #{resItem.merit_rank || idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {resItem.photo_url && (
                          <img
                            src={resItem.photo_url}
                            alt={resItem.applicant_name}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                        )}
                        {resItem.applicant_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {resItem.phone} {resItem.email ? `• ${resItem.email}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {resItem.roll_no || 'Pending Roll'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        App: {resItem.application_no}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{resItem.class_name}</div>
                      <div className="text-[10px] text-slate-400">{resItem.session_name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {resItem.merit_score !== null ? `${resItem.merit_score} pts` : 'Qualified'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-emerald-300">
                        {resItem.status || 'SELECTED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400">
                        <FiCheckCircle className="w-3 h-3 text-sky-600" /> Published
                      </span>
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

export default function AdmissionResultPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading results workstation...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
