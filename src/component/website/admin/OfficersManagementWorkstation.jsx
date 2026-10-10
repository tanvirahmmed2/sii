'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function OfficersManagementWorkstation({ title = 'Officers Management', subtitle = 'Manage institutional administrative officers and assign package module permissions.' }) {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [officers, setOfficers] = useState([]);
  const [packageModules, setPackageModules] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'General',
    designation: 'Officer',
    salary: '0.00',
    joining_date: new Date().toISOString().split('T')[0],
    permissions: {}, // { [slug]: { can_view: true, can_create: false, can_edit: false, can_delete: false } }
  });

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    phone: '',
    department: 'General',
    designation: 'Officer',
    salary: '0.00',
    is_active: true,
    permissions: {},
  });

  // Action feedback
  const [actionInProgressId, setActionInProgressId] = useState(null);

  const fetchOfficers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedDept !== 'all') params.set('department', selectedDept);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      const endpoint = getApiEndpoint(`staff/panel/officers?${params.toString()}`);
      const res = await fetch(endpoint);
      const data = await res.json();

      if (res.ok && data.success) {
        setOfficers(data.officers || []);
        if (data.packageModules) {
          setPackageModules(data.packageModules);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        toast.error(data.error || 'Failed to fetch officers roster.');
      }
    } catch (err) {
      console.error('Error fetching officers:', err);
      toast.error('Network error loading officers roster.');
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint, searchTerm, selectedDept, selectedStatus]);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  // Open Create Modal with initialized permissions map
  const openCreateModal = () => {
    const initialPerms = {};
    packageModules.forEach((mod) => {
      initialPerms[mod.slug] = {
        website_module_id: mod.id,
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    });

    setCreateForm({
      name: '',
      email: '',
      phone: '',
      department: 'General',
      designation: 'Officer',
      salary: '0.00',
      joining_date: new Date().toISOString().split('T')[0],
      permissions: initialPerms,
    });
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.phone.trim()) {
      toast.error('Name, email, and phone number are required.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const endpoint = getApiEndpoint('staff/panel/officers');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create officer.');
      }

      toast.success(data.message || 'Officer created and invitation email dispatched.');
      setIsCreateOpen(false);
      fetchOfficers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (officer) => {
    setEditingOfficer(officer);

    const mergedPerms = {};
    packageModules.forEach((mod) => {
      const existing = officer.permissions?.[mod.slug];
      mergedPerms[mod.slug] = {
        website_module_id: mod.id,
        can_view: existing ? Boolean(existing.can_view) : false,
        can_create: existing ? Boolean(existing.can_create) : false,
        can_edit: existing ? Boolean(existing.can_edit) : false,
        can_delete: existing ? Boolean(existing.can_delete) : false,
      };
    });

    setEditForm({
      id: officer.id,
      name: officer.name || '',
      phone: officer.phone || '',
      department: officer.department || 'General',
      designation: officer.designation || 'Officer',
      salary: officer.salary !== undefined ? String(officer.salary) : '0.00',
      is_active: Boolean(officer.is_active),
      permissions: mergedPerms,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      const endpoint = getApiEndpoint('staff/panel/officers');
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update officer.');
      }

      toast.success(data.message || 'Officer profile and permissions updated.');
      setIsEditOpen(false);
      fetchOfficers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Resend invitation email
  const handleResendInvite = async (officerId) => {
    setActionInProgressId(officerId);
    try {
      const endpoint = getApiEndpoint('staff/panel/officers/resend-invite');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend invitation email.');
      }

      toast.success(data.message || 'Verification invitation email dispatched.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Delete officer
  const handleDeleteOfficer = async (officer) => {
    if (!window.confirm(`Are you sure you want to remove officer "${officer.name}"? This action revokes all their active sessions.`)) {
      return;
    }

    setActionInProgressId(officer.id);
    try {
      const endpoint = getApiEndpoint(`staff/panel/officers?id=${officer.id}`);
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete officer.');
      }

      toast.success(data.message || 'Officer removed successfully.');
      fetchOfficers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer shadow-2xs"
          >
            + Create New Officer
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Total Officers
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {stats.total}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Institution Roster</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Active & Verified
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.active}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Ready on Desk</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Pending Setup
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {stats.pending}
            </span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Awaiting Verification</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Package Modules
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {packageModules.length}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Available to Assign</span>
          </div>
        </div>
      </div>

      {/* Main Table Workstation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search officers by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Departments</option>
              <option value="Hall">Hall / Residence</option>
              <option value="Library">Library</option>
              <option value="Club">Clubs & Activities</option>
              <option value="Accounts">Accounts & Cashier</option>
              <option value="Administration">Administration</option>
              <option value="General">General</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active & Registered</option>
              <option value="pending">Pending Setup</option>
              <option value="inactive">Deactivated</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Officer Identity</th>
                <th className="px-3 py-2">Department / Role</th>
                <th className="px-3 py-2">Assigned Package Modules</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Active Sessions</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400">
                    Loading officers roster...
                  </td>
                </tr>
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400">
                    No officers found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                officers.map((officer) => {
                  const permKeys = Object.keys(officer.permissions || {});
                  const viewableCount = permKeys.filter(
                    (k) => officer.permissions[k]?.can_view
                  ).length;

                  return (
                    <tr key={officer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {officer.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {officer.email} • {officer.phone}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {officer.designation || 'Officer'}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">
                          {officer.department || 'General'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {viewableCount === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">No modules granted</span>
                          ) : (
                            permKeys
                              .filter((k) => officer.permissions[k]?.can_view)
                              .slice(0, 3)
                              .map((k) => (
                                <span
                                  key={k}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                >
                                  {officer.permissions[k]?.module_name || k}
                                </span>
                              ))
                          )}
                          {viewableCount > 3 && (
                            <span className="px-1 py-0.5 text-[9px] text-slate-500">
                              +{viewableCount - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {!officer.is_active ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                            Deactivated
                          </span>
                        ) : !officer.is_registered ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                            Pending Setup
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {officer.activeSessions} active
                      </td>
                      <td className="px-3 py-2 text-right space-x-1.5 whitespace-nowrap">
                        {!officer.is_registered && (
                          <button
                            type="button"
                            onClick={() => handleResendInvite(officer.id)}
                            disabled={actionInProgressId === officer.id}
                            className="px-2 py-1 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
                            title="Resend invitation link to officer's email"
                          >
                            Resend Link
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(officer)}
                          className="px-2 py-1 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                        >
                          Edit & Perms
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOfficer(officer)}
                          disabled={actionInProgressId === officer.id}
                          className="px-2 py-1 rounded text-[11px] font-medium border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE OFFICER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 w-full max-w-2xl shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Create New Officer & Grant Package Permissions
                </h2>
                <p className="text-[11px] text-slate-500">
                  Verification invitation link will be dispatched automatically via the website mailer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Officer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. Dr. Mohammad Rafiq"
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="officer@institution.edu"
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+880 1700 000000"
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Hall">Hall / Residence</option>
                    <option value="Library">Library</option>
                    <option value="Club">Clubs & Activities</option>
                    <option value="Accounts">Accounts & Cashier</option>
                    <option value="Administration">Administration</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Designation Title
                  </label>
                  <input
                    type="text"
                    value={createForm.designation}
                    onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                    placeholder="e.g. Hall Provost / Librarian"
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Monthly Salary
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.salary}
                    onChange={(e) => setCreateForm({ ...createForm, salary: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Package Modules Permission Matrix */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Package Module Access Rights
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Granular permissions restricted to your subscription package
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {packageModules.map((mod) => {
                    const currentPerm = createForm.permissions[mod.slug] || {
                      can_view: false,
                      can_create: false,
                      can_edit: false,
                      can_delete: false,
                    };

                    const updateModPerm = (field, val) => {
                      setCreateForm({
                        ...createForm,
                        permissions: {
                          ...createForm.permissions,
                          [mod.slug]: {
                            ...currentPerm,
                            website_module_id: mod.id,
                            [field]: val,
                          },
                        },
                      });
                    };

                    return (
                      <div key={mod.slug} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {mod.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {mod.slug}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11px]">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentPerm.can_view)}
                              onChange={(e) => updateModPerm('can_view', e.target.checked)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            <span>View</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentPerm.can_create)}
                              onChange={(e) => updateModPerm('can_create', e.target.checked)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            <span>Create</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentPerm.can_edit)}
                              onChange={(e) => updateModPerm('can_edit', e.target.checked)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            <span>Edit</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentPerm.can_delete)}
                              onChange={(e) => updateModPerm('can_delete', e.target.checked)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            <span>Delete</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition disabled:opacity-50"
                >
                  {createSubmitting ? 'Dispatching Invitation...' : 'Create Officer & Send Verification Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OFFICER MODAL */}
      {isEditOpen && editingOfficer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 w-full max-w-2xl shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Update Officer Profile & Permissions: {editingOfficer.name}
                </h2>
                <p className="text-[11px] text-slate-500 font-mono">
                  {editingOfficer.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Officer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Hall">Hall / Residence</option>
                    <option value="Library">Library</option>
                    <option value="Club">Clubs & Activities</option>
                    <option value="Accounts">Accounts & Cashier</option>
                    <option value="Administration">Administration</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Monthly Salary
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.salary}
                    onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Account Status
                  </label>
                  <select
                    value={editForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Deactivated</option>
                  </select>
                </div>
              </div>

              {/* Package Modules Matrix */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Package Module Access Rights
                </span>

                <div className="border border-slate-200 dark:border-slate-800 rounded max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {packageModules.map((mod) => {
                    const currentPerm = editForm.permissions[mod.slug] || {
                      can_view: false,
                      can_create: false,
                      can_edit: false,
                      can_delete: false,
                    };

                    const updateModPerm = (field, val) => {
                      setEditForm({
                        ...editForm,
                        permissions: {
                          ...editForm.permissions,
                          [mod.slug]: {
                            ...currentPerm,
                            website_module_id: mod.id,
                            [field]: val,
                          },
                        },
                      });
                    };

                    return (
                      <div key={mod.slug} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {mod.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {mod.slug}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11px]">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentPerm.can_view)}
                              onChange={(e) => updateModPerm('can_view', e.target.checked)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            <span>View</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentPerm.can_create)}
                              onChange={(e) => updateModPerm('can_create', e.target.checked)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            <span>Create</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentPerm.can_edit)}
                              onChange={(e) => updateModPerm('can_edit', e.target.checked)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            <span>Edit</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentPerm.can_delete)}
                              onChange={(e) => updateModPerm('can_delete', e.target.checked)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            <span>Delete</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save Officer Profile & Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
