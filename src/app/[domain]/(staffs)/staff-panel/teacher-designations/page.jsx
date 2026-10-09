/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  FiAward,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiUsers,
  FiLayers
} from 'react-icons/fi';

export default function TeacherDesignationsPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    display_order: 0,
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, []);

  const fetchDesignations = useCallback(async () => {
    if (!domain) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/designations`);
      const data = await res.json();
      if (data.success) {
        setDesignations(data.designations || []);
      } else {
        showToast(data.error || 'Failed to load designations.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', true);
    } finally {
      setLoading(false);
    }
  }, [domain, showToast]);

  useEffect(() => {
    fetchDesignations();
  }, [fetchDesignations]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      display_order: designations.length + 1,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (des) => {
    setModalMode('edit');
    setEditingId(des.id);
    setFormData({
      title: des.title || '',
      description: des.description || '',
      display_order: des.display_order ?? 0,
      is_active: Boolean(des.is_active)
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Designation title is required.', true);
      return;
    }

    try {
      setSaving(true);
      const url = `/api/${domain}/staff/panel/teacher/designations`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      const payload = modalMode === 'create'
        ? formData
        : { ...formData, id: editingId };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || `Designation ${modalMode === 'create' ? 'created' : 'updated'} successfully.`);
        setIsModalOpen(false);
        fetchDesignations();
      } else {
        showToast(data.error || 'Operation failed.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving designation.', true);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (des) => {
    setItemToDelete(des);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/${domain}/staff/panel/teacher/designations?id=${itemToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Designation deleted.');
        setDeleteModalOpen(false);
        setItemToDelete(null);
        fetchDesignations();
      } else {
        showToast(data.error || 'Failed to delete designation.', true);
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting designation.', true);
    } finally {
      setDeleting(false);
    }
  };

  const filteredList = designations.filter((d) => {
    const matchesSearch = !searchTerm ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && d.is_active) ||
      (selectedStatus === 'inactive' && !d.is_active);

    return matchesSearch && matchesStatus;
  });

  const totalTeachersAssigned = designations.reduce((acc, curr) => acc + (Number(curr.teacher_count) || 0), 0);
  const activeCount = designations.filter((d) => d.is_active).length;
  const inactiveCount = designations.length - activeCount;

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiCheck className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
      {toastError && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <FiX className="w-4 h-4" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Designations</p>
            <FiLayers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{designations.length}</span>
            <span className="text-[10px] font-medium text-slate-500">Configured</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Status</p>
            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{activeCount}</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Available</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Inactive</p>
            <FiXCircle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-600 dark:text-slate-400 font-mono">{inactiveCount}</span>
            <span className="text-[10px] font-medium text-slate-500">Disabled</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Teachers Assigned</p>
            <FiUsers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{totalTeachersAssigned}</span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Faculty Members</span>
          </div>
        </div>
      </div>

      {/* Main Workstation Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Action & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search designations by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>
          </div>

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
              onClick={fetchDesignations}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 transition"
              title="Refresh"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>Add Designation</span>
            </button>
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 w-14">Order</th>
                <th className="px-3 py-2">Designation Title</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-center w-28">Assigned Faculty</th>
                <th className="px-3 py-2 text-center w-24">Status</th>
                <th className="px-3 py-2 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading && designations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading institutional designations...</span>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    <FiAward className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No designations found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Add Designation&quot; above to create your first teacher rank or role.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500 font-semibold">
                      #{row.display_order ?? 0}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                      {row.title}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {row.description || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
                        {row.teacher_count || 0} teachers
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          row.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {row.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(row)}
                        className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Designation"
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(row)}
                        className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete Designation"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Showing {filteredList.length} of {designations.length} total designations</span>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FiAward className="w-4 h-4 text-blue-600" />
                <span>{modalMode === 'create' ? 'Create New Designation' : 'Edit Designation'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Designation Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Lecturer, Assistant Professor, Head Teacher"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Responsibilities (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief role responsibilities or qualifications description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Lower numbers appear first</p>
                </div>

                <div className="flex flex-col justify-center pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Active Status</span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5 ml-6">Available in dropdowns</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : modalMode === 'create' ? 'Create Designation' : 'Update Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <FiTrash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Designation?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove &quot;{itemToDelete.title}&quot;?
                </p>
              </div>
            </div>

            {itemToDelete.teacher_count > 0 && (
              <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                ⚠️ Notice: <strong>{itemToDelete.teacher_count}</strong> teacher(s) are currently assigned to this designation. Their designation will be set to unassigned upon deletion.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
