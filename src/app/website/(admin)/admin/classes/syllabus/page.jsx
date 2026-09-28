'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiLayers, FiFileText, FiDownload, FiExternalLink } from 'react-icons/fi';
import SyllabusCreateForm from '@/component/forms/SyllabusCreateForm';
import SyllabusEditForm from '@/component/forms/SyllabusEditForm';

const AdminSyllabusPage = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const [syllabuses, setSyllabuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSyllabus, setEditingSyllabus] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch('/api/classes');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setClasses(data.paylod.classes || []);
      } catch (err) {
        toast.error('Failed to retrieve academic classes.');
      }
    };
    fetchClasses();
  }, []);

  // Fetch syllabuses based on selected class
  const fetchSyllabuses = async () => {
    setLoading(true);
    try {
      let url = '/api/syllabuses';
      if (selectedClassId) {
        url += `?class_id=${selectedClassId}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSyllabuses(data.paylod.syllabuses || []);
    } catch (err) {
      toast.error('Failed to load syllabus records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabuses();
  }, [selectedClassId]);

  const handleDeleteSyllabus = async (id, syllabusName) => {
    const confirm = window.confirm(
      `Are you sure you want to delete the syllabus: "${syllabusName}"? This action cannot be undone.`
    );
    if (!confirm) return;

    try {
      const response = await fetch(`/api/syllabuses/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete syllabus.');
      }

      toast.success(data.message || 'Syllabus entry deleted successfully!');
      fetchSyllabuses();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStartEdit = (syllabus) => {
    setEditingSyllabus(syllabus);
    setShowAddForm(false);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
     
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiFileText className="text-primary" /> Syllabus Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish, update, and manage syllabus course catalogs for subjects and classes.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingSyllabus(null);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-lg" /> Close Form
            </>
          ) : (
            <>
              <FiPlus className="text-lg" /> Add Syllabus
            </>
          )}
        </button>
      </div>

      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiLayers /> Filter by Academic Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 cursor-pointer"
          >
            <option value="">All Academic Classes...</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {showAddForm && !editingSyllabus && (
        <SyllabusCreateForm
          initialClassId={selectedClassId}
          onSuccess={() => {
            fetchSyllabuses();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingSyllabus && (
        <SyllabusEditForm
          syllabus={editingSyllabus}
          onSuccess={() => {
            fetchSyllabuses();
            setEditingSyllabus(null);
          }}
          onCancel={() => setEditingSyllabus(null)}
        />
      )}

      <div className="w-full bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            Published Syllabus Records ({syllabuses.length})
          </h2>
        </div>

        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-400">Loading syllabus list...</span>
          </div>
        ) : syllabuses.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-6xl mb-4">📖</span>
            <h3 className="text-sm font-bold text-slate-600">No Syllabuses Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-72">
              {selectedClassId 
                ? 'No syllabus records uploaded yet for the selected class.' 
                : 'No syllabus records uploaded yet. Click the add button to publish one.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Syllabus Name
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Term / Title
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Subject & Class
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Document Link
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {syllabuses.map((sy) => (
                  <tr key={sy.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 text-primary border border-emerald-200/60 rounded-xl flex items-center justify-center">
                          <FiFileText className="text-lg" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{sy.name}</p>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            ID: {sy.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                        {sy.title}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs">
                        <p className="font-bold text-slate-700">{sy.subject_name}</p>
                        <span className="text-slate-450 font-semibold text-slate-400">
                          Class: {sy.class_name} ({sy.class_code})
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={sy.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-50 border border-emerald-200/60 text-primary text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer"
                      >
                        <FiExternalLink className="text-sm" /> View Document
                      </a>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleStartEdit(sy)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-50 text-primary rounded-xl transition-colors duration-150 inline-flex items-center justify-center cursor-pointer"
                        title="Edit Syllabus"
                      >
                        <FiEdit2 className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleDeleteSyllabus(sy.id, sy.name)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors duration-150 inline-flex items-center justify-center cursor-pointer"
                        title="Delete Syllabus"
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

export default AdminSyllabusPage;
