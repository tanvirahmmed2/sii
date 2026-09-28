'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiHome, FiGrid, FiPlus, FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi';

export default function AdminHostelRoomsPage() {
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Room Form state
  const [roomHostelId, setRoomHostelId] = useState('');
  const [roomFloor, setRoomFloor] = useState('1');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('Standard');
  const [roomCapacity, setRoomCapacity] = useState('4');
  const [oneTimeFee, setOneTimeFee] = useState('500');
  const [monthlyFee, setMonthlyFee] = useState('1200');
  const [submittingRoom, setSubmittingRoom] = useState(false);

  // Filter
  const [selectedHostelFilter, setSelectedHostelFilter] = useState('all');
  const [seatSearch, setSeatSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resH, resR, resS] = await Promise.all([
        axios.get('/api/hostels'),
        axios.get('/api/hostel-rooms'),
        axios.get('/api/hostel-seats')
      ]);

      setHostels(resH.data.payload?.hostels || resH.data.paylod?.hostels || []);
      setRooms(resR.data.payload?.rooms || resR.data.paylod?.rooms || []);
      setSeats(resS.data.payload?.seats || resS.data.paylod?.seats || []);
    } catch (error) {
      toast.error('Failed to load rooms and seats data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomHostelId || !roomNumber || !roomCapacity) {
      toast.error('Hostel, Room Number, and Capacity are required.');
      return;
    }

    setSubmittingRoom(true);
    try {
      const payload = {
        hostel_id: roomHostelId,
        floor: parseInt(roomFloor, 10) || 1,
        room_number: roomNumber,
        room_type: roomType,
        capacity: parseInt(roomCapacity, 10),
        one_time_fee: parseFloat(oneTimeFee) || 0,
        monthly_fee: parseFloat(monthlyFee) || 0
      };

      const response = await axios.post('/api/hostel-rooms', payload);
      toast.success(response.data.message || 'Room and seats created successfully!');
      
      setRoomNumber('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message);
    } finally {
      setSubmittingRoom(false);
    }
  };

  const handleDeleteSeat = async (seatId, seatCode) => {
    const confirm = window.confirm(`Delete seat ${seatCode}?`);
    if (!confirm) return;

    try {
      const response = await axios.delete(`/api/hostel-seats/${seatId}`);
      toast.success(response.data.message || 'Seat deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const filteredSeats = seats.filter(s => {
    const matchesHostel = selectedHostelFilter === 'all' || String(s.hostel_id) === String(selectedHostelFilter);
    const matchesSearch = !seatSearch || 
      s.seat_code?.toLowerCase().includes(seatSearch.toLowerCase()) ||
      s.room_number?.toLowerCase().includes(seatSearch.toLowerCase()) ||
      s.student_name?.toLowerCase().includes(seatSearch.toLowerCase());
    return matchesHostel && matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiGrid className="text-primary" /> Rooms & Room Seats Management
        </h1>
        <p className="text-sm text-slate-500">
          Create floor rooms (e.g. 1st Floor Room 101), auto-generate seat codes (101A, 101B), and configure seat fees.
        </p>
      </div>

      {/* Grid: Form + Seat Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Create Room Form */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FiPlus className="text-primary" /> Create Room & Generate Seats
          </h2>

          <form onSubmit={handleRoomSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Select Hostel / Hall</label>
              <select
                required
                value={roomHostelId}
                onChange={(e) => setRoomHostelId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="">-- Choose Hostel --</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Floor Number</label>
                <select
                  value={roomFloor}
                  onChange={(e) => setRoomFloor(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                >
                  <option value="1">1st Floor</option>
                  <option value="2">2nd Floor</option>
                  <option value="3">3rd Floor</option>
                  <option value="4">4th Floor</option>
                  <option value="5">5th Floor</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Room Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 203"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Room Type</label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                >
                  <option value="Standard">Standard</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="AC Room">AC Room</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Capacity (Seats)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">One-Time Fee ($)</label>
                <input
                  type="number"
                  value={oneTimeFee}
                  onChange={(e) => setOneTimeFee(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Monthly Seat Fee ($)</label>
                <input
                  type="number"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * Auto-generates seat codes e.g. {roomNumber || '101'}A, {roomNumber || '101'}B, {roomNumber || '101'}C...
            </p>

            <button
              type="submit"
              disabled={submittingRoom}
              className="py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {submittingRoom ? 'Creating...' : 'Create Room & Seats'}
            </button>
          </form>
        </div>

        {/* Seat Matrix Grid */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-800">
              Hostel Seats Grid ({filteredSeats.length} seats)
            </h2>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedHostelFilter}
                onChange={(e) => setSelectedHostelFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">All Hostels</option>
                {hostels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>

              <div className="relative w-full sm:w-48">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search seat code..."
                  value={seatSearch}
                  onChange={(e) => setSeatSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">Loading rooms and seats...</div>
          ) : filteredSeats.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No seats found matching filter.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredSeats.map((seat) => (
                <div
                  key={seat.id}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 transition-all ${
                    seat.status === 'allocated'
                      ? 'bg-rose-50/50 border-rose-200/80 text-rose-950'
                      : 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold tracking-wider uppercase">
                      Seat {seat.seat_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                      seat.status === 'allocated' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {seat.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p><span className="font-bold">Hostel:</span> {seat.hostel_name}</p>
                    <p><span className="font-bold">Location:</span> Floor {seat.floor}, Room {seat.room_number}</p>
                    <p><span className="font-bold">Fees:</span> ${seat.one_time_fee} alloc / ${seat.monthly_fee}/mo</p>
                  </div>

                  {seat.status === 'allocated' ? (
                    <div className="pt-2 border-t border-rose-200/60 text-[10px] font-bold text-rose-800 flex items-center justify-between">
                      <span className="truncate">{seat.student_name}</span>
                      <span className="shrink-0 text-slate-500">#{seat.student_reg}</span>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-emerald-200/60 flex justify-end">
                      <button
                        onClick={() => handleDeleteSeat(seat.id, seat.seat_code)}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
