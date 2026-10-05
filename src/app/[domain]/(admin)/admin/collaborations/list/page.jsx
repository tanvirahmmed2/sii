'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiBriefcase, FiImage, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const CollaborationsListPage = () => {
  const [collaborations, setCollaborations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchCollaborations = async () => {
    try {
      const res = await fetch('/api/collaborations');
      if (res.ok) {
        const data = await res.json();
        setCollaborations(data.paylod.collaborations || []);
      }
    } catch (err) {
      console.error('Error fetching collaborations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborations();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this collaboration? This action cannot be undone.')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/collaborations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Collaboration deleted.');
        setCollaborations((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error(data.error || 'Failed to delete collaboration.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Something went wrong.');
    } finally {
      setDeletingId(null);
    }
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  return (
    <div className="w-full p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Institutional Collaborations
          </h1>
        </div>
        <Link
          href="/admin/collaborations/new"
          className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors"
        >
          <FiPlus />
          <span>Add New Collaboration</span>
        </Link>
      </div>

      {/* List Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading collaborations...</span>
          </div>
        ) : collaborations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pl-6 w-24">Logo</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Institution Name</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Description</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pr-6 text-right w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-800">
                {collaborations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Logo */}
                    <td className="p-4 pl-6">
                      {item.logo ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 p-1 flex items-center justify-center">
                          <img src={item.logo} alt="" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                          <FiImage className="text-base" />
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FiBriefcase className="text-primary flex-shrink-0" />
                        <span className="font-semibold text-slate-900">{item.institution_name}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="p-4 max-w-md">
                      <p className="text-slate-500 text-xs font-medium line-clamp-2 leading-relaxed">
                        {stripHtml(item.description) || <span className="text-slate-350 italic">No description provided</span>}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center gap-3 justify-end">
                        <Link
                          href={`/admin/collaborations/${item.id}/edit`}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary text-[11px] font-bold transition-colors"
                        >
                          <FiEdit2 />
                          <span>Edit</span>
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-[11px] font-bold disabled:opacity-50 transition-colors"
                        >
                          {deletingId === item.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <FiTrash2 />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
              <FiBriefcase />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No collaborations recorded</h3>
            <p className="text-slate-500 text-xs mt-1">
              Institutional partnerships and collaborations will be listed here.
            </p>
            <Link
              href="/admin/collaborations/new"
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors mt-4"
            >
              <FiPlus />
              <span>Add First Collaboration</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationsListPage;
