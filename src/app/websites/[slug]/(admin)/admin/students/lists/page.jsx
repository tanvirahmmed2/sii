'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiLayers, FiUsers, FiFilter, FiSearch } from 'react-icons/fi';

const AdminStudentListsPage = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [filterClassId, setFilterClassId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showPreCreate, setShowPreCreate] = useState(false);
  const [preRegNo, setPreRegNo] = useState('');
  const [preClassId, setPreClassId] = useState('');
  const [preSectionId, setPreSectionId] = useState('');
  const [preSectionsList, setPreSectionsList] = useState([]);
  const [preRoll, setPreRoll] = useState('');

  const [editingStudent, setEditingStudent] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [editSectionId, setEditSectionId] = useState('');
  const [editBirthCert, setEditBirthCert] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editSectionsList, setEditSectionsList] = useState([]);
  const [editRoll, setEditRoll] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchClassesAndStudents = async () => {
    try {
      const classesRes = await fetch('/api/classes');
      const classesData = await classesRes.json();
      setClasses(classesData.paylod?.classes || classesData.payload?.classes || []);

      let url = '/api/students';
      const params = [];
      if (filterClassId) params.push(`class_id=${filterClassId}`);
      if (filterSectionId) params.push(`section_id=${filterSectionId}`);
      if (params.length > 0) url += '?' + params.join('&');

      const studentsRes = await fetch(url);
      const studentsData = await studentsRes.json();
      setStudents(studentsData.paylod?.students || studentsData.payload?.students || []);
    } catch (err) {
      toast.error('Failed to load classes or student roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassesAndStudents();
  }, [filterClassId, filterSectionId]);

  useEffect(() => {
    if (!filterClassId) {
      setSections([]);
      setFilterSectionId('');
      return;
    }
    const fetchFilterSections = async () => {
      const res = await fetch(`/api/sections?class_id=${filterClassId}`);
      const data = await res.json();
      setSections(data.paylod?.sections || data.payload?.sections || []);
      setFilterSectionId('');
    };
    fetchFilterSections();
  }, [filterClassId]);

  useEffect(() => {
    if (!preClassId) {
      setPreSectionsList([]);
      setPreSectionId('');
      return;
    }
    const fetchPreSections = async () => {
      const res = await fetch(`/api/sections?class_id=${preClassId}`);
      const data = await res.json();
      const secList = data.paylod?.sections || data.payload?.sections || [];
      setPreSectionsList(secList);
      if (secList.length > 0) {
        setPreSectionId(secList[0].id.toString());
      } else {
        setPreSectionId('');
      }
    };
    fetchPreSections();
  }, [preClassId]);

  useEffect(() => {
    if (!editClassId) {
      setEditSectionsList([]);
      setEditSectionId('');
      return;
    }
    const fetchEditSections = async () => {
      const res = await fetch(`/api/sections?class_id=${editClassId}`);
      const data = await res.json();
      setEditSectionsList(data.paylod?.sections || data.payload?.sections || []);
    };
    fetchEditSections();
  }, [editClassId]);

  const handlePreCreate = async (e) => {
    e.preventDefault();
    if (!preRegNo.trim() || !preClassId) {
      toast.error('Registration Number and Class are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_number: preRegNo.trim(),
          class_id: parseInt(preClassId, 10),
          section_id: preSectionId ? parseInt(preSectionId, 10) : null,
          roll: preRoll ? parseInt(preRoll, 10) : null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create student account.');

      toast.success(data.message || 'Student pre-created successfully!');
      setPreRegNo('');
      setPreRoll('');
      setShowPreCreate(false);
      fetchClassesAndStudents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (std) => {
    setEditingStudent(std);
    setEditName(std.name || '');
    setEditEmail(std.email || '');
    setEditPhone(std.phone || '');
    setEditClassId(std.class_id ? std.class_id.toString() : '');
    setEditSectionId(std.section_id ? std.section_id.toString() : '');
    setEditBirthCert(std.birth_certificate_number || '');
    setEditGender(std.gender || '');
    setEditActive(std.is_active !== false);
    setEditRoll(std.roll ? std.roll.toString() : '');
    setShowPreCreate(false);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          class_id: editClassId ? parseInt(editClassId, 10) : null,
          section_id: editSectionId ? parseInt(editSectionId, 10) : null,
          birth_certificate_number: editBirthCert.trim(),
          gender: editGender,
          is_active: editActive,
          roll: editRoll ? parseInt(editRoll, 10) : null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student profile.');

      toast.success(data.message || 'Student updated successfully!');
      setEditingStudent(null);
      fetchClassesAndStudents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id, regNo) => {
    if (!window.confirm(`Are you sure you want to delete student (${regNo})?`)) return;

    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete student.');
      toast.success(data.message || 'Student profile removed.');
      fetchClassesAndStudents();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredStudents = students.filter(std => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (std.name || '').toLowerCase().includes(q) ||
      (std.registration_number || '').toLowerCase().includes(q) ||
      (std.email || '').toLowerCase().includes(q) ||
      String(std.roll || '').includes(q)
    );
  });

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiUsers className="text-emerald-600" /> Student Registry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-create accounts, filter by class/section, and manage student details.
          </p>
        </div>
        <button
          onClick={() => { setShowPreCreate(!showPreCreate); setEditingStudent(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
        >
          {showPreCreate ? <><FiX /> Close Form</> : <><FiPlus /> Pre-create Student</>}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-end gap-3 shadow-2xs">
        <div className="flex-1 flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><FiFilter /> Class</label>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-600 bg-white cursor-pointer"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><FiFilter /> Section</label>
          <select
            value={filterSectionId}
            onChange={(e) => setFilterSectionId(e.target.value)}
            disabled={!filterClassId}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-600 bg-white cursor-pointer disabled:opacity-50"
          >
            <option value="">All Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>{sec.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><FiSearch /> Search</label>
          <input
            type="text"
            placeholder="Name, reg no, roll..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-600 bg-white"
          />
        </div>
      </div>

      {/* Pre-Create Form */}
      {showPreCreate && !editingStudent && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FiPlus className="text-emerald-600" /> Pre-create Student Account
          </h2>
          <form onSubmit={handlePreCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registration No. *</label>
              <input type="text" required value={preRegNo} onChange={(e) => setPreRegNo(e.target.value)} disabled={submitting}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class *</label>
              <select required value={preClassId} onChange={(e) => setPreClassId(e.target.value)} disabled={submitting}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 cursor-pointer">
                <option value="">Select class...</option>
                {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section (Optional)</label>
              <select value={preSectionId} onChange={(e) => setPreSectionId(e.target.value)} disabled={submitting || !preClassId}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 cursor-pointer disabled:opacity-50">
                <option value="">No section</option>
                {preSectionsList.map((sec) => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Roll (Optional)</label>
              <input type="number" value={preRoll} onChange={(e) => setPreRoll(e.target.value)} disabled={submitting}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600" />
            </div>
            <div className="md:col-span-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowPreCreate(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Form */}
      {editingStudent && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FiEdit2 className="text-emerald-600" /> Edit Student: {editingStudent.name || editingStudent.registration_number}
          </h2>
          <form onSubmit={handleUpdateStudent} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reg. No. (Fixed)</label>
                <input type="text" disabled value={editingStudent.registration_number}
                  className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 outline-none cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={submitting}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={submitting}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} disabled={submitting}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</label>
                <select required value={editClassId} onChange={(e) => setEditClassId(e.target.value)} disabled={submitting}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 cursor-pointer">
                  {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section</label>
                <select value={editSectionId} onChange={(e) => setEditSectionId(e.target.value)} disabled={submitting || !editClassId}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 cursor-pointer disabled:opacity-50">
                  <option value="">None</option>
                  {editSectionsList.map((sec) => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Birth Cert No.</label>
                <input type="text" value={editBirthCert} onChange={(e) => setEditBirthCert(e.target.value)} disabled={submitting}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</label>
                <select value={editGender} onChange={(e) => setEditGender(e.target.value)} disabled={submitting}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 cursor-pointer">
                  <option value="">-- Select --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Roll No.</label>
                <input type="number" value={editRoll} onChange={(e) => setEditRoll(e.target.value)} disabled={submitting}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="editActive" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} disabled={submitting}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded cursor-pointer" />
              <label htmlFor="editActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Active (student has system access)
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setEditingStudent(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50">
                {submitting ? 'Updating...' : 'Update Student'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Student Roster <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-bold text-[10px] ml-1">({filteredStudents.length})</span>
          </h2>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer">
              <FiX className="text-xs" /> Clear search
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading roster...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-3xl mb-2">🎓</span>
            <h3 className="text-xs font-bold text-slate-700">No students found</h3>
            <p className="text-xs text-slate-400 mt-1">Try changing the filters or pre-create a student.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Roll / Reg No.</th>
                  <th className="px-4 py-3">Student Details</th>
                  <th className="px-4 py-3">Class &amp; Section</th>
                  <th className="px-4 py-3">Registration Setup</th>
                  <th className="px-4 py-3">Active Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Roll / Reg */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-lg w-fit">
                          {std.registration_number}
                        </span>
                        {std.roll && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md w-fit">
                            Roll: {std.roll}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Student Details */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                          {(std.name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-800">{std.name || 'Pre-created (No profile)'}</p>
                            {std.gender && (
                              <span className={`px-1.5 py-px text-[9px] font-bold rounded ${
                                std.gender === 'Male'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-pink-50 text-pink-600 border border-pink-100'
                              }`}>
                                {std.gender}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex flex-col gap-px">
                            {std.email && <span>📧 {std.email}</span>}
                            {std.phone && <span>📞 {std.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Class & Section */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/60">
                        <FiLayers className="text-slate-400 text-xs" />
                        {std.class_name}{std.section_name ? ` · ${std.section_name}` : ''}
                      </span>
                    </td>

                    {/* Registration Setup */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        std.is_registered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {std.is_registered ? 'Setup Completed' : 'Pending Student Setup'}
                      </span>
                    </td>

                    {/* Active Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        std.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}>
                        {std.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEdit(std)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-lg transition-colors cursor-pointer"
                          title="Edit Student"
                        >
                          <FiEdit2 className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(std.id, std.registration_number)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                          title="Delete Student"
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
    </div>
  );
};

export default AdminStudentListsPage;
