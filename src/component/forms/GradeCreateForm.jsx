'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAward, FiPercent, FiPlusCircle, FiStar } from 'react-icons/fi';

const GradeCreateForm = ({ onSuccess, onCancel }) => {
  const [letterGrade, setLetterGrade] = useState('');
  const [minMark, setMinMark] = useState('');
  const [maxMark, setMaxMark] = useState('');
  const [point, setPoint] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!letterGrade || minMark === '' || maxMark === '' || point === '') {
      toast.error('All fields are required.');
      return;
    }

    const min = parseFloat(minMark);
    const max = parseFloat(maxMark);
    const parsedPoint = parseFloat(point);

    if (isNaN(min) || isNaN(max) || isNaN(parsedPoint) || min < 0 || max < 0 || min > 100 || max > 100 || parsedPoint < 0) {
      toast.error('Marks must be numeric values between 0 and 100, and Grade Point must be non-negative.');
      return;
    }

    if (min > max) {
      toast.error('Minimum mark cannot be greater than maximum mark.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter_grade: letterGrade,
          min_mark: min,
          max_mark: max,
          point: parsedPoint
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create grade.');
      }

      toast.success(data.message || 'Grade range created successfully!');
      setLetterGrade('');
      setMinMark('');
      setMaxMark('');
      setPoint('');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.02)] animate-fade-up">
      <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
        <FiPlusCircle className="text-primary" /> Add New Grade Range
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiAward className="text-slate-400" /> Letter Grade
          </label>
          <input
            type="text"
            required
            maxLength={5}
            placeholder="e.g. A+"
            value={letterGrade}
            onChange={(e) => setLetterGrade(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiPercent className="text-slate-400" /> Minimum Mark (%)
          </label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            max="100"
            placeholder="e.g. 80.00"
            value={minMark}
            onChange={(e) => setMinMark(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiPercent className="text-slate-400" /> Maximum Mark (%)
          </label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            max="100"
            placeholder="e.g. 100.00"
            value={maxMark}
            onChange={(e) => setMaxMark(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FiStar className="text-slate-400" /> Grade Point
          </label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            max="10"
            placeholder="e.g. 5.00"
            value={point}
            onChange={(e) => setPoint(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
          />
        </div>

        <div className="flex justify-end gap-3 sm:col-span-2 lg:col-span-4 mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="loader loader-sm loader-white" />
            ) : (
              'Create Grade'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GradeCreateForm;
