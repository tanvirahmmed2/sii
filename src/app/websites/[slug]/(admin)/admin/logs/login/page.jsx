'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiShield, FiSearch, FiMonitor, FiUser, FiGlobe, FiClock,
  FiCheckCircle, FiXCircle, FiFilter, FiRefreshCw
} from 'react-icons/fi';

const AdminLoginLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async (role = 'all') => {
    setLoading(true);
    try {
      let url = '/api/admin/logs/login';
      if (role !== 'all') {
        url += `?user_type=${role}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch login logs.');
      }
      setLogs(data.paylod?.logs || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(selectedRole);
  }, [selectedRole]);

  const filteredLogs = logs.filter((log) => {
    // Filter by status option
    if (selectedStatus !== 'all' && (log.status || '').toLowerCase() !== selectedStatus.toLowerCase()) {
      return false;
    }
    // Search query match
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.name || '').toLowerCase().includes(q) ||
      (log.email || '').toLowerCase().includes(q) ||
      (log.ip_address || '').toLowerCase().includes(q) ||
      (log.user_type || '').toLowerCase().includes(q)
    );
  });

  const getRoleBadgeStyle = (userType) => {
    switch (userType) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'teacher':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'student':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'staff':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const roleOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'admin', label: 'Admins' },
    { value: 'teacher', label: 'Teachers' },
    { value: 'student', label: 'Students' },
    { value: 'staff', label: 'Staff' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'success', label: 'Success Only' },
    { value: 'failed', label: 'Failed Only' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiShield className="text-primary" /> Login Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time authentication records for all administrators, teachers, students, and staff members.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(selectedRole)}
          className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Select Option Filter Controls & Search */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* User Role Select Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <FiFilter className="text-slate-400 text-xs shrink-0" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Select Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or IP..."
            className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Login Logs Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FiClock className="text-primary" /> Login Activity Registry ({filteredLogs.length})
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-400">Retrieving authentication logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <FiShield className="text-slate-300 text-3xl mb-2" />
            <p className="text-xs font-semibold text-slate-600">No Login Logs Found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery ? 'No records match your search.' : 'No authentication activity recorded for this filter.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">User Details</th>
                  <th className="px-4 py-3">Role / User Type</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Device / Browser</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <FiUser className="text-xs" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{log.name || 'User'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{log.email || 'N/A'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getRoleBadgeStyle(
                          log.user_type
                        )}`}
                      >
                        {log.user_type}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">
                      <span className="flex items-center gap-1.5">
                        <FiGlobe className="text-slate-400 text-xs" /> {log.ip_address || '127.0.0.1'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={log.user_agent}>
                      <span className="flex items-center gap-1.5">
                        <FiMonitor className="text-slate-400 text-xs shrink-0" />
                        {log.user_agent || 'Unknown Browser'}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <FiCheckCircle className="text-xs text-emerald-500" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                          <FiXCircle className="text-xs text-rose-500" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right text-slate-500 font-medium">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
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

export default AdminLoginLogsPage;
