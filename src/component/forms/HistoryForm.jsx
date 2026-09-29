'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiClock, FiCalendar, FiBookOpen, FiInfo, FiSave, FiTrash2, FiPlusCircle } from 'react-icons/fi';
import TiptapEditor from 'src/component/helper/TiptapEditor';

const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
};

const HistoryForm = ({ initialData, onSuccess, onCancel, onDelete }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [infor, setInfor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDate(formatDateForInput(initialData.date));
      setDescription(initialData.description || '');
      setInfor(initialData.infor || '');
    } else {
      setTitle('');
      setDate(formatDateForInput(new Date().toISOString()));
      setDescription('');
      setInfor('');
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanDesc = description.replace(/<[^>]*>/g, '').trim();
    if (!title.trim() || !date || !cleanDesc) {
      toast.error('Title, Date, and Description are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        date,
        description: description.trim(),
        infor: infor.trim() || ''
      };

      const url = initialData?.id ? `/api/histories/${initialData.id}` : '/api/histories';
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to save history entry.');
      }

      toast.success(data.message || (initialData?.id ? 'History updated successfully!' : 'History record created successfully!'));
      if (onSuccess) {
        onSuccess(data.paylod?.history || data.history);
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          {initialData?.id ? (
            <>
              <FiClock className="text-primary" /> Edit History Milestone
            </>
          ) : (
            <>
              <FiPlusCircle className="text-primary" /> Add History Milestone
            </>
          )}
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Fill in the details below to record an institutional milestone or historical event.
        </p>
      </div>

      {/* Grid: Date & Title */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiCalendar className="text-primary" /> Milestone Date *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary font-semibold transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiBookOpen className="text-primary" /> Milestone Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary font-medium transition-colors"
          />
        </div>
      </div>

      {/* Description using TiptapEditor */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <FiBookOpen className="text-primary" /> Description Details *
        </label>
        <TiptapEditor
          value={description}
          onChange={setDescription}
        />
      </div>

      {/* Information (infor) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <FiInfo className="text-primary" /> Additional Info / Highlights (infor)
        </label>
        <textarea
          rows={3}
          value={infor}
          onChange={(e) => setInfor(e.target.value)}
          disabled={submitting}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary leading-relaxed font-medium transition-colors resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
        {onDelete && initialData?.id && (
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting}
            className="mr-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FiTrash2 className="text-sm" /> Delete Milestone
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <FiSave className="text-sm" />
              {initialData?.id ? 'Update History' : 'Save History Record'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default HistoryForm;
