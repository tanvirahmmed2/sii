'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiShield, FiAlertTriangle, FiCheckCircle, FiClock, FiGrid, FiUser } from 'react-icons/fi';

const SecurityAuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/security/login-logs');
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.paylod.logs || []);
      }
    } catch (err) {
      toast.error('Failed to load security login logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesRole = filterRole ? log.user_role === filterRole : true;
    const matchesStatus = filterStatus ? log.status === filterStatus : true;
    return matchesRole && matchesStatus;
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiShield className="text-primary animate-pulse" /> Security Access & Authentication Log
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor system login events, audit failures, and verify user agent details for admins, teachers, students, and guardians.
        </p>
      </div>

      {/* Filter card */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col md:flex-row items-center gap-4">
        <div className="w-full md:w-1/3 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiUser /> Filter User Role
          </label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
          >
            <option value="">All Roles...</option>
            <option value="admin">Administrator</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="guardian">Guardian</option>
            <option value="staff">Staff Member</option>
          </select>
        </div>

        <div className="w-full md:w-1/3 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiShield /> Filter Authentication Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
          >
            <option value="">All Statuses...</option>
            <option value="Success">Success Inflow</option>
            <option value="Failed">Failed Attempt</option>
          </select>
        </div>

        <div className="w-full md:w-1/3 flex flex-col gap-1.5 justify-end h-full mt-auto">
          <button
            onClick={fetchLogs}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-850 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs"
          >
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Table log */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Authentication Logs Trail</h2>
          <span className="text-xs font-semibold text-slate-400">Showing {filteredLogs.length} events</span>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-400">Loading audit history...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-5xl mb-3">🛡️</span>
            <h3 className="text-sm font-bold text-slate-600">Logs Sheet Clean</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              No matching authentication logs registered in security system.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User ID / Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Login Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User Agent / Client</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks / Failure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">User #{log.user_id}</p>
                        <span className="inline-flex items-center text-[10px] font-bold text-primary bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full mt-0.5 uppercase">
                          {log.user_role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                        <FiClock className="text-slate-450 text-slate-400" />
                        {new Date(log.login_time).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-semibold">
                      {log.ip_address || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 max-w-xs truncate" title={log.user_agent}>
                        {log.user_agent || 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        log.status === 'Success'
                          ? 'bg-green-50 text-green-600 border border-green-100'
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {log.status === 'Success' ? (
                          <>
                            <FiCheckCircle /> Success
                          </>
                        ) : (
                          <>
                            <FiAlertTriangle /> Failed
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-505 text-red-500 font-semibold">
                      {log.failure_reason || 'N/A'}
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

export default SecurityAuditPage;
