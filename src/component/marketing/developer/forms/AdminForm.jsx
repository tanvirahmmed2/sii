'use client';

import { useState, useEffect } from 'react';

export default function AdminForm({ onSuccess, onCancel, apiEndpoint = '/api/marketing/developer/devs', roles: initialRoles = [] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [rolesLoading, setRolesLoading] = useState(initialRoles.length === 0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'developer',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch dynamic roles if not provided via props
  useEffect(() => {
    if (initialRoles && initialRoles.length > 0) {
      setRoles(initialRoles);
      setRolesLoading(false);
      return;
    }

    let isMounted = true;
    setRolesLoading(true);
    fetch('/api/marketing/developer/roles')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.roles) && data.roles.length > 0) {
          setRoles(data.roles);
          const hasDev = data.roles.some((r) => r.slug === 'developer');
          if (!hasDev && data.roles[0]) {
            setFormData((prev) => ({ ...prev, role: data.roles[0].slug }));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load roles in AdminForm:', err);
      })
      .finally(() => {
        if (isMounted) setRolesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialRoles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const selectedRoleObj = roles.find((r) => r.slug === formData.role || String(r.id) === String(formData.role));
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_admin',
          data: {
            ...formData,
            role: selectedRoleObj?.slug || formData.role,
            role_id: selectedRoleObj?.id || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Developer account created for ${formData.email}. A verification activation link has been sent to their email.`);
        const createdRecord = data.admin || data.record;
        setFormData({ name: '', email: '', password: '', role: roles[0]?.slug || 'developer', isActive: true });
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(createdRecord);
          }, 1500);
        }
      } else {
        setError(data.error || 'Failed to create developer');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">Add Developer Account</h3>
          <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
            Create a developer account. An activation link will be sent to their email.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 mb-4 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-normal">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 mb-4 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-normal">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Email Address</label>
            <input
              type="email"
              required
              placeholder="developer@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">
              Role {rolesLoading && <span className="text-[10px] text-slate-400 font-normal">(Loading...)</span>}
            </label>
            <select
              value={formData.role}
              disabled={rolesLoading}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            >
              {roles.length > 0 ? (
                roles.map((r) => (
                  <option key={r.id || r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="developer">Developer</option>
                  <option value="marketer">Marketer</option>
                  <option value="admin">Super Admin</option>
                  <option value="manager">Manager</option>
                  <option value="support">Support Specialist</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-700 dark:text-slate-300">Account Status</label>
            <select
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Creating...' : 'Create Developer'}
          </button>
        </div>
      </form>
    </div>
  );
}
