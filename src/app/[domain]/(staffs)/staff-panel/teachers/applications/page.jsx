'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiFileText, FiCheck, FiX, FiSearch, FiClock,
  FiCheckCircle, FiXCircle, FiRefreshCw
} from 'react-icons/fi';

const AdminApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/leave-applications?type=teacher');
      setApplications(response.data.paylod?.applications || []);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      const response = await axios.put(`/api/leave-applications/${id}`, { status });
      toast.success(response.data.message || 'Leave application status updated.');
      setApplications(
        applications.map((app) => (app.id === id ? { ...app, status } : app))
      );
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (app.teacher_name || '').toLowerCase().includes(q) ||
      (app.type || '').toLowerCase().includes(q) ||
      (app.reason || '').toLowerCase().includes(q) ||
      (app.status || '').toLowerCase().includes(q)
    );
  });

  // Metrics
  const approvedCount = applications.filter((a) => a.status === 'Approved').length;
  const pendingCount = applications.filter((a) => a.status === 'Pending').length;
  const rejectedCount = applications.filter((a) => a.status === 'Rejected').length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiFileText className="text-primary" /> Applications Drawer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, approve, or reject teacher leave applications and official requests.
          </p>
        </div>

        <button
          onClick={fetchApplications}
          className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} /> Refresh Drawer
        </button>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Applications</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-slate-800">{applications.length}</span>
            <FiFileText className="text-slate-400 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Approved</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-emerald-600">{approvedCount}</span>
            <FiCheckCircle className="text-emerald-500 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Review</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-amber-600">{pendingCount}</span>
            <FiClock className="text-amber-500 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rejected</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-rose-600">{rejectedCount}</span>
            <FiXCircle className="text-rose-500 text-sm" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
        <FiSearch className="text-slate-400 text-sm ml-1" />
        <input
          type="text"
          placeholder="Search applications by teacher name, request type, or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2">
            Clear
          </button>
        )}
      </div>

      {/* Applications Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Leave Applications Registry ({filteredApplications.length})
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-12 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-400">Loading applications...</span>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
            <FiFileText className="text-slate-300 text-3xl mb-2" />
            <p className="text-xs font-semibold text-slate-600">No Applications Filed</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No leave applications match your search query.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Request Type</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredApplications.map((app) => {
                  const startStr = new Date(app.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                  const endStr = new Date(app.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                  const diffTime = Math.abs(new Date(app.end_date) - new Date(app.start_date));
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                        {app.teacher_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                        {app.type || 'Leave Request'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {startStr} - {endStr} ({diffDays} {diffDays === 1 ? 'Day' : 'Days'})
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={app.reason}>
                        {app.reason}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          app.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          app.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {app.status === 'Pending' ? (
                          <div className="inline-flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'Approved')}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                              title="Approve Application"
                            >
                              <FiCheck className="text-xs" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'Rejected')}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Reject Application"
                            >
                              <FiX className="text-xs" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No Action Needed</span>
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
    </div>
  );
};

export default AdminApplicationsPage;
