'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { FiLayers, FiPlus, FiTrash2, FiEdit2, FiCalendar, FiClock, FiCheckCircle } from 'react-icons/fi';

import AdmissionCircularForm from '@/component/forms/AdmissionCircularForm';

const CircularsPage = () => {
  const [circulars, setCirculars] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState(null);

  // Circular Form states
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editCircularData, setEditCircularData] = useState(null);

  const fetchCirculars = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/admissions');
      const data = await res.json();
      if (data.success && data.paylod?.circulars) {
        setCirculars(data.paylod.circulars);
      }
    } catch (err) {
      toast.error('Failed to load admission circulars.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (data.success && data.paylod?.classes) {
        setClasses(data.paylod.classes);
      }
    } catch (err) {
      console.error('Failed to load classes.');
    }
  };

  useEffect(() => {
    fetchCirculars();
    fetchClasses();
  }, []);

  const handleSubmit = async (formValues) => {
    setSubmitting(true);
    try {
      const url = '/api/admin/admissions';
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? { ...formValues, id: editId } : formValues;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(editId ? 'Circular updated successfully!' : 'Circular created successfully!');
        setShowModal(false);
        setEditId(null);
        setEditCircularData(null);
        fetchCirculars();
      } else {
        throw new Error(data.error || 'Failed to save circular.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (c) => {
    setEditCircularData(c);
    setEditId(c.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm('Are you sure you want to delete this circular drive?');
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/admissions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Admission circular deleted.');
        fetchCirculars();
      } else {
        throw new Error(data.error || 'Failed to delete circular.');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePublishResults = async (id) => {
    const confirm = window.confirm(
      'Are you sure you want to publish results for this circular? This will automatically register all approved candidates, generate their registration credentials, send verification setup codes via email, and post a public notice.'
    );
    if (!confirm) return;

    setPublishingId(id);
    try {
      const res = await fetch('/api/admin/admissions/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admission_id: id })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || 'Results published successfully!');
        fetchCirculars();
      } else {
        throw new Error(data.error || 'Failed to publish results.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiLayers className="text-primary" /> Admission Circulars
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Setup and manage requirements, age brackets, timelines, and publishes for student intakes.
          </p>
        </div>

        <div>
          <Link
            href="/admin/students/admissions/circulars/new"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <FiPlus /> New Circular Drive
          </Link>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-400">Loading circulars...</span>
          </div>
        ) : circulars.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-355 text-5xl mb-3">📢</span>
            <h3 className="text-sm font-bold text-slate-600">No Active Circulars</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              Setup circular brackets to start accepting application profiles.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Circular Title</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Target Class</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Admission Fee</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Age Limits</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline Dates</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {circulars.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{c.title}</p>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">Birth Registration Requirement: {c.birth_regi_number || 'None'}</p>
                        {c.description && (
                          <div 
                            className="text-[10px] text-slate-400 mt-1 max-w-[250px] line-clamp-1 italic font-normal" 
                            dangerouslySetInnerHTML={{ __html: c.description.replace(/<[^>]*>/g, ' ') }} 
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-primary">
                      Class: {c.class_name}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-750">
                      BDT {parseFloat(c.fees || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-bold">
                      {c.min_age !== null || c.max_age !== null ? (
                        <span>{c.min_age || 0} to {c.max_age || '∞'} yrs</span>
                      ) : (
                        <span className="text-slate-400 font-medium">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] text-slate-500 flex flex-col gap-0.5 font-semibold">
                        <div>Starts: {new Date(c.admission_start_date).toLocaleDateString()}</div>
                        <div>Closes: {new Date(c.finish_date).toLocaleDateString()}</div>
                        {c.result_date && <div className="text-blue-600 font-bold">Result: {new Date(c.result_date).toLocaleDateString()}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        c.is_result_published
                          ? 'bg-green-50 text-green-600 border border-green-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {c.is_result_published ? 'Results Published' : 'Intake Open'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!c.is_result_published && (
                          <button
                            disabled={publishingId !== null}
                            onClick={() => handlePublishResults(c.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-50 text-primary rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold"
                            title="Publish Results"
                          >
                            <FiCheckCircle />
                            <span>Publish Results</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded transition-colors cursor-pointer"
                          title="Edit Circular"
                        >
                          <FiEdit2 className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition-colors cursor-pointer"
                          title="Delete Circular"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Circular Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl w-full max-w-md animate-scale-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-850 border-b border-slate-50 pb-2 mb-4">
              {editId ? 'Edit Admission Circular' : 'Create Admission Circular'}
            </h3>
            <AdmissionCircularForm
              initialData={editCircularData}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowModal(false);
                setEditId(null);
                setEditCircularData(null);
              }}
              classes={classes}
              submitting={submitting}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CircularsPage;
