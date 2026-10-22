'use client';

import React, { useState, useEffect, useCallback, Suspense, useContext } from 'react';
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
import { motion } from 'framer-motion';

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

  const fetchResults = useCallback(
    async (searchParam = '', showLoader = false) => {
      if (showLoader) setLoading(true);
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
    },
    [getApiEndpoint, apiBase, selectedCircularId]
  );

  // Load circulars & initial merit list
  useEffect(() => {
    let isMounted = true;
    const applyUrl = getApiEndpoint ? getApiEndpoint('admissions/apply') : `${apiBase}/admissions/apply`;
    fetch(applyUrl)
      .then(async (res) => {
        if (!res.ok) return { success: false };
        return res.json();
      })
      .then((data) => {
        if (isMounted && data?.success && data?.circulars) {
          setCirculars(data.circulars);
        }
      })
      .catch((err) => console.error(err));

    (async () => {
      try {
        let url = getApiEndpoint ? getApiEndpoint('admissions/results') : `${apiBase}/admissions/results`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success) {
          setResults(data.results || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiBase, getApiEndpoint]);

  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
    fetchResults(query);
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-2.5 py-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold uppercase tracking-wider">
            <FiAward className="w-3.5 h-3.5" /> Official Merit Publication
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
            Admission Intake Merit Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Search candidate merit ranking by Application Tracking Number or Examination Roll Number. Strictly displays verified selected candidates.
          </p>
        </motion.div>

        {/* Search Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3"
        >
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Enter Application No (e.g. APP-2026-0001) or Roll No..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-style w-full text-xs pl-10 pr-3 py-2.5 font-mono"
              />
            </div>

            <select
              value={selectedCircularId}
              onChange={(e) => setSelectedCircularId(e.target.value)}
              className="input-style w-full sm:w-auto text-xs px-3 py-2.5 font-medium cursor-pointer"
            >
              <option value="">All Intake Circulars</option>
              {circulars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium text-xs rounded-xl shadow-xs hover:shadow-md hover:shadow-primary/20 transition-all cursor-pointer"
            >
              Check Result
            </motion.button>
          </form>
        </motion.div>

        {/* Individual Candidate Result Slip Card if Searched */}
        {hasSearched && (
          <div className="transition-all">
            {searchedCandidate ? (
              <div className="bg-white dark:bg-slate-900 border border-primary/30 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-lg">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                        Congratulations! Candidate Selected
                      </h3>
                      <span className="text-xs text-primary font-medium">
                        Merit Rank #{searchedCandidate.merit_rank || 1} • {searchedCandidate.merit_score || 0} Points
                      </span>
                    </div>
                  </div>

                  <span className="px-3.5 py-1 bg-primary text-white text-[10px] font-semibold uppercase rounded-full self-start sm:self-center tracking-wider">
                    OFFICIALLY QUALIFIED
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Candidate</span>
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{searchedCandidate.applicant_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Application Tracking</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{searchedCandidate.application_no}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Roll Number</span>
                    <span className="font-mono font-bold text-primary">{searchedCandidate.roll_no || 'Assigned'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Intake Session</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{searchedCandidate.session_name || 'Academic'}</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <div>
                    <strong>Ready for Student Setup!</strong>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                      Your admission has been confirmed and student record registered. You can now verify your email and setup your student account password to access the portal.
                    </p>
                  </div>
                  <Link
                    href={`/auth/student/setup?email=${encodeURIComponent(searchedCandidate.email || '')}`}
                    className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 self-start sm:self-center"
                  >
                    <span>Setup Student Account</span>
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-xs">
                <FiInfo className="w-8 h-8 text-primary mx-auto" />
                <h4 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                  No Published Merit Result Found
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  No selected publication record was found matching &quot;{query}&quot;. Results strictly display candidates who have been officially approved and published by academic administration.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Published Merit Ranking Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FiAward className="text-primary w-4 h-4" /> Published Merit Ranking List
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {results.length} Selected Candidates
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Merit Rank</th>
                  <th className="py-3.5 px-4">Candidate Name</th>
                  <th className="py-3.5 px-4">Roll / Application No</th>
                  <th className="py-3.5 px-4">Target Class & Session</th>
                  <th className="py-3.5 px-4">Merit Score</th>
                  <th className="py-3.5 px-4 text-right">Selection Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="flex justify-center items-center py-2">
                        <div className="loader loader-sm" />
                      </div>
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
                    <tr key={res.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary text-sm">
                        #{res.merit_rank || idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {res.applicant_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{res.roll_no || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">{res.application_no}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{res.class_name || 'Academic Class'}</div>
                        <div className="text-[10px] text-slate-400">{res.session_name || '2026-2027'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-primary">
                        {res.merit_score !== null ? `${res.merit_score} pts` : 'Qualified'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-primary/10 text-primary border border-primary/20">
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
    </div>
  );
}

export default function PublicAdmissionResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 flex justify-center items-center">
          <div className="loader loader-md" />
        </div>
      }
    >
      <PublicResultsContent />
    </Suspense>
  );
}
