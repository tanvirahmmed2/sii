'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiLayers } from 'react-icons/fi';
import ClassCreateForm from '@/component/forms/ClassCreateForm';
import ClassEditForm from '@/component/forms/ClassEditForm';
import RichTextDisplay from '@/component/helper/RichTextDisplay';

const AdminClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classes.');
      }
      setClasses(data.paylod?.classes || data.payload?.classes || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleDeleteClass = async (id, className) => {
    const confirm = window.confirm(
      `Are you sure you want to delete "${className}"? This will delete all sections under this class too!`
    );
    if (!confirm) return;

    try {
      const response = await fetch(`/api/classes/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete class.');
      }

      toast.success(data.message || 'Class deleted successfully!');
      setClasses(classes.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStartEdit = (cls) => {
    setEditingClass(cls);
    setShowAddForm(false);
  };

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiLayers className="text-primary" /> Academic Class Setup
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, edit, and manage institutional academic classes.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingClass(null);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-sm" /> Close Form
            </>
          ) : (
            <>
              <FiPlus className="text-sm" /> Add Class
            </>
          )}
        </button>
      </div>

      {showAddForm && !editingClass && (
        <ClassCreateForm
          onSuccess={() => {
            fetchClasses();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingClass && (
        <ClassEditForm
          cls={editingClass}
          onSuccess={() => {
            fetchClasses();
            setEditingClass(null);
          }}
          onCancel={() => setEditingClass(null)}
        />
      )}

      {/* Classes List Registry Table */}
      <div className="w-full bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Active Classes <span className="text-primary bg-primary-lightpx-2 py-0.5 rounded-full border border-primary-light font-bold text-[10px] ml-1">({classes.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Loading classes...</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-3xl mb-2">🎓</span>
            <h3 className="text-xs font-bold text-slate-700">No Classes Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-60">
              Create academic classes to structure your sections.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Class Name</th>
                  <th className="px-4 py-3">Numeric ID</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Max Seats</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-slate-800">{cls.name}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                        {cls.numeric_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-primary bg-primary-lightborder border-primary-light px-2.5 py-0.5 rounded-full">
                        {cls.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded">
                        {cls.max_seats || 40} Seats
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                      {cls.description ? (
                        <RichTextDisplay html={cls.description} className="line-clamp-1 text-xs" />
                      ) : (
                        <span className="text-slate-400 italic">No description</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                      <button
                        onClick={() => handleStartEdit(cls)}
                        className="p-1.5 bg-primary-lighthover:bg-emerald-100 text-primary border border-primary-light rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Edit Class"
                      >
                        <FiEdit2 className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Delete Class"
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

export default AdminClassesPage;
