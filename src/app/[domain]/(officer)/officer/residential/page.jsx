'use client';

import React, { useState } from 'react';

export default function OfficerResidentialPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">
          Residential & Hall Management Desk
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Hall provost workstation for managing student room allocations, seat occupancies, and dormitory logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Hall Rooms
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">128</span>
            <span className="text-[10px] font-medium text-slate-500">Across 4 Wings</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Allocated Seats
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">482</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Occupied</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Vacant Seats
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">30</span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Available</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Maintenance Holds
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-amber-600 dark:text-amber-400 font-mono">4</span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Under repair</span>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search hall rooms, student registrations, or wings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Seats</option>
              <option value="allocated">Allocated</option>
              <option value="vacant">Vacant</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Room / Seat</th>
                <th className="px-3 py-2">Hall Wing</th>
                <th className="px-3 py-2">Resident Student</th>
                <th className="px-3 py-2">Allocation Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {[
                { room: 'Room 101 - S1', wing: 'North Wing', student: 'Tanvir Hossain (REG-8821)', date: '2026-01-15', status: 'Allocated' },
                { room: 'Room 101 - S2', wing: 'North Wing', student: 'Kamrul Islam (REG-8822)', date: '2026-01-15', status: 'Allocated' },
                { room: 'Room 101 - S3', wing: 'North Wing', student: 'Vacant', date: '—', status: 'Available' },
                { room: 'Room 102 - S1', wing: 'North Wing', student: 'Zahid Hasan (REG-8840)', date: '2026-02-01', status: 'Allocated' },
                { room: 'Room 205 - S4', wing: 'South Wing', student: 'Maintenance Hold', date: '2026-10-01', status: 'Maintenance' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 font-mono text-slate-900 dark:text-slate-200">{row.room}</td>
                  <td className="px-3 py-2">{row.wing}</td>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{row.student}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{row.date}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                      row.status === 'Allocated'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                        : row.status === 'Available'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="px-2 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                      Manage Seat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
