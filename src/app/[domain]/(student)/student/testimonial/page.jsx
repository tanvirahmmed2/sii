'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { printTestimonial } from 'src/lib/receipts/testimonial';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const StudentTestimonialPage = () => {
  const { getApiEndpoint } = useTenantWebsite();
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
      const res = await fetch(getApiEndpoint('student/testimonial'));
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
  }, [getApiEndpoint]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!purpose.trim()) {
      setFeedback({ type: 'error', text: 'Please enter the purpose of certificate application.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(getApiEndpoint('student/testimonial'), {
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
    } catch {
      setFeedback({ type: 'error', text: 'Network error submitting certificate application.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  const getStatusBadge = (status) => {
    const norm = (status || 'pending').toLowerCase();
    switch (norm) {
      case 'approved':
      case 'issued':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase tracking-wider">
            Approved &amp; Issued
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 uppercase tracking-wider">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 uppercase tracking-wider">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block mb-1">
            Certification Portal &amp; Testimonials
          </span>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Institutional Certificates &amp; Testimonials
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Apply online for official character testimonials, transfer certificates, or print approved credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFeedback(null);
            setModalOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          Apply for New Certificate
        </button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-md text-xs font-medium flex items-center justify-between ${
          feedback.type === 'error'
            ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        }`}>
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer text-slate-500 hover:text-slate-800 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Candidate Profile Strip */}
      {student && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>Reg: <strong className="font-mono font-medium text-slate-700 dark:text-slate-300">{student.registration_number}</strong></span>
                <span>•</span>
                <span>Class: <strong className="font-medium text-slate-700 dark:text-slate-300">{student.class_name} {student.section_name ? `(${student.section_name})` : ''}</strong></span>
                <span>•</span>
                <span>Roll: <strong className="font-medium text-slate-700 dark:text-slate-300">{student.roll || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          <div>
            {isProvided ? (
              <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-semibold uppercase tracking-wider">
                Testimonial Issued
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-[10px] font-semibold uppercase tracking-wider">
                Pending Approval
              </span>
            )}
          </div>
        </div>
      )}

      {/* Latest Approved Testimonial Card */}
      {isProvided && testimonial && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Official Certificate Number</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono mt-0.5">{testimonial.testimonial_no}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Issue Date</span>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                {testimonial.issue_date ? new Date(testimonial.issue_date).toLocaleDateString('en-GB') : 'Official Issue'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-md space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Academic Character Evaluation</span>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{testimonial.academic_character || 'Very Good'}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-md space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">General Campus Conduct</span>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{testimonial.conduct || 'Exemplary'}</p>
            </div>
          </div>

          {testimonial.remarks && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-md space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registrar Remarks</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 italic">{testimonial.remarks}</p>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => printTestimonial({
                testimonial_no: testimonial.testimonial_no,
                student: student,
                academic_character: testimonial.academic_character,
                conduct: testimonial.conduct,
                remarks: testimonial.remarks,
                issue_date: testimonial.issue_date ? new Date(testimonial.issue_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')
              })}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              Print Official Testimonial
            </button>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Certificate Application History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tracking status of submitted requests</p>
          </div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            Total: {testimonials.length}
          </span>
        </div>

        {testimonials.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-medium text-xs">
            No certificate applications have been submitted yet. Click &ldquo;Apply for New Certificate&rdquo; above to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Ref ID</th>
                  <th className="py-2.5 px-3">Certificate Type</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Applied Date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {testimonials.map((item) => {
                  const isApproved = item.status === 'approved' || item.status === 'issued';
                  const appDate = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : 'N/A';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                        #{item.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {item.certificate_type || 'Character Certificate'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {item.purpose}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono">
                        {appDate}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isApproved ? (
                          <button
                            type="button"
                            onClick={() => printTestimonial({
                              testimonial_no: item.certificate_no || `TEST-${String(item.id).padStart(6, '0')}`,
                              student: student,
                              academic_character: 'Very Good',
                              conduct: 'Good & Satisfactory',
                              remarks: item.remarks || '',
                              issue_date: item.issue_date ? new Date(item.issue_date).toLocaleDateString('en-GB') : appDate
                            })}
                            className="px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Print
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Processing</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-md max-w-lg w-full p-5 shadow-lg border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Apply for Institutional Certificate</h3>
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-2 py-0.5 rounded text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Certificate Type *
                </label>
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary cursor-pointer"
                >
                  <option value="Character Certificate">Character Certificate</option>
                  <option value="Academic Testimonial">Academic Testimonial</option>
                  <option value="Transfer Certificate (TC)">Transfer Certificate (TC)</option>
                  <option value="Bonafide Student Certificate">Bonafide Student Certificate</option>
                  <option value="Course Completion Certificate">Course Completion Certificate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Application Purpose *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Higher secondary college admission, passport verification, scholarship..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Passing Year (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026"
                    value={passingYear}
                    onChange={(e) => setPassingYear(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    GPA / Score (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5.00"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
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
