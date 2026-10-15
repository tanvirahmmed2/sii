'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
function EnrollmentContent() {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';
  const [candidates, setCandidates] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [selectedCircularId, setSelectedCircularId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [enrollingCandidate, setEnrollingCandidate] = useState(null);
  const [enrollForm, setEnrollForm] = useState({
    registration_no: '',
    roll_no: '',
    class_id: '',
    section_id: '',
    session_id: ''
  });
  const [enrolling, setEnrolling] = useState(false);
  const [enrolledSuccessData, setEnrolledSuccessData] = useState(null);

  // Load circulars
  useEffect(() => {
    fetch(`${apiBase}/staff/panel/admissions`).then(async res => {
      if (!res.ok) return {
        success: false
      };
      return res.json();
    }).then(data => {
      if (data?.success && data?.circulars) {
        setCirculars(data.circulars);
      }
    }).catch(err => console.error(err));
  }, [apiBase]);

  // Fetch candidates awaiting enrollment
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const url = `${apiBase}/staff/panel/admissions/enrollment${selectedCircularId ? `?circular_id=${selectedCircularId}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setCandidates(data.candidates || []);
      } else {
        toast.error(data.error || 'Failed to fetch selected candidates.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading candidates.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCandidates();
  }, [selectedCircularId, apiBase]);
  const openEnrollModal = cand => {
    setEnrollingCandidate(cand);
    // Generate suggested registration number: REG-2026-xxxx
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    setEnrollForm({
      registration_no: `REG-${new Date().getFullYear()}-${randSuffix}`,
      roll_no: cand.roll_no || String(cand.merit_rank || randSuffix),
      class_id: '',
      section_id: '',
      session_id: ''
    });
  };
  const handleEnrollSubmit = async e => {
    e.preventDefault();
    if (!enrollingCandidate) return;
    setEnrolling(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/admissions/enrollment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          applicant_id: enrollingCandidate.id,
          registration_no: enrollForm.registration_no.trim(),
          roll_no: enrollForm.roll_no.trim(),
          class_id: enrollForm.class_id || null,
          section_id: enrollForm.section_id || null,
          session_id: enrollForm.session_id || null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Student registered to institutional portal successfully!');
        setEnrolledSuccessData({
          student_name: enrollingCandidate.applicant_name,
          email: enrollingCandidate.email,
          registration_no: data.student?.registration_no || enrollForm.registration_no,
          roll_no: data.student?.roll_no || enrollForm.roll_no,
          setup_url: data.setup_url
        });
        setEnrollingCandidate(null);
        fetchCandidates();
      } else {
        toast.error(data.error || 'Failed to register student to portal.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error executing student enrollment.');
    } finally {
      setEnrolling(false);
    }
  };
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = c.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.application_no?.toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm);
      return matchSearch;
    });
  }, [candidates, searchTerm]);
  return <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            
            Selected Candidates Portal Enrollment
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dedicated workstation for authorized staff to manually register approved admission candidates into the official student portal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchCandidates} className="p-2 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition" title="Refresh List">
            
          </button>
          <Link href="/staff-panel/student-data" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded text-xs transition">
            View Active Students List →
          </Link>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Awaiting Portal Registration</span>
            
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {candidates.length}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">Selected candidates</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Email Requirement</span>
            
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white">Strict Email Match</span>
            <span className="text-xs text-emerald-600 font-medium">OTP Verified</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Security State</span>
            
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white">Pending Setup</span>
            <span className="text-xs text-slate-500">Awaiting Student</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          
          <input type="text" placeholder="Search candidate by name, application no, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div className="flex items-center gap-2">
          <select value={selectedCircularId} onChange={e => setSelectedCircularId(e.target.value)} className="text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden">
            <option value="">All Admission Circulars</option>
            {circulars.map(c => <option key={c.id} value={c.id}>
                {c.title} ({c.class_name || 'All Classes'})
              </option>)}
          </select>
        </div>
      </div>

      {/* Candidates List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Selected Candidate</th>
                <th className="py-3 px-4">Application & Merit</th>
                <th className="py-3 px-4">Target Class & Session</th>
                <th className="py-3 px-4">Institutional Email (Required)</th>
                <th className="py-3 px-4">Fee Clearance</th>
                <th className="py-3 px-4 text-right">Portal Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="flex justify-center items-center py-2">
                      <div className="loader loader-sm" />
                    </div>
                  </td>
                </tr> : filteredCandidates.length === 0 ? <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    No selected candidates currently pending portal registration.
                  </td>
                </tr> : filteredCandidates.map(cand => <tr key={cand.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {cand.photo_url ? <img src={cand.photo_url} alt={cand.applicant_name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" /> : <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                            {cand.applicant_name?.charAt(0)}
                          </div>}
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {cand.applicant_name}
                          </div>
                          <div className="text-[11px] text-slate-400">Phone: {cand.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {cand.application_no}
                      </div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        Merit Rank #{cand.merit_rank || 'N/A'} ({cand.merit_score || 0} pts)
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{cand.class_name}</div>
                      <div className="text-[10px] text-slate-400">{cand.session_name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {cand.email ? <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                          {cand.email}
                        </span> : <span className="text-rose-500 italic">No email provided in application</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                        PAID
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => openEnrollModal(cand)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-xs shadow-2xs transition">
                        Register to Portal
                      </button>
                    </td>
                  </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enrollment Confirmation Modal */}
      {enrollingCandidate && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-5 shadow-xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                
                Register Candidate to Student Portal
              </h3>
              <button onClick={() => setEnrollingCandidate(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                Close
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 space-y-1">
              <div><strong>Candidate:</strong> {enrollingCandidate.applicant_name}</div>
              <div><strong>Application No:</strong> {enrollingCandidate.application_no}</div>
              <div><strong>Registered Email:</strong> <span className="font-mono text-indigo-600 dark:text-indigo-400">{enrollingCandidate.email}</span></div>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Registration Number * (Unique Student Identity)
                </label>
                <input type="text" required value={enrollForm.registration_no} onChange={e => setEnrollForm({
              ...enrollForm,
              registration_no: e.target.value
            })} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Roll Number
                </label>
                <input type="text" value={enrollForm.roll_no} onChange={e => setEnrollForm({
              ...enrollForm,
              roll_no: e.target.value
            })} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                <strong>Notice:</strong> An official student identity record will be created in <code>website_students</code> with this email. When the candidate accesses the setup portal, their email will be strictly verified via the institutional Brevo web mailer before they can set a password.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setEnrollingCandidate(null)} className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300">
                  Cancel
                </button>
                <button type="submit" disabled={enrolling} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded disabled:opacity-50">
                  {enrolling ? 'Enrolling...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>}

      {/* Enrollment Success Slip Modal */}
      {enrolledSuccessData && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-5 shadow-xl text-xs space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl">
                
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Student Enrolled Successfully!
              </h3>
              <p className="text-slate-500 text-[11px]">
                Official student record created in <code>website_students</code>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Student Name:</span>
                <strong>{enrolledSuccessData.student_name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Registered Email:</span>
                <strong className="font-mono">{enrolledSuccessData.email}</strong>
              </div>
              <div className="flex justify-between">
                <span>Registration No:</span>
                <strong className="font-mono text-indigo-600">{enrolledSuccessData.registration_no}</strong>
              </div>
              <div className="flex justify-between">
                <span>Roll No:</span>
                <strong className="font-mono">{enrolledSuccessData.roll_no}</strong>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded border border-indigo-200 dark:border-indigo-800 space-y-2">
              <span className="font-semibold text-indigo-900 dark:text-indigo-200 block text-[11px]">
                Student Setup Portal Link:
              </span>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={enrolledSuccessData.setup_url} className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 font-mono text-[10px]" />
                <button onClick={() => copyToClipboard(enrolledSuccessData.setup_url, 'Setup Link')} className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-[11px] flex items-center gap-1">
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                The student must verify their email address (<code>{enrolledSuccessData.email}</code>) via Brevo OTP upon visiting this link.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setEnrolledSuccessData(null)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs">
                Done
              </button>
            </div>
          </div>
        </div>}
    </div>;
}
export default function AdmissionEnrollmentPage() {
  return <Suspense fallback={<div className="p-12 flex justify-center items-center">
          <div className="loader loader-md" />
        </div>}>
      <EnrollmentContent />
    </Suspense>;
}