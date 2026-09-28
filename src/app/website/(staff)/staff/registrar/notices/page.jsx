'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiFileText, FiBookmark, FiCalendar, FiTrash2, FiX, FiLink } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import NoticeCreateForm from '@/component/forms/NoticeCreateForm';

const RegistrarNoticesPage = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notices');
      if (res.ok) {
        const data = await res.json();
        setNotices(data.paylod?.notices || []);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleTogglePin = async (notice) => {
    try {
      const res = await fetch(`/api/notices/${notice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notice.title,
          link: notice.link,
          is_pinned: !notice.is_pinned
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle pin');
      toast.success(notice.is_pinned ? 'Notice unpinned!' : 'Notice pinned to top!');
      fetchNotices();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    const confirm = window.confirm(`Are you sure you want to delete notice "${name}"?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete notice');
      toast.success('Notice deleted successfully.');
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest">
            Registrar Panel
          </span>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Academic Notice Board
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish syllabus updates, class schedule alerts, exam routines, and links to the notice board.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-lg" /> Cancel
            </>
          ) : (
            <>
              <FiPlus className="text-lg" /> Post Notice
            </>
          )}
        </button>
      </div>

      {showAddForm ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] max-w-xl">
          <NoticeCreateForm
            onSuccess={() => {
              setShowAddForm(false);
              fetchNotices();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-slate-400">Loading notices...</span>
            </div>
          ) : notices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-655">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pl-6">Notice</th>
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Date Posted</th>
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-800">
                  {notices.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{item.title}</span>
                            {item.is_pinned && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                <FiBookmark className="text-[8px]" /> PINNED
                              </span>
                            )}
                          </div>
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-[10px] font-semibold"
                          >
                            <FiLink className="text-[9px]" /> View Document Attachment
                          </a>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <FiCalendar />
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-3.5">
                          <button
                            onClick={() => handleTogglePin(item)}
                            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                              item.is_pinned
                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100'
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border-slate-100'
                            }`}
                            title={item.is_pinned ? 'Unpin from Top' : 'Pin to Top'}
                          >
                            <FiBookmark className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="text-red-500 hover:text-red-750 transition-colors cursor-pointer p-1.5"
                            title="Delete notice"
                          >
                            <FiTrash2 className="text-sm" />
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
                <FiFileText />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No notices published</h3>
              <p className="text-slate-500 text-xs mt-1">
                Official notices and document folders will show here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RegistrarNoticesPage;
