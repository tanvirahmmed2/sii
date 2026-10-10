'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

export default function OfficerLibraryShelvesPage() {
  const [shelves, setShelves] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [feedback, setFeedback] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    shelf_name: '',
    shelf_code: '',
    floor: '',
    room: '',
    section: '',
    capacity: 50,
    description: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Shelf Book Roster Drawer / Modal
  const [rosterShelf, setRosterShelf] = useState(null);
  const [rosterBooks, setRosterBooks] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadShelves = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/library/shelves?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setShelves(data.shelves || []);
        if (data.metrics) setMetrics(data.metrics);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load shelves.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while fetching library shelves.' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadShelves();
  }, [loadShelves]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const filteredShelves = useMemo(() => {
    return shelves.filter((s) => {
      const matchSearch =
        !searchTerm ||
        s.shelf_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.shelf_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.floor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.section?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.is_active) ||
        (statusFilter === 'inactive' && !s.is_active);
      return matchSearch && matchStatus;
    });
  }, [shelves, searchTerm, statusFilter]);

  const totalItems = filteredShelves.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedShelves = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredShelves.slice(start, start + pageSize);
  }, [filteredShelves, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setCurrentItem(null);
    setFormData({
      shelf_name: '',
      shelf_code: '',
      floor: '',
      room: '',
      section: '',
      capacity: 50,
      description: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setModalMode('edit');
    setCurrentItem(s);
    setFormData({
      id: s.id,
      shelf_name: s.shelf_name || '',
      shelf_code: s.shelf_code || '',
      floor: s.floor || '',
      room: s.room || '',
      section: s.section || '',
      capacity: s.capacity || 50,
      description: s.description || '',
      is_active: s.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSaveShelf = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      const res = await fetch('/api/library/shelves', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: modalMode === 'add' ? 'Shelf rack registered successfully.' : 'Shelf rack updated.',
        });
        setModalOpen(false);
        loadShelves();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save shelf rack.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while saving shelf rack.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRoster = async (shelf) => {
    setRosterShelf(shelf);
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/library/shelves?id=${shelf.id}`);
      const data = await res.json();
      if (data.success) {
        setRosterBooks(data.books || []);
      }
    } catch (err) {
      console.error('Error fetching shelf roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleDeleteShelf = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/library/shelves?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Shelf rack deleted successfully.' });
        setDeleteTarget(null);
        loadShelves();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete shelf rack.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while deleting shelf rack.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/officer/library" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              ← Officer Library
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Book Shelves</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
            Officer Book Shelves &amp; Racks Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure library bookshelf racks, assign floor/room locations, set physical capacities, and inspect books placed on each rack.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          + Add Shelf Rack
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Shelf Racks
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.total_shelves || shelves.length}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Storage Units</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Capacity
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {metrics.total_capacity || 0}
            </span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Total volume slots</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Placed Books
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {metrics.total_books_placed || 0}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Occupied volume slots</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Remaining Available Space
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {metrics.remaining_capacity || 0}
            </span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Slots open</span>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-2.5 rounded text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[10px] font-semibold underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search shelf name, code, floor, room, section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Shelves</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              onClick={loadShelves}
              className="px-2.5 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Shelves Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Shelf Rack &amp; Code</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2 text-center">Occupancy &amp; Bar</th>
                <th className="px-3 py-2 text-center">Titles</th>
                <th className="px-3 py-2 text-center">Books / Capacity</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-400">
                    Loading shelf racks...
                  </td>
                </tr>
              ) : paginatedShelves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-400">
                    No shelf racks found. Click "+ Add Shelf Rack" to register your first rack.
                  </td>
                </tr>
              ) : (
                paginatedShelves.map((s) => {
                  const pct = Math.min(100, Math.round(s.occupancy_percentage || 0));
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{s.shelf_name}</span>
                          {s.shelf_code && (
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {s.shelf_code}
                            </span>
                          )}
                        </div>
                        {s.description && <div className="text-[10px] text-slate-400 truncate max-w-xs">{s.description}</div>}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="text-slate-800 dark:text-slate-200">
                          {s.room ? `Room ${s.room}` : ''} {s.floor ? `• ${s.floor}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400">{s.section ? `Section: ${s.section}` : 'General Section'}</div>
                      </td>

                      <td className="px-3 py-2.5 w-40">
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span>{pct}% Full</span>
                          <span className="text-slate-400">{s.remaining_capacity} free</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-center font-mono font-medium text-slate-900 dark:text-white">
                        {s.titles_count || 0}
                      </td>

                      <td className="px-3 py-2.5 text-center font-mono">
                        <span className="font-semibold text-slate-900 dark:text-white">{s.total_books_count || 0}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-600 dark:text-slate-400">{s.capacity}</span>
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                            s.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {s.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenRoster(s)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                        >
                          View Books
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} shelf racks
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-900 dark:text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="ml-2 text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add / Edit Shelf Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-md w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {modalMode === 'add' ? 'Add New Shelf Rack' : 'Edit Shelf Rack'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveShelf} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Shelf Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.shelf_name}
                    onChange={(e) => setFormData({ ...formData, shelf_name: e.target.value })}
                    placeholder="e.g. Science Rack A1"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Shelf Code / Tag
                  </label>
                  <input
                    type="text"
                    value={formData.shelf_code}
                    onChange={(e) => setFormData({ ...formData, shelf_code: e.target.value })}
                    placeholder="e.g. SH-SCI-01"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Floor</label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="2nd Floor"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Room</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="Room 204"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Section</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="Physics"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                  Physical Book Capacity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notes or landmarks for finding this rack..."
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Shelf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Drawer Modal */}
      {rosterShelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-lg w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Books on Rack: {rosterShelf.shelf_name}
                </h3>
                <p className="text-[10px] text-slate-400">
                  Capacity: {rosterShelf.capacity} • Placed: {rosterShelf.total_books_count || 0} books
                </p>
              </div>
              <button
                onClick={() => setRosterShelf(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {rosterLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading shelf roster...</div>
              ) : rosterBooks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No books are currently assigned to this shelf rack.
                </div>
              ) : (
                rosterBooks.map((bk) => (
                  <div key={bk.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{bk.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {bk.isbn ? `ISBN: ${bk.isbn}` : ''} {bk.call_number ? `• Call: ${bk.call_number}` : ''}
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{bk.available_copies}</span>
                      <span className="text-slate-400"> / {bk.total_copies}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setRosterShelf(null)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-sm w-full p-4 shadow-xl space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Delete Shelf Rack?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete shelf rack <strong>{deleteTarget.shelf_name}</strong>? Any books currently assigned to this rack will have their shelf assignment unlinked.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteShelf}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
