'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminForm from 'src/component/marketing/developer/forms/AdminForm';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState([]);
  const [modules, setModules] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resendingEmail, setResendingEmail] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [actionNotice, setActionNotice] = useState({ text: '', type: 'info' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedDevIds, setExpandedDevIds] = useState([]);
  const router = useRouter();

  const [editingDev, setEditingDev] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    role_id: '',
    is_active: true,
    password: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [permsDev, setPermsDev] = useState(null);
  const [permsMap, setPermsMap] = useState({});
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsError, setPermsError] = useState('');
  const [permSearch, setPermSearch] = useState('');

  const fetchDevelopers = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/devs/list');
      const data = await res.json();
      if (data.success) {
        setDevelopers(data.records || []);
        if (Array.isArray(data.modules)) {
          setModules(data.modules);
        }
        if (Array.isArray(data.roles)) {
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
        setDevelopers(adminData.records || []);
        if (Array.isArray(adminData.modules)) {
          setModules(adminData.modules);
        }
        if (Array.isArray(adminData.roles)) {
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
    Number(currentUser?.id) === 1
  );

  const activeDevCount = developers.filter((d) => d.is_active).length;

  const handleToggleExpandDev = (id) => {
    setExpandedDevIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleExpandAll = () => {
    if (expandedDevIds.length === filteredDevelopers.length) {
      setExpandedDevIds([]);
    } else {
      setExpandedDevIds(filteredDevelopers.map((d) => d.id));
    }
  };

  const handleToggleStatus = async (dev) => {
    setUpdatingStatusId(dev.id);
    setActionNotice({ text: '', type: 'info' });
    try {
      const nextActive = !dev.is_active;
      const res = await fetch('/api/marketing/developer/devs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          id: dev.id,
          is_active: nextActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDevelopers((prev) =>
          prev.map((d) => (d.id === dev.id ? { ...d, is_active: nextActive } : d))
        );
        setActionNotice({
          text: `Developer ${dev.name} is now ${nextActive ? 'Active' : 'Inactive'}.`,
          type: 'success',
        });
      } else {
        setActionNotice({ text: data.error || 'Failed to update status.', type: 'error' });
      }
    } catch (err) {
      setActionNotice({ text: err.message || 'Network error updating status.', type: 'error' });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleResendCode = async (email) => {
    setResendingEmail(email);
    setActionNotice({ text: '', type: 'info' });
    try {
      const res = await fetch('/api/marketing/developer/devs/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ text: `Activation link sent to ${email}.`, type: 'success' });
      } else {
        setActionNotice({ text: data.error || 'Failed to send activation code.', type: 'error' });
      }
    } catch (err) {
      setActionNotice({ text: err.message || 'Network error sending code.', type: 'error' });
    } finally {
      setResendingEmail(null);
    }
  };

  const handleDeleteDeveloper = async (devId) => {
    if (!confirm('Are you sure you want to permanently delete this developer account?')) return;
    try {
      const res = await fetch(`/api/marketing/developer/devs?id=${devId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDevelopers((prev) => prev.filter((d) => d.id !== devId));
        setActionNotice({ text: 'Developer deleted successfully.', type: 'success' });
      } else {
        setActionNotice({ text: data.error || 'Failed to delete developer.', type: 'error' });
      }
    } catch (err) {
      setActionNotice({ text: err.message || 'Network error deleting developer.', type: 'error' });
    }
  };

  const handleOpenEdit = (dev) => {
    setEditingDev(dev);
    setEditFormData({
      name: dev.name || '',
      phone: dev.phone || '',
      role_id: dev.role_id || (roles[0]?.id || ''),
      is_active: dev.is_active !== false,
      password: '',
    });
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDev) return;
    setEditLoading(true);
    setEditError('');
    try {
      const payload = {
        id: editingDev.id,
        name: editFormData.name.trim(),
        phone: editFormData.phone.trim(),
        role_id: editFormData.role_id || null,
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
        const assignedRole = roles.find((r) => String(r.id) === String(payload.role_id));
        setDevelopers((prev) =>
          prev.map((d) =>
            d.id === editingDev.id
              ? {
                  ...d,
                  name: payload.name,
                  phone: payload.phone,
                  role_id: payload.role_id,
                  role_name: assignedRole?.name || d.role_name,
                  role_slug: assignedRole?.slug || d.role_slug,
                  is_active: payload.is_active,
                }
              : d
          )
        );
        setEditingDev(null);
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

  const handleOpenPermissions = (dev) => {
    setPermsDev(dev);
    setPermsError('');
    setPermSearch('');

    const initial = {};
    const existing = dev.permissions || {};
    for (const mod of modules) {
      const p = existing[mod.slug] || {};
      initial[mod.slug] = {
        can_view: Boolean(p.can_view ?? false),
        can_create: Boolean(p.can_create ?? false),
        can_edit: Boolean(p.can_edit ?? false),
        can_delete: Boolean(p.can_delete ?? false),
        module_id: mod.id,
        module_name: mod.name,
      };
    }
    setPermsMap(initial);
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    if (!permsDev) return;
    setPermsLoading(true);
    setPermsError('');
    try {
      const res = await fetch('/api/marketing/developer/devs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_permissions',
          id: permsDev.id,
          permissions: permsMap,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDevelopers((prev) =>
          prev.map((d) =>
            d.id === permsDev.id
              ? {
                  ...d,
                  permissions: permsMap,
                  allowedModules: Object.keys(permsMap).filter((k) => permsMap[k]?.can_view),
                }
              : d
          )
        );
        setPermsDev(null);
        setActionNotice({
          text: `Module permissions updated for ${permsDev.name}.`,
          type: 'success',
        });
      } else {
        setPermsError(data.error || 'Failed to update module permissions.');
      }
    } catch (err) {
      setPermsError(err.message || 'Network error saving permissions.');
    } finally {
      setPermsLoading(false);
    }
  };

  const handleSelectAllPerms = (grantAllActions = false) => {
    setPermsMap((prev) => {
      const next = { ...prev };
      for (const mod of modules) {
        next[mod.slug] = {
          can_view: true,
          can_create: grantAllActions,
          can_edit: grantAllActions,
          can_delete: grantAllActions,
          module_id: mod.id,
          module_name: mod.name,
        };
      }
      return next;
    });
  };

  const handleDeselectAllPerms = () => {
    setPermsMap((prev) => {
      const next = { ...prev };
      for (const mod of modules) {
        next[mod.slug] = {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          module_id: mod.id,
          module_name: mod.name,
        };
      }
      return next;
    });
  };

  const filteredDevelopers = developers.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.name || '').toLowerCase().includes(term) ||
      (d.email || '').toLowerCase().includes(term) ||
      (d.phone || '').toLowerCase().includes(term) ||
      (d.role_name || '').toLowerCase().includes(term)
    );
  });

  const filteredModulesForModal = modules.filter((m) => {
    if (!permSearch) return true;
    const q = permSearch.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.slug || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-4">
      {actionNotice.text && (
        <div
          className={`p-3 rounded border text-xs font-normal flex items-center justify-between ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
              : actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice({ text: '', type: 'info' })}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ml-2 cursor-pointer font-medium"
          >
            ✕
          </button>
        </div>
      )}

      {editingDev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-lg max-w-md w-full p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Edit Developer Account</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Update account credentials and details</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDev(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-pointer"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={editingDev.email}
                  className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-500 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Developer Role</label>
                <select
                  value={editFormData.role_id}
                  onChange={(e) => setEditFormData({ ...editFormData, role_id: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Status</label>
                <select
                  value={editFormData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.value === 'active' })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  name="edit_dev_password"
                  autoComplete="new-password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDev(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permsDev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Module Permissions: {permsDev.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Combine platform modules directly with this developer ({permsDev.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPermsDev(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {permsError && (
              <div className="m-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {permsError}
              </div>
            )}

            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <input
                type="text"
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="w-full sm:w-64 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllPerms(false)}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium hover:bg-slate-100"
                >
                  View All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllPerms(true)}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium hover:bg-slate-100"
                >
                  Full Access All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllPerms}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium hover:bg-slate-100"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                    <th className="pb-2">SaaS Module</th>
                    <th className="pb-2 text-center w-16">View</th>
                    <th className="pb-2 text-center w-16">Create</th>
                    <th className="pb-2 text-center w-16">Edit</th>
                    <th className="pb-2 text-center w-16">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredModulesForModal.map((mod) => {
                    const current = permsMap[mod.slug] || {
                      can_view: false,
                      can_create: false,
                      can_edit: false,
                      can_delete: false,
                    };

                    const handleToggle = (field) => {
                      setPermsMap((prev) => ({
                        ...prev,
                        [mod.slug]: {
                          ...current,
                          [field]: !current[field],
                        },
                      }));
                    };

                    return (
                      <tr key={mod.slug} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {mod.name}
                          </div>
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(current.can_view)}
                            onChange={() => handleToggle('can_view')}
                            className="rounded border-slate-300 text-slate-900 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(current.can_create)}
                            onChange={() => handleToggle('can_create')}
                            className="rounded border-slate-300 text-slate-900 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(current.can_edit)}
                            onChange={() => handleToggle('can_edit')}
                            className="rounded border-slate-300 text-slate-900 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(current.can_delete)}
                            onChange={() => handleToggle('can_delete')}
                            className="rounded border-slate-300 text-slate-900 cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setPermsDev(null)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={permsLoading}
                onClick={handleSavePermissions}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {permsLoading ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">Developers Team</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage platform engineers, assign roles, and audit access privileges.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            {expandedDevIds.length === filteredDevelopers.length && filteredDevelopers.length > 0
              ? 'Collapse All Details'
              : 'Expand All Details'}
          </button>
          <button
            type="button"
            onClick={() => fetchDevelopers(true)}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            Refresh
          </button>
          {isUserAdmin && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-medium transition-colors cursor-pointer"
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
            fetchDevelopers();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
          />
          <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            Showing {filteredDevelopers.length} of {developers.length} developers
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 w-10">ID</th>
                <th className="pb-2">Developer</th>
                <th className="pb-2">Phone Number</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Modules</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Verification</th>
                <th className="pb-2">Last Login</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading developers..." />
                  </td>
                </tr>
              ) : filteredDevelopers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-normal">No developer records found.</td>
                </tr>
              ) : (
                filteredDevelopers.map((dev) => {
                  const isVerified = dev.is_verified === true || dev.isVerified === true;
                  const isActive = dev.is_active !== false && dev.isActive !== false;
                  const allowedCount = dev.allowedModules?.length || Object.keys(dev.permissions || {}).length || 0;
                  const totalMods = modules.length || 41;
                  const isExpanded = expandedDevIds.includes(dev.id);

                  return (
                    <tr key={dev.id} className="group">
                      <td colSpan={9} className="p-0">
                        <div className="flex items-center px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <div className="w-10 font-mono text-slate-500 shrink-0">#{dev.id}</div>
                          <div className="flex-1 min-w-[180px] pr-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{dev.name}</div>
                            <div className="font-mono text-[11px] text-slate-500">{dev.email}</div>
                          </div>
                          <div className="w-32 min-w-[120px] font-mono text-[11px] text-slate-600 dark:text-slate-400 pr-3 shrink-0">
                            {dev.phone || '—'}
                          </div>
                          <div className="w-36 min-w-[130px] pr-3 shrink-0">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
                              {dev.role_name || 'Software Engineer'}
                            </span>
                          </div>
                          <div className="w-28 min-w-[100px] pr-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenPermissions(dev)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{allowedCount}/{totalMods}</span>
                            </button>
                          </div>
                          <div className="w-20 min-w-[70px] pr-3 shrink-0">
                            <button
                              type="button"
                              disabled={!isUserAdmin || updatingStatusId === dev.id || (isActive && activeDevCount <= 1)}
                              onClick={() => handleToggleStatus(dev)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                              } disabled:opacity-50`}
                            >
                              {updatingStatusId === dev.id ? 'Updating...' : isActive ? 'Active' : 'Inactive'}
                            </button>
                          </div>
                          <div className="w-28 min-w-[100px] pr-3 shrink-0">
                            {isVerified ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                                Verified
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                                  Unverified
                                </span>
                                <button
                                  type="button"
                                  disabled={resendingEmail === dev.email}
                                  onClick={() => handleResendCode(dev.email)}
                                  className="text-[10px] text-slate-600 dark:text-slate-400 hover:underline font-medium cursor-pointer"
                                >
                                  {resendingEmail === dev.email ? 'Sending...' : 'Resend'}
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="w-24 min-w-[90px] font-mono text-slate-500 text-[11px] pr-3 shrink-0">
                            {dev.last_login_at || dev.lastLoginAt
                              ? new Date(dev.last_login_at || dev.lastLoginAt).toLocaleDateString()
                              : 'Never'}
                          </div>
                          <div className="w-44 min-w-[160px] text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleExpandDev(dev.id)}
                                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer border transition-colors ${
                                  isExpanded
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {isExpanded ? 'Hide Info' : 'Show Info'}
                              </button>
                              {isUserAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(dev)}
                                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDeveloper(dev.id)}
                                    className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-b border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div className="p-3 bg-white dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Role & Security
                                </div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {dev.role_name || 'Standard Developer'}
                                </div>
                                {dev.role_description && (
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                                    {dev.role_description}
                                  </p>
                                )}
                              </div>

                              <div className="p-3 bg-white dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Direct Contact
                                </div>
                                <div className="font-mono text-slate-800 dark:text-slate-200 text-xs">
                                  Phone: {dev.phone}
                                </div>
                                <div className="font-mono text-slate-800 dark:text-slate-200 text-xs">
                                  Email: {dev.email}
                                </div>
                              </div>

                              <div className="p-3 bg-white dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Account Lifecycle
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                  Created: {dev.created_at ? new Date(dev.created_at).toLocaleString() : 'N/A'}
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                  Updated: {dev.updated_at ? new Date(dev.updated_at).toLocaleString() : 'N/A'}
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                  Last Login: {dev.last_login_at ? new Date(dev.last_login_at).toLocaleString() : 'Never'}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Permitted Modules ({dev.allowedModules?.length || 0} Allowed)
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {Array.isArray(dev.allowedModules) && dev.allowedModules.length > 0 ? (
                                  dev.allowedModules.map((slug) => {
                                    const p = dev.permissions?.[slug] || {};
                                    const modObj = modules.find((m) => m.slug === slug);
                                    return (
                                      <span
                                        key={slug}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                                      >
                                        <span>{modObj?.name || slug}</span>
                                        {p.can_create && <span className="text-[8px] px-1 rounded bg-blue-100 text-blue-800">C</span>}
                                        {p.can_edit && <span className="text-[8px] px-1 rounded bg-amber-100 text-amber-800">E</span>}
                                        {p.can_delete && <span className="text-[8px] px-1 rounded bg-rose-100 text-rose-800">D</span>}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-slate-400">No permitted modules assigned to this developer.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
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
