'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentVerifyPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterParams, setFilterParams] = useState(null);

  const [activeTab, setActiveTab] = useState('submitted'); // 'submitted', 'verified', 'rejected', 'pending_setup', 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    submitted_count: 0,
    verified_count: 0,
    rejected_count: 0,
    pending_setup_count: 0,
    total_count: 0,
  });

  // Modal / Drawer state for inspecting student details
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleFilter = (filters) => {
    setFilterParams(filters);
    setHasFiltered(true);
  };

  const handleReset = () => {
    setFilterParams(null);
    setHasFiltered(false);
    setStudents([]);
  };

  const fetchVerifications = async () => {
    if (!filterParams?.classId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab && activeTab !== 'all') params.set('status', activeTab);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (filterParams.sessionId) params.set('session_id', filterParams.sessionId);
      if (filterParams.classId) params.set('class_id', filterParams.classId);
      if (filterParams.sectionId) params.set('section_id', filterParams.sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students/verify?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        setStudents(data.payload?.students || []);
        if (data.payload?.stats) setStats(data.payload.stats);
      } else {
        toast.error(data.error || 'Failed to fetch student verification list.');
      }
    } catch (err) {
      toast.error('Network error loading verifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFiltered && filterParams) {
      fetchVerifications();
    }
  }, [activeTab, filterParams]);

  const handleAction = async (actionType) => {
    if (!selectedStudent) return;

    if (actionType === 'reject' && !reviewNotes.trim()) {
      toast.error('Please enter feedback or reason for rejection.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/students/verify'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          action: actionType,
          notes: reviewNotes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${actionType} student.`);
      }

      toast.success(data.message || `Student ${actionType === 'approve' ? 'verified' : 'rejected'} successfully.`);
      setSelectedStudent(null);
      setReviewNotes('');
      fetchVerifications();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block mb-1">
            Path: /student-verify
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Verify Student Profiles | Staff Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review submitted student records, addresses, guardian verifications, and digital signatures. Approve verified students for portal access.
          </p>
        </div>

        <button
          onClick={fetchVerifications}
          disabled={loading}
          className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>🔄</span> Refresh Roster
        </button>
      </div>

      {/* Academic Filter Bar */}
      <StudentFilterBar
        onFilter={handleFilter}
        onReset={handleReset}
        loading={loading}
        title="Filter Verification Records"
        description="Select session, class, and section to view student verification submissions"
      />

      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🛡️"
          title="Filter by Session, Class & Section to View Verifications"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to inspect student profile verifications."
        />
      ) : (
        <>
          {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('submitted')}
          className={`cursor-pointer border rounded-lg p-3.5 shadow-2xs transition ${
            activeTab === 'submitted'
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <p className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider">
            Pending Review
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {stats.submitted_count || 0}
            </span>
            <span className="text-[10px] text-indigo-600 font-medium animate-pulse">Needs Action</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('verified')}
          className={`cursor-pointer border rounded-lg p-3.5 shadow-2xs transition ${
            activeTab === 'verified'
              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">
            Verified & Active
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 font-mono">
              {stats.verified_count || 0}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Approved</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('rejected')}
          className={`cursor-pointer border rounded-lg p-3.5 shadow-2xs transition ${
            activeTab === 'rejected'
              ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <p className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400 tracking-wider">
            Rejected
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-rose-600 font-mono">
              {stats.rejected_count || 0}
            </span>
            <span className="text-[10px] text-rose-600 font-medium">Feedback Sent</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('pending_setup')}
          className={`cursor-pointer border rounded-lg p-3.5 shadow-2xs transition ${
            activeTab === 'pending_setup'
              ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <p className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 tracking-wider">
            Awaiting Student Setup
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-600 font-mono">
              {stats.pending_setup_count || 0}
            </span>
            <span className="text-[10px] text-amber-600 font-medium">Link Sent</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 text-xs">
            {[
              { id: 'submitted', label: `Pending Review (${stats.submitted_count || 0})` },
              { id: 'verified', label: `Verified (${stats.verified_count || 0})` },
              { id: 'rejected', label: `Rejected (${stats.rejected_count || 0})` },
              { id: 'pending_setup', label: `Pending Setup (${stats.pending_setup_count || 0})` },
              { id: 'all', label: 'All Records' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer text-[11px] ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-xs w-full">
            <input
              type="text"
              placeholder="Search student, reg no, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchVerifications()}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
            />
            <button
              onClick={fetchVerifications}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
            >
              Filter
            </button>
          </div>
        </div>

        {/* Verification Roster Table */}
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading student profiles for verification...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No student records found under status: <strong>{activeTab}</strong>.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Student / Photo</th>
                  <th className="px-3 py-2.5">Reg & Roll</th>
                  <th className="px-3 py-2.5">Enrolled Class</th>
                  <th className="px-3 py-2.5">Guardian & Contact</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Last Updated</th>
                  <th className="px-3 py-2.5 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
                          {st.photo_url ? (
                            <img src={st.photo_url} alt={st.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                              {st.name?.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{st.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{st.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{st.registration_no}</div>
                      <div className="text-[10px] text-slate-400">Roll: {st.roll_no || 'N/A'}</div>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {st.class_name || 'Class —'} {st.section_name ? `(${st.section_name})` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400">{st.session_name || 'Session —'}</div>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="text-slate-800 dark:text-slate-200">
                        {st.guardian_name || st.father_name || st.mother_name || '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {st.guardian_phone || st.father_phone || st.number || 'No phone'}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      {st.verification_status === 'submitted' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-pulse">
                          ⏳ Submitted (Review)
                        </span>
                      )}
                      {st.verification_status === 'verified' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ Verified
                        </span>
                      )}
                      {st.verification_status === 'rejected' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          ✕ Rejected
                        </span>
                      )}
                      {st.verification_status === 'pending_setup' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          ✉ Pending Setup
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-[11px] text-slate-500 font-mono">
                      {st.updated_at ? new Date(st.updated_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(st);
                          setReviewNotes(st.verification_notes || '');
                        }}
                        className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shadow-2xs"
                      >
                        Inspect & Verify →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {/* DETAILED VERIFICATION DRAWER / MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8 space-y-5 p-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                  Verification Inspection Desk
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedStudent.name} (Reg: {selectedStudent.registration_no})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Profile Grid */}
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 text-xs">
              {/* Row: Photo, Signature, Academic Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded border border-slate-200 dark:border-slate-800">
                {/* Photo Preview */}
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Student Photo</p>
                  <div className="w-24 h-28 rounded border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {selectedStudent.photo_url ? (
                      <img src={selectedStudent.photo_url} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-400">No Photo Uploaded</span>
                    )}
                  </div>
                </div>

                {/* Signature Preview */}
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Digital Signature</p>
                  <div className="w-36 h-20 rounded border border-slate-300 dark:border-slate-700 overflow-hidden bg-white flex items-center justify-center p-1">
                    {selectedStudent.signature_url ? (
                      <img src={selectedStudent.signature_url} alt="Signature" className="max-h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400">No Signature Uploaded</span>
                    )}
                  </div>
                </div>

                {/* Academic Metadata */}
                <div className="space-y-1 text-[11px] justify-center flex flex-col">
                  <div><span className="text-slate-400">Class:</span> <span className="font-semibold text-slate-900 dark:text-white">{selectedStudent.class_name || 'N/A'}</span></div>
                  <div><span className="text-slate-400">Section:</span> <span className="font-semibold text-slate-900 dark:text-white">{selectedStudent.section_name || 'N/A'}</span></div>
                  <div><span className="text-slate-400">Session:</span> <span className="font-semibold text-slate-900 dark:text-white">{selectedStudent.session_name || 'N/A'}</span></div>
                  <div><span className="text-slate-400">Roll No:</span> <span className="font-semibold text-slate-900 dark:text-white">{selectedStudent.roll_no || 'N/A'}</span></div>
                  <div><span className="text-slate-400">Unique ID:</span> <span className="font-mono text-slate-900 dark:text-white">{selectedStudent.student_unique_id}</span></div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Personal Information
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div><span className="text-slate-400">Phone:</span> {selectedStudent.number || '—'}</div>
                  <div><span className="text-slate-400">Gender:</span> {selectedStudent.gender || '—'}</div>
                  <div><span className="text-slate-400">Blood Group:</span> {selectedStudent.blood_group || '—'}</div>
                  <div><span className="text-slate-400">DOB:</span> {selectedStudent.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString() : '—'}</div>
                  <div><span className="text-slate-400">Religion:</span> {selectedStudent.religion || '—'}</div>
                  <div><span className="text-slate-400">Admission Date:</span> {selectedStudent.admission_date ? new Date(selectedStudent.admission_date).toLocaleDateString() : '—'}</div>
                </div>
              </div>

              {/* Address Details */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Addresses
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Present Address:</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{selectedStudent.present_address || 'Not filled'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {selectedStudent.city ? `${selectedStudent.city}, ` : ''}
                      {selectedStudent.district ? `${selectedStudent.district}, ` : ''}
                      {selectedStudent.postal_code || ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Permanent Address:</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{selectedStudent.permanent_address || 'Not filled'}</p>
                  </div>
                </div>
              </div>

              {/* Parents & Guardians Details */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Parents & Guardians
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Father</span>
                    <div>Name: {selectedStudent.father_name || '—'}</div>
                    <div>Phone: {selectedStudent.father_phone || '—'}</div>
                    <div>NID: {selectedStudent.father_nid || '—'}</div>
                    <div>Occupation: {selectedStudent.father_occupation || '—'}</div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Mother</span>
                    <div>Name: {selectedStudent.mother_name || '—'}</div>
                    <div>Phone: {selectedStudent.mother_phone || '—'}</div>
                    <div>NID: {selectedStudent.mother_nid || '—'}</div>
                    <div>Occupation: {selectedStudent.mother_occupation || '—'}</div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Local Guardian</span>
                    <div>Name: {selectedStudent.guardian_name || '—'}</div>
                    <div>Relation: {selectedStudent.guardian_relation || '—'}</div>
                    <div>Phone: {selectedStudent.guardian_phone || '—'}</div>
                    <div>Address: {selectedStudent.guardian_address || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Feedback / Review Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Staff Verification Notes (Sent to student if rejected or saved with approval)
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Optional review note or reason for rejection (e.g. Photo resolution is too low, please re-upload passport photo)..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('reject')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-60 transition"
                >
                  {actionLoading ? 'Processing...' : 'Reject Profile ✕'}
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('approve')}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-60 transition shadow-xs"
                >
                  {actionLoading ? 'Verifying...' : 'Approve & Verify Student ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
