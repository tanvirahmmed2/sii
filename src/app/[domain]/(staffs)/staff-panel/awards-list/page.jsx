/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function AwardsListPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';

  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [creating, setCreating] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [awardToDelete, setAwardToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
  }, []);

  const fetchAwards = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/${domain}/staff/panel/awards?`;
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;
      if (selectedYear !== 'all') url += `year=${selectedYear}&`;
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAwards(data.awards || []);
      } else {
        showToast(data.error || 'Failed to load awards catalog', true);
      }
    } catch (err) {
      console.error('Fetch awards error:', err);
      showToast('Network error while loading awards', true);
    } finally {
      setLoading(false);
    }
  }, [domain, selectedStatus, selectedYear, searchTerm, showToast]);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  const handleCreateAward = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/awards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_demo: true }),
      });
      const data = await res.json();

      if (data.success && data.award?.slug) {
        router.push(`/${domain}/staff-panel/awards-list/${data.award.slug}`);
      } else {
        router.push(`/${domain}/staff-panel/awards-create`);
      }
    } catch (err) {
      console.error('Create demo award error:', err);
      router.push(`/${domain}/staff-panel/awards-create`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAward = async () => {
    if (!awardToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/awards?id=${awardToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Award "${awardToDelete.title}" deleted`);
        setDeleteModalOpen(false);
        setAwardToDelete(null);
        fetchAwards();
      } else {
        showToast(data.error || 'Failed to delete award', true);
      }
    } catch (err) {
      console.error('Delete award error:', err);
      showToast('Network error deleting award', true);
    } finally {
      setDeleting(false);
    }
  };

  const toggleAwardStatus = async (award) => {
    try {
      const res = await fetch(`/api/${domain}/staff/panel/awards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: award.id,
          is_active: !award.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Award "${award.title}" set to ${!award.is_active ? 'Active' : 'Inactive'}`);
        fetchAwards();
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  // KPIs & Unique Years
  const totalAwards = awards.length;
  const activeAwards = awards.filter((a) => a.is_active).length;
  const withImagesCount = awards.filter((a) => Boolean(a.image_url)).length;
  const uniqueYears = Array.from(new Set(awards.map((a) => a.year).filter(Boolean))).sort(
    (a, b) => b - a
  );

  return (
    <div className="w-full space-y-4">
      {/* Toast Alerts */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md shadow-lg text-xs font-medium animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-md shadow-lg text-xs font-medium animate-fade-in">
          <span>{toastError}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider">Total Accolades</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold text-slate-900 dark:text-white font-mono">{totalAwards}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Award entries</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider">Publicly Active</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{activeAwards}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Showcased</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider">Trophy Photos</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold text-primary font-mono">{withImagesCount}</span>
            <span className="text-[11px] text-primary">Stored</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider">Chronicle Span</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-semibold text-slate-900 dark:text-white font-mono">
              {uniqueYears.length > 0 ? `${uniqueYears[uniqueYears.length - 1]} – ${uniqueYears[0]}` : 'Current'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {uniqueYears.length} Years
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Awards & Recognitions Catalog
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage school awards, certificates, and trophy photographs (strictly 1 single photo per award).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <input
              type="text"
              placeholder="Search awards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAwards()}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition min-w-[200px]"
            />

            {/* Year Filter */}
            {uniqueYears.length > 0 && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
              >
                <option value="all">All Years</option>
                {uniqueYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              onClick={fetchAwards}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              onClick={handleCreateAward}
              disabled={creating}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-primary hover:bg-primary-dark text-white shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {creating ? (
                <div className="loader loader-sm loader-white" />
              ) : (
                <span>Create Award</span>
              )}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Photo</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Award Title</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Year</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Granting Body</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Status</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <div className="flex justify-center items-center">
                      <div className="loader loader-sm" />
                    </div>
                  </td>
                </tr>
              ) : awards.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No awards found. Click &quot;Create Award&quot; to add institutional honours.
                  </td>
                </tr>
              ) : (
                awards.map((award) => (
                  <tr
                    key={award.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Thumbnail of Single Image */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {award.image_url ? (
                        <div className="w-10 h-10 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                          <img
                            src={award.image_url}
                            alt={award.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[10px] bg-slate-50 dark:bg-slate-800/40" title="No image uploaded">
                          No Pic
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 max-w-sm">
                      <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                        {award.title}
                      </p>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {award.year || '—'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {award.issuer || <span className="text-slate-400 italic">Not specified</span>}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleAwardStatus(award)}
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border ${
                          award.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {award.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${domain}/staff-panel/awards-list/${award.slug}`}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Edit Award"
                        >
                          <FiEdit2 className="text-xs" />
                        </Link>
                        <button
                          onClick={() => {
                            setAwardToDelete(award);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                          title="Delete Award"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Award Confirmation Modal */}
      {deleteModalOpen && awardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md w-full max-w-md shadow-2xl p-5 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <FiTrash2 className="text-lg" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Award Entry</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">&ldquo;{awardToDelete.title}&rdquo;</strong>? This will permanently remove the record and trophy image.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setAwardToDelete(null);
                }}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAward}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting ? (
                  <div className="loader loader-sm loader-white" />
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
