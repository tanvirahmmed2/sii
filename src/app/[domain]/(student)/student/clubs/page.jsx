'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiUsers, FiUserCheck, FiPlusCircle, FiSearch, 
  FiInfo, FiCheckCircle, FiShield, FiTag, FiClock, FiX
} from 'react-icons/fi';

const StudentClubsDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState([]);
  const [joiningClubId, setJoiningClubId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedClub, setSelectedClub] = useState(null);

  useEffect(() => {
    fetchStudentClubs();
  }, []);

  const fetchStudentClubs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/student/clubs');
      const payload = response.data?.payload || response.data?.paylod || {};
      setClubs(payload.clubs || response.data?.clubs || []);
    } catch (error) {
      toast.error('Failed to load campus clubs.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (clubId) => {
    setJoiningClubId(clubId);
    try {
      const res = await axios.post('/api/student/clubs', { club_id: clubId });
      if (res.data?.success) {
        toast.success(res.data.message || 'Joined club successfully!');
        fetchStudentClubs();
      } else {
        toast.error(res.data?.error || 'Failed to join club.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join club.');
    } finally {
      setJoiningClubId(null);
    }
  };

  const myClubs = useMemo(() => {
    return clubs.filter(c => c.my_membership_status === 'active');
  }, [clubs]);

  const categories = useMemo(() => {
    const set = new Set(clubs.map(c => c.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    return clubs.filter((c) => {
      const matchCat = categoryFilter === 'all' || (c.category || '').toLowerCase() === categoryFilter.toLowerCase();
      const matchSearch = searchTerm === '' ||
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.moderator_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [clubs, categoryFilter, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading campus clubs directory...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiUsers /> Co-Curricular &amp; Campus Life
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Student Clubs &amp; Societies</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Discover student organizations, participate in extracurricular activities, and collaborate with peers.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl text-xs font-bold text-emerald-700 shrink-0">
          <FiUserCheck className="text-sm" /> My Enrolled Clubs: {myClubs.length}
        </div>
      </div>

      {/* My Enrolled Clubs Table */}
      {myClubs.length > 0 && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">My Active Club Memberships</h2>
              <p className="text-xs text-slate-400 font-medium">Clubs where your official student membership is active</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {myClubs.length} Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Club Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">My Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Faculty Moderator</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {myClubs.map((club) => (
                  <tr key={club.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {club.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {club.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700 capitalize">
                      {club.my_role || 'Member'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                      {club.my_joined_date ? new Date(club.my_joined_date).toLocaleDateString('en-GB') : 'Active Member'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {club.moderator_name || 'Faculty Advisor'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <FiCheckCircle className="text-xs" /> Enrolled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clubs Catalog Table */}
      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Campus Clubs &amp; Societies Directory</h2>
            <p className="text-xs text-slate-400 font-medium">Browse available campus organizations and enroll to participate</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs w-full sm:w-60">
              <FiSearch className="text-slate-400" />
              <input
                type="text"
                placeholder="Search clubs or advisors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none w-full"
              />
            </div>
          </div>
        </div>

        {filteredClubs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-2xl">
            No campus clubs match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Club Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Faculty Advisor</th>
                  <th className="py-3 px-4 text-center">Members</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClubs.map((club) => {
                  const isMember = club.my_membership_status === 'active';
                  const isJoining = joiningClubId === club.id;

                  return (
                    <tr key={club.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {club.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {club.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {club.description || 'Campus student activity society.'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 font-medium">
                        {club.moderator_name || 'Faculty Member'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-600">
                        {club.total_members || 1}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isMember ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                            <FiCheckCircle className="text-xs" /> Enrolled
                          </span>
                        ) : (
                          <button
                            onClick={() => handleJoinClub(club.id)}
                            disabled={isJoining}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <FiPlusCircle className="text-xs" />
                            {isJoining ? 'Joining...' : 'Join Club'}
                          </button>
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

export default StudentClubsDashboardPage;
