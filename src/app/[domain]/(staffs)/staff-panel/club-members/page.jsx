'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function ClubMembersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domain = params?.domain || '';
  const initialClubId = searchParams.get('club_id');

  const [members, setMembers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [candidateStudents, setCandidateStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchingCandidates, setSearchingCandidates] = useState(false);

  // Filters for Main Members Ledger
  const [selectedClub, setSelectedClub] = useState(initialClubId || 'all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [chatOnly, setChatOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Inline Enrollment / Edit Workstation State (NO popup)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formClubId, setFormClubId] = useState('');
  const [formRole, setFormRole] = useState('member');
  const [formStatus, setFormStatus] = useState('active');
  const [formCanChat, setFormCanChat] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Candidate Student Filters (Department, Class, Reg No, Name)
  const [candidateDept, setCandidateDept] = useState('all');
  const [candidateClass, setCandidateClass] = useState('all');
  const [candidateRegNo, setCandidateRegNo] = useState('');
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Inline Delete State (NO popup)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      let url = `/api/${domain}/staff/panel/clubs/members?`;
      if (selectedClub !== 'all') url += `club_id=${selectedClub}&`;
      if (selectedRole !== 'all') url += `role=${selectedRole}&`;
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;
      if (chatOnly) url += `chat_only=true&`;
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
        if (data.clubs) setClubs(data.clubs);
        if (data.departments) setDepartments(data.departments);
        if (data.classes) setClasses(data.classes);
        if (data.candidate_students) setCandidateStudents(data.candidate_students);
      } else {
        showToast(data.error || 'Failed to load club members', true);
      }
    } catch (err) {
      console.error('Fetch members error:', err);
      showToast('Network error while loading club members.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [domain, selectedClub, selectedRole, selectedStatus, chatOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMembers();
  };

  // Search candidate students dynamically by department, class, or registration number
  const handleSearchCandidates = async (e) => {
    if (e) e.preventDefault();
    setSearchingCandidates(true);
    try {
      let url = `/api/${domain}/staff/panel/clubs/members?action=search_candidates&`;
      if (candidateDept !== 'all') url += `student_dept=${candidateDept}&`;
      if (candidateClass !== 'all') url += `student_class=${candidateClass}&`;
      if (candidateRegNo.trim()) url += `student_reg_no=${encodeURIComponent(candidateRegNo.trim())}&`;
      if (candidateKeyword.trim()) url += `candidate_query=${encodeURIComponent(candidateKeyword.trim())}&`;
      if (formClubId) url += `target_club_id=${formClubId}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCandidateStudents(data.candidate_students || []);
      } else {
        showToast(data.error || 'Failed to search students', true);
      }
    } catch (err) {
      console.error('Search candidates error:', err);
      showToast('Network error while searching candidate students.', true);
    } finally {
      setSearchingCandidates(false);
    }
  };

  const handleResetCandidateFilters = () => {
    setCandidateDept('all');
    setCandidateClass('all');
    setCandidateRegNo('');
    setCandidateKeyword('');
    fetchMembers();
  };

  const openAddForm = () => {
    setEditingMember(null);
    const defaultClub = selectedClub !== 'all' ? selectedClub : clubs[0]?.id ? String(clubs[0].id) : '';
    setFormClubId(defaultClub);
    setFormRole('member');
    setFormStatus('active');
    setFormCanChat(true);
    setSelectedStudentIds([]);
    setIsFormOpen(true);
  };

  const openEditForm = (member) => {
    setEditingMember(member);
    setFormClubId(String(member.club_id));
    setFormRole(member.role || 'member');
    setFormStatus(member.status || 'active');
    setFormCanChat(Boolean(member.can_access_chat));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingMember(null);
    setSelectedStudentIds([]);
  };

  // Toggle single student checkbox
  const handleToggleSelectStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  // Select all or deselect all visible candidate students
  const handleSelectAllVisible = () => {
    if (selectedStudentIds.length === candidateStudents.length && candidateStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(candidateStudents.map((s) => s.id));
    }
  };

  // Save / Enroll members (supports single edit or multi-student bulk enrollment)
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!formClubId) {
      showToast('Please select a target club.', true);
      return;
    }

    if (!editingMember && selectedStudentIds.length === 0) {
      showToast('Please select at least one student to make them a member.', true);
      return;
    }

    setSubmitting(true);
    try {
      if (editingMember) {
        // Single update
        const res = await fetch(`/api/${domain}/staff/panel/clubs/members`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingMember.id,
            role: formRole,
            status: formStatus,
            can_access_chat: formCanChat,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Member updated successfully.');
          closeForm();
          fetchMembers();
        } else {
          showToast(data.error || 'Update failed', true);
        }
      } else {
        // Multi or single student enrollment
        const res = await fetch(`/api/${domain}/staff/panel/clubs/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            club_id: parseInt(formClubId, 10),
            student_ids: selectedStudentIds,
            role: formRole,
            status: formStatus,
            can_access_chat: formCanChat,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || `Successfully enrolled ${selectedStudentIds.length} student(s).`);
          closeForm();
          fetchMembers();
        } else {
          showToast(data.error || 'Failed to add member(s)', true);
        }
      }
    } catch (err) {
      console.error('Save member error:', err);
      showToast('Network error while enrolling member(s).', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickToggleChat = async (member) => {
    try {
      const newStatus = !member.can_access_chat;
      const res = await fetch(`/api/${domain}/staff/panel/clubs/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: member.id,
          can_access_chat: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Chat access ${newStatus ? 'granted' : 'revoked'} for ${member.student_name}.`);
        fetchMembers();
      } else {
        showToast(data.error || 'Failed to toggle chat access', true);
      }
    } catch (err) {
      console.error('Toggle error:', err);
      showToast('Network error.', true);
    }
  };

  const handleDeleteMember = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/clubs/members?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Member removed from club.');
        setConfirmDeleteId(null);
        fetchMembers();
      } else {
        showToast(data.error || 'Failed to remove member', true);
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Network error while removing member', true);
    } finally {
      setDeletingId(null);
    }
  };

  // KPIs
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'active').length;
  const chatMembers = members.filter((m) => m.can_access_chat).length;
  const execMembers = members.filter((m) => m.role !== 'member').length;

  // Filter classes by selected department for candidate filter dropdown
  const filteredCandidateClasses =
    candidateDept === 'all'
      ? classes
      : classes.filter((c) => String(c.department_id) === String(candidateDept));

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 rounded text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
          <span>{toastMessage}</span>
          <span className="text-[10px] font-mono uppercase">OK</span>
        </div>
      )}
      {toastError && (
        <div className="p-3 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-2xs">
          <span>{toastError}</span>
          <span className="text-[10px] font-mono uppercase">ERROR</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Total Enrolled</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{totalMembers}</span>
            <span className="text-[10px] font-medium text-slate-500">Student Members</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Active Status</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{activeMembers}</span>
            <span className="text-[10px] font-medium text-emerald-600">Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Chat Authorized</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-primary font-mono">{chatMembers}</span>
            <span className="text-[10px] font-medium text-primary">Live Chat Access</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Executive Board</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{execMembers}</span>
            <span className="text-[10px] font-medium text-slate-500">Officers</span>
          </div>
        </div>
      </div>

      {/* Inline Multi-Student Enrollment & Edit Workstation Panel (NO popup) */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 border border-primary/40 rounded p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                {editingMember ? `Edit Member: ${editingMember.student_name}` : 'Enroll Students into Club'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {editingMember
                  ? 'Update membership position, status, or chat box communication permissions.'
                  : 'Filter candidate students by department, class, or registration number, select single or multiple students, and enroll them as members.'}
              </p>
            </div>
            <button
              onClick={closeForm}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveMember} className="space-y-4">
            {/* Membership Configuration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Club *
                </label>
                {editingMember ? (
                  <p className="text-xs font-medium text-slate-900 dark:text-white py-1.5 px-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    {editingMember.club_name}
                  </p>
                ) : (
                  <select
                    required
                    value={formClubId}
                    onChange={(e) => setFormClubId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Select Target Club...</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role / Position
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="member">General Member</option>
                  <option value="executive">Executive Member</option>
                  <option value="president">Club President</option>
                  <option value="general_secretary">General Secretary</option>
                  <option value="treasurer">Treasurer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enrollment Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2 py-1.5">
                  <input
                    type="checkbox"
                    id="formCanChat"
                    checked={formCanChat}
                    onChange={(e) => setFormCanChat(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="formCanChat" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                    Grant Live Chat Access
                  </label>
                </div>
              </div>
            </div>

            {/* Candidate Student Filter & Selection (Only when enrolling new members) */}
            {!editingMember && (
              <div className="space-y-3 pt-1">
                {/* Filter Toolbar: Department, Class, Reg No */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Candidate Student Filters
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {candidateStudents.length} candidate(s) loaded
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* Filter: Department */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Department</label>
                      <select
                        value={candidateDept}
                        onChange={(e) => setCandidateDept(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                      >
                        <option value="all">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter: Class */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Class</label>
                      <select
                        value={candidateClass}
                        onChange={(e) => setCandidateClass(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                      >
                        <option value="all">All Classes</option>
                        {filteredCandidateClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter: Registration Number */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Registration Number</label>
                      <input
                        type="text"
                        placeholder="e.g. REG-2026-0001"
                        value={candidateRegNo}
                        onChange={(e) => setCandidateRegNo(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>

                    {/* Filter: Keyword Search & Action Buttons */}
                    <div className="flex items-end gap-1.5">
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Name / Roll No</label>
                        <input
                          type="text"
                          placeholder="Search keyword..."
                          value={candidateKeyword}
                          onChange={(e) => setCandidateKeyword(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSearchCandidates}
                        disabled={searchingCandidates}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 cursor-pointer transition whitespace-nowrap"
                      >
                        {searchingCandidates ? 'Searching...' : 'Filter'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetCandidateFilters}
                        className="px-2 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Reset Filters"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Candidate Students Multi-Select Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800/80 px-3 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          candidateStudents.length > 0 &&
                          selectedStudentIds.length === candidateStudents.length
                        }
                        onChange={handleSelectAllVisible}
                        className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedStudentIds.length > 0
                          ? `${selectedStudentIds.length} student(s) selected`
                          : 'Select candidate students to enroll'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedStudentIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        >
                          Deselect All
                        </button>
                      )}
                      <span className="text-[11px] text-slate-400">
                        Showing {candidateStudents.length} candidate students
                      </span>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900">
                    {candidateStudents.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No candidate students found matching the selected department, class, or registration number.
                      </div>
                    ) : (
                      candidateStudents.map((stu) => {
                        const isSelected = selectedStudentIds.includes(stu.id);
                        return (
                          <div
                            key={stu.id}
                            onClick={() => handleToggleSelectStudent(stu.id)}
                            className={`flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${
                              isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectStudent(stu.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                              />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white leading-tight">
                                  {stu.name}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  <span className="font-mono font-medium text-primary">
                                    Reg: {stu.registration_no}
                                  </span>
                                  {stu.roll_no && <span>Roll: {stu.roll_no}</span>}
                                  {stu.department_name && <span>• {stu.department_name}</span>}
                                  {stu.class_name && <span>• {stu.class_name}</span>}
                                </div>
                              </div>
                            </div>

                            <div>
                              {stu.is_already_member ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                                  Already in Club
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                                  Eligible
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                {!editingMember && (
                  <span>
                    Selected: <strong className="text-slate-900 dark:text-white">{selectedStudentIds.length}</strong> student(s)
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!editingMember && selectedStudentIds.length === 0)}
                  className="px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving...'
                    : editingMember
                    ? 'Update Member'
                    : `Make ${selectedStudentIds.length > 0 ? selectedStudentIds.length : ''} Member(s)`}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Interactive Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search member by name, reg no or club..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Clubs</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="member">General Member</option>
              <option value="executive">Executive</option>
              <option value="president">President</option>
              <option value="general_secretary">Secretary</option>
              <option value="treasurer">Treasurer</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={() => setChatOnly(!chatOnly)}
              className={`px-2.5 py-1.5 rounded text-xs border cursor-pointer transition ${
                chatOnly
                  ? 'bg-primary text-white border-primary'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Chat Access Only
            </button>

            <button
              onClick={isFormOpen ? closeForm : openAddForm}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary hover:bg-primary-dark text-white cursor-pointer transition whitespace-nowrap"
            >
              {isFormOpen ? 'Close Panel' : '+ Enroll Members'}
            </button>
          </div>
        </div>

        {/* Members Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Student Identity</th>
                <th className="px-3 py-2">Club Name</th>
                <th className="px-3 py-2">Department / Class</th>
                <th className="px-3 py-2">Role & Position</th>
                <th className="px-3 py-2">Chat Room Access</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-3 py-8 text-center text-slate-400">
                    Loading club members directory...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-8 text-center text-slate-400">
                    No club members enrolled yet. Click &quot;+ Enroll Members&quot; to filter students by department, class, or registration number and enroll them.
                  </td>
                </tr>
              ) : (
                members.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-semibold text-[11px] text-slate-700 dark:text-slate-200 shrink-0">
                          {item.student_name ? item.student_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white leading-tight">{item.student_name}</p>
                          <p className="text-[10px] text-primary font-mono mt-0.5">
                            Reg: {item.registration_no || '—'} {item.roll_no ? `| Roll: ${item.roll_no}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{item.club_name}</span>
                      <p className="text-[10px] text-slate-400">{item.club_category}</p>
                    </td>

                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                      <span>{item.department_name || item.class_name || 'General'}</span>
                      {item.section_name && <span className="text-[10px] text-slate-400 block">Sec: {item.section_name}</span>}
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                          item.role === 'president'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800'
                            : item.role === 'general_secretary'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800'
                            : item.role === 'executive' || item.role === 'treasurer'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {item.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>

                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleQuickToggleChat(item)}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition ${
                          item.can_access_chat
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                        title="Click to toggle live chat permissions"
                      >
                        {item.can_access_chat ? 'Authorized' : 'Restricted'}
                      </button>
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          item.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : item.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                      {confirmDeleteId === item.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-[10px] text-rose-600 font-semibold">Confirm?</span>
                          <button
                            onClick={() => handleDeleteMember(item.id)}
                            disabled={deletingId === item.id}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition disabled:opacity-50"
                          >
                            {deletingId === item.id ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 rounded text-[10px] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => openEditForm(item)}
                            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center"
                            title="Edit Role & Permissions"
                          >
                            <FiEdit2 className="text-xs" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer inline-flex items-center"
                            title="Remove Member"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
