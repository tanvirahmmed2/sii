'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiActivity, FiSearch, FiUser, FiClock, FiLayers, FiFileText,
  FiAward, FiCheckCircle, FiRefreshCw, FiGrid, FiBook, FiBell, FiPlusCircle,
  FiFilter
} from 'react-icons/fi';

const AdminActivityLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async (entity = 'all') => {
    setLoading(true);
    try {
      let url = '/api/admin/logs/activity';
      if (entity !== 'all') {
        url += `?entity_type=${entity}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch activity logs.');
      }
      setLogs(data.paylod?.logs || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(selectedEntity);
  }, [selectedEntity]);

  const filteredLogs = logs.filter((log) => {
    // Filter by role option
    if (selectedRole !== 'all' && (log.user_type || '').toLowerCase() !== selectedRole.toLowerCase()) {
      return false;
    }
    // Search query match
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.user_name || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.entity_type || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q)
    );
  });

  const getEntityBadgeStyle = (entityType) => {
    switch (entityType) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'teacher':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'staff':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'admission':
      case 'circular':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'class':
      case 'section':
      case 'subject':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'news':
      case 'club':
      case 'club_news':
      case 'notice':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const entityOptions = [
    { value: 'all', label: 'All Entities' },
    { value: 'admin', label: 'Admin Accounts' },
    { value: 'teacher', label: 'Teacher Profiles' },
    { value: 'staff', label: 'Staff Accounts' },
    { value: 'admission', label: 'Admissions' },
    { value: 'circular', label: 'Admission Circulars' },
    { value: 'class', label: 'Classes' },
    { value: 'section', label: 'Sections' },
    { value: 'subject', label: 'Subjects' },
    { value: 'news', label: 'Campus News' },
    { value: 'club', label: 'Clubs' },
    { value: 'club_news', label: 'Club News' },
    { value: 'notice', label: 'Notices' },
  ];

  const roleOptions = [
    { value: 'all', label: 'All User Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'staff', label: 'Staff' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiActivity className="text-primary" /> System Activity Audit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of creation events across administrators, teachers, staff, academics, admissions, and notices.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(selectedEntity)}
          className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Select Option Filter Controls & Search */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Entity Type Select Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <FiFilter className="text-slate-400 text-xs shrink-0" />
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
            >
              {entityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* User Role Select Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
            >
              {roleOptions.map((opt) => (
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
            placeholder="Search action or details..."
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

      {/* Activity Logs Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FiActivity className="text-primary" /> Creation Activity Registry ({filteredLogs.length})
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-400">Retrieving activity logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <FiActivity className="text-slate-300 text-3xl mb-2" />
            <p className="text-xs font-semibold text-slate-600">No Activity Logs Found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery ? 'No creation logs match your search.' : 'No system activity logged for the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Actor / User</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Action Code</th>
                  <th className="px-4 py-3">Activity Details</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          <FiUser className="text-xs" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{log.user_name || 'System'}</p>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            Role: {log.user_type}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getEntityBadgeStyle(
                          log.entity_type
                        )}`}
                      >
                        {log.entity_type}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <FiPlusCircle className="text-xs text-primary" /> {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={log.details}>
                      {log.details || 'Creation event executed.'}
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

export default AdminActivityLogsPage;
