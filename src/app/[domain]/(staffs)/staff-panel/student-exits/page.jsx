'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import {
  FiUsers,
  FiSearch,
  FiPlus,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiTrash2,
  FiEdit,
  FiExternalLink,
  FiFileText,
  FiShield,
  FiAlertTriangle,
  FiLogOut,
} from 'react-icons/fi';

const EXIT_TYPE_TABS = [
  { key: 'all', label: 'All Departures' },
  { key: 'graduated', label: 'Graduated' },
  { key: 'transferred', label: 'Transferred' },
  { key: 'dropped_out', label: 'Dropped Out' },
  { key: 'rusticated', label: 'Rusticated' },
];

export default function StudentExitsPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [activeTab, setActiveTab] = useState('all');
  const [exits, setExits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Record Exit Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeStudents, setActiveStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Exit Form
  const [exitForm, setExitForm] = useState({
    exit_type: 'graduated',
    exit_date: new Date().toISOString().split('T')[0],
    reason: '',
    destination_institution: '',
    destination_address: '',
    financial_clearance: true,
    library_clearance: true,
    hall_clearance: true,
    clearance_notes: '',
  });

  // Selected Detail Modal
  const [detailExit, setDetailExit] = useState(null);

  const fetchExits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('exit_type', activeTab);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('page', pagination.page.toString());
      params.set('limit', '50');

      const res = await fetch(getApiEndpoint(`staff/panel/student-exits?${params.toString()}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setExits(data.payload?.exits || []);
        if (data.payload?.pagination) {
          setPagination(data.payload.pagination);
        }
      } else {
        toast.error(data.error || 'Failed to load exit records.');
      }
    } catch {
      toast.error('Network error loading exit records.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, pagination.page, getApiEndpoint]);

  useEffect(() => {
    fetchExits();
  }, [fetchExits]);

  // Fetch active students for recording modal
  const fetchActiveStudents = async (query = '') => {
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (query.trim()) params.set('search', query.trim());
      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveStudents(data.payload?.students || []);
      }
    } catch {
      console.warn('Error fetching active students');
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    fetchActiveStudents('');
    setSelectedStudent(null);
    setExitForm({
      exit_type: 'graduated',
      exit_date: new Date().toISOString().split('T')[0],
      reason: '',
      destination_institution: '',
      destination_address: '',
      financial_clearance: true,
      library_clearance: true,
      hall_clearance: true,
      clearance_notes: '',
    });
  };

  const handleSubmitExit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student.');
      return;
    }
    if (!exitForm.reason.trim()) {
      toast.error('Please provide a reason or summary for the departure.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/student-exits'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          ...exitForm,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Exit record saved successfully.');
        setShowModal(false);
        fetchExits();
      } else {
        toast.error(data.error || 'Failed to record student exit.');
      }
    } catch {
      toast.error('Network error saving exit record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivateStudent = async (exit) => {
    if (
      !window.confirm(
        `Cancel departure record and reactivate ${exit.student_name} (${exit.registration_no}) as an active student?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(getApiEndpoint(`staff/panel/student-exits?id=${exit.id}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Student reactivated successfully.');
        fetchExits();
        if (detailExit?.id === exit.id) setDetailExit(null);
      } else {
        toast.error(data.error || 'Failed to reactivate student.');
      }
    } catch {
      toast.error('Error reactivating student.');
    }
  };

  const getExitBadge = (type) => {
    switch (type) {
      case 'graduated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            ✓ Graduated
          </span>
        );
      case 'transferred':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            ⇄ Transferred
          </span>
        );
      case 'dropped_out':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            ⚠ Dropped Out
          </span>
        );
      case 'rusticated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            ⛔ Rusticated
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FiLogOut className="text-primary text-lg" /> Student Exit &amp; Transfer Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Maintain official records of departed students, track graduation, transfer destinations, dropouts, and institutional clearances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchExits}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded text-xs font-medium shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FiPlus /> Record Departure
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {EXIT_TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72 relative">
          <input
            type="text"
            placeholder="Search by student, reg, destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-slate-800 dark:focus:border-slate-400"
          />
          <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <div className="loader loader-sm" />
            <span className="text-xs text-slate-400">Loading departure records...</span>
          </div>
        ) : exits.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No departure records found matching the active criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5">Student</th>
                  <th className="px-3.5 py-2.5">Exit Classification</th>
                  <th className="px-3.5 py-2.5">Exit Date</th>
                  <th className="px-3.5 py-2.5">Destination / Reason</th>
                  <th className="px-3.5 py-2.5">Institutional Clearances</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {exits.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.student_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Reg: {item.registration_no} {item.roll_no ? `| Roll: ${item.roll_no}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.class_name} {item.section_name ? `(${item.section_name})` : ''}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">{getExitBadge(item.exit_type)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {item.exit_date}
                    </td>
                    <td className="px-3.5 py-2.5 max-w-xs">
                      {item.destination_institution && (
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.destination_institution}
                        </div>
                      )}
                      <div className="text-slate-500 text-[11px] line-clamp-2">
                        {item.reason || 'No detailed reason provided'}
                      </div>
                      {item.tc_number && (
                        <span className="inline-block mt-0.5 text-[10px] font-mono text-primary">
                          Ref TC #{item.tc_number}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-col gap-0.5 text-[10px]">
                        <span className="flex items-center gap-1">
                          {item.financial_clearance ? (
                            <FiCheckCircle className="text-emerald-500" />
                          ) : (
                            <FiXCircle className="text-rose-500" />
                          )}
                          Finance Cleared
                        </span>
                        <span className="flex items-center gap-1">
                          {item.library_clearance ? (
                            <FiCheckCircle className="text-emerald-500" />
                          ) : (
                            <FiXCircle className="text-rose-500" />
                          )}
                          Library Cleared
                        </span>
                        <span className="flex items-center gap-1">
                          {item.hall_clearance ? (
                            <FiCheckCircle className="text-emerald-500" />
                          ) : (
                            <FiXCircle className="text-rose-500" />
                          )}
                          Hall Cleared
                        </span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailExit(item)}
                          className="px-2 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Dossier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReactivateStudent(item)}
                          className="px-2 py-1 rounded text-[11px] font-medium border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title="Re-admit & Cancel Exit Record"
                        >
                          Re-Admit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Departure Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl w-full p-5 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiPlus className="text-primary" /> Record Student Exit or Departure
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitExit} className="space-y-4 text-xs">
              {/* Student Picker */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Select Departing Student <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Search student by name, reg, roll..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    fetchActiveStudents(e.target.value);
                  }}
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-100 dark:divide-slate-800">
                  {activeStudents.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className={`p-2 cursor-pointer flex items-center justify-between transition ${
                        selectedStudent?.id === s.id
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Reg: {s.registration_no} | Roll: {s.roll_no || '—'}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500">{s.class_name}</span>
                    </div>
                  ))}
                </div>
                {selectedStudent && (
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium flex items-center justify-between">
                    <span>
                      Selected: {selectedStudent.name} ({selectedStudent.registration_no})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Classification & Exit Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exit Classification <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={exitForm.exit_type}
                    onChange={(e) => setExitForm({ ...exitForm, exit_type: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="graduated">Graduated (Completed Studies)</option>
                    <option value="transferred">Transferred (Relocated/Another School)</option>
                    <option value="dropped_out">Dropped Out (Discontinued)</option>
                    <option value="rusticated">Rusticated (Disciplinary Action)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Departure <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={exitForm.exit_date}
                    onChange={(e) => setExitForm({ ...exitForm, exit_date: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Destination School / College */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination Institution / University (if transferred/graduated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka University, St. Joseph Higher Secondary..."
                  value={exitForm.destination_institution}
                  onChange={(e) => setExitForm({ ...exitForm, destination_institution: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Departure Reason / Academic Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide summary of graduation, transfer reason, or dropout circumstances..."
                  value={exitForm.reason}
                  onChange={(e) => setExitForm({ ...exitForm, reason: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Institutional Clearances Checklist */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Institutional Clearances
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exitForm.financial_clearance}
                      onChange={(e) => setExitForm({ ...exitForm, financial_clearance: e.target.checked })}
                    />
                    Tuition Fees Cleared
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exitForm.library_clearance}
                      onChange={(e) => setExitForm({ ...exitForm, library_clearance: e.target.checked })}
                    />
                    Library Books Returned
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exitForm.hall_clearance}
                      onChange={(e) => setExitForm({ ...exitForm, hall_clearance: e.target.checked })}
                    />
                    Hall / Seat Released
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 font-medium cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Confirm Departure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Dossier Modal */}
      {detailExit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiFileText className="text-primary" /> Departure Record Dossier
              </h3>
              <button
                type="button"
                onClick={() => setDetailExit(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {detailExit.student_name}
                  </h4>
                  <p className="font-mono text-slate-500">
                    Reg No: {detailExit.registration_no} | Roll: {detailExit.roll_no || '—'}
                  </p>
                  <p className="text-slate-500">
                    Class: {detailExit.class_name} ({detailExit.section_name})
                  </p>
                </div>
                <div>{getExitBadge(detailExit.exit_type)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 border border-slate-200 dark:border-slate-800 rounded">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">Exit Date</span>
                  <span className="font-mono">{detailExit.exit_date}</span>
                </div>
                <div className="p-2 border border-slate-200 dark:border-slate-800 rounded">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">Destination</span>
                  <span className="font-semibold">{detailExit.destination_institution || '—'}</span>
                </div>
              </div>

              <div className="p-2.5 border border-slate-200 dark:border-slate-800 rounded space-y-1">
                <span className="block text-[10px] uppercase font-semibold text-slate-400">Reason / Details</span>
                <p className="text-slate-700 dark:text-slate-300">{detailExit.reason || 'None provided'}</p>
              </div>

              <div className="p-2.5 border border-slate-200 dark:border-slate-800 rounded space-y-1.5">
                <span className="block text-[10px] uppercase font-semibold text-slate-400">Institutional Clearances</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    {detailExit.financial_clearance ? <FiCheckCircle className="text-emerald-500" /> : <FiXCircle className="text-rose-500" />} Finance
                  </span>
                  <span className="flex items-center gap-1">
                    {detailExit.library_clearance ? <FiCheckCircle className="text-emerald-500" /> : <FiXCircle className="text-rose-500" />} Library
                  </span>
                  <span className="flex items-center gap-1">
                    {detailExit.hall_clearance ? <FiCheckCircle className="text-emerald-500" /> : <FiXCircle className="text-rose-500" />} Hall
                  </span>
                </div>
                {detailExit.clearance_notes && (
                  <p className="text-[11px] text-slate-500 italic mt-1">{detailExit.clearance_notes}</p>
                )}
              </div>

              <div className="text-[10px] text-slate-400">
                Recorded By: {detailExit.recorded_by_staff_name || 'Staff Administrator'} on{' '}
                {new Date(detailExit.created_at).toLocaleString()}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleReactivateStudent(detailExit)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                Re-Admit Student
              </button>
              <button
                type="button"
                onClick={() => setDetailExit(null)}
                className="px-3 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
