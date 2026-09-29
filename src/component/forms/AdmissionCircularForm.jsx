'use client';

import React, { useState, useEffect } from 'react';
import TiptapEditor from 'src/component/helper/TiptapEditor';

const AdmissionCircularForm = ({ initialData, onSubmit, onCancel, classes, submitting }) => {
  const [form, setForm] = useState({
    title: '',
    class_id: '',
    min_age: '',
    max_age: '',
    birth_regi_number: '',
    admission_start_date: '',
    finish_date: '',
    result_date: '',
    fees: '0.00',
    description: ''
  });

  useEffect(() => {
    if (initialData) {
      const formatDate = (isoStr) => {
        if (!isoStr) return '';
        return new Date(isoStr).toISOString().split('T')[0];
      };

      setForm({
        title: initialData.title || '',
        class_id: initialData.class_id || '',
        min_age: initialData.min_age !== null ? initialData.min_age : '',
        max_age: initialData.max_age !== null ? initialData.max_age : '',
        birth_regi_number: initialData.birth_regi_number || '',
        admission_start_date: formatDate(initialData.admission_start_date),
        finish_date: formatDate(initialData.finish_date),
        result_date: formatDate(initialData.result_date),
        fees: initialData.fees !== undefined && initialData.fees !== null ? initialData.fees : '0.00',
        description: initialData.description || ''
      });
    } else {
      setForm({
        title: '',
        class_id: '',
        min_age: '',
        max_age: '',
        birth_regi_number: '',
        admission_start_date: '',
        finish_date: '',
        result_date: '',
        fees: '0.00',
        description: ''
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Circular Title *</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Class *</label>
        <select
          required
          value={form.class_id}
          onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value }))}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
        >
          <option value="">Select class...</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min Age (Yrs)</label>
          <input
            type="number"
            value={form.min_age}
            onChange={(e) => setForm((p) => ({ ...p, min_age: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max Age (Yrs)</label>
          <input
            type="number"
            value={form.max_age}
            onChange={(e) => setForm((p) => ({ ...p, max_age: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Birth Registration Code requirement</label>
        <input
          type="text"
          value={form.birth_regi_number}
          onChange={(e) => setForm((p) => ({ ...p, birth_regi_number: e.target.value }))}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Date *</label>
          <input
            type="date"
            required
            value={form.admission_start_date}
            onChange={(e) => setForm((p) => ({ ...p, admission_start_date: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finish Date *</label>
          <input
            type="date"
            required
            value={form.finish_date}
            onChange={(e) => setForm((p) => ({ ...p, finish_date: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Result publication date</label>
        <input
          type="date"
          value={form.result_date}
          onChange={(e) => setForm((p) => ({ ...p, result_date: e.target.value }))}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admission Fees (BDT) *</label>
        <input
          type="number"
          step="0.01"
          required
          value={form.fees}
          onChange={(e) => setForm((p) => ({ ...p, fees: e.target.value }))}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
        <TiptapEditor
          value={form.description}
          onChange={(val) => setForm((p) => ({ ...p, description: val }))}
        />
      </div>

      <div className="flex items-center justify-end gap-2.5 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
        >
          {submitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Circular'}
        </button>
      </div>
    </form>
  );
};

export default AdmissionCircularForm;
