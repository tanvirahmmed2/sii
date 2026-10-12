'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiAward, FiPercent, FiStar } from 'react-icons/fi';

const GradeEditForm = ({ grade, onSuccess, onCancel }) => {
  const [letterGrade, setLetterGrade] = useState(grade.letter_grade || '');
  const [minMark, setMinMark] = useState(grade.min_mark !== undefined && grade.min_mark !== null ? grade.min_mark : '');
  const [maxMark, setMaxMark] = useState(grade.max_mark !== undefined && grade.max_mark !== null ? grade.max_mark : '');
  const [point, setPoint] = useState(grade.point !== undefined && grade.point !== null ? grade.point : '');
  const [updating, setUpdating] = useState(false);

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

    setUpdating(true);
    try {
      const response = await fetch(`/api/grades/${grade.grade_id}`, {
        method: 'PUT',
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
        throw new Error(data.error || 'Failed to update grade.');
      }

      toast.success(data.message || 'Grade range updated successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="w-full bg-white border border-primary-light rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(59,130,246,0.02)] animate-fade-up">
      <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
        <FiEdit2 className="text-primary" /> Edit Grade Range: {grade.letter_grade}
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
            value={letterGrade}
            onChange={(e) => setLetterGrade(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
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
            value={minMark}
            onChange={(e) => setMinMark(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
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
            value={maxMark}
            onChange={(e) => setMaxMark(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
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
            value={point}
            onChange={(e) => setPoint(e.target.value)}
            disabled={updating}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5"
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
            disabled={updating}
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {updating ? (
              <div className="loader loader-sm loader-white" />
            ) : (
              'Update Grade'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GradeEditForm;
