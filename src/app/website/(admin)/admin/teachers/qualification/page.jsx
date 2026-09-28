'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiAward, FiPlus, FiTrash2, FiEdit2, FiArrowLeft, FiCheck, FiUser, FiSearch
} from 'react-icons/fi';
import Link from 'next/link';

export default function AdminTeacherQualificationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialId = searchParams.get('teacher_id') || '';

  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(initialId);
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
  const [editMode, setEditMode] = useState(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedTeacherId) {
      fetchQualifications(selectedTeacherId);
    } else {
      setQualifications([]);
    }
  }, [selectedTeacherId]);

  const fetchTeachers = async () => {
    setListLoading(true);
    try {
      const res = await axios.get('/api/teachers');
      setTeachers(res.data.paylod?.teachers || []);
    } catch (err) {
      toast.error('Failed to load teachers lookup.');
    } finally {
      setListLoading(false);
    }
  };

  const fetchQualifications = async (teacherId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/teachers/qualifications?teacher_id=${teacherId}`);
      setQualifications(res.data.paylod?.qualifications || []);
    } catch (err) {
      toast.error('Failed to retrieve teacher qualifications.');
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
    if (!selectedTeacherId) {
      toast.error('Please select a teacher.');
      return;
    }
    if (!formData.degree.trim() || !formData.institution.trim() || !formData.passing_year) {
      toast.error('Degree, Institution and Passing Year are required.');
      return;
    }

    setLoading(true);
    try {
      if (editMode) {
        await axios.put(`/api/teachers/qualifications/${editMode}`, formData);
        toast.success('Qualification updated successfully.');
        setEditMode(null);
      } else {
        await axios.post('/api/teachers/qualifications', {
          teacher_id: selectedTeacherId,
          ...formData
        });
        toast.success('Qualification added successfully.');
      }
      setFormData({ degree: '', institution: '', passing_year: '', result: '' });
      fetchQualifications(selectedTeacherId);
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
      await axios.delete(`/api/teachers/qualifications/${id}`);
      toast.success('Qualification removed.');
      fetchQualifications(selectedTeacherId);
    } catch (err) {
      toast.error('Failed to delete qualification.');
    }
  };

  const selectedTeacherDetails = teachers.find(t => String(t.id) === String(selectedTeacherId));

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiAward className="text-primary" /> Qualifications Manager
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage degrees, graduation credentials, and certifications for academic instructors.
          </p>
        </div>

        <Link
          href="/admin/teachers/list"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <FiArrowLeft className="text-xs" /> Back to Teachers List
        </Link>
      </div>

      {/* Selector and Form Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Teacher Selector Card */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs h-fit space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Teacher</label>
            {listLoading ? (
              <div className="h-9 bg-slate-100 animate-pulse rounded-xl"></div>
            ) : (
              <select
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  router.replace(`/admin/teachers/qualification?teacher_id=${e.target.value}`);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
              >
                <option value="">-- Select Teacher --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.designation || 'Teacher'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedTeacherDetails && (
            <div className="border-t border-slate-100 pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                {selectedTeacherDetails.name ? selectedTeacherDetails.name.charAt(0).toUpperCase() : <FiUser />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-800 text-xs truncate">{selectedTeacherDetails.name}</h3>
                <p className="text-[10px] text-slate-400 font-medium truncate">{selectedTeacherDetails.designation || 'Teacher'}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">{selectedTeacherDetails.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Forms & Qualifications List */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTeacherId ? (
            <>
              {/* Form Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                  <FiAward className="text-primary" /> {editMode ? 'Edit Qualification' : 'Add New Qualification'}
                </h2>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Degree Title *</label>
                    <input
                      type="text"
                      name="degree"
                      value={formData.degree}
                      onChange={handleInputChange}
                      placeholder="e.g. M.Sc. in Physics"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">University / Institution *</label>
                    <input
                      type="text"
                      name="institution"
                      value={formData.institution}
                      onChange={handleInputChange}
                      placeholder="e.g. University of Dhaka"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Passing Year *</label>
                    <input
                      type="number"
                      name="passing_year"
                      value={formData.passing_year}
                      onChange={handleInputChange}
                      placeholder="e.g. 2020"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Result / CGPA</label>
                    <input
                      type="text"
                      name="result"
                      value={formData.result}
                      onChange={handleInputChange}
                      placeholder="e.g. CGPA 3.85"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
                    {editMode && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      {editMode ? <FiCheck className="text-xs" /> : <FiPlus className="text-xs" />}
                      {editMode ? 'Save Update' : 'Save Qualification'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Qualification Records List Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Recorded Qualifications ({qualifications.length})
                  </h2>
                </div>

                {loading && qualifications.length === 0 ? (
                  <div className="w-full py-12 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-medium text-slate-400">Loading qualifications...</span>
                  </div>
                ) : qualifications.length === 0 ? (
                  <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
                    <FiAward className="text-slate-300 text-3xl mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No Qualifications Recorded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the form above to record academic credentials.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {qualifications.map((q) => (
                      <div key={q.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">{q.degree}</h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{q.institution}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Year: {q.passing_year}
                            </span>
                            {q.result && (
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                {q.result}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditClick(q)}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit Qualification"
                          >
                            <FiEdit2 className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Qualification"
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
            <div className="bg-white border border-slate-200/80 rounded-2xl py-16 px-6 text-center text-slate-400 shadow-2xs font-medium text-xs">
              Select a teacher from the dropdown on the left to manage their academic qualifications.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
