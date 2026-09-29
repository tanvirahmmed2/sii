'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiUserX, FiSearch, FiPrinter, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';
import { printTransferCertificate } from '@/lib/receipts/transfer_certificate';

export default function TransferCertificateIssuer() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [tcForm, setTcForm] = useState({
    reason_for_leaving: '',
    destination_school: '',
    conduct: 'Good',
    promoted_to_class: 'Promoted to Next Class',
    remarks: ''
  });

  const fetchStudents = async (queryStr = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/staff/registrar/documents/students-search?q=${encodeURIComponent(queryStr)}&status=active`);
      if (res.data.success) {
        setStudents(res.data.paylod.students || []);
      }
    } catch (err) {
      toast.error('Failed to load active students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(searchQuery);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(searchQuery);
  };

  const handleIssueTC = async (e) => {
    e.preventDefault();
    if (!selectedStudent) { toast.error('Please select an active student.'); return; }
    if (!tcForm.reason_for_leaving) { toast.error('Please enter the reason for leaving.'); return; }

    if (!window.confirm(`Issue Transfer Certificate for ${selectedStudent.name}? This will mark the student as TRANSFERRED and remove active class assignments.`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/staff/registrar/documents/transfer-certificate', {
        student_id: selectedStudent.id,
        ...tcForm
      });
      if (res.data.success) {
        toast.success('Transfer Certificate issued & student marked as Transferred!');
        printTransferCertificate({
          tc_number: res.data.paylod.tc.tc_number,
          student: selectedStudent,
          ...tcForm,
          last_class_attended: selectedStudent.class_name || 'N/A'
        });
        setSelectedStudent(null);
        setTcForm({ reason_for_leaving: '', destination_school: '', conduct: 'Good', promoted_to_class: 'Promoted to Next Class', remarks: '' });
        fetchStudents(searchQuery);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to issue Transfer Certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto pb-16">
      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-2xs">
        <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
          <FiUserX /> Student Transfer Workflow
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Transfer Certificate (TC)</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
          Generate official Transfer Certificate. Issuing a TC deactivates the student from active class rosters, routines, and attendance registries.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Selector */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <FiSearch className="text-amber-600" /> Select Active Student
          </h2>

          <form onSubmit={handleSearchSubmit} className="relative">
            <input type="text" placeholder="Search by name, roll, reg no..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 pl-9 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            <FiSearch className="absolute left-3 top-2.5 text-slate-400 text-sm" />
          </form>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">No active students found.</div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {students.map((st) => {
                const isSelected = selectedStudent?.id === st.id;
                return (
                  <button key={st.id} type="button" onClick={() => setSelectedStudent(st)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-xs' : 'bg-slate-50/70 border-slate-200/70 hover:bg-white text-slate-800'
                    }`}>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold leading-tight">{st.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {st.class_name || 'No Class'} {st.section_name ? `(${st.section_name})` : ''} • Roll #{st.roll || 'N/A'}
                      </p>
                      <p className="text-[9px] font-mono text-slate-400">Reg: {st.registration_number}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: TC Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
          <form onSubmit={handleIssueTC} className="space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Transfer Details</h2>
              {selectedStudent && <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">{selectedStudent.name}</span>}
            </div>

            {!selectedStudent ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                Please select an active student from the left list to proceed.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                  <FiAlertCircle className="text-base mt-0.5 shrink-0 text-amber-600" />
                  <p>Issuing this TC will automatically archive <strong>{selectedStudent.name}</strong> as transferred, remove active class allocation, and deactivate login access.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason for Leaving *</label>
                  <textarea value={tcForm.reason_for_leaving} onChange={(e) => setTcForm({ ...tcForm, reason_for_leaving: e.target.value })} required rows={2} placeholder="e.g. Guardian relocation / personal reasons"
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destination School</label>
                    <input type="text" value={tcForm.destination_school} onChange={(e) => setTcForm({ ...tcForm, destination_school: e.target.value })} placeholder="Target institution name"
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">General Conduct</label>
                    <select value={tcForm.conduct} onChange={(e) => setTcForm({ ...tcForm, conduct: e.target.value })}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Satisfactory">Satisfactory</option>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-60 shadow-sm">
                  <FiPrinter /> {submitting ? 'Processing TC...' : 'Issue TC & Print Document'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
