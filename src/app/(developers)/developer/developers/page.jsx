'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminForm from '@/components/developer/forms/AdminForm';
import { BiEdit, BiTrash, BiLockAlt, BiShieldQuarter, BiX, BiCheck, BiUserCheck, BiSearch, BiPlus, BiMinus, BiRefresh } from 'react-icons/bi';

const BASE_ROLE_BADGES = {
  developer: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  marketer: 'bg-orange-50 text-orange-700 border-orange-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  manager: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  support: 'bg-teal-50 text-teal-700 border-teal-200',
};

const PALETTE = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
];

function getRoleBadgeStyle(slug = '') {
  const s = slug.toLowerCase();
  if (BASE_ROLE_BADGES[s]) return BASE_ROLE_BADGES[s];
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash + s.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[hash] || 'bg-slate-100 text-slate-700 border-slate-200';
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

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/developer/me');
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      }
    } catch (_) {}
  };

  const fetchAdmins = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/developer/devs/list');
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
      fetch('/api/developer/devs/list').then((r) => r.json()).catch(() => null),
      fetch('/api/developer/me').then((r) => r.json()).catch(() => null),
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
      if (meData && meData.success && meData.user) {
        setCurrentUser(meData.user);
      }
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const isUserAdmin = Boolean(permissions.includes('developers'));

  useEffect(() => {
    if (currentUser && !isUserAdmin) {
      router.replace('/developer');
    }
  }, [currentUser, isUserAdmin, router]);

  // Toggle active / inactive status
  const handleToggleStatus = async (admin) => {
    if (!isUserAdmin) {
      setActionNotice({
        text: 'Access Denied: developers permission required to update developer account status.',
        type: 'error',
      });
      setTimeout(() => setActionNotice({ text: '', type: 'info' }), 6000);
      return;
    }

    try {
      setUpdatingStatusId(admin.id);
      setActionNotice({ text: '', type: 'info' });
      const res = await fetch('/api/developer/devs/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id, is_active: !admin.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: data.message || `Status updated for ${admin.name}.`,
          type: 'success',
        });
        fetchAdmins();
      } else {
        setActionNotice({
          text: data.error || 'Failed to update admin account status.',
          type: 'error',
        });
      }
    } catch (err) {
      setActionNotice({ text: 'Network error updating account status.', type: 'error' });
    } finally {
      setUpdatingStatusId(null);
      setTimeout(() => setActionNotice({ text: '', type: 'info' }), 6000);
    }
  };

  // Change admin role
  const handleChangeRole = async (admin, newRole) => {
    if (!isUserAdmin) {
      setActionNotice({
        text: 'Access Denied: developers permission required to change roles.',
        type: 'error',
      });
      setTimeout(() => setActionNotice({ text: '', type: 'info' }), 6000);
      return;
    }

    const currentRole = (admin.role || '').toLowerCase();
    if (currentRole === newRole.toLowerCase()) return;

    const currentLabel = getRoleLabel(currentRole);
    const newLabel = getRoleLabel(newRole);

    const confirmChange = window.confirm(
      `Change role for ${admin.name} from "${currentLabel}" to "${newLabel}"?`
    );
    if (!confirmChange) return;

    try {
      setUpdatingRoleId(admin.id);
      setActionNotice({ text: '', type: 'info' });
      const res = await fetch('/api/developer/devs/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: data.message || `Role updated to ${newLabel} for ${admin.name}.`,
          type: 'success',
        });
        fetchAdmins();
      } else {
        setActionNotice({
          text: data.error || 'Failed to update role.',
          type: 'error',
        });
      }
    } catch (err) {
      setActionNotice({ text: 'Network error updating role.', type: 'error' });
    } finally {
      setUpdatingRoleId(null);
      setTimeout(() => setActionNotice({ text: '', type: 'info' }), 6000);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (admin) => {
    if (!isUserAdmin) {
      setActionNotice({
        text: 'Access Denied: developers permission required to edit developer accounts.',
        type: 'error',
      });
      setTimeout(() => setActionNotice({ text: '', type: 'info' }), 6000);
      return;
    }
    setEditingAdmin(admin);
    setEditFormData({
      name: admin.name || '',
      role: (admin.role || 'developer').toLowerCase(),
      is_active: admin.is_active !== false && admin.isActive !== false,
      password: '',
    });
    setEditError('');
  };

  // Submit Edit Modal Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    if (!isUserAdmin) {
      setEditError('developers permission required to update developer accounts.');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const payload = {
        name: editFormData.name.trim(),
        role: editFormData.role,
        is_active: Boolean(editFormData.is_active),
      };
      if (editFormData.password && editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const res = await fetch('/api/developer/devs/list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAdmin.id,
          data: payload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: `Developer account for ${editingAdmin.name} updated successfully.`,
          type: 'success',
        });
        setEditingAdmin(null);
        fetchAdmins();
      } else {
        setEditError(data.error || 'Failed to update developer account.');
      }
    } catch (err) {
      setEditError(err.message || 'Network error updating developer.');
    } finally {
      setEditLoading(false);
      setTimeout(() => setActionNotice({ text: '', type: 'info' }), 6000);
    }
  };

  // Delete admin account
  const handleDeleteAdmin = async (adminId) => {
    if (!isUserAdmin) {
      setActionNotice({
        text: 'Access Denied: developers permission required to delete developer accounts.',
        type: 'error',
      });
      setTimeout(() => setActionNotice({ text: '', type: 'info' }), 6000);
      return;
    }

    if (!confirm('Are you sure you want to delete this admin account? This action cannot be undone.')) return;

    try {
      setActionNotice({ text: '', type: 'info' });
      const res = await fetch(`/api/developer/devs/list?id=${adminId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: data.message || 'Admin account deleted successfully.',
          type: 'success',
        });
        fetchAdmins();
      } else {
        setActionNotice({
          text: data.error || 'Failed to delete admin account.',
          type: 'error',
        });
      }
    } catch (err) {
      setActionNotice({ text: 'Network error deleting admin account.', type: 'error' });
    } finally {
      setTimeout(() => setActionNotice({ text: '', type: 'info' }), 6000);
    }
  };

  // Resend Verification Code
  const handleResendCode = async (email) => {
    try {
      setResendingEmail(email);
      setActionNotice({ text: '', type: 'info' });
      const res = await fetch('/api/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend_code', email }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: `Verification code successfully resent to ${email} via Brevo.`,
          type: 'success',
        });
      } else {
        setActionNotice({
          text: data.error || 'Failed to resend verification code.',
          type: 'error',
        });
      }
    } catch (err) {
      setActionNotice({ text: 'Network error resending code.', type: 'error' });
    } finally {
      setResendingEmail(null);
      setTimeout(() => setActionNotice({ text: '', type: 'info' }), 6000);
    }
  };

  const activeAdminCount = admins.filter(
    (a) => (a.role || '').toLowerCase() === 'admin' && a.is_active !== false && a.isActive !== false
  ).length;

  const filteredAdmins = admins.filter((admin) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      admin.name?.toLowerCase().includes(q) ||
      admin.email?.toLowerCase().includes(q) ||
      admin.role?.toLowerCase().includes(q)
    );
  });

  if (currentUser && !isUserAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl font-bold border border-rose-200">
          <BiLockAlt />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Permission Required</h2>
          <p className="text-xs text-slate-500 mt-1">
            Managing administrator and developer accounts requires the <strong className="font-mono">developers</strong> permission.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            Redirecting to Admin Overview...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Role permission status banner */}
      {currentUser && (
        <div
          className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            isUserAdmin
              ? 'bg-purple-50/70 border-purple-200 text-purple-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg ${
                isUserAdmin ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isUserAdmin ? <BiShieldQuarter className="text-lg" /> : <BiLockAlt className="text-lg" />}
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>Logged in as: {currentUser.name || currentUser.email}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isUserAdmin ? 'bg-purple-200 text-purple-800' : 'bg-amber-200 text-amber-800'
                  }`}
                >
                  {currentUser.role || 'Operator'}
                </span>
              </div>
              <p className="text-[11px] opacity-85 mt-0.5">
                {isUserAdmin
                  ? 'Full administrative control: You can update accounts, change roles, toggle statuses, and add developers.'
                  : 'Read-only access: developers permission is required to update accounts, change roles, or toggle statuses.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                isUserAdmin
                  ? 'bg-white text-purple-700 border-purple-200'
                  : 'bg-white text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isUserAdmin ? 'bg-purple-600 animate-pulse' : 'bg-amber-500'}`}
              />
              {isUserAdmin ? 'Role Update Enabled' : 'Developers Permission Required'}
            </span>
          </div>
        </div>
      )}

      {/* Action Notification Alert */}
      {actionNotice.text && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice({ text: '', type: 'info' })}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Edit Admin Account Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <BiEdit className="text-xl" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Update Admin Account</h3>
                  <p className="text-[11px] text-slate-500">Super Admin role privileges</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={editingAdmin.email}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-500 cursor-not-allowed font-mono"
                  title="Email cannot be changed directly"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-secondary focus:bg-white"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editFormData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.value === 'active' })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-secondary focus:bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-secondary focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <BiCheck className="text-base" />
                  <span>{editLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Developers &amp; Administrators</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              Developer
            </span>
          </div>
          <p className="text-xs text-slate-500">Manage internal operators, developers, and platform staff.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isUserAdmin && (
            <Link
              href="/developer/roles"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all shadow-xs"
              title="Manage platform roles and permission mappings"
            >
              <BiShieldQuarter className="text-base" />
              <span>Roles &amp; Permissions</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => fetchAdmins(true)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh table data"
          >
            <BiRefresh className="text-lg" />
          </button>
          {isUserAdmin && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                showAddForm
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-secondary hover:bg-secondary-dark text-white'
              }`}
            >
              {showAddForm ? <BiMinus className="text-base" /> : <BiPlus className="text-base" />}
              <span>{showAddForm ? 'Hide Form' : 'Add Developer'}</span>
            </button>
          )}
        </div>
      </div>

      {showAddForm && isUserAdmin && (
        <AdminForm
          apiEndpoint="/api/developer/devs"
          roles={roles}
          onSuccess={() => {
            setShowAddForm(false);
            fetchAdmins();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search admins by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredAdmins.length}</span> of {admins.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Email Address</th>
                <th className="px-4 py-3 whitespace-nowrap">Role (Admin editable)</th>
                <th className="px-4 py-3 whitespace-nowrap">Status (Click to toggle)</th>
                <th className="px-4 py-3 whitespace-nowrap">Verification</th>
                <th className="px-4 py-3 whitespace-nowrap">Last Login</th>
                <th className="px-4 py-3 whitespace-nowrap">Created At</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">Loading developers &amp; administrators...</td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">No developer records found.</td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isVerified = admin.is_verified === true || admin.isVerified === true;
                  const isActive = admin.is_active !== false && admin.isActive !== false;
                  const role = (admin.role || 'support').toLowerCase();
                  const isLastActiveAdmin = role === 'admin' && isActive && activeAdminCount <= 1;

                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">#{admin.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{admin.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{admin.email}</td>

                      {/* Role column */}
                      <td className="px-4 py-3">
                        {isUserAdmin ? (
                          <div className="relative inline-block">
                            <select
                              value={role}
                              disabled={updatingRoleId === admin.id}
                              onChange={(e) => handleChangeRole(admin, e.target.value)}
                              title={
                                isLastActiveAdmin
                                  ? 'Protected: Demoting this Super Admin requires another active Super Admin'
                                  : 'Click to change developer role'
                              }
                              className={`text-[10px] font-bold border rounded-full px-2.5 py-1 appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-secondary transition-colors ${
                                getRoleBadgeStyle(role)
                              } ${updatingRoleId === admin.id ? 'opacity-50' : ''}`}
                            >
                              {roleOptions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-white text-slate-800 font-normal">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                              ▼
                            </span>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              getRoleBadgeStyle(role)
                            }`}
                            title="Only developers permission can change roles"
                          >
                            {getRoleLabel(role)}
                          </span>
                        )}
                      </td>

                      {/* Status column */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!isUserAdmin || updatingStatusId === admin.id}
                          onClick={() => handleToggleStatus(admin)}
                          title={
                            !isUserAdmin
                              ? 'Protected: developers permission required to update status'
                              : isLastActiveAdmin
                              ? 'Protected: At least one Super Admin account must remain active'
                              : `Click to ${isActive ? 'deactivate' : 'activate'} this account`
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            !isUserAdmin
                              ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-600 border-slate-200'
                              : 'cursor-pointer hover:shadow-xs disabled:opacity-50 ' +
                                (isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100')
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              !isUserAdmin ? (isActive ? 'bg-emerald-400' : 'bg-rose-400') : isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>
                            {updatingStatusId === admin.id ? 'Updating...' : isActive ? 'Active' : 'Inactive'}
                          </span>
                          {!isUserAdmin ? (
                            <BiLockAlt className="text-[10px] text-slate-400 ml-0.5" />
                          ) : isLastActiveAdmin ? (
                            <span className="text-[9px] text-amber-600 font-semibold ml-0.5" title="Last active super admin">
                              (Protected)
                            </span>
                          ) : null}
                        </button>
                      </td>

                      {/* Verification column */}
                      <td className="px-4 py-3">
                        {isVerified ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Code
                            </span>
                            <button
                              type="button"
                              disabled={resendingEmail === admin.email}
                              onClick={() => handleResendCode(admin.email)}
                              className="text-[10px] text-secondary hover:underline font-semibold disabled:opacity-50 cursor-pointer"
                            >
                              {resendingEmail === admin.email ? 'Sending...' : 'Resend'}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {admin.last_login_at || admin.lastLoginAt
                          ? new Date(admin.last_login_at || admin.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {admin.created_at || admin.createdAt
                          ? new Date(admin.created_at || admin.createdAt).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {isUserAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(admin)}
                                className="text-slate-400 hover:text-secondary p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title={`Edit details for ${admin.name}`}
                              >
                                <BiEdit className="text-base" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAdmin(admin.id)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title={`Delete account ${admin.name}`}
                              >
                                <BiTrash className="text-base" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 italic px-2">
                              <BiLockAlt className="text-xs" />
                              <span>Read-only</span>
                            </span>
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
