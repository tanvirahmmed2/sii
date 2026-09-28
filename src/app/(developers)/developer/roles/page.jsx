'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiShieldQuarter,
  BiPlus,
  BiCheck,
  BiX,
  BiEdit,
  BiTrash,
  BiSearch,
  BiCheckShield,
  BiLockAlt,
  BiRefresh,
  BiGridAlt,
  BiLayer,
  BiUserCheck,
  BiArrowBack,
  BiCheckDouble,
  BiFolder,
  BiInfoCircle,
} from 'react-icons/bi';

export default function RolesManagementPage() {
  const router = useRouter();

  // Core Data States
  const [currentUser, setCurrentUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'roles' | 'matrix' | 'permissions'
  const [activeTab, setActiveTab] = useState('roles');

  // UI & Feedback
  const [notice, setNotice] = useState({ text: '', type: 'info' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');

  // Modal States
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [configuringRolePerms, setConfiguringRolePerms] = useState(null);
  const [showCreatePermModal, setShowCreatePermModal] = useState(false);
  const [editingPerm, setEditingPerm] = useState(null);

  // Create Role Form State
  const [createRoleData, setCreateRoleData] = useState({
    name: '',
    slug: '',
    description: '',
    permissions: [],
  });
  const [createRoleLoading, setCreateRoleLoading] = useState(false);
  const [createRoleError, setCreateRoleError] = useState('');

  // Edit Role Details Form State
  const [editRoleData, setEditRoleData] = useState({
    name: '',
    slug: '',
    description: '',
  });
  const [editRoleLoading, setEditRoleLoading] = useState(false);
  const [editRoleError, setEditRoleError] = useState('');

  // Configure Role Permissions Form State
  const [rolePermsSelection, setRolePermsSelection] = useState([]);
  const [rolePermsLoading, setRolePermsLoading] = useState(false);
  const [rolePermsError, setRolePermsError] = useState('');
  const [permSearchQuery, setPermSearchQuery] = useState('');

  // Create Permission Form State
  const [createPermData, setCreatePermData] = useState({
    name: '',
    slug: '',
    folder: 'general',
    description: '',
  });
  const [createPermLoading, setCreatePermLoading] = useState(false);
  const [createPermError, setCreatePermError] = useState('');

  // Edit Permission Form State
  const [editPermData, setEditPermData] = useState({
    name: '',
    folder: 'general',
    description: '',
  });
  const [editPermLoading, setEditPermLoading] = useState(false);
  const [editPermError, setEditPermError] = useState('');

  // Fetch initial data
  const fetchData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [rolesRes, permsRes, meRes] = await Promise.all([
        fetch('/api/developer/roles').then((r) => r.json()).catch(() => null),
        fetch('/api/developer/permissions').then((r) => r.json()).catch(() => null),
        fetch('/api/developer/me').then((r) => r.json()).catch(() => null),
      ]);

      if (meRes && meRes.success && meRes.user) {
        setCurrentUser(meRes.user);
      }

      if (rolesRes && rolesRes.success) {
        setRoles(rolesRes.roles || []);
      }

      if (permsRes && permsRes.success) {
        setPermissions(permsRes.permissions || permsRes.records || []);
      }
    } catch (err) {
      console.error('Error loading roles data:', err);
      showNotice('Failed to load roles and permissions data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const userPerms = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const canManage = Boolean(userPerms.includes('developers'));

  const showNotice = (text, type = 'info') => {
    setNotice({ text, type });
    setTimeout(() => {
      setNotice({ text: '', type: 'info' });
    }, 6000);
  };

  // Group permissions by folder
  const groupedPermissions = useMemo(() => {
    const groups = {};
    for (const perm of permissions) {
      const folderKey = perm.folder || 'general';
      if (!groups[folderKey]) {
        groups[folderKey] = [];
      }
      groups[folderKey].push(perm);
    }
    return groups;
  }, [permissions]);

  const uniqueFolders = useMemo(() => {
    const list = Object.keys(groupedPermissions);
    list.sort();
    return list;
  }, [groupedPermissions]);

  // Open Configure Permissions Modal
  const handleOpenConfigurePerms = (role) => {
    setConfiguringRolePerms(role);
    setRolePermsSelection(role.permission_slugs || []);
    setRolePermsError('');
    setPermSearchQuery('');
  };

  // Toggle permission in Configure modal
  const handleTogglePerm = (slug) => {
    setRolePermsSelection((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  // Toggle all permissions in a category
  const handleToggleFolderPerms = (folderList, checkAll) => {
    const slugs = folderList.map((p) => p.slug);
    if (checkAll) {
      setRolePermsSelection((prev) => Array.from(new Set([...prev, ...slugs])));
    } else {
      setRolePermsSelection((prev) => prev.filter((s) => !slugs.includes(s)));
    }
  };

  // Save Configured Permissions for Role
  const handleSaveRolePermissions = async () => {
    if (!configuringRolePerms) return;
    setRolePermsLoading(true);
    setRolePermsError('');

    try {
      const res = await fetch('/api/developer/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: configuringRolePerms.id,
          permissions: rolePermsSelection,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Permissions for role "${configuringRolePerms.name}" updated successfully!`, 'success');
        setConfiguringRolePerms(null);
        fetchData();
      } else {
        setRolePermsError(data.error || 'Failed to update role permissions');
      }
    } catch (err) {
      setRolePermsError(err.message || 'Network error updating permissions');
    } finally {
      setRolePermsLoading(false);
    }
  };

  // Create Role Form Submit
  const handleCreateRole = async (e) => {
    e.preventDefault();
    setCreateRoleLoading(true);
    setCreateRoleError('');

    try {
      const res = await fetch('/api/developer/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRoleData),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Role "${createRoleData.name}" created successfully!`, 'success');
        setShowCreateRoleModal(false);
        setCreateRoleData({ name: '', slug: '', description: '', permissions: [] });
        fetchData();
      } else {
        setCreateRoleError(data.error || 'Failed to create role');
      }
    } catch (err) {
      setCreateRoleError(err.message || 'Network error creating role');
    } finally {
      setCreateRoleLoading(false);
    }
  };

  // Open Edit Role Details Modal
  const handleOpenEditRole = (role) => {
    setEditingRole(role);
    setEditRoleData({
      name: role.name || '',
      slug: role.slug || '',
      description: role.description || '',
    });
    setEditRoleError('');
  };

  // Save Edit Role Details
  const handleSaveEditRole = async (e) => {
    e.preventDefault();
    if (!editingRole) return;
    setEditRoleLoading(true);
    setEditRoleError('');

    try {
      const res = await fetch('/api/developer/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRole.id,
          name: editRoleData.name,
          slug: editRoleData.slug,
          description: editRoleData.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Role "${editRoleData.name}" updated successfully!`, 'success');
        setEditingRole(null);
        fetchData();
      } else {
        setEditRoleError(data.error || 'Failed to update role');
      }
    } catch (err) {
      setEditRoleError(err.message || 'Network error updating role');
    } finally {
      setEditRoleLoading(false);
    }
  };

  // Delete Role
  const handleDeleteRole = async (role) => {
    if (role.is_system || role.slug === 'admin') {
      showNotice(`System role "${role.name}" cannot be deleted.`, 'error');
      return;
    }

    if (role.developers_count > 0) {
      showNotice(
        `Cannot delete role "${role.name}": ${role.developers_count} developer accounts are currently assigned to this role. Please reassign them first.`,
        'error'
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete the role "${role.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/developer/roles?id=${role.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Role "${role.name}" deleted successfully.`, 'success');
        fetchData();
      } else {
        showNotice(data.error || 'Failed to delete role', 'error');
      }
    } catch (err) {
      showNotice('Network error deleting role', 'error');
    }
  };

  // Create Custom Permission Form Submit
  const handleCreatePermission = async (e) => {
    e.preventDefault();
    setCreatePermLoading(true);
    setCreatePermError('');

    try {
      const res = await fetch('/api/developer/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPermData),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Permission "${createPermData.name}" created and granted to Admin!`, 'success');
        setShowCreatePermModal(false);
        setCreatePermData({ name: '', slug: '', folder: 'general', description: '' });
        fetchData();
      } else {
        setCreatePermError(data.error || 'Failed to create permission');
      }
    } catch (err) {
      setCreatePermError(err.message || 'Network error creating permission');
    } finally {
      setCreatePermLoading(false);
    }
  };

  // Open Edit Permission Modal
  const handleOpenEditPerm = (perm) => {
    setEditingPerm(perm);
    setEditPermData({
      name: perm.name || '',
      folder: perm.folder || 'general',
      description: perm.description || '',
    });
    setEditPermError('');
  };

  // Save Edit Permission
  const handleSaveEditPerm = async (e) => {
    e.preventDefault();
    if (!editingPerm) return;
    setEditPermLoading(true);
    setEditPermError('');

    try {
      const res = await fetch('/api/developer/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPerm.id,
          name: editPermData.name,
          folder: editPermData.folder,
          description: editPermData.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Permission "${editPermData.name}" updated successfully!`, 'success');
        setEditingPerm(null);
        fetchData();
      } else {
        setEditPermError(data.error || 'Failed to update permission');
      }
    } catch (err) {
      setEditPermError(err.message || 'Network error updating permission');
    } finally {
      setEditPermLoading(false);
    }
  };

  // Delete Permission
  const handleDeletePerm = async (perm) => {
    const protectedSlugs = ['overview', 'developers', 'settings', 'profile'];
    if (protectedSlugs.includes(perm.slug)) {
      showNotice(`Core platform permission "${perm.slug}" is system protected.`, 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete permission module "${perm.name}" (${perm.slug})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/developer/permissions?id=${perm.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Permission "${perm.name}" deleted.`, 'success');
        fetchData();
      } else {
        showNotice(data.error || 'Failed to delete permission', 'error');
      }
    } catch (err) {
      showNotice('Network error deleting permission', 'error');
    }
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    const q = searchTerm.toLowerCase();
    return roles.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.slug?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [roles, searchTerm]);

  // Filtered Permissions for Catalog
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesSearch =
        !searchTerm.trim() ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = selectedFolder === 'all' || (p.folder || 'general') === selectedFolder;
      return matchesSearch && matchesFolder;
    });
  }, [permissions, searchTerm, selectedFolder]);

  // Matrix filtered permissions
  const matrixPermissions = useMemo(() => {
    if (!searchTerm.trim()) return permissions;
    const q = searchTerm.toLowerCase();
    return permissions.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        (p.folder || '').toLowerCase().includes(q)
    );
  }, [permissions, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Notice Alert */}
      {notice.text && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all shadow-xs ${
            notice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              : notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <BiInfoCircle className="text-base shrink-0" />
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice({ text: '', type: 'info' })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
              <BiShieldQuarter className="text-2xl" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Roles &amp; Permissions Studio
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create custom platform roles, manage system permissions, and configure developer access controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/developer/developers"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <BiUserCheck className="text-base" />
            <span>Developer Accounts</span>
          </Link>
          <button
            type="button"
            onClick={() => fetchData(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh roles data"
          >
            <BiRefresh className="text-lg" />
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setShowCreatePermModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <BiPlus className="text-base" />
                <span>New Permission</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateRoleModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <BiPlus className="text-base" />
                <span>Create Role</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('roles');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'roles'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BiShieldQuarter className="text-base" />
            <span>Roles ({roles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('matrix');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'matrix'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BiGridAlt className="text-base" />
            <span>Permissions Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('permissions');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BiLayer className="text-base" />
            <span>Permissions Catalog ({permissions.length})</span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-64 pb-2 sm:pb-0">
          <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder={
              activeTab === 'roles'
                ? 'Search roles by name or slug...'
                : 'Search permissions by name or slug...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
      </div>

      {/* TAB 1: ROLES CARDS VIEW */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-xs">
                Loading platform roles...
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-xs">
                No roles match your search filter.
              </div>
            ) : (
              filteredRoles.map((role) => {
                const assignedSlugs = role.permission_slugs || [];
                const devCount = role.developers_count || 0;
                const isSystem = Boolean(role.is_system);

                return (
                  <div
                    key={role.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{role.name}</h3>
                            {isSystem && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                System
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            slug: {role.slug}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditRole(role)}
                                className="text-slate-400 hover:text-purple-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Edit role metadata"
                              >
                                <BiEdit className="text-base" />
                              </button>
                              {!isSystem && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRole(role)}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Delete role"
                                >
                                  <BiTrash className="text-base" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 min-h-8">
                        {role.description || 'No description specified for this role.'}
                      </p>

                      {/* Counts / Stats */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Permissions</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {assignedSlugs.length} / {permissions.length} modules
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Members</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {devCount} developer{devCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>

                      {/* Permission Preview Chips */}
                      <div className="pt-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Modules Granted</div>
                        <div className="flex flex-wrap gap-1">
                          {assignedSlugs.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No permissions assigned</span>
                          ) : (
                            <>
                              {assignedSlugs.slice(0, 5).map((slug) => (
                                <span
                                  key={slug}
                                  className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  {slug}
                                </span>
                              ))}
                              {assignedSlugs.length > 5 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                  +{assignedSlugs.length - 5} more
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action CTA */}
                    <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <Link
                        href={`/developer/developers?role=${role.slug}`}
                        className="text-[11px] font-semibold text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                      >
                        View {devCount} member{devCount === 1 ? '' : 's'} →
                      </Link>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenConfigurePerms(role)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <BiCheckShield className="text-base" />
                          <span>Configure Permissions</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERMISSIONS MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Role-Permission Access Matrix</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comprehensive matrix of all platform modules against configured staff roles.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800 dark:text-white">{matrixPermissions.length}</span> permissions across{' '}
              <span className="font-bold text-slate-800 dark:text-white">{roles.length}</span> roles
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3 sticky left-0 bg-slate-50 dark:bg-slate-800/90 z-10 w-64">
                    Module / Permission
                  </th>
                  <th className="px-3 py-3 w-32">Category</th>
                  {roles.map((r) => (
                    <th key={r.id} className="px-3 py-3 text-center whitespace-nowrap min-w-28">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{r.name}</span>
                        <div className="text-[9px] font-mono text-slate-400 normal-case">{r.slug}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {matrixPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={2 + roles.length} className="py-12 text-center text-slate-400">
                      No matching permissions found.
                    </td>
                  </tr>
                ) : (
                  matrixPermissions.map((perm) => {
                    return (
                      <tr key={perm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-slate-900 z-10">
                          <div className="font-bold text-slate-800 dark:text-white">{perm.name}</div>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            /{perm.slug}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {perm.folder || 'general'}
                          </span>
                        </td>
                        {roles.map((r) => {
                          const hasPerm = (r.permission_slugs || []).includes(perm.slug);
                          return (
                            <td key={r.id} className="px-3 py-2.5 text-center">
                              {hasPerm ? (
                                <span
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                                  title={`${r.name} has permission to access ${perm.name}`}
                                >
                                  <BiCheck className="text-base" />
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600"
                                  title={`${r.name} does NOT have permission to access ${perm.name}`}
                                >
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PERMISSIONS CATALOG */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedFolder('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedFolder === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              All Categories ({permissions.length})
            </button>
            {uniqueFolders.map((folder) => {
              const count = (groupedPermissions[folder] || []).length;
              return (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setSelectedFolder(folder)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${
                    selectedFolder === folder
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {folder} ({count})
                </button>
              );
            })}
          </div>

          {/* Permissions Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Permission Name</th>
                    <th className="px-4 py-3">Route / Slug</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Assigned Roles</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No permissions found.
                      </td>
                    </tr>
                  ) : (
                    filteredPermissions.map((perm) => {
                      const rolesHoldingPerm = roles.filter((r) =>
                        (r.permission_slugs || []).includes(perm.slug)
                      );
                      const isProtected = ['overview', 'developers', 'settings', 'profile'].includes(
                        perm.slug
                      );

                      return (
                        <tr key={perm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {perm.name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              /{perm.slug}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {perm.folder || 'general'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {rolesHoldingPerm.map((r) => (
                                <span
                                  key={r.id}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  {r.name}
                                </span>
                              ))}
                              {rolesHoldingPerm.length === 0 && (
                                <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                            {perm.description || '—'}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {canManage && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPerm(perm)}
                                  className="text-slate-400 hover:text-purple-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Edit permission details"
                                >
                                  <BiEdit className="text-base" />
                                </button>
                                {!isProtected && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePerm(perm)}
                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                    title="Delete permission"
                                  >
                                    <BiTrash className="text-base" />
                                  </button>
                                )}
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
      )}

      {/* MODAL: CONFIGURE ROLE PERMISSIONS */}
      {configuringRolePerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <BiCheckShield className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Configure Permissions for: <span className="text-purple-600">{configuringRolePerms.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    slug: {configuringRolePerms.slug} &bull; {rolePermsSelection.length} of {permissions.length} modules selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfiguringRolePerms(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <BiX className="text-2xl" />
              </button>
            </div>

            {/* Error banner */}
            {rolePermsError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {rolePermsError}
              </div>
            )}

            {/* Quick Actions & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  placeholder="Filter permissions..."
                  value={permSearchQuery}
                  onChange={(e) => setPermSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRolePermsSelection(permissions.map((p) => p.slug))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setRolePermsSelection([])}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Permissions Checkbox Grid grouped by category */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {uniqueFolders.map((folder) => {
                const folderPerms = (groupedPermissions[folder] || []).filter(
                  (p) =>
                    !permSearchQuery.trim() ||
                    p.name.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
                    p.slug.toLowerCase().includes(permSearchQuery.toLowerCase())
                );

                if (folderPerms.length === 0) return null;

                const allInFolderSelected = folderPerms.every((p) => rolePermsSelection.includes(p.slug));

                return (
                  <div key={folder} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/20">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <BiFolder className="text-purple-600 text-lg" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                          {folder} ({folderPerms.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFolderPerms(folderPerms, !allInFolderSelected)}
                        className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                      >
                        {allInFolderSelected ? 'Deselect Category' : 'Select Category'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {folderPerms.map((perm) => {
                        const checked = rolePermsSelection.includes(perm.slug);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                              checked
                                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-slate-900 dark:text-white'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePerm(perm.slug)}
                              className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold block truncate">{perm.name}</span>
                              <span className="font-mono text-[10px] text-slate-400 block truncate">
                                /{perm.slug}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                <strong className="text-purple-600">{rolePermsSelection.length}</strong> modules will be assigned to{' '}
                <strong className="text-slate-800 dark:text-white">{configuringRolePerms.name}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfiguringRolePerms(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rolePermsLoading}
                  onClick={handleSaveRolePermissions}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <BiCheck className="text-base" />
                  <span>{rolePermsLoading ? 'Saving...' : 'Save Permissions'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ROLE */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <BiShieldQuarter className="text-xl" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Create Platform Role</h3>
                  <p className="text-xs text-slate-500">Define a custom operational role for your developer team</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {createRoleError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {createRoleError}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compliance Officer, Lead Architect"
                  value={createRoleData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
                    setCreateRoleData({
                      ...createRoleData,
                      name,
                      slug: createRoleData.slug === '' || createRoleData.slug === autoSlug.slice(0, -1) ? autoSlug : createRoleData.slug,
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Role Slug / Identifier <span className="text-slate-400 font-normal">(Used in system logic)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. compliance-officer"
                  value={createRoleData.slug}
                  onChange={(e) => setCreateRoleData({ ...createRoleData, slug: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the duties and responsibilities assigned to this role..."
                  value={createRoleData.description}
                  onChange={(e) => setCreateRoleData({ ...createRoleData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Quick Preset Permissions Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Initial Permissions ({createRoleData.permissions.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateRoleData({ ...createRoleData, permissions: permissions.map((p) => p.slug) })}
                      className="text-[10px] font-bold text-purple-600 hover:underline"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateRoleData({ ...createRoleData, permissions: [] })}
                      className="text-[10px] font-bold text-purple-600 hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/40 grid grid-cols-2 gap-2">
                  {permissions.map((p) => {
                    const isChecked = createRoleData.permissions.includes(p.slug);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setCreateRoleData((prev) => ({
                              ...prev,
                              permissions: isChecked
                                ? prev.permissions.filter((s) => s !== p.slug)
                                : [...prev.permissions, p.slug],
                            }));
                          }}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="truncate text-slate-700 dark:text-slate-300">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoleLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <BiCheck className="text-base" />
                  <span>{createRoleLoading ? 'Creating...' : 'Create Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ROLE METADATA */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <BiEdit className="text-xl" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Edit Role Details</h3>
                  <p className="text-xs text-slate-500">Update metadata for role #{editingRole.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {editRoleError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {editRoleError}
              </div>
            )}

            <form onSubmit={handleSaveEditRole} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  value={editRoleData.name}
                  onChange={(e) => setEditRoleData({ ...editRoleData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Slug {editingRole.is_system && <span className="text-slate-400 font-normal">(System Protected)</span>}
                </label>
                <input
                  type="text"
                  disabled={editingRole.is_system}
                  value={editRoleData.slug}
                  onChange={(e) => setEditRoleData({ ...editRoleData, slug: e.target.value })}
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono ${
                    editingRole.is_system
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editRoleData.description}
                  onChange={(e) => setEditRoleData({ ...editRoleData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editRoleLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <BiCheck className="text-base" />
                  <span>{editRoleLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PERMISSION */}
      {showCreatePermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <BiLayer className="text-xl" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">New Permission Module</h3>
                  <p className="text-xs text-slate-500">Register a new feature or endpoint permission</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePermModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {createPermError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {createPermError}
              </div>
            )}

            <form onSubmit={handleCreatePermission} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Permission Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Analytics Dashboard, Audit Logs"
                  value={createPermData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
                    setCreatePermData({
                      ...createPermData,
                      name,
                      slug: createPermData.slug === '' || createPermData.slug === autoSlug.slice(0, -1) ? autoSlug : createPermData.slug,
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Module Slug / Route Key <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. analytics, audit-logs"
                  value={createPermData.slug}
                  onChange={(e) => setCreatePermData({ ...createPermData, slug: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category / Folder</label>
                <input
                  type="text"
                  list="folder-list"
                  placeholder="e.g. Platform Core, Security & Trust"
                  value={createPermData.folder}
                  onChange={(e) => setCreatePermData({ ...createPermData, folder: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
                <datalist id="folder-list">
                  {uniqueFolders.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Description of capabilities granted by this permission..."
                  value={createPermData.description}
                  onChange={(e) => setCreatePermData({ ...createPermData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreatePermModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPermLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <BiCheck className="text-base" />
                  <span>{createPermLoading ? 'Creating...' : 'Create Permission'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PERMISSION */}
      {editingPerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <BiEdit className="text-xl" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Edit Permission</h3>
                  <p className="text-xs text-slate-500 font-mono">slug: {editingPerm.slug}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPerm(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {editPermError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {editPermError}
              </div>
            )}

            <form onSubmit={handleSaveEditPerm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Permission Name
                </label>
                <input
                  type="text"
                  required
                  value={editPermData.name}
                  onChange={(e) => setEditPermData({ ...editPermData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category / Folder</label>
                <input
                  type="text"
                  list="folder-list-edit"
                  value={editPermData.folder}
                  onChange={(e) => setEditPermData({ ...editPermData, folder: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
                <datalist id="folder-list-edit">
                  {uniqueFolders.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editPermData.description}
                  onChange={(e) => setEditPermData({ ...editPermData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPerm(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editPermLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <BiCheck className="text-base" />
                  <span>{editPermLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
