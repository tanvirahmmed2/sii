'use client';

import React, { useState } from 'react';

export default function OfficerClubPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">
          Clubs & Student Activities Operations
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Campus club desk for managing club registrations, active memberships, events, and officer committee rosters.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Registered Clubs
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">16</span>
            <span className="text-[10px] font-medium text-slate-500">Active Campus Societies</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Student Members
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">1,120</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Enrolled Members</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Upcoming Events
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">5</span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Scheduled Term</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Executive Officers
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">48</span>
            <span className="text-[10px] font-medium text-slate-500">Committee Leads</span>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search clubs, moderators, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Club Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Faculty Moderator</th>
                <th className="px-3 py-2">Active Members</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {[
                { name: 'Robotics & AI Society', category: 'STEM & Technology', mod: 'Engr. Saiful Islam', members: '185', status: 'Active' },
                { name: 'Debate & Public Speaking Club', category: 'Cultural & Academic', mod: 'Prof. Anisuzzaman', members: '142', status: 'Active' },
                { name: 'Sports & Athletics Association', category: 'Athletics', mod: 'Coach Rafiqul Huq', members: '310', status: 'Active' },
                { name: 'Language & Literature Society', category: 'Arts & Humanities', mod: 'Dr. Shahana Akhter', members: '98', status: 'Active' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{row.name}</td>
                  <td className="px-3 py-2 text-slate-500">{row.category}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{row.mod}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">{row.members} enrolled</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="px-2 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                      Club Desk
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
