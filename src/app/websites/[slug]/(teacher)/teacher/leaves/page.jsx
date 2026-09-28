'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiPlus, FiCheck, FiX, FiClock } from 'react-icons/fi';
import TiptapEditor from '@/component/helper/TiptapEditor';
import RichTextDisplay from '@/component/helper/RichTextDisplay';

const LeavesPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await fetch('/api/teacher/leaves');
        if (res.ok) {
          const data = await res.json();
          setApplications(data.paylod.applications || []);
        }
      } catch (err) {
        console.error('Failed to load leave history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaves();
  }, [reloadTrigger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanReason = reason.replace(/<[^>]*>/g, '').trim();
    if (!type || !startDate || !endDate || !cleanReason) {
      toast.error('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/teacher/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, start_date: startDate, end_date: endDate, reason })
      });
      if (res.ok) {
        toast.success('Leave application submitted!');
        setType(''); setStartDate(''); setEndDate(''); setReason('');
        setShowModal(false);
        setReloadTrigger((p) => p + 1);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to submit.');
      }
    } catch { toast.error('An error occurred.'); }
    finally { setSubmitting(false); }
  };

  const statusBadge = (status) => {
    if (status === 'Approved') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"><FiCheck className="text-[9px]" /> Approved</span>;
    if (status === 'Rejected') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100"><FiX className="text-[9px]" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100"><FiClock className="text-[9px]" /> Pending</span>;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FiCalendar className="text-primary" /> Leave Applications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Apply for leaves and monitor your application status.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium shadow-2xs transition-colors"
        >
          <FiPlus /> Apply Leave
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400">Loading...</div>
        ) : applications.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">No leave applications submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-2.5">Applied</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">
                      {new Date(app.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{app.type}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {new Date(app.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – {new Date(app.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5">{statusBadge(app.status)}</td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-xs">
                      <RichTextDisplay html={app.reason} className="line-clamp-2 text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-lg shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-800">New Leave Application</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Leave Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} required
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-primary">
                  <option value="">-- Choose Type --</option>
                  <option>Casual Leave</option>
                  <option>Medical/Sick Leave</option>
                  <option>Maternity/Paternity Leave</option>
                  <option>Duty Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-primary" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Reason</label>
                <TiptapEditor value={reason} onChange={(val) => setReason(val)} />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavesPage;
