'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiAward, FiSearch, FiPrinter } from 'react-icons/fi';
import axios from 'axios';
import { printTestimonial } from '@/lib/receipts/testimonial';

export default function TestimonialIssuer() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [testimonialForm, setTestimonialForm] = useState({
    academic_character: 'Excellent',
    conduct: 'Good',
    remarks: ''
  });

  const fetchStudents = async (queryStr = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/staff/registrar/documents/students-search?q=${encodeURIComponent(queryStr)}&status=all`);
      if (res.data.success) {
        setStudents(res.data.paylod.students || []);
      }
    } catch (err) {
      toast.error('Failed to load students.');
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

  const handleIssueTestimonial = async (e) => {
    e.preventDefault();
    if (!selectedStudent) { toast.error('Please select a student.'); return; }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/staff/registrar/documents/testimonial', {
        student_id: selectedStudent.id,
        ...testimonialForm
      });
      if (res.data.success) {
        toast.success('Testimonial issued successfully!');
        printTestimonial({
          testimonial_no: res.data.paylod.testimonial.testimonial_no,
          student: selectedStudent,
          ...testimonialForm
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to issue Testimonial.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto pb-16">
      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-2xs">
        <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
          <FiAward /> Certification Center
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Student Testimonials</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
          Issue character and conduct testimonials for active or outgoing students.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <FiSearch className="text-emerald-600" /> Select Student
          </h2>

          <form onSubmit={handleSearchSubmit} className="relative">
            <input type="text" placeholder="Search by name, roll, reg no..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 pl-9 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            <FiSearch className="absolute left-3 top-2.5 text-slate-400 text-sm" />
          </form>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">No matching students found.</div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {students.map((st) => {
                const isSelected = selectedStudent?.id === st.id;
                return (
                  <button key={st.id} type="button" onClick={() => setSelectedStudent(st)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs' : 'bg-slate-50/70 border-slate-200/70 hover:bg-white text-slate-800'
                    }`}>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold leading-tight">{st.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {st.class_name || 'No Class'} {st.section_name ? `(${st.section_name})` : ''} • Roll #{st.roll || 'N/A'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
          <form onSubmit={handleIssueTestimonial} className="space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Testimonial Character Evaluation</h2>
              {selectedStudent && <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl">{selectedStudent.name}</span>}
            </div>

            {!selectedStudent ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                Please select a student from the left panel to issue Testimonial.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Academic Character</label>
                    <select value={testimonialForm.academic_character} onChange={(e) => setTestimonialForm({ ...testimonialForm, academic_character: e.target.value })}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                      <option value="Excellent">Excellent</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Satisfactory">Satisfactory</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">General Conduct</label>
                    <select value={testimonialForm.conduct} onChange={(e) => setTestimonialForm({ ...testimonialForm, conduct: e.target.value })}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Satisfactory">Satisfactory</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Special Remarks (Optional)</label>
                  <textarea value={testimonialForm.remarks} onChange={(e) => setTestimonialForm({ ...testimonialForm, remarks: e.target.value })} rows={2} placeholder="Optional honors or notes"
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
                </div>

                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 shadow-sm">
                  <FiPrinter /> {submitting ? 'Generating...' : 'Issue & Print Testimonial'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
