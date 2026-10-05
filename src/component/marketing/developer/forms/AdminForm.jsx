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
    <div className="bg-white border border-slate-200 rounded p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Add Developer Account</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Create a developer account. An activation link will be sent to their email.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            ✕ Close
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs font-normal">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-normal">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name <span className="text-rose-600">*</span></label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address <span className="text-rose-600">*</span></label>
            <input
              type="email"
              required
              placeholder="developer@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password <span className="text-rose-600">*</span></label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Role {rolesLoading && <span className="text-[10px] text-slate-400 font-normal">(Loading...)</span>}
            </label>
            <select
              value={formData.role}
              disabled={rolesLoading}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
            <select
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating...' : 'Create Developer'}
          </button>
        </div>
      </form>
    </div>
  );
}
