'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminForm from 'src/component/marketing/developer/forms/AdminForm';

const BASE_ROLE_BADGES = {
  developer: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  marketer: 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  admin: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  manager: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  support: 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
};

function getRoleBadgeStyle(slug = '') {
  const s = slug.toLowerCase();
  if (BASE_ROLE_BADGES[s]) return BASE_ROLE_BADGES[s];
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
}

const DEFAULT_ROLE_OPTIONS = [
  { value: 'admin', label: 'Super Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'marketer', label: 'Marketer' },
  { value: 'manager', label: 'Manager' },
  { value: 'support', label: 'Support' },
];

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resendingEmail, setResendingEmail] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [actionNotice, setActionNotice] = useState({ text: '', type: 'info' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  // Modal / Form state for Editing an Admin Account
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', role: 'developer', is_active: true, password: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const roleOptions = roles.length > 0
    ? roles.map((r) => ({ value: r.slug, label: r.name, id: r.id, is_system: r.is_system }))
    : DEFAULT_ROLE_OPTIONS;

  const roleLabelsMap = roles.reduce((acc, r) => {
    acc[r.slug] = r.name;
    return acc;
  }, {
    admin: 'Super Admin',
    developer: 'Developer',
    marketer: 'Marketer',
    manager: 'Manager',
    support: 'Support',
  });

  const getRoleLabel = (slug = '') => roleLabelsMap[slug.toLowerCase()] || slug;

  const fetchAdmins = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/devs/list');
      const data = await res.json();
      if (data.success) {
        setAdmins(data.records || []);
        if (data.roles) {
          setRoles(data.roles);
        }
        if (data.currentUser) {
          setCurrentUser(data.currentUser);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch('/api/marketing/developer/devs/list').then((r) => r.json()).catch(() => null),
      fetch('/api/marketing/developer/me').then((r) => r.json()).catch(() => null),
    ]).then(([adminData, meData]) => {
      if (ignore) return;
      if (adminData && adminData.success) {
        setAdmins(adminData.records || []);
        if (adminData.roles) {
          setRoles(adminData.roles);
        }
        if (adminData.currentUser) {
          setCurrentUser(adminData.currentUser);
        }
      }
      if (meData && meData.success && (meData.user || meData.developer)) {
        setCurrentUser(meData.user || meData.developer);
      }
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const isUserAdmin = Boolean(permissions.includes('developers'));

  const activeAdminCount = admins.filter(
    (a) => (a.role || '').toLowerCase() === 'admin' && a.is_active !== false && a.isActive !== false
  ).length;

  const handleChangeRole = async (admin, newRole) => {
    if (!isUserAdmin) return;
    setUpdatingRoleId(admin.id);
    setActionNotice({ text: '', type: 'info' });

    try {
      const res = await fetch('/api/marketing/developer/devs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? { ...a, role: newRole, role_name: getRoleLabel(newRole) } : a))
        );
        setActionNotice({ text: `Updated ${admin.name} to ${getRoleLabel(newRole)}.`, type: 'success' });
      } else {
        setActionNotice({ text: data.error || 'Failed to update role.', type: 'error' });
      }
    } catch (err) {
      setActionNotice({ text: err.message || 'Error updating role.', type: 'error' });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleToggleStatus = async (admin) => {
    if (!isUserAdmin) return;
    setUpdatingStatusId(admin.id);
    setActionNotice({ text: '', type: 'info' });

    try {
      const res = await fetch('/api/marketing/developer/devs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id, is_active: !admin.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? { ...a, is_active: !admin.is_active } : a))
        );
        setActionNotice({
          text: `Account for ${admin.name} is now ${!admin.is_active ? 'Active' : 'Inactive'}.`,
          type: 'success',
        });
      } else {
        setActionNotice({ text: data.error || 'Failed to update status.', type: 'error' });
      }
    } catch (err) {
      setActionNotice({ text: err.message || 'Error updating status.', type: 'error' });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleResendCode = async (email) => {
    setResendingEmail(email);
    setActionNotice({ text: '', type: 'info' });

    try {
      const res = await fetch('/api/marketing/developer/me/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ text: `Activation link sent to ${email}.`, type: 'success' });
      } else {
        setActionNotice({ text: data.error || 'Failed to send activation link.', type: 'error' });
      }
    } catch (err) {
      setActionNotice({ text: err.message || 'Error sending link.', type: 'error' });
    } finally {
      setResendingEmail(null);
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!isUserAdmin) return;
    if (!confirm('Are you sure you want to delete this developer account? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/marketing/developer/devs?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setAdmins((prev) => prev.filter((a) => a.id !== id));
        setActionNotice({ text: 'Developer account deleted successfully.', type: 'success' });
      } else {
        setActionNotice({ text: data.error || 'Failed to delete developer.', type: 'error' });
      }
    } catch (err) {
      setActionNotice({ text: err.message || 'Error deleting developer.', type: 'error' });
    }
  };

  const handleOpenEdit = (admin) => {
    setEditingAdmin(admin);
    setEditFormData({
      name: admin.name || '',
      role: admin.role || 'developer',
      is_active: admin.is_active !== false,
      password: '',
    });
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    try {
      const payload = {
        id: editingAdmin.id,
        name: editFormData.name.trim(),
        role: editFormData.role,
        is_active: editFormData.is_active,
      };
      if (editFormData.password && editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const res = await fetch('/api/marketing/developer/devs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === editingAdmin.id
              ? {
                  ...a,
                  name: payload.name,
                  role: payload.role,
                  role_name: getRoleLabel(payload.role),
                  is_active: payload.is_active,
                }
              : a
          )
        );
        setEditingAdmin(null);
        setActionNotice({ text: `Account for ${payload.name} updated successfully.`, type: 'success' });
      } else {
        setEditError(data.error || 'Failed to update account.');
      }
    } catch (err) {
      setEditError(err.message || 'Network error updating account.');
    } finally {
      setEditLoading(false);
    }
  };

  const filteredAdmins = admins.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (a.name || '').toLowerCase().includes(term) ||
      (a.email || '').toLowerCase().includes(term) ||
      (a.role || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Action Notification Alert */}
      {actionNotice.text && (
        <div
          className={`p-3 rounded border text-xs font-normal flex items-center justify-between ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              : actionNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice({ text: '', type: 'info' })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Edit Admin Account Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Edit Developer Account</h3>
                <p className="text-[11px] font-normal text-slate-500">Update account credentials and role</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="text-xs font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-normal">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={editingAdmin.email}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-500 cursor-not-allowed font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Assigned Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Account Status</label>
                  <select
                    value={editFormData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.value === 'active' })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
                  Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <h1 className="text-base font-medium text-slate-900 dark:text-white">Developers &amp; Staff</h1>
          <p className="text-xs text-slate-500 font-normal">Manage internal operators and platform access.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isUserAdmin && (
            <Link
              href="/developer/roles"
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Roles &amp; Permissions
            </Link>
          )}
          <button
            type="button"
            onClick={() => fetchAdmins(true)}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Refresh
          </button>
          {isUserAdmin && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium cursor-pointer"
            >
              {showAddForm ? 'Hide Form' : 'Add Developer'}
            </button>
          )}
        </div>
      </div>

      {showAddForm && isUserAdmin && (
        <AdminForm
          apiEndpoint="/api/marketing/developer/devs"
          roles={roles}
          onSuccess={() => {
            setShowAddForm(false);
            fetchAdmins();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 font-normal"
          />
          <div className="text-xs text-slate-500 font-normal">
            Showing {filteredAdmins.length} of {admins.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal text-[11px]">
                <th className="px-3.5 py-2.5 whitespace-nowrap">ID</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Name</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Email</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Role</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Status</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Verification</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Last Login</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Created</th>
                <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-normal">Loading developers...</td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-normal">No developer records found.</td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isVerified = admin.is_verified === true || admin.isVerified === true;
                  const isActive = admin.is_active !== false && admin.isActive !== false;
                  const role = (admin.role || 'support').toLowerCase();
                  const isLastActiveAdmin = role === 'admin' && isActive && activeAdminCount <= 1;

                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-normal text-slate-500">#{admin.id}</td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-900 dark:text-white">{admin.name}</td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-600 dark:text-slate-400 font-normal">{admin.email}</td>

                      {/* Role column */}
                      <td className="px-3.5 py-2.5">
                        {isUserAdmin ? (
                          <select
                            value={role}
                            disabled={updatingRoleId === admin.id}
                            onChange={(e) => handleChangeRole(admin, e.target.value)}
                            className={`text-[11px] font-normal border rounded px-2 py-0.5 bg-transparent cursor-pointer focus:outline-none ${getRoleBadgeStyle(role)}`}
                          >
                            {roleOptions.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-normal border ${getRoleBadgeStyle(role)}`}>
                            {getRoleLabel(role)}
                          </span>
                        )}
                      </td>

                      {/* Status column */}
                      <td className="px-3.5 py-2.5">
                        <button
                          type="button"
                          disabled={!isUserAdmin || updatingStatusId === admin.id || isLastActiveAdmin}
                          onClick={() => handleToggleStatus(admin)}
                          className={`px-2 py-0.5 rounded text-[11px] font-normal border cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          } disabled:opacity-50`}
                        >
                          {updatingStatusId === admin.id ? 'Updating...' : isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Verification column */}
                      <td className="px-3.5 py-2.5">
                        {isVerified ? (
                          <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400">
                            Verified
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-normal text-amber-700 dark:text-amber-400">
                              Unverified
                            </span>
                            <button
                              type="button"
                              disabled={resendingEmail === admin.email}
                              onClick={() => handleResendCode(admin.email)}
                              className="text-[11px] text-slate-600 dark:text-slate-400 hover:underline font-normal cursor-pointer"
                            >
                              {resendingEmail === admin.email ? 'Sending...' : 'Resend Link'}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="px-3.5 py-2.5 text-slate-500 text-[11px] font-normal">
                        {admin.last_login_at || admin.lastLoginAt
                          ? new Date(admin.last_login_at || admin.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </td>

                      {/* Created At */}
                      <td className="px-3.5 py-2.5 text-slate-500 text-[11px] font-normal">
                        {admin.created_at || admin.createdAt
                          ? new Date(admin.created_at || admin.createdAt).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isUserAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(admin)}
                                className="text-xs font-normal text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAdmin(admin.id)}
                                className="text-xs font-normal text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-normal">Read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
