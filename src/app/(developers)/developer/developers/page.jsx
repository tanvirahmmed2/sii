'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminForm from 'src/component/marketing/developer/forms/AdminForm';
import LoadingScreen from 'src/component/common/LoadingScreen';

const BASE_ROLE_BADGES = {
  developer: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  marketer: 'bg-orange-50 text-orange-800 border-orange-200',
  admin: 'bg-purple-50 text-purple-800 border-purple-200',
  manager: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  support: 'bg-teal-50 text-teal-800 border-teal-200',
};

function getRoleBadgeStyle(slug = '') {
  const s = slug.toLowerCase();
  if (BASE_ROLE_BADGES[s]) return BASE_ROLE_BADGES[s];
  return 'bg-slate-100 text-slate-700 border-slate-200';
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
  const isUserAdmin = Boolean(
    permissions.includes('developers') ||
    currentUser?.role === 'admin' ||
    currentUser?.isSuperAdmin
  );

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
    <div className="w-full space-y-4">
      {/* Action Notification Alert */}
      {actionNotice.text && (
        <div
          className={`p-3 rounded border text-xs font-normal flex items-center justify-between ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice({ text: '', type: 'info' })}
            className="text-slate-500 hover:text-slate-800 ml-2 cursor-pointer font-medium"
          >
            ✕
          </button>
        </div>
      )}

      {/* Edit Admin Account Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-slate-200 shadow-lg max-w-md w-full p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Edit Developer Account</h3>
                <p className="text-[11px] text-slate-500">Update account credentials and role</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-normal">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name <span className="text-rose-600">*</span></label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={editingAdmin.email}
                  className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-500 cursor-not-allowed font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editFormData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.value === 'active' })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Developers &amp; Staff</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage internal operators and platform access.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isUserAdmin && (
            <Link
              href="/developer/roles"
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors"
            >
              Roles &amp; Permissions
            </Link>
          )}
          <button
            type="button"
            onClick={() => fetchAdmins(true)}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Refresh
          </button>
          {isUserAdmin && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
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
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
          />
          <div className="text-xs text-slate-500 font-normal">
            Showing {filteredAdmins.length} of {admins.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2">ID</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Verification</th>
                <th className="pb-2">Last Login</th>
                <th className="pb-2">Created</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading developers..." />
                  </td>
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
                    <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-mono text-slate-500">#{admin.id}</td>
                      <td className="py-2.5 font-semibold text-slate-900">{admin.name}</td>
                      <td className="py-2.5 font-mono text-slate-600">{admin.email}</td>

                      {/* Role column */}
                      <td className="py-2.5">
                        {isUserAdmin ? (
                          <select
                            value={role}
                            disabled={updatingRoleId === admin.id}
                            onChange={(e) => handleChangeRole(admin, e.target.value)}
                            className={`text-[10px] font-medium border rounded px-1.5 py-0.5 bg-white cursor-pointer focus:outline-none ${getRoleBadgeStyle(role)}`}
                          >
                            {roleOptions.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium border ${getRoleBadgeStyle(role)}`}>
                            {getRoleLabel(role)}
                          </span>
                        )}
                      </td>

                      {/* Status column */}
                      <td className="py-2.5">
                        <button
                          type="button"
                          disabled={!isUserAdmin || updatingStatusId === admin.id || isLastActiveAdmin}
                          onClick={() => handleToggleStatus(admin)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          } disabled:opacity-50`}
                        >
                          {updatingStatusId === admin.id ? 'Updating...' : isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Verification column */}
                      <td className="py-2.5">
                        {isVerified ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Verified
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200">
                              Unverified
                            </span>
                            <button
                              type="button"
                              disabled={resendingEmail === admin.email}
                              onClick={() => handleResendCode(admin.email)}
                              className="text-[10px] text-slate-600 hover:underline font-medium cursor-pointer"
                            >
                              {resendingEmail === admin.email ? 'Sending...' : 'Resend'}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-2.5 text-slate-500 text-xs font-mono">
                        {admin.last_login_at || admin.lastLoginAt
                          ? new Date(admin.last_login_at || admin.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </td>

                      {/* Created At */}
                      <td className="py-2.5 text-slate-500 text-xs font-mono">
                        {admin.created_at || admin.createdAt
                          ? new Date(admin.created_at || admin.createdAt).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isUserAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(admin)}
                                className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAdmin(admin.id)}
                                className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400">Read-only</span>
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
