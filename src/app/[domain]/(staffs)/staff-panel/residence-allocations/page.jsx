'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function ResidenceAllocationsPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState([]);
  const [stats, setStats] = useState({
    active_allocations: 0,
    vacated_allocations: 0,
    total_students_served: 0,
  });

  const [halls, setHalls] = useState([]);
  const [selectedHallFilter, setSelectedHallFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Allocate Seat Modal
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [allocSubmitting, setAllocSubmitting] = useState(false);

  // Cascading options for Allocate modal
  const [modalHalls, setModalHalls] = useState([]);
  const [selectedModalHall, setSelectedModalHall] = useState('');
  const [modalRooms, setModalRooms] = useState([]);
  const [selectedModalRoom, setSelectedModalRoom] = useState('');
  const [modalSeats, setModalSeats] = useState([]);
  const [selectedModalSeat, setSelectedModalSeat] = useState('');

  // Student search for allocation
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [allocFormData, setAllocFormData] = useState({
    allocated_date: new Date().toISOString().split('T')[0],
    end_date: '',
    fee_monthly: '',
    remarks: '',
  });

  // Vacate Modal
  const [vacateTarget, setVacateTarget] = useState(null);
  const [vacateDate, setVacateDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacateReason, setVacateReason] = useState('Completed semester / left hall.');
  const [vacateSubmitting, setVacateSubmitting] = useState(false);

  // Fetch halls
  const fetchHalls = async () => {
    try {
      const url = getApiEndpoint('/staff/panel/residence/halls');
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setHalls(data.payload.halls || []);
        setModalHalls(data.payload.halls || []);
      }
    } catch (err) {
      console.error('Error fetching halls:', err);
    }
  };

  // Fetch allocations
  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedHallFilter) params.set('hall_id', selectedHallFilter);
      if (selectedStatusFilter !== 'all') params.set('status', selectedStatusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const url = getApiEndpoint(`/staff/panel/residence/allocations?${params.toString()}`);
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch allocations.');
      }

      setAllocations(data.payload.allocations || []);
      setStats(data.payload.stats || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [selectedHallFilter, selectedStatusFilter]);

  // When modal hall changes -> load rooms
  useEffect(() => {
    if (!selectedModalHall) {
      setModalRooms([]);
      setSelectedModalRoom('');
      setModalSeats([]);
      setSelectedModalSeat('');
      return;
    }

    const loadRooms = async () => {
      try {
        const url = getApiEndpoint(`/staff/panel/residence/rooms?hall_id=${selectedModalHall}`);
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.success) {
          setModalRooms(data.payload.rooms || []);
          setSelectedModalRoom('');
          setModalSeats([]);
          setSelectedModalSeat('');
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadRooms();
  }, [selectedModalHall]);

  // When modal room changes -> load available seats
  useEffect(() => {
    if (!selectedModalRoom) {
      setModalSeats([]);
      setSelectedModalSeat('');
      return;
    }

    const loadSeats = async () => {
      try {
        const url = getApiEndpoint(`/staff/panel/residence/seats?room_id=${selectedModalRoom}&status=available`);
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.success) {
          const avail = data.payload.seats || [];
          setModalSeats(avail);
          if (avail.length > 0) {
            setSelectedModalSeat(String(avail[0].id));
          } else {
            setSelectedModalSeat('');
          }

          // Prepopulate monthly fee from room rent
          const roomObj = modalRooms.find((r) => String(r.id) === String(selectedModalRoom));
          if (roomObj && roomObj.rent_monthly) {
            setAllocFormData((prev) => ({ ...prev, fee_monthly: roomObj.rent_monthly }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSeats();
  }, [selectedModalRoom]);

  // Search students dynamically
  const handleStudentSearch = async () => {
    if (!studentSearchQuery.trim()) return;
    try {
      setSearchingStudents(true);
      const url = getApiEndpoint(`/staff/panel/students?search=${encodeURIComponent(studentSearchQuery.trim())}&limit=10`);
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setStudentSearchResults(data.payload.roster || []);
      }
    } catch (err) {
      toast.error('Failed to search students.');
    } finally {
      setSearchingStudents(false);
    }
  };

  const openAllocateModal = () => {
    setSelectedModalHall(halls[0]?.id ? String(halls[0].id) : '');
    setSelectedModalRoom('');
    setSelectedModalSeat('');
    setSelectedStudent(null);
    setStudentSearchQuery('');
    setStudentSearchResults([]);
    setAllocFormData({
      allocated_date: new Date().toISOString().split('T')[0],
      end_date: '',
      fee_monthly: '',
      remarks: '',
    });
    setIsAllocModalOpen(true);
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedModalSeat) {
      toast.error('Please select an available seat.');
      return;
    }
    if (!selectedStudent) {
      toast.error('Please select a student to allocate.');
      return;
    }

    try {
      setAllocSubmitting(true);
      const url = getApiEndpoint('/staff/panel/residence/allocations');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat_id: selectedModalSeat,
          student_id: selectedStudent.id,
          allocated_date: allocFormData.allocated_date,
          end_date: allocFormData.end_date || null,
          fee_monthly: allocFormData.fee_monthly ? parseFloat(allocFormData.fee_monthly) : undefined,
          remarks: allocFormData.remarks,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to allocate seat.');
      }

      toast.success(data.message || 'Seat allocated successfully!');
      setIsAllocModalOpen(false);
      fetchAllocations();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAllocSubmitting(false);
    }
  };

  // Submit vacate
  const handleVacateSubmit = async (e) => {
    e.preventDefault();
    if (!vacateTarget) return;

    try {
      setVacateSubmitting(true);
      const url = getApiEndpoint('/staff/panel/residence/allocations');
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: vacateTarget.id,
          action: 'vacate',
          vacated_date: vacateDate,
          vacate_reason: vacateReason,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to vacate seat.');
      }

      toast.success(data.message || 'Seat vacated successfully.');
      setVacateTarget(null);
      fetchAllocations();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVacateSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block mb-1">
            Path: /residence-allocations
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Seat Allocation Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Allocate resident students to available hall beds, manage monthly accommodation fees, and track occupancy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllocations}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh
          </button>
          <button
            onClick={openAllocateModal}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
          >
            <span>＋</span> Allocate Seat to Student
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider">Active Residents</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{stats.active_allocations || 0}</span>
            <span className="text-[10px] font-medium text-indigo-600">Occupied Beds</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Vacated Records</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{stats.vacated_allocations || 0}</span>
            <span className="text-[10px] font-medium text-slate-500">History</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">Students Served</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 font-mono">{stats.total_students_served || 0}</span>
            <span className="text-[10px] font-medium text-emerald-600">All Time</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Halls</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{halls.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Available</span>
          </div>
        </div>
      </div>

      {/* Main Table Workstation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search student, reg no, room, hall..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAllocations()}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
            />
            <button
              onClick={fetchAllocations}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
            >
              Filter
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedHallFilter}
              onChange={(e) => setSelectedHallFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
            >
              <option value="">All Halls</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer outline-none font-medium"
            >
              <option value="active">Active Residents Only</option>
              <option value="vacated">Vacated Only</option>
              <option value="all">All Records</option>
            </select>
          </div>
        </div>

        {/* Allocations Table */}
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading student seat allocations...</p>
          </div>
        ) : allocations.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            <p className="text-base mb-1">🛏️</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">No seat allocations found.</p>
            <p className="mt-1">Click "Allocate Seat to Student" above to assign a resident student to a hall bed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Resident Student</th>
                  <th className="px-3 py-2.5">Reg & Roll</th>
                  <th className="px-3 py-2.5">Class</th>
                  <th className="px-3 py-2.5">Hall & Room</th>
                  <th className="px-3 py-2.5">Seat No</th>
                  <th className="px-3 py-2.5">Monthly Fee</th>
                  <th className="px-3 py-2.5">Allocated Date</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
                          {alloc.student_photo_url ? (
                            <img src={alloc.student_photo_url} alt="Photo" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              {alloc.student_name ? alloc.student_name.substring(0, 2).toUpperCase() : 'ST'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {alloc.student_name || 'Enrolled Student'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {alloc.student_number || alloc.student_email || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{alloc.registration_no}</div>
                      <div className="text-[10px] text-slate-400">Roll: {alloc.roll_no || '—'}</div>
                    </td>

                    <td className="px-3 py-2.5">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {alloc.class_name || 'Class —'}
                      </span>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{alloc.hall_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Room {alloc.room_number} (Floor {alloc.floor_number})
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {alloc.seat_number}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 font-mono">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        ৳{parseFloat(alloc.fee_monthly || 0).toLocaleString()}
                      </div>
                      <span className="text-[9px] text-slate-400">/month</span>
                    </td>

                    <td className="px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <div>{alloc.allocated_date ? new Date(alloc.allocated_date).toLocaleDateString() : '—'}</div>
                      {alloc.vacated_date && (
                        <div className="text-[10px] text-rose-500">
                          Vacated: {new Date(alloc.vacated_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        alloc.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {alloc.status === 'active' ? '✓ Active Resident' : 'Vacated'}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {alloc.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setVacateTarget(alloc);
                            setVacateDate(new Date().toISOString().split('T')[0]);
                            setVacateReason('Completed semester / vacated hall.');
                          }}
                          className="px-2.5 py-1 rounded border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-medium cursor-pointer transition"
                        >
                          Vacate Seat ✕
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No action needed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ALLOCATE SEAT MODAL */}
      {isAllocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8 space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                  Residence Assignment Desk
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Allocate Hall Seat to Student
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAllocModalOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
              {/* Step 1: Hall, Room & Available Seat */}
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  1. Select Facility & Seat
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hall <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedModalHall}
                      onChange={(e) => setSelectedModalHall(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">Select Hall</option>
                      {modalHalls.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.gender})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Room <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!selectedModalHall || modalRooms.length === 0}
                      value={selectedModalRoom}
                      onChange={(e) => setSelectedModalRoom(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                    >
                      <option value="">
                        {!selectedModalHall ? 'Select Hall first' : modalRooms.length === 0 ? 'No rooms found' : 'Select Room'}
                      </option>
                      {modalRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.room_number} ({r.available_seats || 0} vacant)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Available Seat <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!selectedModalRoom || modalSeats.length === 0}
                      value={selectedModalSeat}
                      onChange={(e) => setSelectedModalSeat(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer disabled:opacity-50 font-mono font-medium"
                    >
                      <option value="">
                        {!selectedModalRoom ? 'Select Room first' : modalSeats.length === 0 ? 'No vacant seats' : 'Select Vacant Seat'}
                      </option>
                      {modalSeats.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.seat_number} (Available)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Student Search & Selection */}
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  2. Select Enrolled Student
                </p>

                {selectedStudent ? (
                  <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {selectedStudent.name || 'Student'} (Reg: {selectedStudent.registration_no})
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Roll: {selectedStudent.roll_no || '—'} • Class: {selectedStudent.class_name || '—'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Change Student
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search student by Registration No or Name..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleStudentSearch())}
                        className="flex-1 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handleStudentSearch}
                        disabled={searchingStudents}
                        className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
                      >
                        {searchingStudents ? 'Searching...' : 'Search'}
                      </button>
                    </div>

                    {studentSearchResults.length > 0 && (
                      <div className="mt-2 max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                        {studentSearchResults.map((st) => (
                          <div
                            key={st.id}
                            onClick={() => setSelectedStudent(st)}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-white">{st.name || 'Student'}</span>
                              <span className="text-slate-400 ml-1 font-mono text-[10px]">({st.registration_no})</span>
                            </div>
                            <span className="text-[10px] text-slate-500">{st.class_name || 'Class —'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Terms, Dates & Rent */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Allocation Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={allocFormData.allocated_date}
                    onChange={(e) => setAllocFormData({ ...allocFormData, allocated_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Rent Fee (BDT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    placeholder="0.00"
                    value={allocFormData.fee_monthly}
                    onChange={(e) => setAllocFormData({ ...allocFormData, fee_monthly: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={allocFormData.end_date}
                    onChange={(e) => setAllocFormData({ ...allocFormData, end_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Special Remarks / Allocation Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Optional notes or instructions..."
                    value={allocFormData.remarks}
                    onChange={(e) => setAllocFormData({ ...allocFormData, remarks: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAllocModalOpen(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocSubmitting || !selectedModalSeat || !selectedStudent}
                  className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-60 transition"
                >
                  {allocSubmitting ? 'Allocating...' : 'Confirm Allocation ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VACATE / DISALLOCATE MODAL */}
      {vacateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8 space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                  Check-out & Disallocate
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Vacate Student from Seat
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setVacateTarget(null)}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVacateSubmit} className="space-y-3 text-xs">
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-white text-sm">
                  {vacateTarget.student_name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Reg No: {vacateTarget.registration_no}
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
                  Location: {vacateTarget.hall_name} • Room {vacateTarget.room_number} • {vacateTarget.seat_number}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vacate / Departure Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={vacateDate}
                  onChange={(e) => setVacateDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Departure Clearance Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={vacateReason}
                  onChange={(e) => setVacateReason(e.target.value)}
                  placeholder="e.g. Completed academic year, transferred, disciplinary reason..."
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setVacateTarget(null)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vacateSubmitting}
                  className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60 transition"
                >
                  {vacateSubmitting ? 'Vacating...' : 'Confirm Vacate & Release Seat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
