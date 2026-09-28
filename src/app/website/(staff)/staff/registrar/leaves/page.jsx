'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiCalendar, FiChevronRight, FiFileText } from 'react-icons/fi';

const StaffLeavesPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [type, setType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchMyLeaves = async () => {
    try {
      const res = await fetch('/api/staff/leaves');
      const data = await res.json();
      if (data.success && data.paylod?.leaves) {
        setLeaves(data.paylod.leaves);
      }
    } catch (err) {
      toast.error('Failed to load leave history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type || !startDate || !endDate || !reason.trim()) {
      toast.error('Please fill in all the required fields.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after the end date.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          start_date: startDate,
          end_date: endDate,
          reason
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || 'Leave application submitted successfully.');
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchMyLeaves();
      } else {
        throw new Error(data.error || 'Failed to submit leave request.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiCalendar className="text-primary animate-pulse" /> Leave Desk
        </h1>
        <p className="text-sm text-slate-500">
          File new leave applications and track active approval logs or past leaves status.
        </p>
      </div>

      {/* Split Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        {/* Application Form */}
        <div className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-bold text-slate-850 border-b border-slate-100 pb-3 flex items-center gap-1.5 mb-5">
            <FiPlus className="text-primary" /> Apply For Leave
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Leave Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none focus:bg-white focus:border-primary"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Earned Leave">Earned Leave</option>
                <option value="Maternity/Paternity Leave">Maternity/Paternity Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none focus:bg-white focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none focus:bg-white focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Reason Details
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none focus:bg-white focus:border-primary resize-none"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 bg-linear-to-r bg-primary text-secondary hover:from-sky-600 hover:to-cyan-600 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-500/10 hover:shadow-sky-500/20 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{submitting ? 'Submitting...' : 'Submit Leave Request'}</span>
            </button>
          </form>
        </div>

        {/* History Tracker */}
        <div className="xl:col-span-3 bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.02)] min-h-[400px]">
          <h2 className="text-sm font-bold text-slate-855 border-b border-slate-100 pb-3 flex items-center gap-1.5 mb-5">
            <FiFileText className="text-slate-400" /> My Leave Requests
          </h2>

          {loading ? (
            <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-slate-400">Loading leave requests...</span>
            </div>
          ) : leaves.length === 0 ? (
            <div className="w-full py-20 flex flex-col items-center justify-center text-center px-4">
              <span className="text-slate-300 text-5xl mb-3">🏖️</span>
              <h3 className="text-sm font-bold text-slate-650">No Leave Requests</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                You haven't submitted any leave requests yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
              {leaves.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300/80 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        {item.type}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full border ${
                        item.status === 'Approved' ? 'bg-primary-light text-primary border-primary-light' :
                        item.status === 'Rejected' ? 'bg-red-50 text-red-655 border-red-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-450 font-bold flex items-center gap-1">
                      {new Date(item.start_date).toLocaleDateString()}
                      <FiChevronRight className="text-slate-400 text-xs" />
                      {new Date(item.end_date).toLocaleDateString()}
                    </span>

                    <p className="text-xs text-slate-500 mt-1 pl-1 border-l-2 border-slate-200">
                      {item.reason}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-400 font-semibold self-end sm:self-auto">
                    Filed: {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffLeavesPage;
