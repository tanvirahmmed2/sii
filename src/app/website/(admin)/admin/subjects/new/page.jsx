'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiBook } from 'react-icons/fi';
import SubjectCreateForm from '@/component/forms/SubjectCreateForm';
import SubjectEditForm from '@/component/forms/SubjectEditForm';

const AdminSubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subjects.');
      }
      setSubjects(data.paylod?.subjects || data.payload?.subjects || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleDeleteSubject = async (id, subjectName) => {
    const confirm = window.confirm(
      `Are you sure you want to delete subject "${subjectName}"? This will delete all class/section mappings for this subject as well!`
    );
    if (!confirm) return;

    try {
      const response = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete subject.');
      }

      toast.success(data.message || 'Subject deleted successfully!');
      setSubjects(subjects.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStartEdit = (sub) => {
    setEditingSubject(sub);
    setShowAddForm(false);
  };

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiBook className="text-emerald-600" /> Subject Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, edit, and delete academic subjects across the curriculum.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingSubject(null);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-sm" /> Close Form
            </>
          ) : (
            <>
              <FiPlus className="text-sm" /> Add Subject
            </>
          )}
        </button>
      </div>

      {/* Add Subject Form component */}
      {showAddForm && !editingSubject && (
        <SubjectCreateForm
          onSuccess={() => {
            fetchSubjects();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Subject Form component */}
      {editingSubject && (
        <SubjectEditForm
          subject={editingSubject}
          onSuccess={() => {
            fetchSubjects();
            setEditingSubject(null);
          }}
          onCancel={() => setEditingSubject(null)}
        />
      )}

      {/* Subjects Registry Table */}
      <div className="w-full bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Active Subjects <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-bold text-[10px] ml-1">({subjects.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading subjects...</span>
          </div>
        ) : subjects.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-3xl mb-2">📚</span>
            <h3 className="text-xs font-bold text-slate-700">No Subjects Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              Add subjects to connect them with classes, sections, and teachers.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Subject Name</th>
                  <th className="px-4 py-3">Subject Code</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-slate-800">{sub.name}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                        {sub.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                      <button
                        onClick={() => handleStartEdit(sub)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Edit Subject"
                      >
                        <FiEdit2 className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sub.id, sub.name)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Delete Subject"
                      >
                        <FiTrash2 className="text-xs" />
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

export default AdminSubjectsPage;
