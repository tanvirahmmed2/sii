'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

export default function OfficerLibraryBooksPage() {
  const [books, setBooks] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [categories, setCategories] = useState([]);
  const [writers, setWriters] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedShelf, setSelectedShelf] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [feedback, setFeedback] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookModalMode, setBookModalMode] = useState('add'); // 'add' | 'edit'
  const [currentBook, setCurrentBook] = useState(null);
  const [bookForm, setBookForm] = useState({});

  // Quick Stock / Availability Modal
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockBook, setStockBook] = useState(null);
  const [stockForm, setStockForm] = useState({ total_copies: 1, available_copies: 1, is_available: true });

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch dropdown lookup options
  const loadLookups = useCallback(async () => {
    try {
      const [catRes, wriRes, pubRes, shelfRes] = await Promise.all([
        fetch('/api/library/categories?status=active').then((r) => r.json()),
        fetch('/api/library/writers?status=active').then((r) => r.json()),
        fetch('/api/library/publishers?status=active').then((r) => r.json()),
        fetch('/api/library/shelves?status=active').then((r) => r.json()),
      ]);
      if (catRes.success) setCategories(catRes.categories || []);
      if (wriRes.success) setWriters(wriRes.writers || []);
      if (pubRes.success) setPublishers(pubRes.publishers || []);
      if (shelfRes.success) setShelves(shelfRes.shelves || []);
    } catch (err) {
      console.error('Error fetching lookups:', err);
    }
  }, []);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/library/books?search=${encodeURIComponent(searchTerm)}&category_id=${selectedCategory}&shelf_id=${selectedShelf}&availability=${selectedAvailability}&limit=500`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBooks(data.books || []);
        if (data.metrics) setMetrics(data.metrics);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load books.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while fetching books.' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedShelf, selectedAvailability]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedShelf, selectedAvailability, pageSize]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchSearch =
        !searchTerm ||
        b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.isbn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.call_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.writer_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = !selectedCategory || String(b.category_id) === String(selectedCategory);
      const matchShelf = !selectedShelf || String(b.shelf_id) === String(selectedShelf);
      const matchAvail =
        selectedAvailability === 'all' ||
        (selectedAvailability === 'in_stock' && b.available_copies > 0) ||
        (selectedAvailability === 'out_of_stock' && b.available_copies <= 0);
      return matchSearch && matchCat && matchShelf && matchAvail;
    });
  }, [books, searchTerm, selectedCategory, selectedShelf, selectedAvailability]);

  const totalItems = filteredBooks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setBookModalMode('add');
    setCurrentBook(null);
    setBookForm({
      title: '',
      isbn: '',
      edition: '',
      category_id: categories[0]?.id || '',
      writer_id: writers[0]?.id || '',
      publisher_id: publishers[0]?.id || '',
      shelf_id: '',
      call_number: '',
      shelf_location: '',
      price: 0,
      total_copies: 1,
      available_copies: 1,
      is_available: true,
      description: '',
    });
    setBookModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setBookModalMode('edit');
    setCurrentBook(b);
    setBookForm({
      id: b.id,
      title: b.title || '',
      isbn: b.isbn || '',
      edition: b.edition || '',
      category_id: b.category_id || '',
      writer_id: b.writer_id || '',
      publisher_id: b.publisher_id || '',
      shelf_id: b.shelf_id || '',
      call_number: b.call_number || '',
      shelf_location: b.shelf_name || b.shelf_location || '',
      price: b.price || 0,
      total_copies: b.total_copies ?? 1,
      available_copies: b.available_copies ?? 1,
      is_available: b.is_available !== false,
      description: b.description || '',
    });
    setBookModalOpen(true);
  };

  const handleOpenStock = (b) => {
    setStockBook(b);
    setStockForm({
      total_copies: b.total_copies,
      available_copies: b.available_copies,
      is_available: b.is_available,
    });
    setStockModalOpen(true);
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const method = bookModalMode === 'add' ? 'POST' : 'PUT';
      const res = await fetch('/api/library/books', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookForm),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: bookModalMode === 'add' ? 'Book cataloged successfully.' : 'Book details updated.',
        });
        setBookModalOpen(false);
        loadBooks();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save book.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while saving book.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!stockBook) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/library/books', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: stockBook.id,
          total_copies: Number(stockForm.total_copies),
          available_copies: Number(stockForm.available_copies),
          is_available: Boolean(stockForm.is_available),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Book stock & availability adjusted.' });
        setStockModalOpen(false);
        loadBooks();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to adjust stock.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while adjusting stock.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/library/books?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Book deleted from catalog.' });
        setDeleteTarget(null);
        loadBooks();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete book.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while deleting book.' });
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
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Books &amp; Catalog</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
            Officer Book Catalog &amp; Inventory Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Add catalog titles, ISBN, barcodes, call numbers, shelf locations, and adjust physical stock.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          + Add New Book
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Catalog Titles
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.total_titles || books.length}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Accession Items</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Physical Copies
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {metrics.total_copies || 0}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Inventory Units</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Available on Shelves
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {metrics.available_copies || 0}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Ready to issue</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Borrowed Copies
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {metrics.borrowed_copies || 0}
            </span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">In Circulation</span>
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
              placeholder="Search title, ISBN, writer, call no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedShelf}
              onChange={(e) => setSelectedShelf(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Shelves &amp; Racks</option>
              {shelves.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shelf_name} {s.shelf_code ? `(${s.shelf_code})` : ''}
                </option>
              ))}
            </select>

            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Availability</option>
              <option value="in_stock">In Stock Only</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            <button
              onClick={loadBooks}
              className="px-2.5 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Books Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Title &amp; Identifiers</th>
                <th className="px-3 py-2">Author &amp; Category</th>
                <th className="px-3 py-2">Shelf Rack</th>
                <th className="px-3 py-2 text-center">Available / Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400">
                    Loading book catalog...
                  </td>
                </tr>
              ) : paginatedBooks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400">
                    No books found matching the current filters.
                  </td>
                </tr>
              ) : (
                paginatedBooks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{b.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {b.isbn ? `ISBN: ${b.isbn}` : 'No ISBN'} {b.call_number ? `• Call: ${b.call_number}` : ''}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="text-slate-800 dark:text-slate-200">{b.writer_name || '—'}</div>
                      <div className="text-[10px] text-slate-400">{b.category_name || 'Uncategorized'}</div>
                    </td>

                    <td className="px-3 py-2.5">
                      {b.shelf_name ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {b.shelf_name} {b.shelf_code ? `(${b.shelf_code})` : ''}
                        </span>
                      ) : b.shelf_location ? (
                        <span className="text-[10px] font-mono text-slate-500">{b.shelf_location}</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Unassigned</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-center font-mono">
                      <span className={b.available_copies > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 font-semibold'}>
                        {b.available_copies}
                      </span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-slate-700 dark:text-slate-300">{b.total_copies}</span>
                    </td>

                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          b.is_available && b.available_copies > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                        }`}
                      >
                        {b.is_available && b.available_copies > 0 ? 'Available' : 'Unavailable'}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenStock(b)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                      >
                        Stock
                      </button>
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(b)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} titles
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

      {/* Add / Edit Book Modal */}
      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-lg w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {bookModalMode === 'add' ? 'Accession New Book' : 'Edit Book Catalog Item'}
              </h3>
              <button
                onClick={() => setBookModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                  Book Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.title || ''}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  placeholder="e.g. Introduction to Algorithms"
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Category
                  </label>
                  <select
                    value={bookForm.category_id || ''}
                    onChange={(e) => setBookForm({ ...bookForm, category_id: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Author / Writer
                  </label>
                  <select
                    value={bookForm.writer_id || ''}
                    onChange={(e) => setBookForm({ ...bookForm, writer_id: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">Select Writer</option>
                    {writers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Publisher
                  </label>
                  <select
                    value={bookForm.publisher_id || ''}
                    onChange={(e) => setBookForm({ ...bookForm, publisher_id: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">Select Publisher</option>
                    {publishers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Book Shelf Rack
                  </label>
                  <select
                    value={bookForm.shelf_id || ''}
                    onChange={(e) => {
                      const shelf = shelves.find((s) => String(s.id) === String(e.target.value));
                      setBookForm({
                        ...bookForm,
                        shelf_id: e.target.value,
                        shelf_location: shelf?.shelf_name || bookForm.shelf_location,
                      });
                    }}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">Select Shelf Rack</option>
                    {shelves.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shelf_name} {s.shelf_code ? `(${s.shelf_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={bookForm.isbn || ''}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    placeholder="978-0..."
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Call Number
                  </label>
                  <input
                    type="text"
                    value={bookForm.call_number || ''}
                    onChange={(e) => setBookForm({ ...bookForm, call_number: e.target.value })}
                    placeholder="QA76.6"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Edition
                  </label>
                  <input
                    type="text"
                    value={bookForm.edition || ''}
                    onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                    placeholder="3rd Ed."
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Total Copies <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bookForm.total_copies ?? 1}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBookForm({
                        ...bookForm,
                        total_copies: val,
                        available_copies: bookModalMode === 'add' ? val : bookForm.available_copies,
                      });
                    }}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Available Copies
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={bookForm.total_copies || 1}
                    value={bookForm.available_copies ?? 1}
                    onChange={(e) => setBookForm({ ...bookForm, available_copies: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Price (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bookForm.price ?? 0}
                    onChange={(e) => setBookForm({ ...bookForm, price: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {stockModalOpen && stockBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-sm w-full p-4 shadow-xl space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Adjust Book Stock &amp; Availability
            </h4>
            <p className="text-xs text-slate-500">{stockBook.title}</p>
            <form onSubmit={handleSaveStock} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Total Copies
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stockForm.total_copies}
                    onChange={(e) => setStockForm({ ...stockForm, total_copies: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    Available Copies
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={stockForm.total_copies}
                    value={stockForm.available_copies}
                    onChange={(e) => setStockForm({ ...stockForm, available_copies: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={stockForm.is_available}
                  onChange={(e) => setStockForm({ ...stockForm, is_available: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0"
                />
                Mark as Borrowable / Active in Catalog
              </label>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
                >
                  {submitting ? 'Updating...' : 'Update Stock'}
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
              Delete Book Catalog Entry?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete <strong>{deleteTarget.title}</strong>? All circulation records referencing this book must be cleared first.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBook}
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
