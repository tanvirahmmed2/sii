'use client';

import { useState, useEffect } from 'react';

export default function AdminForm({ onSuccess, onCancel, apiEndpoint = '/api/marketing/developer/devs', roles = [] }) {
  const [availableRoles, setAvailableRoles] = useState(roles);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role_id: roles[0]?.id || '',
    password: '',
    designation: '',
    isActive: true,
  });
  const [readOnly, setReadOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (Array.isArray(roles) && roles.length > 0) {
      setAvailableRoles(roles);
      setFormData((prev) => ({ ...prev, role_id: prev.role_id || roles[0]?.id || '' }));
    } else {
      fetch('/api/marketing/developer/roles')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.roles)) {
            setAvailableRoles(d.roles);
            setFormData((prev) => ({ ...prev, role_id: prev.role_id || d.roles[0]?.id || '' }));
          }
        })
        .catch(() => {});
    }
  }, [roles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password.trim()) {
      setError('Full Name, Email Address, Phone Number, and Password are required.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_admin',
          data: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            role_id: formData.role_id || null,
            password: formData.password.trim(),
            designation: formData.designation.trim() || null,
            isActive: Boolean(formData.isActive),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Developer account created for ${formData.email}. An activation link has been sent to their email.`);
        const createdRecord = data.admin || data.record;
        setFormData({
          name: '',
          email: '',
          phone: '',
          role_id: availableRoles[0]?.id || '',
          password: '',
          designation: '',
          isActive: true,
        });
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3 mb-4 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Add Developer Account</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create a developer account with required unique phone number, assigned role, and credentials.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
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

      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3">
        <input
          type="text"
          name="decoy_username_prevent_autofill"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="username"
          className="sr-only opacity-0 absolute -z-50 pointer-events-none h-0 w-0"
        />
        <input
          type="password"
          name="decoy_password_prevent_autofill"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="new-password"
          className="sr-only opacity-0 absolute -z-50 pointer-events-none h-0 w-0"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              name="developer_name"
              autoComplete="off"
              required
              readOnly={readOnly}
              onFocus={() => setReadOnly(false)}
              onPointerDown={() => setReadOnly(false)}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address <span className="text-rose-600">*</span>
            </label>
            <input
              type="email"
              name="developer_email"
              autoComplete="off"
              required
              readOnly={readOnly}
              onFocus={() => setReadOnly(false)}
              onPointerDown={() => setReadOnly(false)}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number <span className="text-rose-600">*</span>
            </label>
            <input
              type="tel"
              name="developer_phone"
              autoComplete="off"
              required
              readOnly={readOnly}
              onFocus={() => setReadOnly(false)}
              onPointerDown={() => setReadOnly(false)}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Developer Role <span className="text-rose-600">*</span>
            </label>
            <select
              name="developer_role_id"
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            >
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.is_system ? '(System)' : '(Custom)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Designation
            </label>
            <input
              type="text"
              name="developer_designation"
              autoComplete="off"
              readOnly={readOnly}
              onFocus={() => setReadOnly(false)}
              onPointerDown={() => setReadOnly(false)}
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password <span className="text-rose-600">*</span>
            </label>
            <input
              type="password"
              name="developer_password"
              autoComplete="new-password"
              required
              minLength={6}
              readOnly={readOnly}
              onFocus={() => setReadOnly(false)}
              onPointerDown={() => setReadOnly(false)}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Account Status
            </label>
            <select
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating...' : 'Create Developer'}
          </button>
        </div>
      </form>
    </div>
  );
}
