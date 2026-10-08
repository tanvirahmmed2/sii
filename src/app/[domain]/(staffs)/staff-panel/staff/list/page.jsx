'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiTrash2, FiUsers, FiMail, FiPhone, FiCheckCircle, FiClock,
  FiSend, FiPlus, FiEdit3, FiSearch, FiFilter, FiUserCheck, FiDollarSign
} from 'react-icons/fi';
import Link from 'next/link';

const AdminStaffListPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [payScales, setPayScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [editingStaff, setEditingStaff] = useState(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [editGradeId, setEditGradeId] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchStaff = async () => {
    try {
      const response = await axios.get('/api/admin/staff');
      setStaffList(response.data.paylod?.staff || response.data.payload?.staff || []);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    }
  };

  const fetchPayScales = async () => {
    try {
      const response = await axios.get('/api/staff-pay-scales');
      setPayScales(response.data.paylod?.payScales || response.data.payload?.payScales || []);
    } catch (err) {
      console.error('Failed to load pay scales', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStaff(), fetchPayScales()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setEditName(staff.name || '');
    setEditNumber(staff.number || staff.phone || '');
    setEditRole(staff.role || 'staff');
    setEditGradeId(staff.grade_id || '');
    setEditAddress(staff.address || '');
    setEditActive(staff.is_active);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName || !editNumber || !editRole) {
      toast.error('Name, phone number, and role are required.');
      return;
    }

    setSubmittingEdit(true);
    try {
      await axios.put(`/api/admin/staff/${editingStaff.id}`, {
        name: editName.trim(),
        email: editingStaff.email,
        number: editNumber.trim(),
        role: editRole,
        address: editAddress.trim(),
        is_active: editActive,
        grade_id: editGradeId || null
      });

      toast.success('Staff profile updated successfully.');
      setEditingStaff(null);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async (staff) => {
    const nextStatus = !staff.is_active;
    try {
      await axios.put(`/api/admin/staff/${staff.id}`, {
        name: staff.name,
        email: staff.email,
        number: staff.number || staff.phone,
        role: staff.role,
        address: staff.address,
        is_active: nextStatus,
        grade_id: staff.grade_id
      });

      toast.success(`Staff member ${staff.name} status updated.`);
      setStaffList(
        staffList.map((s) => (s.id === staff.id ? { ...s, is_active: nextStatus } : s))
      );
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove staff member ${name}?`)) return;

    try {
      await axios.delete(`/api/admin/staff/${id}`);
      toast.success(`Staff account for ${name} deleted successfully.`);
      setStaffList(staffList.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleResendVerification = async (staff) => {
    setResendingId(staff.id);
    try {
      const response = await axios.post('/api/admin/staff/resend-verification', {
        email: staff.email
      });
      toast.success(response.data.message || `Verification link sent to ${staff.email}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send verification link.');
    } finally {
      setResendingId(null);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.number && s.number.includes(searchQuery)) ||
      (s.phone && s.phone.includes(searchQuery));

    const matchesRole = roleFilter === 'all' || s.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'cashier':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'registrar':
        return 'bg-sky-50 text-sky-700 border-sky-200/60';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200/60';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'cashier':
        return 'Cashier Desk';
      case 'registrar':
        return 'Registrar Desk';
      default:
        return 'General Support Staff';
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiUsers className="text-emerald-600" /> Staff Directory & Roles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage staff accounts, assign Cashier/Registrar desk permissions, and update salary grades.
          </p>
        </div>
        <Link
          href="/admin/staff/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          <FiPlus className="text-sm" />
          <span>Add Staff Member</span>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-slate-900">{staffList.length}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs">
              <FiUsers />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-emerald-700">
              {staffList.filter((s) => s.is_active).length}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs">
              <FiUserCheck />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cashiers</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-slate-900">
              {staffList.filter((s) => s.role === 'cashier').length}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs">
              <FiDollarSign />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registrars</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-sky-700">
              {staffList.filter((s) => s.role === 'registrar').length}
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center text-xs">
              <FiCheckCircle />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-3 shadow-2xs">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search staff by name, email, or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <FiFilter className="text-slate-400 text-xs" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Desk Roles</option>
              <option value="cashier">Cashiers Only</option>
              <option value="registrar">Registrars Only</option>
              <option value="staff">General Support</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table Registry */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Staff Members <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-bold text-[10px] ml-1">({filteredStaff.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading staff registry...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <FiUsers className="text-slate-300 text-3xl mb-2" />
            <p className="text-xs font-bold text-slate-700">No Staff Accounts Found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try resetting your search query or filter selection.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Desk Role</th>
                  <th className="px-4 py-3">Pay Scale Grade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200/60">
                          {staff.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{staff.name}</p>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1"><FiMail /> {staff.email}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><FiPhone /> {staff.number || staff.phone || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(staff.role)}`}>
                        {getRoleLabel(staff.role)}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-semibold">
                      {payScales.find((p) => p.id == staff.grade_id)?.name || <span className="text-slate-400 italic font-normal">Unassigned</span>}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {staff.is_registered ? (
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-colors cursor-pointer border ${
                            staff.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {staff.is_active ? 'Active' : 'Suspended'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Setup Pending
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!staff.is_registered && (
                          <button
                            disabled={resendingId === staff.id}
                            onClick={() => handleResendVerification(staff)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold"
                            title="Resend verification link"
                          >
                            <FiSend className={resendingId === staff.id ? 'animate-spin' : ''} />
                            <span>Resend Link</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer"
                          title="Edit staff member"
                        >
                          <FiEdit3 className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staff.id, staff.name)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-all cursor-pointer"
                          title="Delete staff account"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal Dialog */}
      {editingStaff && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 w-full max-w-md shadow-xl animate-scale-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Edit Staff Member</h2>
            <p className="text-xs text-slate-500 mb-4">Modify staff profile details, portal role, or salary grade.</p>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  required
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Portal Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 transition-all cursor-pointer font-semibold"
                  >
                    <option value="staff">General Staff</option>
                    <option value="cashier">Cashier</option>
                    <option value="registrar">Registrar</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salary Grade</label>
                  <select
                    value={editGradeId}
                    onChange={(e) => setEditGradeId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 transition-all cursor-pointer font-semibold"
                  >
                    <option value="">Unassigned</option>
                    {payScales.map((scale) => (
                      <option key={scale.id} value={scale.id}>
                        {scale.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-600 cursor-pointer"
                />
                <label htmlFor="editActive" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                  Account is Active (Uncheck to suspend)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-1">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  disabled={submittingEdit}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer shadow-2xs"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffListPage;
