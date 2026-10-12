'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiEdit2 } from 'react-icons/fi';

const SubjectEditForm = ({ subject, onSuccess, onCancel }) => {
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code);
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !code) {
      toast.error('All fields are required.');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/subjects/${subject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subject.');
      }

      toast.success(data.message || 'Subject updated successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="w-full bg-white border border-primary-light rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(59,130,246,0.02)] animate-fade-up">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FiEdit2 className="text-primary" /> Edit Subject: {subject.name}
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Subject Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 bg-slate-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Subject Code
          </label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 bg-slate-50"
          />
        </div>

        <div className="flex justify-end gap-3 md:col-span-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updating}
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {updating ? (
              <div className="loader loader-sm loader-white" />
            ) : (
              'Update Subject'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubjectEditForm;
