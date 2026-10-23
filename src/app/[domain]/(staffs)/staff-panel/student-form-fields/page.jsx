'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiUser,
  FiUsers,
  FiMapPin,
  FiBookOpen,
  FiPlus,
  FiCheck,
  FiTrash2,
  FiRefreshCw,
  FiEye,
  FiLayers,
  FiActivity
} from 'react-icons/fi';

function StudentFormFieldsContent() {
  const params = useParams();
  const domain = params?.domain || '';
  const apiBase = domain ? `/api/${domain}` : '/api';

  const [activeSection, setActiveSection] = useState('personal'); // 'personal' | 'guardian' | 'address' | 'other'
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // New field modal state
  const [newField, setNewField] = useState({
    field_key: '',
    label: '',
    field_type: 'text',
    options: '',
    section: 'personal',
    is_required: false,
    placeholder: '',
    help_text: '',
    validation_regex: ''
  });

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/students/fields`);
      const data = await res.json();
      if (res.ok && data.success) {
        setFields(data.fields || []);
      } else {
        toast.error(data.error || 'Failed to load student form fields.');
      }
    } catch {
      toast.error('Network error loading modular fields.');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Toggle field required status
  const handleToggleRequired = async (field) => {
    const idKey = field.id || field.field_key;
    setSavingId(idKey);
    const updatedRequired = !field.is_required;
    try {
      const res = await fetch(`${apiBase}/staff/panel/students/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: field.id && field.id !== 'undefined' ? field.id : undefined,
          field_key: field.field_key,
          is_required: updatedRequired
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFields((prev) =>
          prev.map((f) =>
            (field.id && f.id === field.id) || (!field.id && f.field_key === field.field_key)
              ? { ...f, ...(data.field || {}), is_required: updatedRequired }
              : f
          )
        );
        toast.success(`'${field.label}' is now ${updatedRequired ? 'REQUIRED' : 'OPTIONAL'}.`);
      } else {
        toast.error(data.error || 'Failed to update field requirement.');
      }
    } catch {
      toast.error('Network error updating field.');
    } finally {
      setSavingId(null);
    }
  };

  // Toggle field active status
  const handleToggleActive = async (field) => {
    const idKey = field.id || field.field_key;
    setSavingId(idKey);
    const updatedActive = !field.is_active;
    try {
      const res = await fetch(`${apiBase}/staff/panel/students/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: field.id && field.id !== 'undefined' ? field.id : undefined,
          field_key: field.field_key,
          is_active: updatedActive
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFields((prev) =>
          prev.map((f) =>
            (field.id && f.id === field.id) || (!field.id && f.field_key === field.field_key)
              ? { ...f, ...(data.field || {}), is_active: updatedActive }
              : f
          )
        );
        toast.success(`'${field.label}' ${updatedActive ? 'activated' : 'deactivated'}.`);
      } else {
        toast.error(data.error || 'Failed to toggle status.');
      }
    } catch {
      toast.error('Network error updating status.');
    } finally {
      setSavingId(null);
    }
  };

  // Delete modular field
  const handleDeleteField = async (field) => {
    const id = field?.id;
    const label = field?.label || 'Field';
    const fieldKey = field?.field_key;
    if (!confirm(`Are you sure you want to delete '${label}'?`)) return;

    if (!id && !fieldKey) return;

    try {
      const params = new URLSearchParams();
      if (id && id !== 'undefined') params.set('id', id);
      if (fieldKey) params.set('field_key', fieldKey);

      const url = `${apiBase}/staff/panel/students/fields?${params.toString()}`;
      const res = await fetch(url, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFields((prev) => prev.filter((f) => (id ? f.id !== id : f.field_key !== fieldKey)));
        toast.success(`Field '${label}' removed successfully.`);
      } else {
        toast.error(data.error || 'Failed to delete field.');
      }
    } catch {
      toast.error('Network error deleting field.');
    }
  };


  // Initialize or reset defaults
  const handleInitializeDefaults = async () => {
    if (!confirm('Initialize standard default modular student fields? Existing fields will be updated.')) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/panel/students/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize_defaults' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Default modular student fields initialized successfully!');
        fetchFields();
      } else {
        toast.error(data.error || 'Failed to initialize defaults.');
        setLoading(false);
      }
    } catch {
      toast.error('Network error initializing defaults.');
      setLoading(false);
    }
  };

  // Create new field submit
  const handleCreateField = async (e) => {
    e.preventDefault();
    if (!newField.label.trim()) {
      toast.error('Field label is required.');
      return;
    }

    const autoKey = (newField.field_key || newField.label)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    let parsedOptions = [];
    if (newField.field_type === 'select' && newField.options.trim()) {
      parsedOptions = newField.options.split(',').map((o) => o.trim()).filter(Boolean);
    }

    try {
      const res = await fetch(`${apiBase}/staff/panel/students/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_key: autoKey,
          label: newField.label.trim(),
          field_type: newField.field_type,
          options: parsedOptions,
          section: newField.section,
          is_required: newField.is_required,
          placeholder: newField.placeholder.trim(),
          help_text: newField.help_text.trim(),
          validation_regex: newField.validation_regex.trim() || null,
          sort_order: fields.length + 1
        })
      });


      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Custom field '${newField.label}' added!`);
        setShowAddModal(false);
        setNewField({
          field_key: '',
          label: '',
          field_type: 'text',
          options: '',
          section: activeSection,
          is_required: false,
          placeholder: '',
          help_text: '',
          validation_regex: ''
        });
        fetchFields();
      } else {
        toast.error(data.error || 'Failed to add custom field.');
      }
    } catch {
      toast.error('Network error creating field.');
    }
  };

  const sectionsConfig = [
    { key: 'personal', label: '1. Student Profile', sub: 'website_student_info', icon: FiUser },
    { key: 'guardian', label: '2. Student Guardians', sub: 'website_student_guardians', icon: FiUsers },
    { key: 'address', label: '3. Student Address', sub: 'website_student_addresses', icon: FiMapPin },
    { key: 'other', label: '4. Other / Medical', sub: 'custom_fields', icon: FiActivity }
  ];

  const currentSectionFields = fields.filter((f) => {
    const s = f.section || 'personal';
    if (activeSection === 'other') {
      return !['personal', 'guardian', 'address'].includes(s);
    }
    return s === activeSection;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            <FiLayers className="w-3.5 h-3.5" /> Student Schema Configuration
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-slate-900 dark:text-white">
            Student Form Requirements & Fields
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure what fields are mandatory or optional across student personal identity, guardians information, and residential addresses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <FiEye className="w-4 h-4" />
            <span>{previewMode ? 'Close Preview' : 'Form Preview'}</span>
          </button>

          <button
            onClick={handleInitializeDefaults}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            title="Reset to default standard fields"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Sync Defaults</span>
          </button>

          <button
            onClick={() => {
              setNewField((prev) => ({ ...prev, section: activeSection }));
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Custom Field</span>
          </button>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sectionsConfig.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.key;
          const secFields = fields.filter((f) => {
            const s = f.section || 'personal';
            if (sec.key === 'other') return !['personal', 'guardian', 'address'].includes(s);
            return s === sec.key;
          });
          const count = secFields.length;
          const requiredCount = secFields.filter((f) => f.is_required && f.is_active).length;

          return (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-primary'}`} />
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {requiredCount} req / {count} total
                </span>
              </div>
              <h3 className="font-semibold text-sm mt-3">{sec.label}</h3>
              <p className={`text-[11px] font-mono mt-0.5 truncate ${isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                {sec.sub}
              </p>
            </button>
          );
        })}
      </div>

      {/* Preview Mode Drawer */}
      {previewMode && (
        <div className="p-6 bg-slate-100 dark:bg-slate-900 border border-primary/30 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FiEye className="text-primary" /> Student Registration Live Form Preview: {activeSection.toUpperCase()}
            </h3>
            <span className="text-xs text-slate-500">Previewing active student requirements</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentSectionFields.filter((f) => f.is_active).map((f) => (
              <div key={f.id || f.field_key} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                  {f.label} {f.is_required && <span className="text-red-500">*</span>}
                </label>
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-400">
                  {f.placeholder || `Input for ${f.label}`}
                </div>
                {f.help_text && <p className="text-[10px] text-slate-400">{f.help_text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fields Management Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Configured Fields: {sectionsConfig.find((s) => s.key === activeSection)?.label}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click &quot;Required&quot; badge to mandate whether students/staff must provide this attribute.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {currentSectionFields.length} Fields in this Section
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading student schema configuration...
          </div>
        ) : currentSectionFields.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-xs text-slate-400">No fields configured for this section yet.</p>
            <button
              onClick={handleInitializeDefaults}
              className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl shadow-xs cursor-pointer"
            >
              Initialize Default Fields
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Field Label</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Placeholder / Help Text</th>
                  <th className="py-3.5 px-4 text-center">Required Status</th>
                  <th className="py-3.5 px-4 text-center">Active Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {currentSectionFields.map((field) => (
                  <tr key={field.id || field.field_key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{field.label}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                        {field.field_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="text-slate-700 dark:text-slate-300 truncate">{field.placeholder || '—'}</div>
                      {field.help_text && <div className="text-[10px] text-slate-400 truncate">{field.help_text}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleRequired(field)}
                        disabled={savingId === field.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                          field.is_required
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="Click to toggle required requirement"
                      >
                        {field.is_required ? (
                          <>
                            <FiCheck className="w-3.5 h-3.5 text-rose-500" />
                            <span>REQUIRED</span>
                          </>
                        ) : (
                          <span>OPTIONAL</span>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(field)}
                        disabled={savingId === field.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                          field.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {field.is_active ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteField(field)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer"
                        title="Delete Field"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* Add Custom Field Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                Add Custom Modular Student Field
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateField} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Section *
                </label>
                <select
                  value={newField.section}
                  onChange={(e) => setNewField({ ...newField, section: e.target.value })}
                  className="input-style w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="personal">1. Student Profile (website_student_info)</option>
                  <option value="guardian">2. Student Guardians (website_student_guardians)</option>
                  <option value="address">3. Student Address (website_student_addresses)</option>
                  <option value="medical">4. Medical / Health Information</option>
                  <option value="other">5. Other / General Attributes</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Field Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Contact Relation"
                  value={newField.label}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    const key = lbl.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                    setNewField({ ...newField, label: lbl, field_key: key });
                  }}
                  className="input-style w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Field Type *
                  </label>
                  <select
                    value={newField.field_type}
                    onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                    className="input-style w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="text">Text (Single Line)</option>
                    <option value="textarea">Textarea (Multi-Line)</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown Select</option>
                    <option value="boolean">Boolean Switch</option>
                    <option value="file">File Upload</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    placeholder="Enter placeholder..."
                    value={newField.placeholder}
                    onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                    className="input-style w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {newField.field_type === 'select' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dropdown Options (comma separated) *
                  </label>
                  <input
                    type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    value={newField.options}
                    onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                    className="input-style w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Help Text / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Additional instructions for student setup"
                  value={newField.help_text}
                  onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
                  className="input-style w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="req_checkbox_student"
                  checked={newField.is_required}
                  onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                  className="rounded border-slate-300 text-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="req_checkbox_student" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Mandate as REQUIRED field for student registration & profile
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  Save Modular Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentFormFieldsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Schema Panel...</div>}>
      <StudentFormFieldsContent />
    </Suspense>
  );
}
