'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiFileText, FiCheckCircle, FiXCircle, FiClock, FiSearch, FiX, FiCheck } from 'react-icons/fi';

export default function AdminHostelApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedSeatId, setSelectedSeatId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resApp, resSeats] = await Promise.all([
        axios.get('/api/hostel-applications'),
        axios.get('/api/hostel-seats')
      ]);

      setApplications(resApp.data.payload?.applications || resApp.data.paylod?.applications || []);
      setSeats(resSeats.data.payload?.seats || resSeats.data.paylod?.seats || []);
    } catch (error) {
      toast.error('Failed to load hostel applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp || !selectedSeatId) {
      toast.error('Please select an available seat to approve the application.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.put(`/api/hostel-applications/${selectedApp.id}`, {
        status: 'approved',
        seat_id: selectedSeatId
      });

      toast.success(response.data.message || 'Application approved and seat allocated!');
      setSelectedApp(null);
      setSelectedSeatId('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectClick = async (appId, studentName) => {
    const reason = window.prompt(`Reject application for ${studentName}? Enter reason (optional):`);
    if (reason === null) return;

    try {
      const response = await axios.put(`/api/hostel-applications/${appId}`, {
        status: 'rejected',
        rejection_reason: reason
      });

      toast.success(response.data.message || 'Application rejected.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const availableSeats = seats.filter(s => s.status === 'available');

  const filteredApps = applications.filter(app => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesSearch = !searchTerm ||
      app.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.student_reg?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.preferred_hostel_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiFileText className="text-primary" /> Student Hostel Applications
        </h1>
        <p className="text-sm text-slate-500">
          Review student applications for hostel seat allocation. Approving an application allocates an available seat and generates cashier billing invoices.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden space-y-4">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800">
              Applications ({filteredApps.length})
            </h2>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search student or hostel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-semibold">Loading applications...</div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">No applications matching filter.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Preferred Hostel</th>
                  <th className="px-6 py-3.5">Reason / Remarks</th>
                  <th className="px-6 py-3.5">Applied Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div>{app.student_name} ({app.student_gender || 'Unspecified'})</div>
                      <div className="text-[10px] text-slate-400 font-semibold">Reg: {app.student_reg} ({app.class_name})</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {app.preferred_hostel_name ? (
                        <span>{app.preferred_hostel_name} ({app.hostel_gender || 'Both'} Hall)</span>
                      ) : (
                        <span className="text-slate-400 italic">No preference</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[220px] truncate">
                      {app.reason || <span className="italic text-slate-300">No reason stated</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">
                      {new Date(app.applied_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="px-6 py-4">
                      {app.status === 'pending' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                          <FiClock /> Pending
                        </span>
                      )}
                      {app.status === 'approved' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                          <FiCheckCircle /> Approved
                        </span>
                      )}
                      {app.status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                          <FiXCircle /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {app.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setSelectedSeatId('');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FiCheck /> Approve & Allocate
                          </button>
                          <button
                            onClick={() => handleRejectClick(app.id, app.student_name)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {app.status !== 'pending' && (
                        <span className="text-[10px] font-bold text-slate-400">
                          Reviewed by {app.reviewed_by}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APPROVAL & SEAT ALLOCATION MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiCheckCircle className="text-emerald-600" /> Approve Application & Allocate Seat
              </h3>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <FiX />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 space-y-1">
              <p><span className="font-bold">Student:</span> {selectedApp.student_name} ({selectedApp.student_gender || 'Unspecified'})</p>
              <p><span className="font-bold">Registration:</span> {selectedApp.student_reg} ({selectedApp.class_name})</p>
              <p><span className="font-bold">Preferred Hostel:</span> {selectedApp.preferred_hostel_name || 'No preference'}</p>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Select Available Seat</label>
                <select
                  required
                  value={selectedSeatId}
                  onChange={(e) => setSelectedSeatId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Choose Available Seat --</option>
                  {availableSeats
                    .filter((s) => {
                      const hG = (s.hostel_gender || 'Both').toLowerCase();
                      if (hG === 'both') return true;
                      const sG = (selectedApp?.student_gender || '').toLowerCase();
                      const isFemaleStudent = sG.includes('female') || sG === 'f';
                      const isMaleStudent = !isFemaleStudent && (sG.includes('male') || sG === 'm');
                      const isMaleHostel = hG === 'male' || (hG.includes('male') && !hG.includes('female'));
                      const isFemaleHostel = hG === 'female' || hG.includes('female');
                      if (isMaleHostel && !isMaleStudent) return false;
                      if (isFemaleHostel && !isFemaleStudent) return false;
                      return true;
                    })
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Seat {s.seat_code} - {s.hostel_name} ({s.hostel_gender || 'Both'} Hall, Floor {s.floor}, Room {s.room_number})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Approving...' : 'Approve & Allocate Seat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
