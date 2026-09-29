'use client';

import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiAward, FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiLayers, FiRefreshCw
} from 'react-icons/fi';
import { Context } from '@/component/helper/Context';

export default function DesignationsManagementPage() {
  const { setDesignations: setContextDesignations } = useContext(Context);

  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsHead, setNewIsHead] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingDesignation, setEditingDesignation] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsHead, setEditIsHead] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const fetchDesignations = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/authorities/designations');
      const fetched = res.data.paylod?.designations || [];
      setDesignations(fetched);
      if (setContextDesignations) {
        setContextDesignations(fetched);
      }
    } catch (err) {
      console.error('Error loading designations:', err);
      toast.error('Failed to load designations list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Title is required.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await axios.post('/api/authorities/designations', {
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        is_head: newIsHead
      });

      toast.success(res.data.message || 'Designation created successfully.');
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewIsHead(false);
      fetchDesignations();
    } catch (err) {
      console.error('Error creating designation:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to create designation.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = (des) => {
    setEditingDesignation(des);
    setEditTitle(des.title || '');
    setEditDescription(des.description || '');
    setEditIsHead(Boolean(des.is_head));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast.error('Title is required.');
      return;
    }

    setUpdateLoading(true);
    try {
      const res = await axios.put(`/api/authorities/designations/${editingDesignation.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        is_head: editIsHead
      });

      toast.success(res.data.message || 'Designation updated successfully.');
      setEditingDesignation(null);
      fetchDesignations();
    } catch (err) {
      console.error('Error updating designation:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to update designation.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await axios.delete(`/api/authorities/designations/${id}`);
      toast.success(res.data.message || 'Designation deleted successfully.');
      fetchDesignations();
    } catch (err) {
      console.error('Error deleting designation:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to delete designation.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDesignations = useMemo(() => {
    if (!searchQuery.trim()) return designations;
    const query = searchQuery.toLowerCase().trim();
    return designations.filter(
      (d) =>
        (d.title && d.title.toLowerCase().includes(query)) ||
        (d.description && d.description.toLowerCase().includes(query))
    );
  }, [designations, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiAward className="text-primary" /> Designations Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, update, and manage official designations for institutional board members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDesignations}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh List"
          >
            <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setIsCreateOpen(true);
              setNewTitle('');
              setNewDescription('');
              setNewIsHead(false);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FiPlus className="text-sm" /> Add Designation
          </button>
        </div>
      </div>

      {/* Metrics Card & Search Bar Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Designations</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-slate-900">{designations.length}</span>
            <FiLayers className="text-slate-400 text-lg" />
          </div>
        </div>

        <div className="sm:col-span-2 bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex items-center">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designation title or description..."
              className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Designations Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-400">Loading designations list...</span>
          </div>
        ) : filteredDesignations.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <FiAward className="text-slate-300 text-3xl mb-2" />
            <p className="text-xs font-semibold text-slate-600">
              {searchQuery ? 'No designations found matching query.' : 'No designations created yet.'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click "Add Designation" to register a new designation.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDesignations.map((des, index) => (
                  <tr key={des.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{des.title}</span>
                        {des.is_head && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                            Head Role
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {des.description || <span className="text-slate-300 italic">No description provided</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(des)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title="Edit Designation"
                        >
                          <FiEdit2 className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleDelete(des.id)}
                          disabled={deletingId === des.id}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Designation"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Add New Designation</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <FiX className="text-base" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="newIsHead"
                  checked={newIsHead}
                  onChange={(e) => setNewIsHead(e.target.checked)}
                  className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                />
                <label htmlFor="newIsHead" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                  Set as Head / Principal Designation
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Save Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingDesignation && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Edit Designation</h3>
              <button
                onClick={() => setEditingDesignation(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <FiX className="text-base" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="editIsHead"
                  checked={editIsHead}
                  onChange={(e) => setEditIsHead(e.target.checked)}
                  className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                />
                <label htmlFor="editIsHead" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                  Set as Head / Principal Designation
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDesignation(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updateLoading ? 'Updating...' : 'Update Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
