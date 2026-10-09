'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function ResidenceRoomPage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [halls, setHalls] = useState([]);
  const [selectedHallId, setSelectedHallId] = useState(searchParams.get('hall_id') || '');
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Add / Edit Room Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const [formData, setFormData] = useState({
    hall_id: '',
    room_number: '',
    floor_number: 1,
    room_type: 'standard',
    capacity: 4,
    rent_monthly: 0,
    description: '',
    is_active: true,
    auto_generate_seats: true,
  });

  // Room Seats Inspection Drawer
  const [inspectingRoom, setInspectingRoom] = useState(null);
  const [roomSeats, setRoomSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [newSeatNumber, setNewSeatNumber] = useState('');

  // Fetch all halls for dropdown
  const fetchHalls = async () => {
    try {
      const url = getApiEndpoint('/staff/panel/residence/halls');
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setHalls(data.payload.halls || []);
      }
    } catch (err) {
      console.error('Error fetching halls:', err);
    }
  };

  // Fetch rooms
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedHallId) params.set('hall_id', selectedHallId);
      if (selectedFloor !== 'all') params.set('floor', selectedFloor);
      if (selectedType !== 'all') params.set('room_type', selectedType);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const url = getApiEndpoint(`/staff/panel/residence/rooms?${params.toString()}`);
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load rooms.');
      }

      setRooms(data.payload.rooms || []);
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
    fetchRooms();
  }, [selectedHallId, selectedFloor, selectedType]);

  const openCreateModal = () => {
    setEditingRoom(null);
    setFormData({
      hall_id: selectedHallId || (halls[0]?.id ? String(halls[0].id) : ''),
      room_number: '',
      floor_number: 1,
      room_type: 'standard',
      capacity: 4,
      rent_monthly: 0,
      description: '',
      is_active: true,
      auto_generate_seats: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      hall_id: String(room.hall_id),
      room_number: room.room_number || '',
      floor_number: room.floor_number || 1,
      room_type: room.room_type || 'standard',
      capacity: room.capacity || 4,
      rent_monthly: room.rent_monthly || 0,
      description: room.description || '',
      is_active: room.is_active ?? true,
      auto_generate_seats: false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hall_id) {
      toast.error('Please select a hall.');
      return;
    }
    if (!formData.room_number.trim()) {
      toast.error('Room number is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = getApiEndpoint('/staff/panel/residence/rooms');
      const method = editingRoom ? 'PUT' : 'POST';
      const payload = editingRoom ? { id: editingRoom.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save room.');
      }

      toast.success(data.message || (editingRoom ? 'Room updated!' : 'Room created!'));
      setIsModalOpen(false);
      fetchRooms();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (room) => {
    if (!confirm(`Are you sure you want to delete Room "${room.room_number}"? This will delete all unallocated seats.`)) {
      return;
    }

    try {
      const url = getApiEndpoint(`/staff/panel/residence/rooms?id=${room.id}`);
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete room.');
      }

      toast.success(data.message || 'Room deleted successfully.');
      fetchRooms();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Inspect seats for a room
  const inspectRoomSeats = async (room) => {
    setInspectingRoom(room);
    setLoadingSeats(true);
    try {
      const url = getApiEndpoint(`/staff/panel/residence/rooms?id=${room.id}`);
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setRoomSeats(data.payload.seats || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load seats.');
    } finally {
      setLoadingSeats(false);
    }
  };

  // Add individual seat to room
  const handleAddSeat = async (e) => {
    e.preventDefault();
    if (!newSeatNumber.trim() || !inspectingRoom) return;

    try {
      const url = getApiEndpoint('/staff/panel/residence/seats');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: inspectingRoom.id,
          seat_number: newSeatNumber.trim(),
          status: 'available',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      toast.success('Seat added successfully.');
      setNewSeatNumber('');
      inspectRoomSeats(inspectingRoom);
      fetchRooms();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Toggle seat maintenance
  const handleToggleSeatStatus = async (seat) => {
    const nextStatus = seat.status === 'maintenance' ? 'available' : 'maintenance';
    try {
      const url = getApiEndpoint('/staff/panel/residence/seats');
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: seat.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      toast.success(`Seat marked as ${nextStatus}.`);
      inspectRoomSeats(inspectingRoom);
      fetchRooms();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Summary counts
  const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const totalAllocated = rooms.reduce((acc, r) => acc + (r.allocated_seats || 0), 0);
  const totalAvailable = rooms.reduce((acc, r) => acc + (r.available_seats || 0), 0);

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block mb-1">
            Path: /residence-room
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hall Rooms & Bed Seats Setup
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define hall rooms, floors, bed capacity, monthly rents, and manage individual seat availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRooms}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
          >
            <span>＋</span> Add Room
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Rooms</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{rooms.length}</span>
            <span className="text-[10px] font-medium text-blue-600">Listed</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Capacity</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{totalCapacity}</span>
            <span className="text-[10px] font-medium text-slate-500">Total Beds</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">Vacant Beds</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 font-mono">{totalAvailable}</span>
            <span className="text-[10px] font-medium text-emerald-600">Ready</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider">Occupied Beds</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-indigo-600 font-mono">{totalAllocated}</span>
            <span className="text-[10px] font-medium text-indigo-600">Active</span>
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
              placeholder="Search room number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRooms()}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
            />
            <button
              onClick={fetchRooms}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
            >
              Filter
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedHallId}
              onChange={(e) => setSelectedHallId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer outline-none font-medium"
            >
              <option value="">All Residence Halls</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.gender === 'male' ? 'Boys' : h.gender === 'female' ? 'Girls' : 'Co-ed'})
                </option>
              ))}
            </select>

            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
            >
              <option value="all">All Floors</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((fl) => (
                <option key={fl} value={fl}>Floor {fl}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
            >
              <option value="all">All Room Types</option>
              <option value="single">Single Bed</option>
              <option value="double">Double (2 Beds)</option>
              <option value="triple">Triple (3 Beds)</option>
              <option value="quad">Quad (4 Beds)</option>
              <option value="dormitory">Dormitory</option>
              <option value="standard">Standard</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            <p className="text-base mb-1">🚪</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">No rooms found.</p>
            <p className="mt-1">Select a hall or click "Add Room" above to configure your hall rooms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Room & Floor</th>
                  <th className="px-3 py-2.5">Hall Name</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Capacity / Rent</th>
                  <th className="px-3 py-2.5">Seats Inventory</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                        {room.room_number}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Floor {room.floor_number}
                        {room.description ? ` • ${room.description}` : ''}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{room.hall_name}</div>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {room.hall_gender === 'male' ? '♂ Boys Hall' : room.hall_gender === 'female' ? '♀ Girls Hall' : 'Co-ed Hall'}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 capitalize">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {room.room_type}
                      </span>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {room.capacity} {room.capacity === 1 ? 'Bed' : 'Beds'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ৳{parseFloat(room.rent_monthly || 0).toLocaleString()}/mo
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                          {room.available_seats || 0} vacant
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200 dark:border-indigo-800">
                          {room.allocated_seats || 0} occupied
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        room.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {room.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => inspectRoomSeats(room)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer transition shadow-2xs"
                      >
                        Inspect Seats ({room.total_seats || 0}) →
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(room)}
                        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(room)}
                        className="px-2 py-1 rounded border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-medium cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT ROOM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8 space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingRoom ? `Edit Room: ${editingRoom.room_number}` : 'Add New Room'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Residence Hall <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.hall_id}
                  onChange={(e) => setFormData({ ...formData, hall_id: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Hall</option>
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.gender})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Room Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, 204B"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Floor Level
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.floor_number}
                    onChange={(e) => setFormData({ ...formData, floor_number: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Room Type
                  </label>
                  <select
                    value={formData.room_type}
                    onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="single">Single Bed</option>
                    <option value="double">Double (2 Beds)</option>
                    <option value="triple">Triple (3 Beds)</option>
                    <option value="quad">Quad (4 Beds)</option>
                    <option value="dormitory">Dormitory</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bed Capacity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Rent (BDT)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  placeholder="0.00"
                  value={formData.rent_monthly}
                  onChange={(e) => setFormData({ ...formData, rent_monthly: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Amenities
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Attached washroom, balcony, window facing garden..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              {!editingRoom && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="auto_gen_check"
                    checked={formData.auto_generate_seats}
                    onChange={(e) => setFormData({ ...formData, auto_generate_seats: e.target.checked })}
                    className="rounded border-slate-300 text-primary cursor-pointer"
                  />
                  <label htmlFor="auto_gen_check" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    Automatically generate {formData.capacity} seats (Seat-1, Seat-2, etc.)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-60 transition"
                >
                  {isSubmitting ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT ROOM SEATS MODAL */}
      {inspectingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8 space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                  Room Seats Inventory
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Room {inspectingRoom.room_number} ({inspectingRoom.hall_name})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRoom(null)}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Quick Add Seat Form */}
            <form onSubmit={handleAddSeat} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Seat identifier (e.g. Seat-5, Bed 5)..."
                value={newSeatNumber}
                onChange={(e) => setNewSeatNumber(e.target.value)}
                className="flex-1 text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer shrink-0"
              >
                ＋ Add Seat
              </button>
            </form>

            {/* Seats Grid */}
            {loadingSeats ? (
              <div className="text-center py-6 text-xs text-slate-500">
                <div className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mb-1" />
                <p>Loading seats...</p>
              </div>
            ) : roomSeats.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No seats generated for this room yet. Enter a seat identifier above to add one.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {roomSeats.map((seat) => (
                  <div
                    key={seat.id}
                    className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {seat.seat_number}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                            seat.status === 'available'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : seat.status === 'allocated'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {seat.status === 'available' ? '✓ Available' : seat.status === 'allocated' ? '👤 Occupied' : '🛠 Maintenance'}
                        </span>
                      </div>

                      {seat.status === 'allocated' && seat.student_name ? (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                          Resident: <strong className="text-slate-900 dark:text-white">{seat.student_name}</strong> (Reg: {seat.student_reg || '—'})
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {seat.status !== 'allocated' && (
                        <button
                          type="button"
                          onClick={() => handleToggleSeatStatus(seat)}
                          className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                        >
                          {seat.status === 'maintenance' ? 'Set Available' : 'Set Maintenance'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInspectingRoom(null)}
                className="px-3.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-200"
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
