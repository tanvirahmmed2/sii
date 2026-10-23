'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentDataPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Custom Columns & Requirements State
  const [customColumns, setCustomColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [savingColumn, setSavingColumn] = useState(false);

  // New custom column form
  const [newColumn, setNewColumn] = useState({
    field_key: '',
    label: '',
    field_type: 'text',
    section: 'personal',
    is_required: false,
    placeholder: '',
    options: '',
    help_text: ''
  });

  // Fetch configured form fields/custom columns
  const fetchCustomColumns = useCallback(async () => {
    setLoadingColumns(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/students/fields'));
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.fields)) {
        setCustomColumns(data.fields.filter((f) => f.is_active !== false));
      }
    } catch {
      console.warn('Failed to load custom columns.');
    } finally {
      setLoadingColumns(false);
    }
  }, [getApiEndpoint]);

  useEffect(() => {
    fetchCustomColumns();
  }, [fetchCustomColumns]);

  const handleFilter = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const params = new URLSearchParams({
        session_id: sessionId,
        class_id: classId,
      });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        setStudents(data.payload?.students || []);
        if (Array.isArray(data.payload?.fields)) {
          setCustomColumns(data.payload.fields.filter((f) => f.is_active !== false));
        }
        setHasFiltered(true);
        toast.success(`Loaded ${(data.payload?.students || []).length} students.`);
      } else {
        toast.error(data.error || 'Failed to fetch students.');
      }
    } catch (err) {
      toast.error('Network error loading students.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setSelectedStudent(null);
    setDetailData(null);
  };

  const handleViewDetails = async (student) => {
    setSelectedStudent(student);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/students?id=${student.id}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setDetailData(data.payload);
      } else {
        toast.error(data.error || 'Failed to fetch student details.');
      }
    } catch {
      toast.error('Error loading details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Create new custom column (used for both student table & admission intake)
  const handleCreateColumn = async (e) => {
    e.preventDefault();
    if (!newColumn.label.trim()) {
      toast.error('Column label is required.');
      return;
    }

    const autoKey = newColumn.field_key.trim()
      ? newColumn.field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : newColumn.label.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    let parsedOpts = [];
    if (newColumn.field_type === 'select' && newColumn.options) {
      parsedOpts = newColumn.options
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    }

    setSavingColumn(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/students/fields'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_key: autoKey,
          label: newColumn.label.trim(),
          field_type: newColumn.field_type,
          section: newColumn.section,
          is_required: Boolean(newColumn.is_required),
          placeholder: newColumn.placeholder.trim(),
          help_text: newColumn.help_text.trim(),
          options: parsedOpts,
          is_active: true
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Custom column '${newColumn.label}' created! Now active in student table & admissions.`);
        setNewColumn({
          field_key: '',
          label: '',
          field_type: 'text',
          section: 'personal',
          is_required: false,
          placeholder: '',
          options: '',
          help_text: ''
        });
        await fetchCustomColumns();
        setShowColumnModal(false);
      } else {
        toast.error(data.error || 'Failed to create custom column.');
      }
    } catch {
      toast.error('Network error saving custom column.');
    } finally {
      setSavingColumn(false);
    }
  };

  // Toggle column requirement
  const handleToggleRequirement = async (col) => {
    const nextReq = !col.is_required;
    try {
      const res = await fetch(getApiEndpoint('staff/panel/students/fields'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: col.id && col.id !== 'undefined' ? col.id : undefined,
          field_key: col.field_key,
          is_required: nextReq
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`'${col.label}' is now ${nextReq ? 'REQUIRED' : 'OPTIONAL'} for student registration & admission.`);
        setCustomColumns((prev) =>
          prev.map((c) =>
            (col.id && c.id === col.id) || (!col.id && c.field_key === col.field_key)
              ? { ...c, ...(data.field || {}), is_required: nextReq }
              : c
          )
        );
      } else {
        toast.error(data.error || 'Failed to update requirement.');
      }
    } catch {
      toast.error('Network error updating requirement.');
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.registration_no?.toLowerCase().includes(term) ||
      s.roll_no?.toLowerCase().includes(term) ||
      s.student_unique_id?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term)
    );
  });

  // Extract display value for custom column
  const getColValue = (student, colKey) => {
    if (!student) return '—';
    if (student[colKey] !== undefined && student[colKey] !== null && String(student[colKey]).trim() !== '') {
      return String(student[colKey]);
    }
    if (student.info_data && student.info_data[colKey] !== undefined && student.info_data[colKey] !== null) {
      return String(student.info_data[colKey]);
    }
    if (student.guardian_data && student.guardian_data[colKey] !== undefined && student.guardian_data[colKey] !== null) {
      return String(student.guardian_data[colKey]);
    }
    if (student.address_data && student.address_data[colKey] !== undefined && student.address_data[colKey] !== null) {
      return String(student.address_data[colKey]);
    }
    return '—';
  };

  // Extra custom columns to show in the table (excluding core columns already rendered)
  const coreKeys = new Set(['name', 'registration_no', 'roll_no', 'student_unique_id', 'email', 'class_id', 'section_id', 'session_id']);
  const tableCustomColumns = customColumns.filter((col) => !coreKeys.has(col.field_key));

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Students Data Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filter rosters, configure required student information, and manage custom columns synced with admissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowColumnModal(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <span>⚙️</span>
            <span>Custom Columns &amp; Requirements</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200">
              {tableCustomColumns.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={handleFilter}
        onReset={handleReset}
        loading={loading}
        title="Filter Students Data"
        description="Select academic session, class, and section to load enrolled students"
      />

      {/* Data display: show after filter only */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🎓"
          title="Filter by Session, Class & Section to View Data"
          description="Select an Academic Session and Class in the filter toolbar above, then click 'View Data' to display students."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
          {/* Active Filter Badge & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Filtered Roster:
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/20">
                {filterInfo?.sessionName}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Class: {filterInfo?.className}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Section: {filterInfo?.sectionName}
              </span>
              <span className="text-xs text-slate-400">
                ({filteredStudents.length} of {students.length} students)
              </span>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search by Reg, Roll, Name, Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* IN-PAGE STUDENT DETAILS VIEW */}
          {selectedStudent && (
            <div className="bg-white dark:bg-slate-900 border-2 border-primary/30 rounded-xl p-5 space-y-4 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Student Record Details
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedStudent.registration_no} • {selectedStudent.student_unique_id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  ✕ Close Details
                </button>
              </div>

              {detailLoading ? (
                <div className="py-12 flex justify-center items-center">
                  <div className="loader loader-sm" />
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Academic & Identity Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Registration No</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">{selectedStudent.registration_no}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Roll Number</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">{selectedStudent.roll_no || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Class &amp; Section</span>
                      <span className="text-slate-900 dark:text-white">{selectedStudent.class_name} {selectedStudent.section_name ? `(${selectedStudent.section_name})` : ''}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Session</span>
                      <span className="text-slate-900 dark:text-white">{selectedStudent.session_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Student Name</span>
                      <span className="text-slate-900 dark:text-white">{selectedStudent.name || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Email</span>
                      <span className="text-slate-900 dark:text-white font-mono">{selectedStudent.email || 'Not provided'}</span>
                    </div>
                  </div>

                  {/* Address Information */}
                  {detailData?.address && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Address Information</span>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Present:</strong> {detailData.address.present_address || '—'}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Permanent:</strong> {detailData.address.permanent_address || '—'}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {[detailData.address.upazila, detailData.address.district, detailData.address.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Guardian Information */}
                  {detailData?.guardian && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Guardian Information</span>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Father:</strong> {detailData.guardian.father_name || '—'} ({detailData.guardian.father_phone || 'No phone'})
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Mother:</strong> {detailData.guardian.mother_name || '—'} ({detailData.guardian.mother_phone || 'No phone'})
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Primary Guardian:</strong> {detailData.guardian.guardian_name || '—'} ({detailData.guardian.guardian_relation || '—'}) • {detailData.guardian.guardian_phone || '—'}
                      </p>
                    </div>
                  )}

                  {/* Custom Modular Fields Box */}
                  {tableCustomColumns.length > 0 && (
                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60 space-y-2">
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-400 block uppercase font-bold tracking-wider">
                        Required &amp; Custom Student Fields
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {tableCustomColumns.map((col) => (
                          <div key={col.id || col.field_key} className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                              {col.label} {col.is_required && <span className="text-red-500">*</span>}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {getColValue(selectedStudent, col.field_key)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Student Table with Dynamic Custom Columns */}
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No students found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Reg No</th>
                    <th className="px-3 py-2.5">Roll</th>
                    <th className="px-3 py-2.5">Full Name</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Class / Section</th>
                    {/* Dynamic Custom Column Headers */}
                    {tableCustomColumns.map((col) => (
                      <th key={col.id || col.field_key} className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.is_required && (
                            <span className="text-red-500 text-[11px]" title="Required for intake">*</span>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 font-mono font-medium text-slate-900 dark:text-white">
                        {s.registration_no}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {s.roll_no || '—'}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                        {s.name || <span className="text-slate-400 italic">Not set</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {s.email || <span className="text-slate-400 italic">None</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {s.class_name} {s.section_name ? `(${s.section_name})` : ''}
                      </td>
                      {/* Dynamic Custom Column Values */}
                      {tableCustomColumns.map((col) => (
                        <td key={col.id || col.field_key} className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                          {getColValue(s, col.field_key)}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.verification_status === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : s.verification_status === 'submitted'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {s.verification_status === 'pending_setup' ? 'Pending Setup' : s.verification_status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            selectedStudent?.id === s.id
                              ? setSelectedStudent(null)
                              : handleViewDetails(s)
                          }
                          className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer transition ${
                            selectedStudent?.id === s.id
                              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {selectedStudent?.id === s.id ? '✕ Close Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CUSTOM COLUMN & REQUIRED FIELDS MANAGER MODAL */}
      {showColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>⚙️</span>
                  <span>Student Columns &amp; Admission Intake Requirements</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Allowed staff can add custom columns for the student roster. Any required column will automatically be required on the admission application form.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowColumnModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form to Add New Custom Column */}
            <form onSubmit={handleCreateColumn} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                + Create New Custom Column
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Column / Field Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Blood Group, Previous GPA, NID"
                    value={newColumn.label}
                    onChange={(e) => setNewColumn({ ...newColumn, label: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Field Key <span className="text-slate-400 text-[10px]">(Optional, auto-generated)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. blood_group"
                    value={newColumn.field_key}
                    onChange={(e) => setNewColumn({ ...newColumn, field_key: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Field Data Type
                  </label>
                  <select
                    value={newColumn.field_type}
                    onChange={(e) => setNewColumn({ ...newColumn, field_type: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="text">Text (Single Line)</option>
                    <option value="number">Number</option>
                    <option value="select">Dropdown Select</option>
                    <option value="date">Date</option>
                    <option value="textarea">Multi-line Text</option>
                    <option value="boolean">Yes / No Switch</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Section Category
                  </label>
                  <select
                    value={newColumn.section}
                    onChange={(e) => setNewColumn({ ...newColumn, section: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="personal">Personal Information</option>
                    <option value="guardian">Parents &amp; Guardian</option>
                    <option value="address">Address &amp; Location</option>
                    <option value="academic">Academic Background</option>
                    <option value="general">General / Other</option>
                  </select>
                </div>

                {newColumn.field_type === 'select' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Dropdown Options (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A+, A-, B+, B-, O+, O-, AB+, AB-"
                      value={newColumn.options}
                      onChange={(e) => setNewColumn({ ...newColumn, options: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="sm:col-span-2 flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={newColumn.is_required}
                      onChange={(e) => setNewColumn({ ...newColumn, is_required: e.target.checked })}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>Mark as REQUIRED Information (Enforced for admission applications)</span>
                  </label>

                  <button
                    type="submit"
                    disabled={savingColumn}
                    className="px-4 py-1.5 rounded bg-primary text-white text-xs font-semibold hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    {savingColumn ? 'Creating...' : '+ Add Column'}
                  </button>
                </div>
              </div>
            </form>

            {/* List of Configured Columns with Requirement Toggles */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                Configured Columns &amp; Admission Field Status ({customColumns.length})
              </h4>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg max-h-60 overflow-y-auto">
                {customColumns.map((col) => (
                  <div key={col.id || col.field_key} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{col.label}</span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {col.field_key}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">
                          ({col.section || 'personal'} • {col.field_type})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{col.placeholder || col.help_text || 'Active in students & admission form'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRequirement(col)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition ${
                          col.is_required
                            ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {col.is_required ? 'REQUIRED *' : 'Optional'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowColumnModal(false)}
                className="px-4 py-2 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
