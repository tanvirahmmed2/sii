'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiAward } from 'react-icons/fi';
import GradeCreateForm from '@/component/forms/GradeCreateForm';
import GradeEditForm from '@/component/forms/GradeEditForm';

const AdminGradesPage = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);

  const fetchGrades = async () => {
    try {
      const response = await fetch('/api/grades');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch grades.');
      }
      setGrades(data.paylod.grades || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const response = await fetch('/api/grades');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch grades.');
        }
        if (!ignore) {
          setGrades(data.paylod.grades || []);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleDeleteGrade = async (gradeId, letterGrade) => {
    const confirm = window.confirm(
      `Are you sure you want to delete grade "${letterGrade}"?`
    );
    if (!confirm) return;

    try {
      const response = await fetch(`/api/grades/${gradeId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete grade.');
      }

      toast.success(data.message || 'Grade range deleted successfully!');
      setGrades(grades.filter((g) => g.grade_id !== gradeId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStartEdit = (grade) => {
    setEditingGrade(grade);
    setShowAddForm(false);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiAward className="text-primary" /> Grade Scale Setup
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure letter grades and their corresponding minimum and maximum mark thresholds.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingGrade(null);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer animate-pulse-slow"
        >
          {showAddForm ? (
            <>
              <FiX className="text-lg" /> Close
            </>
          ) : (
            <>
              <FiPlus className="text-lg" /> Add Grade Scale
            </>
          )}
        </button>
      </div>

      {/* Add Grade Form component */}
      {showAddForm && !editingGrade && (
        <GradeCreateForm
          onSuccess={() => {
            fetchGrades();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Grade Form component */}
      {editingGrade && (
        <GradeEditForm
          grade={editingGrade}
          onSuccess={() => {
            fetchGrades();
            setEditingGrade(null);
          }}
          onCancel={() => setEditingGrade(null)}
        />
      )}

      {/* Grades Table */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">
            Configure Grading Rules ({grades.length} Grades Defined)
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-400">Loading grade scale...</span>
          </div>
        ) : grades.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-5xl mb-3">🎓</span>
            <h3 className="text-sm font-bold text-slate-600">No Grade Scale Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              Set up grade scale records so marks can be automatically compiled into transcripts.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Letter Grade
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Min Mark Threshold (%)
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Max Mark Threshold (%)
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Grade Point
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.map((grade) => (
                  <tr key={grade.grade_id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-primary border border-emerald-200/60 rounded-xl flex items-center justify-center font-semibold text-sm shadow-xs">
                          {grade.letter_grade}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Grade {grade.letter_grade}</p>
                          <span className="text-[10px] text-slate-450 font-semibold block text-slate-400">
                            ID: #{grade.grade_id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-700">
                        {parseFloat(grade.min_mark).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-700">
                        {parseFloat(grade.max_mark).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                        {grade.point !== undefined && grade.point !== null ? parseFloat(grade.point).toFixed(2) : '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleStartEdit(grade)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-50 text-primary rounded-xl transition-colors duration-150 inline-flex items-center justify-center cursor-pointer"
                        title="Edit Grade"
                      >
                        <FiEdit2 className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleDeleteGrade(grade.grade_id, grade.letter_grade)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors duration-150 inline-flex items-center justify-center cursor-pointer"
                        title="Delete Grade"
                      >
                        <FiTrash2 className="text-sm" />
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

export default AdminGradesPage;
