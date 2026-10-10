'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

export default function OfficerLibrarySetupPage() {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'writers' | 'publishers'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const apiEndpoint = useMemo(() => {
    switch (activeTab) {
      case 'categories': return '/api/library/categories';
      case 'writers': return '/api/library/writers';
      case 'publishers': return '/api/library/publishers';
      default: return '/api/library/categories';
    }
  }, [activeTab]);

  const dataKey = useMemo(() => {
    switch (activeTab) {
      case 'categories': return 'categories';
      case 'writers': return 'writers';
      case 'publishers': return 'publishers';
      default: return 'categories';
    }
  }, [activeTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiEndpoint}?search=${encodeURIComponent(searchTerm)}`);
      const result = await res.json();
      if (result.success) {
        setData(result[dataKey] || []);
      } else {
        setFeedback({ type: 'error', message: result.error || 'Failed to load records.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while fetching records.' });
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, dataKey, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, pageSize]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) =>
      item.name?.toLowerCase().includes(term) ||
      item.code?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setCurrentItem(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      status: 'active',
      bio: '',
      website: '',
      contact: '',
      address: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setModalMode('edit');
    setCurrentItem(item);
    setFormData({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      const res = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setFeedback({
          type: 'success',
          message: modalMode === 'add' ? 'Record created successfully.' : 'Record updated successfully.',
        });
        setModalOpen(false);
        loadData();
      } else {
        setFeedback({ type: 'error', message: result.error || 'Operation failed.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error during save.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiEndpoint}?id=${deleteTarget.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setFeedback({ type: 'success', message: 'Record deleted successfully.' });
        setDeleteTarget(null);
        loadData();
      } else {
        setFeedback({ type: 'error', message: result.error || 'Failed to delete record.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error deleting record.' });
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
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Classification Setup</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
            Officer Library Classifications Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure book categories, author registries, and publication houses for seamless catalog indexing.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          + Add {activeTab === 'categories' ? 'Category' : activeTab === 'writers' ? 'Author' : 'Publisher'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-medium space-x-6">
        {[
          { key: 'categories', label: 'Book Categories' },
          { key: 'writers', label: 'Writers & Authors' },
          { key: 'publishers', label: 'Publishers & Presses' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSearchTerm('');
            }}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === tab.key
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
          <button onClick={() => setFeedback(null)} className="text-[10px] font-semibold underline ml-2 cursor-pointer">
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
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="px-2.5 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">{activeTab === 'categories' ? 'Code' : activeTab === 'writers' ? 'Designation / Bio' : 'Contact / Location'}</th>
                <th className="px-3 py-2 text-center">Books</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-slate-400">
                    Loading classification records...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-slate-400">
                    No records found. Click "+ Add" to create your first entry.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                      {item.description && <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.description}</div>}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {activeTab === 'categories' ? (
                        <span className="font-mono text-[11px]">{item.code || '—'}</span>
                      ) : activeTab === 'writers' ? (
                        <span>{item.bio || item.designation || '—'}</span>
                      ) : (
                        <span>{item.address || item.contact || item.website || '—'}</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-center font-mono font-medium">
                      {item.books_count || 0}
                    </td>

                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          item.status === 'active' || item.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {item.status || (item.is_active ? 'active' : 'inactive')}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
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
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-sm w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {modalMode === 'add' ? 'Add Entry' : 'Edit Entry'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {activeTab === 'categories' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Category Code</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}

              {activeTab === 'writers' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Biography / Description</label>
                  <textarea
                    rows="2"
                    value={formData.bio || formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value, description: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {activeTab === 'publishers' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Address / City</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-0.5">Status</label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-3.5 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium cursor-pointer">
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-sm w-full p-4 shadow-xl space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Entry?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs cursor-pointer">Cancel</button>
              <button onClick={handleDelete} disabled={submitting} className="px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer">
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
