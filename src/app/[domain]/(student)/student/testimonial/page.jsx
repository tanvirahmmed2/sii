'use client';

import React, { useEffect, useState } from 'react';
import { 
  FiAward, FiPrinter, FiLock, FiCheckCircle, 
  FiInfo, FiUser, FiClock, FiPlus, FiXCircle, FiX, FiFileText 
} from 'react-icons/fi';
import { printTestimonial } from 'src/lib/receipts/testimonial';

const StudentTestimonialPage = () => {
  const [student, setStudent] = useState(null);
  const [testimonial, setTestimonial] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [isProvided, setIsProvided] = useState(false);
  const [loading, setLoading] = useState(true);

  // Application Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [certificateType, setCertificateType] = useState('Character Certificate');
  const [purpose, setPurpose] = useState('');
  const [passingYear, setPassingYear] = useState('');
  const [gpa, setGpa] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchTestimonials = async () => {
    try {
      const res = await fetch('/api/student/testimonial');
      if (res.ok) {
        const data = await res.json();
        const payload = data.payload || data.paylod || {};
        setStudent(payload.student || null);
        setTestimonial(payload.testimonial || null);
        setTestimonials(payload.testimonials || []);
        setIsProvided(!!payload.isProvided);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!purpose.trim()) {
      setFeedback({ type: 'error', text: 'Please enter the purpose of certificate application.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/student/testimonial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificate_type: certificateType,
          purpose,
          passing_year: passingYear,
          gpa
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setFeedback({ type: 'success', text: resData.message || 'Application submitted successfully!' });
        setPurpose('');
        setPassingYear('');
        setGpa('');
        setModalOpen(false);
        fetchTestimonials();
      } else {
        setFeedback({ type: 'error', text: resData.error || 'Failed to submit application.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network error submitting certificate application.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading certificate records...</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const norm = (status || 'pending').toLowerCase();
    switch (norm) {
      case 'approved':
      case 'issued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FiCheckCircle className="text-xs" /> Approved &amp; Issued
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <FiXCircle className="text-xs" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <FiClock className="text-xs" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiAward /> Certification Portal &amp; Testimonials
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Institutional Certificates &amp; Testimonial</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Apply online for official character testimonials, transfer certificates, or print approved credentials.
          </p>
        </div>

        <button
          onClick={() => {
            setFeedback(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
        >
          <FiPlus className="text-sm" /> Apply for New Certificate
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs ${
          feedback.type === 'error'
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="cursor-pointer text-slate-500 hover:text-slate-800">
            <FiX />
          </button>
        </div>
      )}

      {/* Candidate Profile Summary */}
      {student && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100/70 text-emerald-800 rounded-2xl flex items-center justify-center font-bold text-lg border border-emerald-200/60 shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : <FiUser />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Reg No: <strong className="text-slate-800 font-mono">{student.registration_number}</strong></span>
                <span>&bull;</span>
                <span>Class: <strong className="text-slate-800">{student.class_name} {student.section_name ? `(${student.section_name})` : ''}</strong></span>
                <span>&bull;</span>
                <span>Roll: <strong className="text-slate-800">{student.roll || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          <div>
            {isProvided ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold">
                <FiCheckCircle className="text-emerald-600 text-sm" /> Testimonial Issued
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-bold">
                <FiClock className="text-amber-600 text-sm" /> Pending Approval
              </span>
            )}
          </div>
        </div>
      )}

      {/* Latest Approved Testimonial Card */}
      {isProvided && testimonial && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Certificate Number</span>
              <p className="text-base font-bold text-slate-900 font-mono">{testimonial.testimonial_no}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</span>
              <p className="text-sm font-semibold text-slate-700">
                {testimonial.issue_date ? new Date(testimonial.issue_date).toLocaleDateString('en-GB') : 'Official Issue'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Character Evaluation</span>
              <p className="text-sm font-bold text-slate-900">{testimonial.academic_character || 'Very Good'}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">General Campus Conduct</span>
              <p className="text-sm font-bold text-slate-900">{testimonial.conduct || 'Exemplary'}</p>
            </div>
          </div>

          {testimonial.remarks && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Headmaster / Registrar Remarks</span>
              <p className="text-xs text-slate-700 italic">{testimonial.remarks}</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => printTestimonial({
                testimonial_no: testimonial.testimonial_no,
                student: student,
                academic_character: testimonial.academic_character,
                conduct: testimonial.conduct,
                remarks: testimonial.remarks,
                issue_date: testimonial.issue_date ? new Date(testimonial.issue_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')
              })}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FiPrinter className="text-sm" /> Print Official Testimonial
            </button>
          </div>
        </div>
      )}

      {/* Certificate Applications History Table */}
      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Certificate Application History Table</h2>
            <p className="text-xs text-slate-400 font-medium">Tracking status of all submitted testimonial &amp; certificate requests</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Total Requests: {testimonials.length}
          </span>
        </div>

        {testimonials.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-2xl">
            No certificate applications have been submitted yet. Click "Apply for New Certificate" above to start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Ref ID</th>
                  <th className="py-3 px-4">Certificate Type</th>
                  <th className="py-3 px-4">Stated Purpose</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {testimonials.map((item) => {
                  const isApproved = item.status === 'approved' || item.status === 'issued';
                  const appDate = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : 'N/A';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-600">
                        #{item.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {item.certificate_type || 'Character Certificate'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {item.purpose}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {appDate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isApproved ? (
                          <button
                            onClick={() => printTestimonial({
                              testimonial_no: item.certificate_no || `TEST-${String(item.id).padStart(6, '0')}`,
                              student: student,
                              academic_character: 'Very Good',
                              conduct: 'Good & Satisfactory',
                              remarks: item.remarks || '',
                              issue_date: item.issue_date ? new Date(item.issue_date).toLocaleDateString('en-GB') : appDate
                            })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            <FiPrinter className="text-xs" /> Print
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Processing</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-bold text-lg text-slate-800">Apply for Certificate</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Certificate Type
                </label>
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="Character Certificate">Character Certificate</option>
                  <option value="Academic Testimonial">Academic Testimonial</option>
                  <option value="Transfer Certificate (TC)">Transfer Certificate (TC)</option>
                  <option value="Bonafide Student Certificate">Bonafide Student Certificate</option>
                  <option value="Course Completion Certificate">Course Completion Certificate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Application Purpose *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Higher secondary college admission, passport application, job verification..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Passing Year (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026"
                    value={passingYear}
                    onChange={(e) => setPassingYear(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    GPA / Score (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5.00"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTestimonialPage;
