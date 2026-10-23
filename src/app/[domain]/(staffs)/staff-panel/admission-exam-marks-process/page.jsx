'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
export default function AdmissionExamMarksProcessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';
  const initialAdmissionId = searchParams.get('admission_id') || '';
  const [circulars, setCirculars] = useState([]);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(initialAdmissionId);
  const [loadingCirculars, setLoadingCirculars] = useState(true);
  const [examData, setExamData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unselectedPolicy, setUnselectedPolicy] = useState('rejected'); // 'rejected' | 'waiting'

  // Fetch exam circulars
  useEffect(() => {
    const fetchCirculars = async () => {
      try {
        setLoadingCirculars(true);
        const res = await fetch(`${apiBase}/staff/panel/admissions/exam-marks`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (data.success && data.circulars) {
          setCirculars(data.circulars);
          if (!selectedAdmissionId && data.circulars.length > 0) {
            setSelectedAdmissionId(String(data.circulars[0].id));
          }
        }
      } catch (err) {
        console.error('Error fetching circulars:', err);
        toast.error('Failed to load admission circulars.');
      } finally {
        setLoadingCirculars(false);
      }
    };
    fetchCirculars();
  }, [apiBase, selectedAdmissionId]);

  // Fetch exam applicants & calculated marks
  const fetchExamData = useCallback(async (silent = false) => {
    if (!selectedAdmissionId) return;
    if (!silent) setLoadingData(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/exam-marks?admission_id=${selectedAdmissionId}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setExamData(data);
      } else {
        toast.error(data.error || 'Failed to load exam data.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading exam data.');
    } finally {
      setLoadingData(false);
    }
  }, [apiBase, selectedAdmissionId]);
  useEffect(() => {
    if (selectedAdmissionId) {
      fetchExamData();
    }
  }, [selectedAdmissionId, fetchExamData]);

  // Auto-Select top applicants up to class seat ceiling
  const handleAutoSelect = async () => {
    if (!selectedAdmissionId) {
      toast.error('Please select an admission circular.');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/exam-marks/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admission_id: parseInt(selectedAdmissionId, 10),
          mark_unselected_as: unselectedPolicy
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Auto-selection completed!');
        fetchExamData(true);
      } else {
        toast.error(data.error || 'Failed to auto-select candidates.');
      }
    } catch {
      toast.error('Network error executing auto-selection.');
    } finally {
      setProcessing(false);
    }
  };

  // Publish Results (commits accepted candidates to results and deletes rejected candidates)
  const handlePublishResults = async () => {
    if (!selectedAdmissionId) return;
    setPublishing(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/results/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admission_id: parseInt(selectedAdmissionId, 10),
          remarks_template: 'Selected in Official Merit Intake'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Results published and rejected candidates removed!');
        fetchExamData(true);
      } else {
        toast.error(data.error || 'Failed to publish results.');
      }
    } catch {
      toast.error('Network error publishing results.');
    } finally {
      setPublishing(false);
    }
  };

  // Manual status override
  const handleManualStatus = async (applicantId, newStatus) => {
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/applicants`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: applicantId,
          status: newStatus
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Applicant status updated to ${newStatus.toUpperCase()}`);
        fetchExamData(true);
      } else {
        toast.error(data.error || 'Failed to update applicant status.');
      }
    } catch {
      toast.error('Network error updating status.');
    }
  };

  // Sorted candidates from highest total score to lowest - STRICT RULE: only completed applicants
  const sortedApplicants = useMemo(() => {
    if (!examData?.applicants) return [];
    const completedOnly = examData.applicants.filter(
      (a) => a.status === 'completed' || a.status === 'selected' || a.status === 'rejected'
    );
    const list = [...completedOnly];
    list.sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0));
    return list;
  }, [examData]);

  // Filtered list by search
  const filteredApplicants = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return sortedApplicants;
    return sortedApplicants.filter(a => a.applicant_name.toLowerCase().includes(q) || a.application_no.toLowerCase().includes(q) || a.roll_no && a.roll_no.toLowerCase().includes(q));
  }, [sortedApplicants, searchTerm]);

  // Seat capacity ceiling
  const seatCapacity = useMemo(() => {
    if (!examData?.circular) return 50;
    const circCap = parseInt(examData.circular.capacity, 10) || 50;
    const classMax = examData.circular.class_max_seats ? parseInt(examData.circular.class_max_seats, 10) : circCap;
    return Math.min(circCap, classMax);
  }, [examData]);
  const selectedCount = useMemo(() => {
    return (examData?.applicants || []).filter(a => a.status === 'selected' || a.status === 'accepted').length;
  }, [examData]);
  return <div className="w-full space-y-4">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2.5 py-0.5 rounded uppercase tracking-wider">
                Exam Workstation &bull; Step 2
              </span>
              <Link href={`/staff-panel/admission-exam-marks-upload${selectedAdmissionId ? `?admission_id=${selectedAdmissionId}` : ''}`} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1">
                Back to Marks Upload
              </Link>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              Process Exam Calculations &amp; Auto-Select by Seats
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rank candidates by total exam score, verify breakdown against class seat capacity ({seatCapacity} seats), and publish results.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Select Button */}
            <button onClick={handleAutoSelect} disabled={processing || !examData} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50 cursor-pointer">
              {processing ? <>
                  <div className="loader loader-xs loader-white" />
                  <span>Calculating &amp; Selecting...</span>
                </> : <>
                  
                  <span>Auto-Select Top {seatCapacity} Seats</span>
                </>}
            </button>

            {/* Publish Results Button */}
            <button onClick={handlePublishResults} disabled={publishing || selectedCount === 0} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50 cursor-pointer" title="Publishes accepted candidates to results and deletes rejected applicants">
              {publishing ? <>
                  <div className="loader loader-xs loader-white" />
                  <span>Publishing Results...</span>
                </> : <>
                  
                  <span>Publish Results Now ({selectedCount})</span>
                </>}
            </button>
          </div>
        </div>

        {/* Circular Selector & Options */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              Select Circular:
            </label>
            <select value={selectedAdmissionId} onChange={e => setSelectedAdmissionId(e.target.value)} className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer">
              {circulars.map(c => <option key={c.id} value={c.id}>
                  {c.title} ({c.class_name || 'Class'}) &bull; Seats: {c.capacity}
                </option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Unselected Policy:</span>
            <select value={unselectedPolicy} onChange={e => setUnselectedPolicy(e.target.value)} className="text-xs px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer">
              <option value="rejected">Mark as Rejected (will be deleted on publish)</option>
              <option value="waiting">Mark as Waiting List (pending)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards: Seats, Selected, Cutoff */}
      {examData && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Class Seat Limit</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{seatCapacity}</span>
              <span className="text-[10px] text-slate-500">Max Capacity</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Total Exam Candidates</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                {examData.applicants?.length || 0}
              </span>
              <span className="text-[10px] text-blue-500">Submissions</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Currently Selected</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {selectedCount}
              </span>
              <span className="text-[10px] text-emerald-600">/ {seatCapacity} Seats</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Predicted Cut-off Score</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                {sortedApplicants[seatCapacity - 1]?.score !== undefined ? `${parseFloat(sortedApplicants[seatCapacity - 1].score).toFixed(1)} pts` : 'N/A'}
              </span>
              <span className="text-[10px] text-purple-500">Seat #{seatCapacity}</span>
            </div>
          </div>
        </div>}

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          
          <input type="text" placeholder="Search candidate by name, application no, or roll..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden" />
        </div>

        <button onClick={() => fetchExamData(false)} title="Refresh merit list" className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
          Refresh
        </button>
      </div>

      {/* Merit & Ranking Table: Single row format with full details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Merit Rank</th>
                <th className="py-2.5 px-3">App No &amp; Roll</th>
                <th className="py-2.5 px-3">Candidate Name</th>
                <th className="py-2.5 px-3">Photo</th>
                {examData?.subjects.map(sub => <th key={sub.id} className="py-2.5 px-3 text-purple-900 dark:text-purple-300 bg-purple-50/30 dark:bg-purple-950/20">
                    {sub.title} ({sub.mark})
                  </th>)}
                <th className="py-2.5 px-3">Total Exam Score</th>
                <th className="py-2.5 px-3">Seat Quota Status</th>
                <th className="py-2.5 px-3 text-right">Manual Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loadingData ? <tr>
                  <td colSpan={4 + (examData?.subjects?.length || 0) + 3} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="loader loader-sm" />
                      <span className="text-xs">Loading merit calculation data...</span>
                    </div>
                  </td>
                </tr> : filteredApplicants.length === 0 ? <tr>
                  <td colSpan={4 + (examData?.subjects?.length || 0) + 3} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">No applicants found</span>
                    </div>
                  </td>
                </tr> : filteredApplicants.map((app, index) => {
              const rankNumber = index + 1;
              const isWithinSeats = rankNumber <= seatCapacity;
              const subjects = examData?.subjects || [];
              return <tr key={app.id} className={`transition-colors ${isWithinSeats ? 'bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
                      {/* Merit Rank Badge */}
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] ${rankNumber === 1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 font-extrabold' : rankNumber === 2 ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 font-bold' : rankNumber === 3 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 font-bold' : isWithinSeats ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                          #{rankNumber}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                            {app.application_no}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{app.roll_no || 'No Roll'}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {app.applicant_name}
                      </td>

                      <td className="py-2 px-3">
                        {app.photo_url ? <img src={app.photo_url} alt="Photo" className="w-7 h-7 rounded object-cover border border-slate-200 dark:border-slate-700" /> : <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 text-[10px] flex items-center justify-center text-slate-400">
                            N/A
                          </div>}
                      </td>

                      {/* Subject Breakdown */}
                      {subjects.map(sub => {
                  const breakdown = app.marks_breakdown?.find(b => b.subject_id === sub.id);
                  const markVal = breakdown?.marks_obtained;
                  return <td key={sub.id} className="py-2 px-3 font-mono text-[11px] bg-purple-50/10 dark:bg-purple-950/5">
                            {markVal !== null && markVal !== undefined ? <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {parseFloat(markVal).toFixed(1)}
                              </span> : <span className="text-slate-400 italic">0.0</span>}
                          </td>;
                })}

                      <td className="py-2.5 px-3 font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {parseFloat(app.score || 0).toFixed(2)} pts
                      </td>

                      {/* Seat Quota Status */}
                      <td className="py-2.5 px-3">
                        {app.status === 'selected' || app.status === 'accepted' ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            Selected (Seat #{rankNumber})
                          </span> : isWithinSeats ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200">
                            Eligible (Within Cutoff)
                          </span> : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Outside Cutoff
                          </span>}
                      </td>

                      {/* Manual Override Action Buttons */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleManualStatus(app.id, 'selected')} disabled={app.status === 'selected'} className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition cursor-pointer" title="Force Accept Candidate">
                            Accept
                          </button>
                          <button onClick={() => handleManualStatus(app.id, 'rejected')} disabled={app.status === 'rejected'} className="px-2 py-1 rounded text-[10px] font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 transition cursor-pointer" title="Reject Candidate">
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>;
            })}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
}