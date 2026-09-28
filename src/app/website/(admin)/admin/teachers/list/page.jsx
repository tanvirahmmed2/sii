'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiUsers,
  FiUserCheck,
  FiSearch,
  FiTrash2,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiUser,
  FiRefreshCw,
  FiSend,
  FiCheck,
  FiX
} from 'react-icons/fi';

const AdminTeachersListPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [payScales, setPayScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resendingId, setResendingId] = useState(null);

  const fetchTeachers = async () => {
    try {
      const response = await axios.get('/api/teachers');
      setTeachers(response.data.paylod?.teachers || response.data.payload?.teachers || []);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    }
  };

  const fetchPayScales = async () => {
    try {
      const response = await axios.get('/api/teacher-pay-scales');
      setPayScales(response.data.paylod?.payScales || response.data.payload?.payScales || []);
    } catch (error) {
      toast.error('Failed to load pay scale grades.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchTeachers(), fetchPayScales()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleToggleStatus = async (teacher) => {
    const nextStatus = !teacher.is_active;
    try {
      await axios.put(`/api/teachers/${teacher.id}`, {
        name: teacher.name,
        email: teacher.email,
        number: teacher.number,
        designation: teacher.designation,
        address: teacher.address,
        is_active: nextStatus,
        is_permanent: teacher.is_permanent,
        grade_id: teacher.grade_id
      });

      toast.success(`Teacher ${teacher.name} status updated.`);
      setTeachers(
        teachers.map((t) => (t.id === teacher.id ? { ...t, is_active: nextStatus } : t))
      );
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleTogglePermanent = async (teacher) => {
    const nextPermanent = !teacher.is_permanent;
    try {
      await axios.put(`/api/teachers/${teacher.id}`, {
        name: teacher.name,
        email: teacher.email,
        number: teacher.number,
        designation: teacher.designation,
        address: teacher.address,
        is_active: teacher.is_active,
        is_permanent: nextPermanent,
        grade_id: teacher.grade_id
      });

      toast.success(`Teacher ${teacher.name} updated to ${nextPermanent ? 'Permanent' : 'Temporary'}.`);
      setTeachers(
        teachers.map((t) => (t.id === teacher.id ? { ...t, is_permanent: nextPermanent } : t))
      );
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleUpdateGrade = async (teacher, gradeId) => {
    try {
      await axios.put(`/api/teachers/${teacher.id}`, {
        name: teacher.name,
        email: teacher.email,
        number: teacher.number,
        designation: teacher.designation,
        address: teacher.address,
        is_active: teacher.is_active,
        is_permanent: teacher.is_permanent,
        grade_id: gradeId ? parseInt(gradeId, 10) : null
      });

      toast.success(`Updated pay scale grade for ${teacher.name}`);
      setTeachers(
        teachers.map((t) =>
          t.id === teacher.id ? { ...t, grade_id: gradeId ? parseInt(gradeId, 10) : null } : t
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteTeacher = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove teacher ${name}?`)) return;

    try {
      await axios.delete(`/api/teachers/${id}`);
      toast.success(`Teacher ${name} record removed successfully.`);
      setTeachers(teachers.filter((t) => t.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleResendVerification = async (teacher) => {
    setResendingId(teacher.id);
    try {
      const response = await axios.post('/api/teachers/resend-verification', {
        email: teacher.email
      });
      toast.success(response.data.message || `Verification link resent to ${teacher.email}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend verification link.');
    } finally {
      setResendingId(null);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(query)) ||
      (t.email && t.email.toLowerCase().includes(query)) ||
      (t.number && t.number.includes(query)) ||
      (t.designation && t.designation.toLowerCase().includes(query))
    );
  });

  const totalTeachers = teachers.length;
  const activeCount = teachers.filter((t) => t.is_active).length;
  const permanentCount = teachers.filter((t) => t.is_permanent).length;
  const pendingRegisterCount = teachers.filter((t) => !t.is_registered).length;

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiUsers className="text-emerald-600" /> Faculty & Teacher Directory
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage teacher accounts, active statuses, permanent designations, and pay scale assignments.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Teachers</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-slate-900">{totalTeachers}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs">
              <FiUsers />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-emerald-700">{activeCount}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs">
              <FiUserCheck />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Permanent Staff</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-slate-900">{permanentCount}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs">
              <FiBriefcase />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Setup</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-amber-700">{pendingRegisterCount}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-xs">
              <FiRefreshCw />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
        <FiSearch className="text-slate-400 text-sm ml-1" />
        <input
          type="text"
          placeholder="Search teachers by name, email, phone, or designation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 cursor-pointer">
            Clear
          </button>
        )}
      </div>

      {/* Teachers Table Registry */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Teacher Profiles <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-bold text-[10px] ml-1">({filteredTeachers.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading teacher registry...</span>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <FiUsers className="text-slate-300 text-3xl mb-2" />
            <p className="text-xs font-bold text-slate-700">No Teacher Profiles Found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try searching with a different keyword.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Employment</th>
                  <th className="px-4 py-3">Pay Scale Grade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Teacher Details */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center font-bold text-xs">
                          {teacher.name ? teacher.name.charAt(0).toUpperCase() : <FiUser />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{teacher.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {teacher.designation || 'Instructor'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Information */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-slate-700 font-medium">{teacher.email}</p>
                      <p className="text-[10px] text-slate-400">{teacher.number || 'N/A'}</p>
                    </td>

                    {/* Registration State */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        teacher.is_registered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {teacher.is_registered ? 'Setup Completed' : 'Pending Register'}
                      </span>
                    </td>

                    {/* Employment Toggle */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePermanent(teacher)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          teacher.is_permanent
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {teacher.is_permanent ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
                        {teacher.is_permanent ? 'Permanent' : 'Temporary'}
                      </button>
                    </td>

                    {/* Pay Scale Grade Select */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={teacher.grade_id || ''}
                        onChange={(e) => handleUpdateGrade(teacher, e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-medium text-slate-800 outline-none focus:border-emerald-600 transition-all cursor-pointer"
                      >
                        <option value="">Unassigned Grade</option>
                        {payScales.map((scale) => (
                          <option key={scale.id} value={scale.id}>
                            {scale.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Account Status Toggle */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(teacher)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          teacher.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {teacher.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                      {!teacher.is_registered && (
                        <button
                          onClick={() => handleResendVerification(teacher)}
                          disabled={resendingId === teacher.id}
                          className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-lg transition-colors inline-flex items-center cursor-pointer disabled:opacity-50"
                          title={`Resend verification link to ${teacher.email}`}
                        >
                          {resendingId === teacher.id ? (
                            <FiRefreshCw className="text-xs animate-spin" />
                          ) : (
                            <FiSend className="text-xs" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                        className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                        title="Delete teacher record"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
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

export default AdminTeachersListPage;
