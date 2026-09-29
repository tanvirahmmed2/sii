'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiUsers, FiSearch, FiPrinter } from 'react-icons/fi';
import axios from 'axios';
import { printTransferCertificate } from '@/lib/receipts/transfer_certificate';

export default function TransferredRoster() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchStudents = async (queryStr = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/staff/registrar/documents/students-search?q=${encodeURIComponent(queryStr)}&status=transferred`);
      if (res.data.success) {
        setStudents(res.data.paylod.students || []);
      }
    } catch (err) {
      toast.error('Failed to load transferred students roster.');
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

  return (
    <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto pb-16">
      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-2xs">
        <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
          <FiUsers /> Transferred Roster
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transferred Students Archive</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
          View archived records of transferred students and re-print Transfer Certificates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <FiSearch className="text-amber-600" /> Transferred Students List
          </h2>

          <form onSubmit={handleSearchSubmit} className="relative">
            <input type="text" placeholder="Search by name, roll, reg no..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 pl-9 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            <FiSearch className="absolute left-3 top-2.5 text-slate-400 text-sm" />
          </form>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">Loading transferred students...</div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">No transferred students found.</div>
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
                      <p className="text-[10px] text-slate-500">Reg: {st.registration_number}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-full">Transferred</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Archived Student Record</h2>
          </div>

          {!selectedStudent ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
              Select a transferred student from the roster on the left to review record or re-print TC.
            </div>
          ) : (
            <div className="space-y-4 p-5 bg-amber-50/50 border border-amber-200/80 rounded-2xl">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">{selectedStudent.name}</h3>
                <p className="text-xs text-slate-600">Registration Number: {selectedStudent.registration_number}</p>
                <p className="text-xs text-slate-600">Father's Name: {selectedStudent.father_name || 'N/A'}</p>
                <p className="text-xs text-amber-800 font-semibold mt-1">Status: Transferred & Archived</p>
              </div>

              <button onClick={() => printTransferCertificate({
                tc_number: `TC-${selectedStudent.id}`,
                student: selectedStudent,
                reason_for_leaving: 'Transferred Out',
                last_class_attended: selectedStudent.class_name || 'N/A'
              })}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors">
                <FiPrinter /> Re-Print Transfer Certificate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
