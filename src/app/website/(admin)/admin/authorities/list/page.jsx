'use client';

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUsers, FiEdit2, FiTrash2, FiAward, FiMail, FiPhone, FiInfo, FiPlus, FiCamera, FiUpload, FiX, FiSearch } from 'react-icons/fi';
import Link from 'next/link';
import { Context } from '@/component/helper/Context';

const DESIGNATION_LABELS = {
  chairman: 'Chairman',
  director: 'Managing Director',
  principal: 'Principal',
  registrar: 'Registrar',
  council: 'Academic Council Member',
  officers: 'Executive Officer',
  staff: 'Support Staff'
};

const DESIGNATIONS = [
  { value: 'chairman', label: 'Chairman' },
  { value: 'director', label: 'Managing Director' },
  { value: 'principal', label: 'Principal' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'council', label: 'Academic Council Member' },
  { value: 'officers', label: 'Executive Officer' },
  { value: 'staff', label: 'Support Staff' }
];

export default function AuthoritiesListPage() {
  const { designations } = useContext(Context);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/authorities');
      setMembers(res.data.paylod.authorities || []);
    } catch (err) {
      toast.error('Failed to load board members registry.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this board member? This will delete all their qualifications and profile photo.')) return;

    try {
      await axios.delete(`/api/authorities/${id}`);
      toast.success('Member removed successfully.');
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete member.');
    }
  };

  const handleEditClick = (member) => {
    setEditingMember({ ...member });
    setPreview(member.image || '');
  };

  const handleEditChange = (e) => {
    setEditingMember({
      ...editingMember,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setEditingMember(prev => ({
        ...prev,
        image: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMember.name.trim() || !editingMember.designation) {
      toast.error('Name and designation are required.');
      return;
    }

    setSaveLoading(true);
    try {
      const res = await axios.put(`/api/authorities/${editingMember.id}`, editingMember);
      toast.success(res.data.message || 'Board member details updated.');
      setEditingMember(null);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update member.');
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.designation_title || m.designation || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiUsers className="text-primary" /> Governing Board Registry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage institutional administration members, bios, contact details, and qualifications.
          </p>
        </div>

        <Link
          href="/admin/authorities/new"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
        >
          <FiPlus className="text-sm" /> Add Member
        </Link>
      </div>

      {/* Summary Cards & Search Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Board Members</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-slate-900">{members.length}</span>
            <FiUsers className="text-slate-400 text-lg" />
          </div>
        </div>

        <div className="sm:col-span-2 bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex items-center">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member name, designation, or email..."
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

      {/* Grid Roster */}
      {loading ? (
        <div className="w-full py-16 flex flex-col items-center justify-center gap-2 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium text-slate-400">Loading board roster...</span>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="w-full py-16 flex flex-col items-center justify-center gap-2 bg-white border border-slate-200/80 rounded-2xl text-center px-4 shadow-2xs">
          <FiUsers className="text-slate-300 text-3xl mb-1" />
          <p className="text-xs font-semibold text-slate-600">No Board Members Found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {searchQuery ? 'No members match your search.' : 'Click "Add Member" to onboard a governing board member.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              {/* Top Photo & Identity */}
              <div className="p-4 pb-3 flex items-center gap-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center text-slate-500 font-bold text-sm">
                  {m.image ? (
                    <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    m.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-xs truncate">{m.name}</h3>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 mt-0.5 capitalize truncate max-w-full">
                    {m.designation_title || DESIGNATION_LABELS[m.designation] || m.designation}
                  </span>
                </div>
              </div>

              {/* Info Details */}
              <div className="p-4 py-3 flex flex-col gap-2 text-xs text-slate-600 flex-1">
                {m.email && (
                  <div className="flex items-center gap-2 text-slate-500 truncate font-mono text-[11px]">
                    <FiMail className="text-slate-400 shrink-0 text-xs" />
                    <span className="truncate">{m.email}</span>
                  </div>
                )}
                {m.contact && (
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                    <FiPhone className="text-slate-400 shrink-0 text-xs" />
                    <span>{m.contact}</span>
                  </div>
                )}
                {m.bio ? (
                  <p className="text-[11px] text-slate-500 line-clamp-2 italic mt-0.5">
                    "{m.bio}"
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic mt-0.5">No bio provided.</p>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => handleEditClick(m)}
                  className="flex items-center justify-center gap-1 py-1 px-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-700 font-semibold transition-all cursor-pointer text-[11px]"
                >
                  <FiEdit2 className="text-xs" /> Edit
                </button>
                <Link
                  href={`/admin/authorities/qualification?id=${m.id}`}
                  className="flex items-center justify-center gap-1 py-1 px-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-700 font-semibold transition-all text-center text-[11px]"
                >
                  <FiAward className="text-xs text-primary" /> Degrees
                </Link>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="flex items-center justify-center gap-1 py-1 px-2 hover:bg-rose-50 text-rose-600 rounded-lg font-semibold transition-all cursor-pointer text-[11px]"
                >
                  <FiTrash2 className="text-xs" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editing Dialog Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 md:p-6 flex flex-col gap-4 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <FiX className="text-base" />
            </button>

            <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Edit Board Member</h2>
              <p className="text-xs text-slate-500">Modify profile photo, details, and credentials.</p>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Photo Upload */}
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200 bg-white shadow-2xs flex items-center justify-center text-slate-400 font-bold">
                    {preview ? (
                      <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <FiCamera className="text-xl text-slate-400" />
                    )}
                  </div>
                  <label className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all">
                    <FiUpload /> Change Photo
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                {/* Details inputs */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editingMember.name}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-primary outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</label>
                    <select
                      name="designation"
                      value={editingMember.designation_id || editingMember.designation}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-primary outline-none font-semibold"
                      required
                    >
                      {designations && designations.length > 0 ? (
                        designations.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.title}</option>
                        ))
                      ) : (
                        DESIGNATIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editingMember.email || ''}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    name="contact"
                    value={editingMember.contact || ''}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profile Bio</label>
                <textarea
                  name="bio"
                  value={editingMember.bio || ''}
                  onChange={handleEditChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-primary outline-none resize-none"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60"
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
