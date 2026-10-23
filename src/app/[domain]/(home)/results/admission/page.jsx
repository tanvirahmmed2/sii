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
  FiArrowRight,
  FiInfo,
  FiPrinter,
  FiFileText,
  FiPhone,
  FiMapPin,
  FiBookOpen
} from 'react-icons/fi';
import { motion } from 'framer-motion';

function AdmissionResultsContent() {
  const params = useParams();
  const domain = params?.domain || '';
  const { getApiEndpoint } = useContext(TenantWebsiteContext) || {};
  const apiBase = domain ? `/api/${domain}` : '/api';

  const [query, setQuery] = useState('');
  const [selectedCircularId, setSelectedCircularId] = useState('');
  const [circulars, setCirculars] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
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
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (data.success) {
          const list = data.results || [];
          setResults(list);
          if (data.circulars) setCirculars(data.circulars);

          // If searching or list has entries, pick the first as individual candidate
          if (searchParam.trim() && list.length > 0) {
            setSelectedCandidate(list[0]);
          } else if (searchParam.trim()) {
            setSelectedCandidate(null);
          } else if (list.length > 0 && !selectedCandidate) {
            setSelectedCandidate(list[0]);
          }
        } else {
          toast.error(data.error || 'Failed to fetch published results.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error loading admission results.');
      } finally {
        setLoading(false);
      }
    },
    [getApiEndpoint, apiBase, selectedCircularId, selectedCandidate]
  );

  useEffect(() => {
    fetchResults('', true);
  }, [fetchResults]);

  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
    fetchResults(query, true);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb / Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2">
            <Link
              href="/results"
              className="text-xs font-semibold text-slate-500 hover:text-primary transition"
            >
              Results Hub
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-primary">Admission Results</span>
          </div>

          <div className="inline-flex rounded-xl bg-slate-200/60 dark:bg-slate-800/60 p-1 text-xs">
            <span className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 font-semibold text-primary shadow-xs">
              Admission Results
            </span>
            <Link
              href="/results/academic"
              className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium"
            >
              Academic Results
            </Link>
          </div>
        </div>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-2.5"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold uppercase tracking-wider">
            <FiAward className="w-3.5 h-3.5" /> Official Admission Selection
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 dark:text-white tracking-tight">
            Admission Intake Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
            Verify individual candidate selection dossier, merit rank, scores, and proceed with verified student portal registration.
          </p>
        </motion.div>

        {/* Search Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3"
        >
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Enter Application Tracking No (e.g. APP-2026-0001), Roll No, or Name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-style w-full text-xs pl-10 pr-3 py-3 font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <select
              value={selectedCircularId}
              onChange={(e) => {
                setSelectedCircularId(e.target.value);
              }}
              className="input-style w-full sm:w-auto text-xs px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium cursor-pointer"
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
              className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Search Candidate
            </motion.button>
          </form>
        </motion.div>

        {/* Individual Candidate Dossier Card (Always Showing Individual Data) */}
        {selectedCandidate ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 border border-primary/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
          >
            {/* Dossier Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
                  ✓
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">
                    Individual Candidate Result Slip
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl text-slate-900 dark:text-white">
                    {selectedCandidate.applicant_name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedCandidate.circular_title} • {selectedCandidate.class_name || 'Academic Class'} ({selectedCandidate.session_name || '2026-2027'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="px-3.5 py-1 bg-emerald-600 text-white text-[11px] font-semibold uppercase rounded-full tracking-wider shadow-xs">
                  {selectedCandidate.selection_status || selectedCandidate.status || 'SELECTED'}
                </span>
                <button
                  onClick={handlePrintSlip}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition cursor-pointer"
                  title="Print Admission Slip"
                >
                  <FiPrinter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Performance Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Merit Rank</span>
                <span className="text-2xl font-serif font-bold text-primary mt-1 block">
                  #{selectedCandidate.merit_position || selectedCandidate.merit_rank || 1}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Merit Score / Marks</span>
                <span className="text-2xl font-serif font-bold text-slate-900 dark:text-white mt-1 block">
                  {selectedCandidate.score !== null && selectedCandidate.score !== undefined ? `${selectedCandidate.score} pts` : 'Qualified'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tracking No</span>
                <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-2 block truncate">
                  {selectedCandidate.application_no}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Roll Number</span>
                <span className="text-sm font-mono font-bold text-primary mt-2 block">
                  {selectedCandidate.roll_no || 'Assigned'}
                </span>
              </div>
            </div>

            {/* Candidate Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50/70 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Personal Profile</span>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Gender: {selectedCandidate.gender || 'Not specified'}
                </div>
                {selectedCandidate.date_of_birth && (
                  <div className="text-slate-600 dark:text-slate-400">
                    DOB: {new Date(selectedCandidate.date_of_birth).toLocaleDateString()}
                  </div>
                )}
                {selectedCandidate.blood_group && (
                  <div className="text-slate-600 dark:text-slate-400">
                    Blood Group: <strong className="text-primary">{selectedCandidate.blood_group}</strong>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Guardians Info</span>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Father: {selectedCandidate.father_name || 'N/A'}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Mother: {selectedCandidate.mother_name || 'N/A'}
                </div>
                {selectedCandidate.guardian_name && (
                  <div className="text-slate-600 dark:text-slate-400">
                    Guardian: {selectedCandidate.guardian_name}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Contact & Address</span>
                <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FiPhone className="text-slate-400 shrink-0" />
                  <span>{selectedCandidate.phone || 'N/A'}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 truncate">
                  Email: {selectedCandidate.email || 'N/A'}
                </div>
                {selectedCandidate.present_address && (
                  <div className="text-slate-500 dark:text-slate-400 flex items-start gap-1.5 pt-0.5">
                    <FiMapPin className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{selectedCandidate.present_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Student Portal Setup Direct Banner */}
            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-emerald-900 dark:text-emerald-200">
              <div>
                <strong className="text-sm font-semibold flex items-center gap-1.5">
                  <FiCheckCircle className="text-emerald-600 dark:text-emerald-400" />
                  Admission Confirmed • Setup Your Student Account
                </strong>
                <p className="text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                  Your admission has been officially approved. If enrolled, set up your student password and security tokens to access the student portal.
                </p>
              </div>
              <Link
                href={`/auth/student/setup?email=${encodeURIComponent(selectedCandidate.email || '')}`}
                className="shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 self-start sm:self-center"
              >
                <span>Setup Student Account</span>
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        ) : hasSearched ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <FiInfo className="w-8 h-8 text-primary mx-auto" />
            <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
              No Matching Candidate Record
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              No officially selected candidate was found matching &quot;{query}&quot;. Results only show candidates verified and published by admissions administration.
            </p>
          </div>
        ) : null}

        {/* Published Ranking List Table (Click Any Candidate to View Individual Data) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiAward className="text-primary w-4 h-4" /> Published Selection List
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any candidate row to view their individual dossier above
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {results.length} Candidates
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Merit Rank</th>
                  <th className="py-3.5 px-4">Candidate Name</th>
                  <th className="py-3.5 px-4">Tracking / Roll No</th>
                  <th className="py-3.5 px-4">Class & Circular</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4 text-right">Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">
                      Loading published candidate selections...
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-400">
                      No published results available yet. Please check back later.
                    </td>
                  </tr>
                ) : (
                  results.map((res, idx) => {
                    const isSelected = selectedCandidate?.id === res.id;
                    return (
                      <tr
                        key={res.id || idx}
                        onClick={() => setSelectedCandidate(res)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-primary text-sm">
                          #{res.merit_position || res.merit_rank || idx + 1}
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
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{res.circular_title}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-primary">
                          {res.score !== null && res.score !== undefined ? `${res.score} pts` : 'Qualified'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {res.selection_status || res.status || 'SELECTED'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
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
    <Suspense fallback={<div className="p-16 text-center text-xs text-slate-400">Loading Results...</div>}>
      <AdmissionResultsContent />
    </Suspense>
  );
}
