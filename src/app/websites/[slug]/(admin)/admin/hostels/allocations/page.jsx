'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiPlus, FiRepeat, FiX, FiDollarSign, FiSearch } from 'react-icons/fi';

export default function AdminHostelAllocationsPage() {
  const [allocations, setAllocations] = useState([]);
  const [seats, setSeats] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form states
  const [allocStudentId, setAllocStudentId] = useState('');
  const [allocSeatId, setAllocSeatId] = useState('');
  const [transferStudentId, setTransferStudentId] = useState('');
  const [transferTargetSeatId, setTransferTargetSeatId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resA, resS, resSt] = await Promise.all([
        axios.get('/api/hostel-allocations'),
        axios.get('/api/hostel-seats'),
        axios.get('/api/students')
      ]);

      setAllocations(resA.data.payload?.allocations || resA.data.paylod?.allocations || []);
      setSeats(resS.data.payload?.seats || resS.data.paylod?.seats || []);
      setStudents(resSt.data.payload?.students || resSt.data.paylod?.students || []);
    } catch (error) {
      toast.error('Failed to load allocations data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!allocStudentId || !allocSeatId) {
      toast.error('Please select student and seat.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/hostel-allocations', {
        student_id: allocStudentId,
        seat_id: allocSeatId
      });

      toast.success(response.data.message || 'Seat allocated & fees sent to Cashier!');
      setShowAllocateModal(false);
      setAllocStudentId('');
      setAllocSeatId('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferStudentId || !transferTargetSeatId) {
      toast.error('Please select student and target seat.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/hostel-allocations/transfer', {
        student_id: transferStudentId,
        to_seat_id: transferTargetSeatId,
        reason: transferReason
      });

      toast.success(response.data.message || 'Student transferred successfully!');
      setShowTransferModal(false);
      setTransferStudentId('');
      setTransferTargetSeatId('');
      setTransferReason('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const availableSeats = seats.filter(s => s.status === 'available');

  const filteredAllocations = allocations.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.student_name?.toLowerCase().includes(term) ||
      a.student_reg?.toLowerCase().includes(term) ||
      a.seat_code?.toLowerCase().includes(term) ||
      a.hostel_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiCheckCircle className="text-primary" /> Seat Allocations & Student Transfers
          </h1>
          <p className="text-sm text-slate-500">
            Allocate hostel seats to students, automatically issue cashier fee invoices, and execute seat/hall transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAllocateModal(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FiPlus className="text-sm" /> Allocate Seat
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2 bg-sky-950 hover:bg-slate-900 text-sky-400 border border-sky-800/60 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FiRepeat className="text-sm" /> Transfer Student
          </button>
        </div>
      </div>

      {/* Main Allocations Table Card */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden space-y-4">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-800">
            Active Allocations ({filteredAllocations.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search student or seat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-semibold">Loading allocations...</div>
        ) : filteredAllocations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">No active seat allocations found.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Hostel & Seat</th>
                  <th className="px-6 py-3.5">Room & Floor</th>
                  <th className="px-6 py-3.5">Allocation Date</th>
                  <th className="px-6 py-3.5">Cashier Billing Link</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div>{a.student_name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">Reg: {a.student_reg} ({a.class_name})</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">
                      <div>{a.hostel_name}</div>
                      <div className="text-[10px] text-slate-600 font-bold">Seat Code: {a.seat_code}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">
                      Room {a.room_number} (Floor {a.floor})
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">
                      {new Date(a.allocated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                        Invoiced (${a.one_time_fee} alloc + ${a.monthly_fee}/mo)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setTransferStudentId(a.student_id);
                          setShowTransferModal(true);
                        }}
                        className="px-3 py-1.5 bg-sky-950 text-sky-400 hover:bg-slate-900 font-bold rounded-xl text-[11px] border border-sky-800/60 cursor-pointer"
                      >
                        Transfer Seat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ALLOCATE SEAT MODAL */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiPlus className="text-primary" /> Allocate Hostel Seat
              </h3>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleAllocateSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Select Student</label>
                <select
                  required
                  value={allocStudentId}
                  onChange={(e) => setAllocStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.gender || 'Unspecified'}) - Reg: {s.registration_number || s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Select Available Seat</label>
                <select
                  required
                  value={allocSeatId}
                  onChange={(e) => setAllocSeatId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Choose Available Seat --</option>
                  {availableSeats.map((s) => (
                    <option key={s.id} value={s.id}>
                      Seat {s.seat_code} - {s.hostel_name} ({s.hostel_gender || 'Both'} Hall, Floor {s.floor}, Room {s.room_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <FiDollarSign /> Gender & Cashier Billing Note:
                </p>
                <p className="text-[11px] leading-relaxed">
                  Student gender must match the designated hostel gender. Allocating seat will send fee invoices to Cashier.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Allocating...' : 'Allocate Seat & Invoiced'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiRepeat className="text-primary" /> Transfer Student Seat
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Student with Active Seat</label>
                <select
                  required
                  value={transferStudentId}
                  onChange={(e) => setTransferStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Choose Student --</option>
                  {allocations.map((a) => (
                    <option key={a.student_id} value={a.student_id}>
                      {a.student_name} (Current: Seat {a.seat_code} in {a.hostel_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Target New Seat</label>
                <select
                  required
                  value={transferTargetSeatId}
                  onChange={(e) => setTransferTargetSeatId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Choose Target Seat --</option>
                  {availableSeats.map((s) => (
                    <option key={s.id} value={s.id}>
                      Seat {s.seat_code} - {s.hostel_name} ({s.hostel_gender || 'Both'} Hall, Floor {s.floor}, Room {s.room_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Transfer Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Hall transfer request"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-950 hover:bg-slate-900 text-sky-400 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Transferring...' : 'Transfer Student Seat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
