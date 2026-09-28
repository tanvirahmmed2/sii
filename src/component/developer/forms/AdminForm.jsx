'use client';

import { useState } from 'react';
import { BiUserPlus, BiCheck, BiX } from 'react-icons/bi';

export default function AdminForm({ onSuccess, onCancel, apiEndpoint = '/api/developer/devs', roles: initialRoles = [] }) {
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
    fetch('/api/developer/roles')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.roles) && data.roles.length > 0) {
          setRoles(data.roles);
          // If current formData.role not in fetched roles, default to first or 'developer'
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
        setSuccessMsg(`Admin account created for ${formData.email}! A 6-digit verification code was sent via Brevo email.`);
        const createdRecord = data.admin || data.record;
        setFormData({ name: '', email: '', password: '', role: roles[0]?.slug || 'developer', isActive: true });
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(createdRecord);
          }, 1500);
        }
      } else {
        setError(data.error || 'Failed to create admin');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
            <BiUserPlus className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Add Platform Admin</h3>
            <p className="text-xs text-slate-500">Configure a platform administrator account with role-based permissions.</p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <BiX className="text-xl" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="admin@saasplatform.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Role {rolesLoading && <span className="text-[10px] text-slate-400 font-normal">(Loading...)</span>}
            </label>
            <select
              value={formData.role}
              disabled={rolesLoading}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              {roles.length > 0 ? (
                roles.map((r) => (
                  <option key={r.id || r.slug} value={r.slug}>
                    {r.name} {r.is_system ? '★' : ''}
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
            <select
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-secondary focus:bg-white transition-colors"
            >
              <option value="active">Active (Granted Access)</option>
              <option value="inactive">Inactive (Suspended)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            <BiCheck className="text-base" />
            <span>{loading ? 'Creating...' : 'Save Admin'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
