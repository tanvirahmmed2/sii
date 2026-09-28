'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiX,  FiPhone, FiMapPin, FiMail, FiUser, FiSearch, FiCheckCircle } from 'react-icons/fi';
import AdminCreateForm from '@/component/forms/AdminCreateForm';

const AdminAccessPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch admins.');
      }
      setAdmins(data.paylod?.admins || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleDeleteAdmin = async (id, adminEmail) => {
    const confirmDelete = window.confirm(`Are you sure you want to remove administrator account (${adminEmail})?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch('/api/admin/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to delete admin.');
      }

      toast.success(data.message || 'Admin account deleted successfully.');
      setAdmins((prev) => prev.filter((admin) => admin.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.number?.includes(searchQuery)
  );

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
             Access Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage administrative personnel accounts, security permissions, and roles below.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-lg" /> Close Drawer
            </>
          ) : (
            <>
              <FiPlus className="text-lg" /> Add Administrator
            </>
          )}
        </button>
      </div>

      {/* Add Admin Form Component Drawer */}
      {showAddForm && (
        <AdminCreateForm
          onSuccess={() => {
            fetchAdmins();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Admin List Table Card */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Administrators Registry ({filteredAdmins.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Active institutional system administrators</p>
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary focus:bg-white transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-400">Loading administrators...</span>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-350 text-5xl mb-3">📭</span>
            <h3 className="text-sm font-bold text-slate-600">No Administrators Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              {searchQuery ? 'No accounts match your search query.' : 'Register new admins to give them administrative access.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Administrator
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Security Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary border border-primary/20 rounded-2xl flex items-center justify-center font-bold text-sm">
                          <FiUser className="text-lg" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{admin.name}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-0.5">
                            ID: #{admin.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium">
                          <FiMail className="text-slate-400 text-sm" /> {admin.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FiPhone className="text-slate-400 text-sm" /> {admin.number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 flex items-center gap-1.5">
                        <FiMapPin className="text-slate-400 shrink-0 text-sm" /> {admin.address}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 w-max">
                          <FiCheckCircle className="text-xs text-emerald-600" /> 2FA Enabled
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors duration-150 inline-flex items-center justify-center cursor-pointer"
                        title="Remove Administrator"
                      >
                        <FiTrash2 className="text-base" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAccessPage;
