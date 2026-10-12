'use client';

import React, { useState, useEffect, Suspense, useContext } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import {
  FiAward,
  FiSearch,
  FiCheckCircle,
  FiUser,
  FiCalendar,
  FiLayers,
  FiArrowRight,
  FiInfo
} from 'react-icons/fi';

function PublicResultsContent() {
  const params = useParams();
  const domain = params?.domain || '';
  const { getApiEndpoint } = useContext(TenantWebsiteContext) || {};
  const apiBase = domain ? `/api/${domain}` : '/api';

  const [query, setQuery] = useState('');
  const [selectedCircularId, setSelectedCircularId] = useState('');
  const [circulars, setCirculars] = useState([]);
  const [results, setResults] = useState([]);
  const [searchedCandidate, setSearchedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // Load circulars & initial merit list
  useEffect(() => {
    const applyUrl = getApiEndpoint ? getApiEndpoint('admissions/apply') : `${apiBase}/admissions/apply`;
    fetch(applyUrl)
      .then(async (res) => {
        if (!res.ok) return { success: false };
        return res.json();
      })
      .then((data) => {
        if (data?.success && data?.circulars) {
          setCirculars(data.circulars);
        }
      })
      .catch((err) => console.error(err));

    fetchResults();
  }, [apiBase]);

  const fetchResults = async (searchParam = '') => {
    setLoading(true);
    try {
      let url = getApiEndpoint ? getApiEndpoint('admissions/results') : `${apiBase}/admissions/results`;
      const queryParams = new URLSearchParams();
      if (searchParam.trim()) queryParams.append('query', searchParam.trim());
      if (selectedCircularId) queryParams.append('circular_id', selectedCircularId);

      const qs = queryParams.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        if (searchParam.trim() && data.results?.length > 0) {
          setSearchedCandidate(data.results[0]);
        } else if (searchParam.trim()) {
          setSearchedCandidate(null);
        }
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

  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
    fetchResults(query);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-semibold uppercase tracking-wider">
          <FiAward className="w-3.5 h-3.5" /> Official Merit Publication
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Admission Intake Merit Results
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Search candidate merit ranking by Application Tracking Number or Examination Roll Number. Strictly displays verified selected candidates.
        </p>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Enter Application No (e.g. APP-2026-0001) or Roll No..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={selectedCircularId}
            onChange={(e) => setSelectedCircularId(e.target.value)}
            className="w-full sm:w-auto text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="">All Intake Circulars</option>
            {circulars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-lg shadow-sm transition"
          >
            Check Result
          </button>
        </form>
      </div>

      {/* Individual Candidate Result Slip Card if Searched */}
      {hasSearched && (
        <div className="transition-all">
          {searchedCandidate ? (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 dark:border-emerald-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Congratulations! Candidate Selected
                    </h3>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      Merit Rank #{searchedCandidate.merit_rank || 1} • {searchedCandidate.merit_score || 0} Points
                    </span>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded-full self-start sm:self-center tracking-wider">
                  OFFICIALLY QUALIFIED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Candidate</span>
                  <span className="font-bold text-slate-900 dark:text-white">{searchedCandidate.applicant_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Application Tracking</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{searchedCandidate.application_no}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Roll Number</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{searchedCandidate.roll_no || 'Assigned'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Intake Session</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{searchedCandidate.session_name || 'Academic'}</span>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] text-slate-600 dark:text-slate-300">
                <strong>Next Step:</strong> Institution staff will complete your student portal enrollment. Once enrolled, you will receive an invitation to initialize your student account with your verified email.
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-center space-y-2">
              <FiInfo className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                No Published Merit Result Found
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                No selected publication record was found matching &quot;{query}&quot;. Results strictly display candidates who have been officially approved and published by academic administration.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Published Merit Ranking Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FiAward className="text-amber-500" /> Published Merit Ranking List
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {results.length} Selected Candidates
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Merit Rank</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Roll / Application No</th>
                <th className="py-3 px-4">Target Class & Session</th>
                <th className="py-3 px-4">Merit Score</th>
                <th className="py-3 px-4 text-right">Selection Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    Loading merit results...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    No results have been published for this intake yet. Please check back later.
                  </td>
                </tr>
              ) : (
                results.map((res, idx) => (
                  <tr key={res.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                      #{res.merit_rank || idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {res.applicant_name}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{res.roll_no || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">{res.application_no}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{res.class_name || 'Academic Class'}</div>
                      <div className="text-[10px] text-slate-400">{res.session_name || '2026-2027'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {res.merit_score !== null ? `${res.merit_score} pts` : 'Qualified'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-emerald-300">
                        SELECTED
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

export default function PublicAdmissionResultsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading merit publication...</div>}>
      <PublicResultsContent />
    </Suspense>
  );
}
