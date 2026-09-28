'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiAward, FiPlus, FiTrash2, FiEdit2, FiArrowLeft, FiX, FiCheck } from 'react-icons/fi';
import Link from 'next/link';

export default function AuthorityQualificationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialId = searchParams.get('id') || '';

  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(initialId);
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    degree: '',
    institution: '',
    passing_year: '',
    result: ''
  });
  const [editMode, setEditMode] = useState(null); // id of qualification being edited

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      fetchQualifications(selectedMemberId);
    } else {
      setQualifications([]);
    }
  }, [selectedMemberId]);

  const fetchMembers = async () => {
    setListLoading(true);
    try {
      const res = await axios.get('/api/authorities');
      setMembers(res.data.paylod.authorities || []);
    } catch (err) {
      toast.error('Failed to load board members lookup.');
    } finally {
      setListLoading(false);
    }
  };

  const fetchQualifications = async (memberId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/authorities/qualifications?authority_id=${memberId}`);
      setQualifications(res.data.paylod.qualifications || []);
    } catch (err) {
      toast.error('Failed to retrieve member qualifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      toast.error('Please select a board member.');
      return;
    }
    if (!formData.degree.trim() || !formData.institution.trim() || !formData.passing_year) {
      toast.error('Degree, Institution and Passing Year are required.');
      return;
    }

    setLoading(true);
    try {
      if (editMode) {
        await axios.put(`/api/authorities/qualifications/${editMode}`, formData);
        toast.success('Qualification updated successfully.');
        setEditMode(null);
      } else {
        await axios.post('/api/authorities/qualifications', {
          authority_id: selectedMemberId,
          ...formData
        });
        toast.success('Qualification added successfully.');
      }
      setFormData({ degree: '', institution: '', passing_year: '', result: '' });
      fetchQualifications(selectedMemberId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save qualification.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (q) => {
    setEditMode(q.id);
    setFormData({
      degree: q.degree,
      institution: q.institution,
      passing_year: q.passing_year,
      result: q.result || ''
    });
  };

  const handleCancelEdit = () => {
    setEditMode(null);
    setFormData({ degree: '', institution: '', passing_year: '', result: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this qualification record?')) return;
    try {
      await axios.delete(`/api/authorities/qualifications/${id}`);
      toast.success('Qualification removed.');
      fetchQualifications(selectedMemberId);
    } catch (err) {
      toast.error('Failed to delete qualification.');
    }
  };

  const selectedMemberDetails = members.find(m => String(m.id) === String(selectedMemberId));

  return (
    <div className="w-full space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 pb-2 border-b border-slate-200/60">
        <Link
          href="/admin/authorities/list"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <FiArrowLeft className="text-xs" /> Back to Board Registry
        </Link>

        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiAward className="text-primary" /> Manage Board Qualifications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Add or edit official degrees, academic certifications, and honors for board members.
          </p>
        </div>
      </div>

      {/* Selector and Form Split Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left selector */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Member</label>
              {listLoading ? (
                <div className="h-9 bg-slate-50 animate-pulse rounded-xl mt-1"></div>
              ) : (
                <select
                  value={selectedMemberId}
                  onChange={(e) => {
                    setSelectedMemberId(e.target.value);
                    router.replace(`/admin/authorities/qualification?id=${e.target.value}`);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.designation})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedMemberDetails && (
              <div className="border-t border-slate-100 pt-3 flex flex-col items-center text-center gap-2">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 text-sm font-bold shadow-2xs">
                  {selectedMemberDetails.image ? (
                    <img src={selectedMemberDetails.image} alt={selectedMemberDetails.name} className="w-full h-full object-cover" />
                  ) : (
                    selectedMemberDetails.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">{selectedMemberDetails.name}</h3>
                  <span className="text-[10px] text-slate-400 font-medium uppercase block mt-0.5">{selectedMemberDetails.designation}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Forms & list */}
        <div className="md:col-span-2 flex flex-col gap-5">
          {selectedMemberId ? (
            <>
              {/* Form Block */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-2xs flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <FiAward className="text-primary" /> {editMode ? 'Edit Qualification' : 'Add Qualification Credential'}
                </h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Degree Title *</label>
                    <input
                      type="text"
                      name="degree"
                      value={formData.degree}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-primary outline-none"
                      required
                    />
                  </div>

                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">University / Board *</label>
                    <input
                      type="text"
                      name="institution"
                      value={formData.institution}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-primary outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Graduation Year *</label>
                    <input
                      type="number"
                      name="passing_year"
                      value={formData.passing_year}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-primary outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score / CGPA</label>
                    <input
                      type="text"
                      name="result"
                      value={formData.result}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-primary outline-none"
                    />
                  </div>

                  <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
                    {editMode && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      {editMode ? <FiCheck className="text-xs" /> : <FiPlus className="text-xs" />}
                      <span>{editMode ? 'Save Update' : 'Add Credential'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* List Block */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-2xs flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  Credential Records List ({qualifications.length})
                </h3>

                {loading && qualifications.length === 0 ? (
                  <div className="py-10 flex justify-center items-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : qualifications.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 font-medium">
                    No academic qualifications recorded for this member.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {qualifications.map(q => (
                      <div key={q.id} className="p-3 border border-slate-200/70 rounded-xl flex items-center justify-between hover:bg-slate-50/50 transition-all">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <h4 className="font-bold text-slate-800">{q.degree}</h4>
                          <span className="text-[10px] text-slate-400 font-medium uppercase">{q.institution}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">Graduation: {q.passing_year}</span>
                            {q.result && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{q.result}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditClick(q)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
                          >
                            <FiEdit2 className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl py-16 px-6 text-center text-slate-400 font-semibold text-xs shadow-2xs">
              Please choose a board member from the left dropdown to view or add credentials.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
