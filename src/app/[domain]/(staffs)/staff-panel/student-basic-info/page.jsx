'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentBasicInfoPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roll_no: '',
    gender: 'Male',
    blood_group: 'A+',
    date_of_birth: '',
    religion: 'Islam',
  });

  const loadData = async ({ departmentId, sessionId, classId, sectionId, departmentName, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ departmentId, sessionId, classId, sectionId, departmentName, sessionName, className, sectionName });
    try {
      const params = new URLSearchParams();
      if (departmentId) params.set('department_id', departmentId);
      if (sessionId) params.set('session_id', sessionId);
      if (classId) params.set('class_id', classId);
      if (sectionId) params.set('section_id', sectionId);
      params.set('limit', '100');

      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        setStudents(data.payload?.students || []);
        setHasFiltered(true);
        toast.success(`Loaded ${(data.payload?.students || []).length} student records.`);
      } else {
        toast.error(data.error || 'Failed to fetch student basic info.');
      }
    } catch {
      toast.error('Network error loading students.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHasFiltered(false);
    setFilterInfo(null);
    setStudents([]);
    setEditingStudent(null);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      roll_no: student.roll_no || '',
      gender: student.gender || 'Male',
      blood_group: student.blood_group || 'A+',
      date_of_birth: student.date_of_birth ? String(student.date_of_birth).substring(0, 10) : '',
      religion: student.religion || 'Islam',
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    setSaving(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/students'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStudent.id,
          name: formData.name.trim() || null,
          email: formData.email.trim() || null,
          roll_no: formData.roll_no.trim() || null,
          gender: formData.gender,
          blood_group: formData.blood_group,
          date_of_birth: formData.date_of_birth || null,
          religion: formData.religion || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update basic info.');
      }

      toast.success('Student basic info updated successfully!');
      // Update local state
      setStudents((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? { ...s, ...formData } : s))
      );
      setEditingStudent(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = students.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.registration_no?.toLowerCase().includes(term) ||
      s.student_unique_id?.toLowerCase().includes(term) ||
      s.roll_no?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.department_name?.toLowerCase().includes(term) ||
      s.class_name?.toLowerCase().includes(term) ||
      s.guardian_name?.toLowerCase().includes(term)
    );
  });

  // Export to Excel sheet (.xlsx) with all fields in one row per student
  const handleDownloadExcel = () => {
    if (!filtered || filtered.length === 0) {
      toast.error('No student records available to download.');
      return;
    }

    const rows = filtered.map((s, idx) => ({
      'SL': idx + 1,
      'Registration No': s.registration_no || '',
      'Roll No': s.roll_no || '',
      'Unique ID': s.student_unique_id || '',
      'Status': s.is_active ? 'Active' : 'Pending Setup',
      'Verification Status': s.verification_status || 'pending_setup',
      'Student Name': s.name || '',
      'Email Address': s.email || '',
      'Phone Number': s.number || '',
      'Gender': s.gender || '',
      'Blood Group': s.blood_group || '',
      'Date of Birth': s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : '',
      'Religion': s.religion || '',
      'Department': s.department_name || '',
      'Session': s.session_name || '',
      'Class': s.class_name || '',
      'Class Code': s.class_code || '',
      'Section': s.section_name || '',
      'Admission Date': s.admission_date ? new Date(s.admission_date).toLocaleDateString() : '',
      'Father Name': s.father_name || '',
      'Father Phone': s.father_phone || '',
      'Father NID': s.father_nid || '',
      'Father Occupation': s.father_occupation || '',
      'Mother Name': s.mother_name || '',
      'Mother Phone': s.mother_phone || '',
      'Mother NID': s.mother_nid || '',
      'Mother Occupation': s.mother_occupation || '',
      'Guardian Name': s.guardian_name || '',
      'Guardian Relation': s.guardian_relation || '',
      'Guardian Phone': s.guardian_phone || '',
      'Guardian Email': s.guardian_email || '',
      'Guardian Address': s.guardian_address || '',
      'Present Address': s.present_address || '',
      'Permanent Address': s.permanent_address || '',
      'City': s.city || '',
      'District': s.district || '',
      'Upazila': s.upazila || '',
      'Postal Code': s.postal_code || '',
      'Country': s.country || '',
      'Registered Date': s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    const fileName = `Student_Basic_Info_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success(`Downloaded ${rows.length} student records as ${fileName}`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Basic Information Roster
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filter by Department, Session, Class, and Section. View all detailed student information in one single row and export to Excel.
          </p>
        </div>

        {hasFiltered && filtered.length > 0 && (
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <span>📥</span> Download Excel (.xlsx)
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        title="Filter Student Records"
        description="Filter by Department, Session, Class, and Section to view records"
      />

      {/* View Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="👥"
          title="Filter by Department, Session, Class & Section to View Records"
          description="Please select Department, Session, Class, and Section above, then click 'View Data' to display full student details."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
          {/* Active Filter Bar & Search & Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Active Filter:
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {filterInfo?.departmentName}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/20">
                {filterInfo?.sessionName}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {filterInfo?.className}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {filterInfo?.sectionName}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({filtered.length} students loaded)
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by Reg, Roll, Name, Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                title="Export all rows to Excel"
              >
                <span>📥</span> Export (.xlsx)
              </button>
            </div>
          </div>

          {/* IN-PAGE EDIT BASIC INFO FORM */}
          {editingStudent && (
            <div className="bg-white dark:bg-slate-900 border-2 border-primary/30 rounded-xl p-5 space-y-4 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit Student Basic Info
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Reg: {editingStudent.registration_no} • {editingStudent.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer flex items-center gap-1 font-medium"
                >
                  ✕ Close Form
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Tanvir Ahmmed"
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. student@institution.edu"
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      value={formData.roll_no}
                      onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                      placeholder="e.g. 101"
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Religion
                    </label>
                    <input
                      type="text"
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                      placeholder="e.g. Islam"
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-3.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs cursor-pointer font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 transition"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ALL INFORMATION OF THE STUDENT IN ONE ROW (OVERFLOW HORIZONTAL SCROLL) */}
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No student records found matching the chosen criteria.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
              <table className="text-left text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-max">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Reg No</th>
                    <th className="px-3 py-2.5">Roll No</th>
                    <th className="px-3 py-2.5">Unique ID</th>
                    <th className="px-3 py-2.5">Account Status</th>
                    <th className="px-3 py-2.5">Full Name</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Gender</th>
                    <th className="px-3 py-2.5">Blood Group</th>
                    <th className="px-3 py-2.5">Date of Birth</th>
                    <th className="px-3 py-2.5">Religion</th>
                    <th className="px-3 py-2.5">Department</th>
                    <th className="px-3 py-2.5">Session</th>
                    <th className="px-3 py-2.5">Class</th>
                    <th className="px-3 py-2.5">Section</th>
                    <th className="px-3 py-2.5">Father Name</th>
                    <th className="px-3 py-2.5">Father Phone</th>
                    <th className="px-3 py-2.5">Father NID</th>
                    <th className="px-3 py-2.5">Father Occupation</th>
                    <th className="px-3 py-2.5">Mother Name</th>
                    <th className="px-3 py-2.5">Mother Phone</th>
                    <th className="px-3 py-2.5">Mother NID</th>
                    <th className="px-3 py-2.5">Mother Occupation</th>
                    <th className="px-3 py-2.5">Guardian Name</th>
                    <th className="px-3 py-2.5">Guardian Relation</th>
                    <th className="px-3 py-2.5">Guardian Phone</th>
                    <th className="px-3 py-2.5">Guardian Email</th>
                    <th className="px-3 py-2.5">Present Address</th>
                    <th className="px-3 py-2.5">Permanent Address</th>
                    <th className="px-3 py-2.5">City</th>
                    <th className="px-3 py-2.5">District</th>
                    <th className="px-3 py-2.5">Upazila</th>
                    <th className="px-3 py-2.5">Postal Code</th>
                    <th className="px-3 py-2.5">Country</th>
                    <th className="px-3 py-2.5">Admission Date</th>
                    <th className="px-3 py-2.5">Registered At</th>
                    <th className="px-3 py-2.5 sticky right-0 bg-slate-100 dark:bg-slate-800 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filtered.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 text-[11px] font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">
                        {s.registration_no}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {s.roll_no || '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                        {s.student_unique_id}
                      </td>
                      <td className="px-3 py-2">
                        {s.is_active ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Pending Setup
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                        {s.name || <span className="text-slate-400 italic">Not set</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {s.email || <span className="text-slate-400 italic">Not set</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {s.number || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{s.gender || '—'}</td>
                      <td className="px-3 py-2 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {s.blood_group || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{s.religion || '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-medium">
                        {s.department_name || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{s.session_name || '—'}</td>
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                        {s.class_name || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{s.section_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{s.father_name || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{s.father_phone || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{s.father_nid || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{s.father_occupation || '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{s.mother_name || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{s.mother_phone || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{s.mother_nid || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{s.mother_occupation || '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{s.guardian_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{s.guardian_relation || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{s.guardian_phone || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{s.guardian_email || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={s.present_address}>
                        {s.present_address || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={s.permanent_address}>
                        {s.permanent_address || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{s.city || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{s.district || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{s.upazila || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{s.postal_code || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{s.country || 'Bangladesh'}</td>
                      <td className="px-3 py-2 text-slate-500">
                        {s.admission_date ? new Date(s.admission_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-right sticky right-0 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            if (editingStudent?.id === s.id) {
                              setEditingStudent(null);
                            } else {
                              openEditModal(s);
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer transition ${
                            editingStudent?.id === s.id
                              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 font-semibold'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {editingStudent?.id === s.id ? '✕ Close' : '✏️ Edit'}
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
    </div>
  );
}
