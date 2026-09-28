'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUsers, FiTrash2, FiSearch, FiAlertCircle, FiUserPlus, FiShield } from 'react-icons/fi';


const TeacherClubMembersPage = () => {
  const [loading, setLoading] = useState(true);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');

  // Add member form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [memberDesignation, setMemberDesignation] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Table filter state
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    fetchTeacherClubs();
  }, []);

  const fetchTeacherClubs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/teacher/clubs');
      const payload = response.data?.paylod || {};
      if (payload.isClubAdmin && payload.clubs?.length > 0) {
        setIsClubAdmin(true);
        setClubs(payload.clubs);
        setStudents(payload.students || []);
        const firstClub = payload.clubs[0];
        setSelectedClubId(String(firstClub.id));
      } else {
        setIsClubAdmin(false);
        setClubs([]);
      }
    } catch (error) {
      toast.error('Failed to load members details.');
    } finally {
      setLoading(false);
    }
  };

  const currentClub = clubs.find(c => String(c.id) === String(selectedClubId));

  // Add Student to Club
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedClubId) {
      toast.error('Please select a student.');
      return;
    }

    setAddingMember(true);
    try {
      const res = await axios.post('/api/teacher/clubs', {
        action: 'add_member',
        club_id: selectedClubId,
        student_id: selectedStudentId,
        role: selectedRole,
        designation: memberDesignation
      });
      toast.success(res.data.message || 'Student added to club!');
      setSelectedStudentId('');
      setMemberDesignation('');
      setSelectedRole('member');
      fetchTeacherClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally {
      setAddingMember(false);
    }
  };

  // Update Member Role
  const handleRoleChange = async (studentId, newRole, currentDesig) => {
    try {
      const res = await axios.post('/api/teacher/clubs', {
        action: 'update_member_role',
        club_id: selectedClubId,
        student_id: studentId,
        role: newRole,
        designation: currentDesig
      });
      toast.success(res.data.message || 'Role updated successfully');
      fetchTeacherClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  // Remove Member
  const handleRemoveMember = async (studentId) => {
    if (!confirm('Remove this student from the club?')) return;
    try {
      const res = await axios.post('/api/teacher/clubs', {
        action: 'remove_member',
        club_id: selectedClubId,
        student_id: studentId
      });
      toast.success(res.data.message || 'Student removed from club');
      fetchTeacherClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove student');
    }
  };

  const dropdownFilteredStudents = students.filter(st =>
    st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    st.registration_number.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const displayedMembers = (currentClub?.members || []).filter(m =>
    m.student_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.registration_number.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (m.designation && m.designation.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center">
        <span className="text-xs text-slate-400">Loading Club Members...</span>
      </div>
    );
  }

  if (!isClubAdmin || clubs.length === 0) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
        <FiAlertCircle className="text-2xl text-slate-400 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800">Not Assigned to Any Club</h2>
        <p className="text-xs text-slate-500">You are not currently assigned as a Club Admin.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{currentClub?.name || 'Club Admin'}</h1>
          <p className="text-xs text-slate-500">
            Role: <span className="font-semibold text-slate-700">{currentClub?.admin_designation || 'Club Admin'}</span>
          </p>
        </div>

        {clubs.length > 1 && (
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none cursor-pointer"
          >
            {clubs.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Add Student Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FiUserPlus className="text-primary" /> Add Student Member
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Assign a student as Member or Moderator.</p>
          </div>

          <form onSubmit={handleAddMember} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Search Student</label>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Select Student *</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-medium"
              >
                <option value="">-- Select Student --</option>
                {dropdownFilteredStudents.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.registration_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned Role *</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold"
              >
                <option value="member">Member</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Designation / Title</label>
              <input
                type="text"
                value={memberDesignation}
                onChange={(e) => setMemberDesignation(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={addingMember}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors mt-2"
            >
              {addingMember ? 'Adding...' : '+ Add Student to Club'}
            </button>
          </form>
        </div>

        {/* Member Roster List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FiUsers /> Members &amp; Moderators Roster
              </h2>
              <p className="text-xs text-slate-500">{currentClub?.members?.length || 0} Total Assigned Students</p>
            </div>

            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 text-xs" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 font-semibold">Student Name</th>
                  <th className="py-2.5 px-3 font-semibold">Reg. ID</th>
                  <th className="py-2.5 px-3 font-semibold">Current Role</th>
                  <th className="py-2.5 px-3 font-semibold">Designation</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedMembers.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-800">{m.student_name}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{m.registration_number}</td>
                    <td className="py-3 px-3">
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.student_id, e.target.value, m.designation)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border border-slate-200 cursor-pointer ${
                          m.role === 'moderator' ? 'bg-primary-light text-primary' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{m.designation || '-'}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleRemoveMember(m.student_id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove Student"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-400 py-8 text-xs">
                      No student members matching search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TeacherClubMembersPage;
