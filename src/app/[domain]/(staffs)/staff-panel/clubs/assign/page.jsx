'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUsers, FiSave, FiSearch, FiRefreshCw, FiBook, FiUserCheck, FiShield } from 'react-icons/fi';

const AdminClubsAssignPage = () => {
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [loading, setLoading] = useState(false);

  // Lookups lists
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  // Selections arrays (selectedAdmins contains objects: [{ teacher_id, designation }])
  const [selectedAdmins, setSelectedAdmins] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Search queries
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchStudent, setSearchStudent] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const response = await axios.get('/api/clubs');
      setClubs(response.data.paylod.clubs || []);
    } catch (error) {
      toast.error('Failed to load clubs registry.');
    }
  };

  useEffect(() => {
    if (selectedClub) {
      fetchClubAssignments();
    } else {
      setTeachers([]);
      setStudents([]);
      setSelectedAdmins([]);
      setSelectedMembers([]);
    }
  }, [selectedClub]);

  const fetchClubAssignments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/clubs/assign?club_id=${selectedClub}`);
      setTeachers(response.data.paylod.teachers || []);
      setStudents(response.data.paylod.students || []);

      setSelectedAdmins(response.data.paylod.assignedAdmins || []);
      setSelectedMembers(response.data.paylod.assignedMembers || []);
    } catch (error) {
      toast.error('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle checks helpers
  const handleToggleAdmin = (teacherId) => {
    setSelectedAdmins(prev => {
      const exists = prev.find(item => item.teacher_id === teacherId);
      if (exists) {
        return prev.filter(item => item.teacher_id !== teacherId);
      } else {
        return [...prev, { teacher_id: teacherId, designation: '' }];
      }
    });
  };

  const handleDesignationChange = (teacherId, desValue) => {
    setSelectedAdmins(prev => prev.map(item => {
      if (item.teacher_id === teacherId) {
        return { ...item, designation: desValue };
      }
      return item;
    }));
  };

  const handleToggleMember = (studentId) => {
    setSelectedMembers(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  // Search filters
  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTeacher.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTeacher.toLowerCase())
  );

  const filteredStudents = students.filter(st => 
    st.name.toLowerCase().includes(searchStudent.toLowerCase()) || 
    st.registration_number.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const handleSaveAssignments = async (e) => {
    e.preventDefault();
    if (!selectedClub) return;

    setSaving(true);
    try {
      const response = await axios.post('/api/clubs/assign', {
        club_id: selectedClub,
        teachers: selectedAdmins,
        student_ids: selectedMembers
      });

      toast.success(response.data.message || 'Club assignments updated successfully!');
      fetchClubAssignments(); // reload
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiUsers className="text-primary" /> Assign Club Roles & Members
        </h1>
        <p className="text-sm text-slate-5050 text-slate-500">
          Select a club to assign teachers as Admins and students as Members.
        </p>
      </div>

      {/* Select club panel */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
        <div className="flex flex-col gap-1.5 max-w-sm">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiBook /> Select Club
          </label>
          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary bg-slate-50"
          >
            <option value="">-- Choose Club --</option>
            {clubs.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedClub && (
        <form onSubmit={handleSaveAssignments} className="w-full flex flex-col gap-6">
          {loading ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-slate-400">Loading assignments...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Admins (Teachers) */}
              <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col overflow-hidden h-[450px]">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <FiShield className="text-primary" /> Club Admins (Teachers)
                  </h3>
                  <div className="relative">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                      type="text"
                      value={searchTeacher}
                      onChange={(e) => setSearchTeacher(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-250 border-slate-200 rounded-xl text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                  {filteredTeachers.map(t => {
                    const isChecked = selectedAdmins.some(item => item.teacher_id === t.id);
                    return (
                      <div 
                        key={t.id} 
                        className={`flex flex-col gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                          isChecked 
                            ? 'bg-emerald-50/50 border-emerald-200/60 text-blue-850' 
                            : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer select-none w-full">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAdmin(t.id)}
                            className="w-4 h-4 rounded text-primary border-slate-300 outline-none cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold">{t.name}</span>
                            <span className="text-[10px] text-slate-405 text-slate-400">{t.email}</span>
                          </div>
                        </label>
                        
                        {isChecked && (
                          <input
                            type="text"
                            value={selectedAdmins.find(item => item.teacher_id === t.id)?.designation || ''}
                            onChange={(e) => handleDesignationChange(t.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-primary bg-white text-slate-800 mt-1 font-normal"
                          />
                        )}
                      </div>
                    );
                  })}
                  {filteredTeachers.length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-8">No teachers found.</div>
                  )}
                </div>
              </div>


              {/* Members (Students) */}
              <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col overflow-hidden h-[450px]">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <FiUsers className="text-primary" /> Club Members (Students)
                  </h3>
                  <div className="relative">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                      type="text"
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-250 border-slate-200 rounded-xl text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                  {filteredStudents.map(st => {
                    const isChecked = selectedMembers.includes(st.id);
                    return (
                      <label 
                        key={st.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-155 ${
                          isChecked 
                            ? 'bg-emerald-50/50 border-emerald-200/60 text-primary' 
                            : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMember(st.id)}
                          className="w-4 h-4 rounded text-primary border-slate-350 outline-none"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold">{st.name}</span>
                          <span className="text-[10px] text-slate-400">Reg ID: {st.registration_number}</span>
                        </div>
                      </label>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-8">No students found.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Action Bar */}
          {!loading && (
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform duration-150 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <FiSave className="animate-spin text-sm" /> Saving Assignments...
                  </>
                ) : (
                  <>
                    <FiSave className="text-sm" /> Save Assignments & Roles
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default AdminClubsAssignPage;
