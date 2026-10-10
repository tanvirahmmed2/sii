'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function ResidenceListPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [loading, setLoading] = useState(true);
  const [halls, setHalls] = useState([]);
  const [stats, setStats] = useState({
    total_halls: 0,
    total_rooms: 0,
    total_seats: 0,
    total_allocated: 0,
    total_available: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingHall, setEditingHall] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    gender: 'male',
    provost_name: '',
    contact_number: '',
    email: '',
    location: '',
    description: '',
    total_floors: 1,
    is_active: true,
  });

  const fetchHalls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedGender !== 'all') params.set('gender', selectedGender);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      const url = getApiEndpoint(`/staff/panel/residence/halls?${params.toString()}`);
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load halls.');
      }

      setHalls(data.payload.halls || []);
      setStats(data.payload.stats || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, [selectedGender, selectedStatus]);

  const openCreateModal = () => {
    setEditingHall(null);
    setFormData({
      name: '',
      code: '',
      gender: 'male',
      provost_name: '',
      contact_number: '',
      email: '',
      location: '',
      description: '',
      total_floors: 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (hall) => {
    setEditingHall(hall);
    setFormData({
      name: hall.name || '',
      code: hall.code || '',
      gender: hall.gender || 'male',
      provost_name: hall.provost_name || '',
      contact_number: hall.contact_number || '',
      email: hall.email || '',
      location: hall.location || '',
      description: hall.description || '',
      total_floors: hall.total_floors || 1,
      is_active: hall.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Hall name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = getApiEndpoint('/staff/panel/residence/halls');
      const method = editingHall ? 'PUT' : 'POST';
      const bodyData = editingHall ? { id: editingHall.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save hall.');
      }

      toast.success(data.message || (editingHall ? 'Hall updated!' : 'Hall created!'));
      setIsModalOpen(false);
      fetchHalls();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (hall) => {
    if (!confirm(`Are you sure you want to delete "${hall.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const url = getApiEndpoint(`/staff/panel/residence/halls?id=${hall.id}`);
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete hall.');
      }

      toast.success(data.message || 'Hall deleted successfully.');
      fetchHalls();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const occupancyRate = stats.total_seats > 0
    ? Math.round((stats.total_allocated / stats.total_seats) * 100)
    : 0;

  return (
    <div className="w-full space-y-5">
      {/* Page Title & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block mb-1">
            Path: /residence-list
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Halls & Dormitory Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure student residence halls, provosts, floor plans, and view overall room and seat occupancy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHalls}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh
          </button>
          <button
            onClick={() => {
              if (isModalOpen) {
                setIsModalOpen(false);
                setEditingHall(null);
              } else {
                openCreateModal();
              }
            }}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-2xs ${
              isModalOpen
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {isModalOpen ? <span>✕ Close Form</span> : <span>＋ Create Hall</span>}
          </button>
        </div>
      </div>

      {/* IN-PAGE CREATE / EDIT FORM */}
      {isModalOpen && (
        <div className="bg-white dark:bg-slate-900 border-2 border-primary/30 rounded-lg p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                {editingHall ? 'Edit Facility Record' : 'New Residence Facility'}
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingHall ? `Editing Hall: ${editingHall.name}` : 'Create New Residence Hall'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingHall(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕ Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="sm:col-span-2 md:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hall Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shaheed Salam Hall"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Code / Abbreviation
                </label>
                <input
                  type="text"
                  placeholder="e.g. SSH-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gender Designation
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="male">Male (Boys)</option>
                  <option value="female">Female (Girls)</option>
                  <option value="co-ed">Co-ed</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Provost / In-Charge Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Dr. Harun Ur Rashid"
                  value={formData.provost_name}
                  onChange={(e) => setFormData({ ...formData, provost_name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Floors
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={formData.total_floors}
                  onChange={(e) => setFormData({ ...formData, total_floors: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 01711223344"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. hall@campus.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campus Location / Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. North Campus, Gate 2"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Amenities
                </label>
                <input
                  type="text"
                  placeholder="Optional details, amenities (e.g. WiFi, Dining room, Gym)..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-3 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hall_active_check"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-primary cursor-pointer"
                />
                <label htmlFor="hall_active_check" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Hall is Active & Open for Room Allocations
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingHall(null);
                }}
                className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-60 transition"
              >
                {isSubmitting ? 'Saving...' : editingHall ? 'Update Hall ✓' : 'Save Hall ✓'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Halls</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{stats.total_halls || 0}</span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Facilities</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Rooms</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{stats.total_rooms || 0}</span>
            <span className="text-[10px] font-medium text-slate-500">Configured</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Seats</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{stats.total_seats || 0}</span>
            <span className="text-[10px] font-medium text-slate-500">Capacity</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">Available Seats</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 font-mono">{stats.total_available || 0}</span>
            <span className="text-[10px] font-medium text-emerald-600">Vacant</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider">Occupancy Rate</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-indigo-600 font-mono">{occupancyRate}%</span>
            <span className="text-[10px] font-medium text-slate-500">{stats.total_allocated || 0} Occupied</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Workstation Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
        {/* Action & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search hall name, code, provost..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchHalls()}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary transition"
            />
            <button
              onClick={fetchHalls}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
            >
              Filter
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
            >
              <option value="all">All Gender Halls</option>
              <option value="male">Male (Boys)</option>
              <option value="female">Female (Girls)</option>
              <option value="co-ed">Co-ed</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Halls Roster Table */}
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading residence halls...</p>
          </div>
        ) : halls.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            <p className="text-base mb-1">🏢</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">No residence halls found.</p>
            <p className="mt-1">Click "Create Hall" above to set up your first dormitory or residence building.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Hall Name & Code</th>
                  <th className="px-3 py-2.5">Type / Gender</th>
                  <th className="px-3 py-2.5">Provost & Contact</th>
                  <th className="px-3 py-2.5">Rooms</th>
                  <th className="px-3 py-2.5">Seats & Occupancy</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {halls.map((hall) => {
                  const hallOccPercent = hall.total_seats > 0
                    ? Math.round((hall.allocated_seats / hall.total_seats) * 100)
                    : 0;

                  return (
                    <tr key={hall.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{hall.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {hall.code ? `Code: ${hall.code} • ` : ''}
                          {hall.total_floors} {hall.total_floors === 1 ? 'Floor' : 'Floors'}
                          {hall.location ? ` • ${hall.location}` : ''}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 capitalize">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          hall.gender === 'female'
                            ? 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800'
                            : hall.gender === 'male'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                        }`}>
                          {hall.gender === 'male' ? '♂ Boys' : hall.gender === 'female' ? '♀ Girls' : '⚧ Co-ed'}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {hall.provost_name || 'Provost not assigned'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {hall.contact_number || hall.email || '—'}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">{hall.total_rooms || 0}</span>
                        <span className="text-[10px] text-slate-400"> rooms</span>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900 dark:text-white text-[11px]">
                            {hall.allocated_seats || 0} / {hall.total_seats || 0}
                          </span>
                          <span className="text-[10px] text-slate-400">({hallOccPercent}%)</span>
                          <span className="text-[10px] text-emerald-600 font-medium ml-auto">
                            {hall.available_seats || 0} vacant
                          </span>
                        </div>
                        <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              hallOccPercent > 90 ? 'bg-rose-500' : hallOccPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, hallOccPercent)}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          hall.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {hall.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/staff-panel/residence-room?hall_id=${hall.id}`}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition"
                        >
                          Manage Rooms →
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            if (isModalOpen && editingHall?.id === hall.id) {
                              setIsModalOpen(false);
                              setEditingHall(null);
                            } else {
                              openEditModal(hall);
                            }
                          }}
                          className={`px-2 py-1 rounded border text-[11px] font-medium cursor-pointer transition ${
                            isModalOpen && editingHall?.id === hall.id
                              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                              : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isModalOpen && editingHall?.id === hall.id ? '✕ Close' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(hall)}
                          className="px-2 py-1 rounded border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-medium cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
