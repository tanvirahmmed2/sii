'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function ClubCategoryPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Inline Form State (NO popup)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Inline Delete State
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Alert Banner
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      let url = `/api/${domain}/staff/panel/clubs/category?`;
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      } else {
        showToast(data.error || 'Failed to load categories', true);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
      showToast('Network error while loading club categories', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [domain, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCategories();
  };

  const openCreateForm = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormIsActive(true);
    setIsFormOpen(true);
  };

  const openEditForm = (cat) => {
    setEditingCategory(cat);
    setFormName(cat.name || '');
    setFormDescription(cat.description || '');
    setFormIsActive(cat.is_active);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Category name is required.', true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        is_active: formIsActive,
      };

      if (editingCategory) {
        payload.id = editingCategory.id;
      }

      const method = editingCategory ? 'PUT' : 'POST';
      const res = await fetch(`/api/${domain}/staff/panel/clubs/category`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(editingCategory ? 'Category updated successfully.' : 'Category created successfully.');
        closeForm();
        fetchCategories();
      } else {
        showToast(data.error || 'Operation failed', true);
      }
    } catch (err) {
      console.error('Save category error:', err);
      showToast('Network error while saving category.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/category?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Category deleted successfully.');
        setConfirmDeleteId(null);
        fetchCategories();
      } else {
        showToast(data.error || 'Failed to delete category', true);
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Network error while deleting category', true);
    } finally {
      setDeletingId(null);
    }
  };

  // KPI Calculations
  const totalRecords = categories.length;
  const activeRecords = categories.filter((c) => c.is_active).length;
  const totalClubsBound = categories.reduce((acc, c) => acc + (parseInt(c.clubs_count, 10) || 0), 0);

  return (
    <div className="w-full space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
          <span>{toastMessage}</span>
          <span className="text-[10px] font-mono uppercase">OK</span>
        </div>
      )}
      {toastError && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-2xs">
          <span>{toastError}</span>
          <span className="text-[10px] font-mono uppercase">ERROR</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Categories</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{totalRecords}</span>
            <span className="text-[10px] font-medium text-slate-500">Classifications</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Status</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{activeRecords}</span>
            <span className="text-[10px] font-medium text-emerald-600">Available</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Associated Clubs</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{totalClubsBound}</span>
            <span className="text-[10px] font-medium text-blue-600">Enrolled</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">System Cycle</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">2026-T1</span>
            <span className="text-[10px] font-medium text-slate-500">Live Workspace</span>
          </div>
        </div>
      </div>

      {/* Inline Create / Edit Workstation Panel (NO popup) */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 border border-primary/30 rounded p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
            </h3>
            <button
              onClick={closeForm}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveCategory} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cultural & Arts, Science Club, Sports"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Brief details about this category..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="categoryIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="categoryIsActive" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Category is Active and available for clubs
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Interactive Workstation Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Action & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search category name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              onClick={openCreateForm}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary hover:bg-primary-dark text-white cursor-pointer transition"
            >
              + Add Category
            </button>
          </div>
        </div>

        {/* High-Density Data Table (NO slug column) */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Category Name</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-center">Clubs Enrolled</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-3 py-8 text-center text-slate-400">
                    Loading club categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 py-8 text-center text-slate-400">
                    No club categories registered yet. Click &quot;+ Add Category&quot; to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{cat.name}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-sm truncate">{cat.description || '—'}</td>
                    <td className="px-3 py-2 text-center font-mono font-medium text-slate-900 dark:text-slate-200">
                      {cat.clubs_count || 0}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          cat.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                      {confirmDeleteId === cat.id ? (
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-1 rounded">
                          <span className="text-[10px] text-rose-700 dark:text-rose-300">Confirm?</span>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            disabled={deletingId === cat.id}
                            className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 border border-slate-300 text-slate-600 text-[10px] rounded cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => openEditForm(cat)}
                            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center"
                            title="Edit Category"
                          >
                            <FiEdit2 className="text-xs" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(cat.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer inline-flex items-center"
                            title="Delete Category"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
