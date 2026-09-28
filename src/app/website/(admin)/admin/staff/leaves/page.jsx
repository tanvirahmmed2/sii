'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiCheck, FiX, FiChevronRight, FiCalendar, FiUser, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const AdminStaffLeavesPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff/leaves');
      const data = await res.json();
      if (data.success && data.paylod?.leaves) {
        setLeaves(data.paylod.leaves);
      } else {
        throw new Error(data.error || 'Failed to fetch leave records.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load staff leave applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleProcessLeave = async (id, status) => {
    const confirm = window.confirm(`Are you sure you want to ${status.toLowerCase()} this leave application?`);
    if (!confirm) return;

    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/staff/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || `Leave application ${status.toLowerCase()} successfully!`);
        fetchLeaves();
      } else {
        throw new Error(data.error || 'Failed to process leave application.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === 'Pending');
  const approvedLeaves = leaves.filter((l) => l.status === 'Approved');
  const rejectedLeaves = leaves.filter((l) => l.status === 'Rejected');
  const processedLeaves = leaves.filter((l) => l.status !== 'Pending');

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiCalendar className="text-primary" /> Staff Leave Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, approve, or reject leave applications submitted by support and operational staff.
          </p>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Requests</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-amber-600">{pendingLeaves.length}</span>
            <FiClock className="text-amber-500 text-lg" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved Leaves</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-emerald-600">{approvedLeaves.length}</span>
            <FiCheckCircle className="text-emerald-500 text-lg" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rejected Requests</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-rose-600">{rejectedLeaves.length}</span>
            <FiXCircle className="text-rose-500 text-lg" />
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200/80 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Pending Requests ({pendingLeaves.length})
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'archive'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Processed Archive ({processedLeaves.length})
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-400">Loading leave requests...</span>
          </div>
        ) : activeTab === 'pending' ? (
          pendingLeaves.length === 0 ? (
            <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
              <FiCalendar className="text-slate-300 text-3xl mb-2" />
              <p className="text-xs font-semibold text-slate-600">No Pending Requests</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All staff leave applications have been processed.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Reason Details</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pendingLeaves.map((lv) => (
                    <tr key={lv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <FiUser className="text-xs" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{lv.staff_name}</p>
                            <span className="text-[10px] text-slate-400 font-medium uppercase">
                              Role: {lv.staff_role}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {lv.type}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                        <span className="flex items-center gap-1">
                          {new Date(lv.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          <FiChevronRight className="text-slate-400 text-xs" />
                          {new Date(lv.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={lv.reason}>
                        {lv.reason}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            disabled={processingId !== null}
                            onClick={() => handleProcessLeave(lv.id, 'Approved')}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all cursor-pointer border border-emerald-200"
                            title="Approve Leave"
                          >
                            <FiCheck className="text-xs" />
                          </button>
                          <button
                            disabled={processingId !== null}
                            onClick={() => handleProcessLeave(lv.id, 'Rejected')}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-all cursor-pointer border border-rose-200"
                            title="Reject Leave"
                          >
                            <FiX className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : processedLeaves.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <FiCalendar className="text-slate-300 text-3xl mb-2" />
            <p className="text-xs font-semibold text-slate-600">Archive Log Empty</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No processed leave applications recorded yet.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {processedLeaves.map((lv) => (
                  <tr key={lv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <FiUser className="text-xs" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{lv.staff_name}</p>
                          <span className="text-[10px] text-slate-400 font-medium uppercase">Role: {lv.staff_role}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                      {lv.type}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">
                      {new Date(lv.start_date).toLocaleDateString()} to {new Date(lv.end_date).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={lv.reason}>
                      {lv.reason}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        lv.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {lv.status}
                      </span>
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

export default AdminStaffLeavesPage;
