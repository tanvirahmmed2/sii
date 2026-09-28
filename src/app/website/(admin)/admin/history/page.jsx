'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
  FiPlus, 
  FiClock, 
  FiEdit3, 
  FiTrash2, 
  FiInfo, 
  FiX, 
} from 'react-icons/fi';
import HistoryForm from '@/component/forms/HistoryForm';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function AdminHistoryPage() {
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/histories');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load histories');
      const list = data.paylod?.histories || data.histories || [];
      setHistories(list);
    } catch (err) {
      console.error('Error fetching histories:', err);
      toast.error('Failed to load history list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistories();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this history record?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/histories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to delete record.');

      toast.success('History record deleted successfully!');
      if (editingItem?.id === id) setEditingItem(null);
      fetchHistories();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up max-w-6xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-xs">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <FiClock className="text-primary" /> Institutional History Milestones
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage institutional timeline events, major founding achievements, and historical growth records.
          </p>
        </div>
        <Link
          href="/admin/history/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-indigo-200 cursor-pointer shrink-0"
        >
          <FiPlus className="text-base" /> Create History
        </Link>
      </div>

      {/* List Container */}
      {loading ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500">Loading history records...</p>
        </div>
      ) : histories.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <FiClock className="text-4xl text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">No History Records Found</h3>
          <p className="text-xs text-slate-500 max-w-md">
            Click "Create History" above to add the first historical milestone.
          </p>
          <Link
            href="/admin/history/new"
            className="mt-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-colors inline-flex items-center gap-1.5"
          >
            <FiPlus /> Add First Record
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {histories.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-200 transition-all"
            >
              <div className="flex flex-col gap-2 max-w-3xl">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-200/60 text-primary text-xs font-semibold rounded-lg">
                    {formatDate(item.date)}
                  </span>
                  <h2 className="text-base font-bold text-slate-800">{item.title}</h2>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {stripHtml(item.description)}
                </p>

                {item.infor && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg w-fit">
                    <FiInfo className="text-primary shrink-0" />
                    <span>{item.infor}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <button
                  onClick={() => setEditingItem(item)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-primary text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FiEdit3 /> Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deletingId === item.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FiTrash2 />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <FiX className="text-xl" />
            </button>

            <HistoryForm
              initialData={editingItem}
              onSuccess={() => {
                setEditingItem(null);
                fetchHistories();
              }}
              onCancel={() => setEditingItem(null)}
              onDelete={() => handleDelete(editingItem.id)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
