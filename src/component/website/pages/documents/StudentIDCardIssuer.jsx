'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiCreditCard, FiSearch, FiPrinter, FiTrash2,
  FiCheckCircle, FiClock, FiFilter, FiCheck, FiUser
} from 'react-icons/fi';
import axios from 'axios';
import { printStudentIDCard } from '@/lib/receipts/student_id_card';

export default function StudentIDCardIssuer() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Default expiry date
  const [idCardExpiry, setIdCardExpiry] = useState(`${new Date().getFullYear()}-12-31`);
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = `/api/staff/registrar/documents/students-search?status=active`;
      if (selectedClassId) url += `&class_id=${selectedClassId}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const res = await axios.get(url);
      if (res.data.success) {
        setStudents(res.data.paylod.students || []);
        if (classes.length === 0) {
          setClasses(res.data.paylod.classes || []);
        }
      }
    } catch (err) {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const toggleStudentSelection = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(item => item !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(st => st.id));
    }
  };

  // Issue / Update ID Cards
  const handleIssueIDCards = async (overrideIds = null) => {
    const targetIds = overrideIds || selectedStudentIds;
    if (targetIds.length === 0) {
      toast.error('Select at least one student.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/staff/registrar/documents/id-card', {
        student_ids: targetIds,
        expiry_date: idCardExpiry
      });

      if (res.data.success) {
        toast.success(`Issued ${targetIds.length} Student ID Card(s)!`);

        const printPayload = (res.data.paylod.id_cards || []).map(item => ({
          id_card_no: item.id_card.id_card_no,
          student: item.student,
          expiry_date: item.id_card.expiry_date ? new Date(item.id_card.expiry_date).toLocaleDateString('en-GB') : idCardExpiry
        }));

        if (printPayload.length > 0) {
          printStudentIDCard(printPayload);
        }

        fetchStudents();
        if (!overrideIds) setSelectedStudentIds([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to issue ID Cards.');
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke / Remove ID Cards
  const handleRemoveIDCards = async (overrideIds = null) => {
    const targetIds = overrideIds || selectedStudentIds;
    if (targetIds.length === 0) {
      toast.error('Select at least one student.');
      return;
    }

    if (!window.confirm(`Revoke ID Card for ${targetIds.length} student(s)?`)) return;

    setSubmitting(true);
    try {
      const res = await axios.delete('/api/staff/registrar/documents/id-card', {
        data: { student_ids: targetIds }
      });

      if (res.data.success) {
        toast.success(`Revoked ${targetIds.length} Student ID Card(s).`);
        fetchStudents();
        if (!overrideIds) setSelectedStudentIds([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to revoke ID Cards.');
    } finally {
      setSubmitting(false);
    }
  };

  const isAllSelected = students.length > 0 && selectedStudentIds.length === students.length;

  return (
    <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto pb-20 animate-fade-up">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-2xs">
        <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
          <FiCreditCard /> Document Issuance
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student ID Cards</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
          Select class or search students to issue, print, update, or revoke ID cards.
        </p>
      </div>

      {/* Filter & Date Controls */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
          {/* Class Filter */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-xs font-bold text-slate-700">
            <FiFilter className="text-indigo-600" />
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer">
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
            <input type="text" placeholder="Search student name, roll..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 pl-8 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
          </form>
        </div>

        {/* Expiry Date */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-500">Expiry Date:</span>
          <input type="date" value={idCardExpiry} onChange={(e) => setIdCardExpiry(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>
      </div>

      {/* Clean Table View */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-semibold animate-pulse">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 italic">
            No students found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class & Roll</th>
                  <th className="py-3 px-4">Reg No</th>
                  <th className="py-3 px-4">ID Card Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {students.map((st) => {
                  const isChecked = selectedStudentIds.includes(st.id);
                  const hasCard = !!st.id_card_id;

                  return (
                    <tr key={st.id} className={`hover:bg-slate-50/60 transition-colors ${isChecked ? 'bg-indigo-50/40' : ''}`}>
                      <td className="py-3 px-4">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleStudentSelection(st.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {st.image ? (
                            <img src={st.image} alt={st.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                              {st.name ? st.name.charAt(0).toUpperCase() : <FiUser />}
                            </div>
                          )}
                          <span className="font-bold text-slate-800">{st.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {st.class_name} {st.section_name ? `(${st.section_name})` : ''} &bull; Roll #{st.roll || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {st.registration_number}
                      </td>
                      <td className="py-3 px-4">
                        {hasCard ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold">
                            <FiCheckCircle className="text-emerald-600" /> Provided (Exp: {st.expiry_date ? new Date(st.expiry_date).toLocaleDateString('en-GB') : 'N/A'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-[11px] font-semibold">
                            <FiClock className="text-slate-400" /> Not Provided
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasCard && (
                            <button type="button" onClick={() => handleRemoveIDCards([st.id])} title="Revoke ID Card"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-sm">
                              <FiTrash2 />
                            </button>
                          )}
                          <button type="button" onClick={() => handleIssueIDCards([st.id])}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-2xs">
                            {hasCard ? 'Re-issue / Print' : 'Provide ID Card'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Action Bar when students are selected */}
      {selectedStudentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-4 animate-bounce-short border border-slate-700">
          <span className="text-xs font-bold text-slate-300">
            Selected: <strong className="text-white">{selectedStudentIds.length}</strong> student(s)
          </span>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleRemoveIDCards()} disabled={submitting}
              className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-rose-500/30 flex items-center gap-1.5">
              <FiTrash2 /> Revoke Selected
            </button>

            <button type="button" onClick={() => handleIssueIDCards()} disabled={submitting}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5">
              <FiPrinter /> {submitting ? 'Processing...' : 'Provide & Print Selected'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
