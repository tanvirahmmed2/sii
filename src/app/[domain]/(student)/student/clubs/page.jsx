'use client';

import React, { useState, useEffect, useMemo } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const StudentClubsDashboardPage = () => {
  const { getApiEndpoint } = useTenantWebsite();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState([]);
  const [joiningClubId, setJoiningClubId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchStudentClubs = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint('student/clubs'));
      if (res.ok) {
        const responseData = await res.json();
        const payload = responseData.payload || responseData.paylod || responseData;
        setClubs(payload.clubs || responseData.clubs || []);
      } else {
        toast.error('Failed to load campus clubs.');
      }
    } catch {
      toast.error('Failed to load campus clubs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentClubs();
  }, [getApiEndpoint]);

  const handleJoinClub = async (clubId) => {
    setJoiningClubId(clubId);
    try {
      const res = await fetch(getApiEndpoint('student/clubs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Joined club successfully!');
        fetchStudentClubs();
      } else {
        toast.error(data.error || 'Failed to join club.');
      }
    } catch {
      toast.error('Failed to join club.');
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
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="w-full pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block mb-1">
            Co-Curricular &amp; Campus Life
          </span>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Student Clubs &amp; Societies
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Discover student organizations, participate in extracurricular activities, and collaborate with peers.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-xs font-semibold text-primary self-start sm:self-auto">
          Enrolled Clubs: {myClubs.length}
        </div>
      </div>

      {/* My Enrolled Clubs Table */}
      {myClubs.length > 0 && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">My Active Club Memberships</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Organizations where your student membership is registered</p>
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded">
              {myClubs.length} Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Club Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">My Role</th>
                  <th className="py-2.5 px-3">Joined Date</th>
                  <th className="py-2.5 px-3">Faculty Moderator</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myClubs.map((club) => (
                  <tr key={club.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {club.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {club.category || 'General'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-primary capitalize">
                      {club.my_role || 'Member'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {club.my_joined_date ? new Date(club.my_joined_date).toLocaleDateString('en-GB') : 'Active Member'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {club.moderator_name || 'Faculty Advisor'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase tracking-wider">
                        Enrolled
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
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Campus Clubs Directory</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Browse available campus organizations and enroll to participate</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-primary cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search clubs or advisors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-primary w-48 sm:w-56"
            />
          </div>
        </div>

        {filteredClubs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-medium text-xs">
            No campus clubs match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Club Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Faculty Advisor</th>
                  <th className="py-2.5 px-3 text-center">Members</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClubs.map((club) => {
                  const isMember = club.my_membership_status === 'active';
                  const isJoining = joiningClubId === club.id;

                  return (
                    <tr key={club.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {club.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {club.category || 'General'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {club.description || 'Campus student society.'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        {club.moderator_name || 'Faculty Member'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600 dark:text-slate-400">
                        {club.total_members || 1}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isMember ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase tracking-wider">
                            Enrolled
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleJoinClub(club.id)}
                            disabled={isJoining}
                            className="px-3 py-1 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
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
