'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState({ text: '', type: 'info' });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRoleIds, setExpandedRoleIds] = useState([]);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', is_active: true });
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [readOnly, setReadOnly] = useState(true);

  const [activePermsRole, setActivePermsRole] = useState(null);
  const [activePermsMap, setActivePermsMap] = useState({});
  const [permsSearch, setPermsSearch] = useState('');
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsError, setPermsError] = useState('');

  const [activeDevsRole, setActiveDevsRole] = useState(null);
  const [selectedDevIds, setSelectedDevIds] = useState([]);
  const [devsAssignLoading, setDevsAssignLoading] = useState(false);

  const fetchRoleData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/roles');
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles || []);
        setModules(data.modules || []);
        setPermissions(data.permissions || {});
        setDevelopers(data.developers || []);
      } else {
        setActionNotice({ text: data.error || 'Failed to load roles data.', type: 'error' });
      }
    } catch (err) {
      setActionNotice({ text: err.message || 'Network error fetching roles.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoleData(true);
  }, []);

  const handleToggleExpandRole = (id) => {
    setExpandedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleExpandAllRoles = () => {
    if (expandedRoleIds.length === filteredRoles.length && filteredRoles.length > 0) {
      setExpandedRoleIds([]);
    } else {
      setExpandedRoleIds(filteredRoles.map((r) => r.id));
    }
  };

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '', is_active: true });
    setRoleError('');
    setReadOnly(true);
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      is_active: role.is_active !== false,
    });
    setRoleError('');
    setReadOnly(true);
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    setRoleLoading(true);
    setRoleError('');

    const generatedSlug = roleForm.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '');

    try {
      if (editingRole) {
        const res = await fetch('/api/marketing/developer/roles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRole.id,
            name: roleForm.name.trim(),
            slug: editingRole.is_system ? undefined : generatedSlug,
            description: roleForm.description.trim(),
            is_active: roleForm.is_active,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowRoleModal(false);
          setActionNotice({ text: `Role "${roleForm.name}" updated successfully.`, type: 'success' });
          fetchRoleData();
        } else {
          setRoleError(data.error || 'Failed to update role.');
        }
      } else {
        const res = await fetch('/api/marketing/developer/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_role',
            name: roleForm.name.trim(),
            slug: generatedSlug,
            description: roleForm.description.trim(),
            is_active: roleForm.is_active,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowRoleModal(false);
          setActionNotice({ text: `Role "${roleForm.name}" created successfully.`, type: 'success' });
          fetchRoleData();
        } else {
          setRoleError(data.error || 'Failed to create role.');
        }
      }
    } catch (err) {
      setRoleError(err.message || 'Error processing role request.');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.is_system) {
      setActionNotice({ text: 'System roles are protected and cannot be deleted.', type: 'error' });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete role "${role.name}"? Developers assigned to this role will have their role cleared.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/marketing/developer/roles?id=${role.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ text: `Role "${role.name}" deleted successfully.`, type: 'success' });
        fetchRoleData();
      } else {
        setActionNotice({ text: data.error || 'Failed to delete role.', type: 'error' });
      }
    } catch (err) {
      setActionNotice({ text: err.message || 'Error deleting role.', type: 'error' });
    }
  };

  const handleOpenPermsModal = (role) => {
    setActivePermsRole(role);
    setPermsError('');
    setPermsSearch('');

    const rolePerms = permissions[role.id] || {};
    const initialMap = {};

    for (const mod of modules) {
      const existing = rolePerms[mod.slug] || {};
      initialMap[mod.slug] = {
        can_view: Boolean(existing.can_view),
        can_create: Boolean(existing.can_create),
        can_edit: Boolean(existing.can_edit),
        can_delete: Boolean(existing.can_delete),
        module_id: mod.id,
        module_name: mod.name,
      };
    }

    setActivePermsMap(initialMap);
  };

  const handleSavePerms = async (e) => {
    e.preventDefault();
    if (!activePermsRole) return;
    setPermsLoading(true);
    setPermsError('');

    try {
      const res = await fetch('/api/marketing/developer/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_permissions',
          role_id: activePermsRole.id,
          permissions: activePermsMap,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActivePermsRole(null);
        setActionNotice({ text: `Module permissions for role "${activePermsRole.name}" updated successfully.`, type: 'success' });
        fetchRoleData();
      } else {
        setPermsError(data.error || 'Failed to save permissions.');
      }
    } catch (err) {
      setPermsError(err.message || 'Error saving module permissions.');
    } finally {
      setPermsLoading(false);
    }
  };

  const handleSelectAllPerms = (grantAllActions = false) => {
    setActivePermsMap((prev) => {
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

  const handleRevokeAllPerms = () => {
    setActivePermsMap((prev) => {
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

  const handleOpenDevsModal = (role) => {
    setActiveDevsRole(role);
    const assignedIds = developers
      .filter((d) => String(d.role_id) === String(role.id))
      .map((d) => d.id);
    setSelectedDevIds(assignedIds);
  };

  const handleToggleDevSelection = (devId) => {
    setSelectedDevIds((prev) => {
      if (prev.includes(devId)) {
        return prev.filter((id) => id !== devId);
      }
      return [...prev, devId];
    });
  };

  const currentAssignedDevs = useMemo(() => {
    if (!activeDevsRole) return [];
    return developers.filter((d) => String(d.role_id) === String(activeDevsRole.id));
  }, [activeDevsRole, developers]);

  const unassignedDevs = useMemo(() => {
    return developers.filter((d) => !d.role_id);
  }, [developers]);

  const otherRoleDevsCount = useMemo(() => {
    if (!activeDevsRole) return 0;
    return developers.filter((d) => d.role_id && String(d.role_id) !== String(activeDevsRole.id)).length;
  }, [activeDevsRole, developers]);

  const handleSaveDevAssignments = async () => {
    if (!activeDevsRole) return;
    setDevsAssignLoading(true);

    try {
      const relevantDevs = developers.filter(
        (d) => String(d.role_id) === String(activeDevsRole.id) || !d.role_id
      );

      for (const dev of relevantDevs) {
        const isCurrentlyAssigned = String(dev.role_id) === String(activeDevsRole.id);
        const shouldBeAssigned = selectedDevIds.includes(dev.id);

        if (isCurrentlyAssigned !== shouldBeAssigned) {
          await fetch('/api/marketing/developer/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'assign_developer',
              developer_id: dev.id,
              role_id: shouldBeAssigned ? activeDevsRole.id : null,
            }),
          });
        }
      }

      setActiveDevsRole(null);
      setActionNotice({ text: `Developer assignments for role "${activeDevsRole.name}" updated successfully.`, type: 'success' });
      fetchRoleData();
    } catch (err) {
      setActionNotice({ text: err.message || 'Failed to update developer assignments.', type: 'error' });
    } finally {
      setDevsAssignLoading(false);
    }
  };

  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    const q = searchTerm.toLowerCase().trim();
    return roles.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
    );
  }, [roles, searchTerm]);

  const filteredModulesInModal = useMemo(() => {
    if (!permsSearch.trim()) return modules;
    const q = permsSearch.toLowerCase().trim();
    return modules.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
    );
  }, [modules, permsSearch]);

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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Roles & Permissions
            </h1>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {roles.length} Roles
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Create roles, configure granular module permissions, and manage developer authority levels.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleExpandAllRoles}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            {expandedRoleIds.length === filteredRoles.length && filteredRoles.length > 0
              ? 'Collapse All Details'
              : 'Expand All Details'}
          </button>
          <button
            type="button"
            onClick={handleOpenCreateRole}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            + Add New Role
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
          />
          <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            Showing {filteredRoles.length} of {roles.length} roles
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 w-10">ID</th>
                <th className="pb-2">Role Name</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Developers</th>
                <th className="pb-2">Allowed Modules</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading developer roles..." />
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-normal">
                    No developer roles matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => {
                  const devCount = role.developer_count || 0;
                  const allowedMods = role.allowed_modules_count || 0;
                  const isActive = role.is_active !== false;
                  const isExpanded = expandedRoleIds.includes(role.id);
                  const rolePerms = permissions[role.id] || {};
                  const assignedDevs = developers.filter((d) => String(d.role_id) === String(role.id));

                  return (
                    <tr key={role.id} className="group">
                      <td colSpan={7} className="p-0">
                        <div className="flex items-center px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <div className="w-10 font-mono text-slate-500 shrink-0">#{role.id}</div>
                          <div className="flex-1 min-w-[200px] pr-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {role.name}
                            </div>
                          </div>
                          <div className="w-28 min-w-[100px] pr-3 shrink-0">
                            <span
                              className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                role.is_system
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
                                  : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {role.is_system ? 'System' : 'Custom'}
                            </span>
                          </div>
                          <div className="w-32 min-w-[110px] pr-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenDevsModal(role)}
                              className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium text-xs underline cursor-pointer"
                            >
                              {devCount} {devCount === 1 ? 'Developer' : 'Developers'}
                            </button>
                          </div>
                          <div className="w-36 min-w-[120px] pr-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenPermsModal(role)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{allowedMods} / {modules.length} Modules</span>
                            </button>
                          </div>
                          <div className="w-24 min-w-[80px] pr-3 shrink-0">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="w-56 min-w-[210px] text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleExpandRole(role.id)}
                                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer border transition-colors ${
                                  isExpanded
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {isExpanded ? 'Hide Info' : 'Show Info'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenPermsModal(role)}
                                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium cursor-pointer transition-colors"
                              >
                                Permissions
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDevsModal(role)}
                                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer font-medium"
                              >
                                Assign
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditRole(role)}
                                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer font-medium"
                              >
                                Edit
                              </button>
                              {!role.is_system && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRole(role)}
                                  className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs cursor-pointer font-medium"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-b border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="p-3 bg-white dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Role Description
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                                  {role.description || 'No description provided for this role.'}
                                </p>
                                <div className="text-[11px] text-slate-500 pt-1 font-mono">
                                  Created: {role.created_at ? new Date(role.created_at).toLocaleString() : 'N/A'}
                                </div>
                              </div>

                              <div className="p-3 bg-white dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Assigned Developers ({assignedDevs.length})
                                </div>
                                {assignedDevs.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {assignedDevs.map((dev) => (
                                      <span
                                        key={dev.id}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-medium"
                                      >
                                        <span>{dev.name}</span>
                                        <span className="text-[10px] text-slate-400">({dev.email})</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-400 pt-1">
                                    No developers currently assigned to this role.
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Allowed Modules for Role ({allowedMods} of {modules.length} Enabled)
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {modules.filter((m) => rolePerms[m.slug]?.can_view).length > 0 ? (
                                  modules
                                    .filter((m) => rolePerms[m.slug]?.can_view)
                                    .map((m) => {
                                      const p = rolePerms[m.slug] || {};
                                      return (
                                        <span
                                          key={m.slug}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                                        >
                                          <span>{m.name}</span>
                                          {p.can_create && <span className="text-[8px] px-1 rounded bg-blue-100 text-blue-800">C</span>}
                                          {p.can_edit && <span className="text-[8px] px-1 rounded bg-amber-100 text-amber-800">E</span>}
                                          {p.can_delete && <span className="text-[8px] px-1 rounded bg-rose-100 text-rose-800">D</span>}
                                        </span>
                                      );
                                    })
                                ) : (
                                  <span className="text-xs text-slate-400">No modules permitted for this role.</span>
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

      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editingRole ? 'Edit Developer Role' : 'Create Developer Role'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Define authority title, operational scope, and status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {roleError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {roleError}
              </div>
            )}

            <form onSubmit={handleSaveRole} autoComplete="off" className="space-y-3">
              <input
                type="text"
                name="decoy_role_prevent_autofill"
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only opacity-0 absolute -z-50 pointer-events-none h-0 w-0"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  name="role_name"
                  required
                  readOnly={readOnly}
                  onFocus={() => setReadOnly(false)}
                  onPointerDown={() => setReadOnly(false)}
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Description
                </label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  readOnly={readOnly}
                  onFocus={() => setReadOnly(false)}
                  onPointerDown={() => setReadOnly(false)}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Status
                </label>
                <select
                  value={roleForm.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setRoleForm({ ...roleForm, is_active: e.target.value === 'active' })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleLoading}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {roleLoading ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activePermsRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Module Permissions: {activePermsRole.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure granular View, Create, Edit, and Delete module capabilities for this role.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePermsRole(null)}
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
                value={permsSearch}
                onChange={(e) => setPermsSearch(e.target.value)}
                className="w-full sm:w-64 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllPerms(false)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  View Only All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllPerms(true)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Full Access All
                </button>
                <button
                  type="button"
                  onClick={handleRevokeAllPerms}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Revoke All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                    <th className="pb-2">Platform Module</th>
                    <th className="pb-2 text-center w-20">View</th>
                    <th className="pb-2 text-center w-20">Create</th>
                    <th className="pb-2 text-center w-20">Edit</th>
                    <th className="pb-2 text-center w-20">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredModulesInModal.map((mod) => {
                    const current = activePermsMap[mod.slug] || {
                      can_view: false,
                      can_create: false,
                      can_edit: false,
                      can_delete: false,
                    };

                    const handleToggleField = (field) => {
                      setActivePermsMap((prev) => {
                        const nextMod = {
                          ...current,
                          [field]: !current[field],
                        };
                        if (field !== 'can_view' && !current.can_view && !current[field]) {
                          nextMod.can_view = true;
                        }
                        return {
                          ...prev,
                          [mod.slug]: nextMod,
                        };
                      });
                    };

                    return (
                      <tr key={mod.slug} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {mod.name}
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(current.can_view)}
                            onChange={() => handleToggleField('can_view')}
                            className="rounded border-slate-300 text-slate-900 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(current.can_create)}
                            onChange={() => handleToggleField('can_create')}
                            className="rounded border-slate-300 text-slate-900 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(current.can_edit)}
                            onChange={() => handleToggleField('can_edit')}
                            className="rounded border-slate-300 text-slate-900 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(current.can_delete)}
                            onChange={() => handleToggleField('can_delete')}
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
                onClick={() => setActivePermsRole(null)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={permsLoading}
                onClick={handleSavePerms}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {permsLoading ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDevsRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Assign Developers: {activeDevsRole.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage assigned members or select from unassigned developers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDevsRole(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Currently Assigned ({currentAssignedDevs.length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Uncheck to remove developer from this role
                  </span>
                </div>
                {currentAssignedDevs.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded mt-2">
                    No developers currently assigned to this role.
                  </div>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {currentAssignedDevs.map((dev) => {
                      const isChecked = selectedDevIds.includes(dev.id);
                      return (
                        <label
                          key={dev.id}
                          className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800/80'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleDevSelection(dev.id)}
                              className="rounded border-slate-300 text-slate-900 cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                {dev.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {dev.email} {dev.phone ? `• ${dev.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {dev.designation || 'Engineer'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Available Unassigned Developers ({unassignedDevs.length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Check to add unassigned developer to this role
                  </span>
                </div>
                {unassignedDevs.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded mt-2">
                    All registered developers already belong to their assigned roles.
                  </div>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {unassignedDevs.map((dev) => {
                      const isChecked = selectedDevIds.includes(dev.id);
                      return (
                        <label
                          key={dev.id}
                          className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800/80'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleDevSelection(dev.id)}
                              className="rounded border-slate-300 text-slate-900 cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                {dev.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {dev.email} {dev.phone ? `• ${dev.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {dev.designation || 'Engineer'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {otherRoleDevsCount > 0 && (
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                  Notice: {otherRoleDevsCount} other {otherRoleDevsCount === 1 ? 'developer is' : 'developers are'} already assigned to other roles. Each developer can only hold one role. To switch a developer to this role, edit their account directly in Developers Team.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/30">
              <span className="text-xs text-slate-500">
                {selectedDevIds.length} developers selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDevsRole(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={devsAssignLoading}
                  onClick={handleSaveDevAssignments}
                  className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {devsAssignLoading ? 'Saving...' : 'Save Assignments'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
