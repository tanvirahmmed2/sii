'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiGrid, FiLayers, FiUsers, FiMapPin } from 'react-icons/fi';
import SectionCreateForm from '@/component/forms/SectionCreateForm';
import SectionEditForm from '@/component/forms/SectionEditForm';

const AdminSectionsPage = () => {
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  const fetchData = async () => {
    try {
      // Fetch sections
      const sectionsRes = await fetch('/api/sections');
      const sectionsData = await sectionsRes.json();
      if (!sectionsRes.ok) throw new Error(sectionsData.error || 'Failed to fetch sections.');
      
      // Fetch classes
      const classesRes = await fetch('/api/classes');
      const classesData = await classesRes.json();
      if (!classesRes.ok) throw new Error(classesData.error || 'Failed to fetch classes.');

      setSections(sectionsData.paylod.sections || []);
      setClasses(classesData.paylod.classes || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteSection = async (id, sectionName, className) => {
    const confirm = window.confirm(
      `Are you sure you want to delete section "${sectionName}" under "${className}"?`
    );
    if (!confirm) return;

    try {
      const response = await fetch(`/api/sections/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete section.');
      }

      toast.success(data.message || 'Section deleted successfully!');
      setSections(sections.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStartEdit = (sec) => {
    setEditingSection(sec);
    setShowAddForm(false);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiGrid className="text-primary" /> Section Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, edit, and delete classroom sections under classes.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingSection(null);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-lg" /> Close
            </>
          ) : (
            <>
              <FiPlus className="text-lg" /> Add Section
            </>
          )}
        </button>
      </div>

      {/* Add Section Form component */}
      {showAddForm && !editingSection && (
        <SectionCreateForm
          classes={classes}
          onSuccess={() => {
            fetchData();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Section Form component */}
      {editingSection && (
        <SectionEditForm
          section={editingSection}
          classes={classes}
          onSuccess={() => {
            fetchData();
            setEditingSection(null);
          }}
          onCancel={() => setEditingSection(null)}
        />
      )}

      {/* Sections Registry Table */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">
            Active Sections Registry ({sections.length})
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-400">Loading sections...</span>
          </div>
        ) : sections.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-355 text-5xl mb-3">📂</span>
            <h3 className="text-sm font-bold text-slate-600">No Sections Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              Create section branches to organize students inside academic classes.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Section Name
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Assigned Class
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Room Number
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Capacity limit
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sections.map((sec) => (
                  <tr key={sec.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 text-primary border border-emerald-200/60 rounded-xl flex items-center justify-center font-bold text-sm">
                          {sec.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{sec.name}</p>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            DB Key: {sec.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                        <FiLayers className="text-xs text-blue-400" />
                        {sec.class_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 font-semibold flex items-center gap-1 text-slate-600">
                        <FiMapPin className="text-slate-400" />
                        {sec.room_number || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 font-semibold flex items-center gap-1 text-slate-600">
                        <FiUsers className="text-slate-400" />
                        {sec.capacity} students
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleStartEdit(sec)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-50 text-primary rounded-xl transition-colors duration-150 inline-flex items-center justify-center cursor-pointer"
                        title="Edit Section"
                      >
                        <FiEdit2 className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(sec.id, sec.name, sec.class_name)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors duration-150 inline-flex items-center justify-center cursor-pointer"
                        title="Delete Section"
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

export default AdminSectionsPage;
