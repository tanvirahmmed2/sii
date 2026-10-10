'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

export default function LibraryShelvesWorkstation() {
  const [shelves, setShelves] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [feedback, setFeedback] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: 'cards' | 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
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

  // Load Shelves
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
        setFeedback({ type: 'error', message: data.error || 'Failed to load book shelves.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error occurred while fetching book shelves.' });
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

  const totalItems = shelves.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedShelves = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return shelves.slice(start, start + pageSize);
  }, [shelves, currentPage, pageSize]);

  // Open Add Modal
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

  // Open Edit Modal
  const handleOpenEdit = (shelf) => {
    setModalMode('edit');
    setCurrentItem(shelf);
    setFormData({
      shelf_name: shelf.shelf_name || '',
      shelf_code: shelf.shelf_code || '',
      floor: shelf.floor || '',
      room: shelf.room || '',
      section: shelf.section || '',
      capacity: shelf.capacity ?? 50,
      description: shelf.description || '',
      is_active: shelf.is_active ?? true,
    });
    setModalOpen(true);
  };

  // Open Book Roster
  const handleOpenRoster = async (shelf) => {
    setRosterShelf(shelf);
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/library/shelves?shelf_id=${shelf.id}`);
      const data = await res.json();
      if (data.success) {
        setRosterShelf(data.shelf || shelf);
        setRosterBooks(data.books || []);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load shelf books.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while loading shelf books.' });
    } finally {
      setRosterLoading(false);
    }
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const method = modalMode === 'add' ? 'POST' : 'PUT';
    const payload = modalMode === 'add' ? formData : { ...formData, id: currentItem.id };

    try {
      const res = await fetch('/api/library/shelves', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Shelf "${data.shelf.shelf_name}" ${modalMode === 'add' ? 'created' : 'updated'} successfully.`
        });
        setModalOpen(false);
        loadShelves();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save shelf.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error occurred while saving shelf.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Shelf
  const handleDeleteShelf = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/library/shelves?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message || 'Shelf deleted successfully.' });
        setDeleteTarget(null);
        if (rosterShelf?.id === deleteTarget.id) setRosterShelf(null);
        loadShelves();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete shelf.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error during shelf deletion.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for Occupancy Color
  const getOccupancyColor = (percentage) => {
    if (percentage >= 100) return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
    if (percentage >= 80) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
  };

  const getBarColor = (percentage) => {
    if (percentage >= 100) return 'bg-rose-600 dark:bg-rose-500';
    if (percentage >= 80) return 'bg-amber-500 dark:bg-amber-400';
    return 'bg-emerald-600 dark:bg-emerald-500';
  };

  return (
    <div className="w-full space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Shelves &amp; Racks
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.total_shelves ?? shelves.length}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Configured Racks</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Shelving Capacity
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.total_capacity ?? 0}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Book Slots</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Books Placed on Shelves
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {metrics.total_books_on_shelves ?? 0}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {metrics.total_available_on_shelves ?? 0} In Stock
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Shelves at 100% Capacity
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-lg font-semibold font-mono ${metrics.full_shelves_count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {metrics.full_shelves_count ?? 0}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Full Shelves</span>
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

      {/* Action / Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5 shadow-2xs">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="Search shelves by name, code, room, floor, section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2 py-1 text-[11px] rounded font-medium transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 text-[11px] rounded font-medium transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Table
            </button>
          </div>

          <button
            onClick={loadShelves}
            className="px-2.5 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            title="Refresh list"
          >
            Refresh
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer shadow-2xs flex items-center gap-1"
          >
            <span>+</span>
            <span>New Shelf Rack</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
          Loading book shelves and live inventory counts...
        </div>
      ) : shelves.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded space-y-2">
          <p>No shelf racks found matching criteria.</p>
          <button
            onClick={handleOpenAdd}
            className="px-3 py-1 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded cursor-pointer"
          >
            Create First Shelf Rack
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Grid of Visual Shelf Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {paginatedShelves.map((shelf) => {
            const occupancy = shelf.occupancy_percentage || 0;
            const booksCount = shelf.total_books_count || 0;
            const capacity = shelf.capacity || 0;
            const availableCount = shelf.available_books_count || 0;
            const borrowedCount = shelf.borrowed_books_count || 0;

            return (
              <div
                key={shelf.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs flex flex-col justify-between space-y-3 hover:border-slate-400 dark:hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={shelf.shelf_name}>
                        {shelf.shelf_name}
                      </h4>
                      {shelf.shelf_code && (
                        <p className="text-[10px] font-mono text-slate-400">{shelf.shelf_code}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                        shelf.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {shelf.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Location Tag */}
                  {(shelf.room || shelf.floor || shelf.section) && (
                    <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-1">
                      {shelf.room && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{shelf.room}</span>}
                      {shelf.floor && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{shelf.floor}</span>}
                      {shelf.section && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{shelf.section}</span>}
                    </div>
                  )}

                  {/* Capacity & Occupancy Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {booksCount} <span className="text-[10px] font-normal text-slate-500">/ {capacity} books</span>
                      </span>
                      <span className={`text-[10px] font-semibold px-1 rounded border ${getOccupancyColor(occupancy)}`}>
                        {occupancy}% Full
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getBarColor(occupancy)}`}
                        style={{ width: `${Math.min(100, Math.max(0, occupancy))}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>{shelf.titles_count || 0} unique titles</span>
                      <span>{shelf.remaining_capacity || 0} slots left</span>
                    </div>
                  </div>

                  {/* Stock Breakdown */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded">
                    <div>
                      <span className="text-slate-400">On Shelf:</span>{' '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{availableCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Borrowed:</span>{' '}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{borrowedCount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                  <button
                    onClick={() => handleOpenRoster(shelf)}
                    className="text-[11px] font-medium text-slate-900 dark:text-slate-200 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>View Books ({booksCount})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(shelf)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(shelf)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* High-Density Data Table View */
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Shelf Rack Name &amp; Code</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Books on Shelf</th>
                <th className="px-3 py-2">Physical Status</th>
                <th className="px-3 py-2">Occupancy</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedShelves.map((shelf) => {
                const occupancy = shelf.occupancy_percentage || 0;
                const booksCount = shelf.total_books_count || 0;
                const capacity = shelf.capacity || 0;

                return (
                  <tr key={shelf.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900 dark:text-white">{shelf.shelf_name}</div>
                      {shelf.shelf_code && (
                        <div className="text-[10px] font-mono text-slate-400">{shelf.shelf_code}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {[shelf.room, shelf.floor, shelf.section].filter(Boolean).join(' • ') || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">
                        {booksCount} / {capacity}
                      </div>
                      <div className="text-[10px] text-slate-400">{shelf.titles_count || 0} distinct titles</div>
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {shelf.available_books_count || 0} In Stock
                      </span>{' '}
                      / <span className="text-blue-600 dark:text-blue-400">{shelf.borrowed_books_count || 0} Borrowed</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded overflow-hidden">
                          <div
                            className={`h-full ${getBarColor(occupancy)}`}
                            style={{ width: `${Math.min(100, Math.max(0, occupancy))}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-semibold px-1 rounded border ${getOccupancyColor(occupancy)}`}>
                          {occupancy}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          shelf.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {shelf.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <button
                        onClick={() => handleOpenRoster(shelf)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                      >
                        Books ({booksCount})
                      </button>
                      <button
                        onClick={() => handleOpenEdit(shelf)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(shelf)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
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

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-xs text-slate-500 shadow-2xs">
        <div>
          Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-300">{totalItems}</span> shelves
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200"
          >
            <option value={4}>4 / page</option>
            <option value={8}>8 / page</option>
            <option value={12}>12 / page</option>
            <option value={24}>24 / page</option>
          </select>

          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Previous
          </button>
          <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Slide-out Drawer / Modal: Shelf Book Roster */}
      {rosterShelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-2xl w-full p-4 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Books on {rosterShelf.shelf_name}</span>
                  {rosterShelf.shelf_code && (
                    <span className="text-xs font-mono text-slate-400">({rosterShelf.shelf_code})</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {[rosterShelf.room, rosterShelf.floor, rosterShelf.section].filter(Boolean).join(' • ') || 'General Location'} — Max Capacity: {rosterShelf.capacity}
                </p>
              </div>
              <button
                onClick={() => setRosterShelf(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Shelf Capacity Bar in Modal */}
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Total Allocated: <strong className="font-mono text-slate-900 dark:text-white">{rosterShelf.total_books_count || 0}</strong> / {rosterShelf.capacity} copies
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {rosterShelf.available_books_count || 0} available on shelf
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded overflow-hidden">
                <div
                  className={`h-full ${getBarColor(rosterShelf.occupancy_percentage || 0)}`}
                  style={{ width: `${Math.min(100, Math.max(0, rosterShelf.occupancy_percentage || 0))}%` }}
                />
              </div>
            </div>

            {/* Books Roster Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded">
              {rosterLoading ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading shelf inventory...</div>
              ) : rosterBooks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No books are currently assigned to this shelf rack. You can allocate books to this rack from the Catalog workstation.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Book Title</th>
                      <th className="px-3 py-2">Author / Category</th>
                      <th className="px-3 py-2">Call No. / ISBN</th>
                      <th className="px-3 py-2 text-right">Copies (Avail/Total)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rosterBooks.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-900 dark:text-white">{b.title}</span>
                          {b.edition && <span className="text-[10px] text-slate-400 ml-1">({b.edition})</span>}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                          {b.writer_name || '—'} {b.category_name ? `• ${b.category_name}` : ''}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {b.call_number || b.isbn || '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{b.available_copies}</span>
                          {' '}/ {b.total_copies}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setRosterShelf(null)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
              >
                Close Shelf View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Shelf */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-md w-full p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {modalMode === 'add' ? 'Add New Shelf Rack' : `Edit Shelf: ${currentItem?.shelf_name}`}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Shelf / Rack Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rack A-1, Science Shelf 3, Fiction Bay"
                  value={formData.shelf_name}
                  onChange={(e) => setFormData({ ...formData, shelf_name: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Shelf Code / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SH-A1, RACK-01"
                    value={formData.shelf_code}
                    onChange={(e) => setFormData({ ...formData, shelf_code: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Holding Capacity (Max Books) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Floor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Floor"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hall 2"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Science"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Location Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. West aisle near study cubicles"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shelf_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <label htmlFor="shelf_active" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Rack is active for accessioning and shelving
                </label>
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
                  {submitting ? 'Saving...' : modalMode === 'add' ? 'Create Shelf' : 'Save Changes'}
                </button>
              </div>
            </form>
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
              Are you sure you want to delete <strong>{deleteTarget.shelf_name}</strong>?
              {deleteTarget.total_books_count > 0 && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                  Notice: {deleteTarget.total_books_count} books are currently shelved on this rack. Deleting this rack will safely unlink their shelf location.
                </span>
              )}
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
