'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiAward, FiCalendar, FiImage, FiTrash2, FiUser, FiEdit2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const RecognitionListPage = () => {
  const [recognitions, setRecognitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRecognitions = async () => {
    try {
      const res = await fetch('/api/recognitions');
      if (res.ok) {
        const data = await res.json();
        const list = data.paylod?.recognitions || data.payload?.recognitions || data.recognitions || [];
        setRecognitions(list);
      }
    } catch (err) {
      console.error('Error fetching recognitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecognitions();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this recognition? This action cannot be undone.')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/recognitions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Recognition deleted.');
        setRecognitions((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(data.error || 'Failed to delete recognition.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Something went wrong.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Recognitions &amp; Awards
          </h1>
        </div>
        <Link
          href="/admin/recognition/new"
          className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors"
        >
          <FiPlus />
          <span>Add New Recognition</span>
        </Link>
      </div>

      {/* List Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading recognitions...</span>
          </div>
        ) : recognitions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pl-6">Image</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Recognition Name</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Description</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Awarded By</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Date</th>
                  <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-800">
                {recognitions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Image */}
                    <td className="p-4 pl-6">
                      {item.image ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                          <img src={item.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                          <FiImage className="text-sm" />
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="p-4 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <FiAward className="text-amber-500 flex-shrink-0" />
                        <span className="font-semibold text-slate-900">{item.name}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="p-4 max-w-xs">
                      {item.description ? (
                        <p className="text-slate-500 text-xs font-normal line-clamp-2 leading-relaxed">
                          {stripHtml(item.description)}
                        </p>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">No description</span>
                      )}
                    </td>

                    {/* Awarded By */}
                    <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <FiUser className="text-slate-400" />
                        {item.awarded_by}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <FiCalendar />
                        {new Date(item.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center gap-3 justify-end">
                        <Link
                          href={`/admin/recognition/${item.id}/edit`}
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
              <FiAward />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No recognitions recorded</h3>
            <p className="text-slate-500 text-xs mt-1">
              Awards and recognitions received by the institution will be listed here.
            </p>
            <Link
              href="/admin/recognition/new"
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors mt-4"
            >
              <FiPlus />
              <span>Add First Recognition</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecognitionListPage;
