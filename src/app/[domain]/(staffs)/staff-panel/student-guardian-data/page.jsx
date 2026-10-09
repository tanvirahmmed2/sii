'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentGuardianDataPage() {
  const { getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    father_name: '',
    father_phone: '',
    father_nid: '',
    mother_name: '',
    mother_phone: '',
    guardian_name: '',
    guardian_relation: 'Father',
    guardian_phone: '',
    guardian_email: '',
    guardian_address: '',
  });

  const loadData = async ({ sessionId, classId, sectionId, sessionName, className, sectionName }) => {
    setLoading(true);
    setFilterInfo({ sessionId, classId, sectionId, sessionName, className, sectionName });
    try {
      const params = new URLSearchParams({ session_id: sessionId, class_id: classId });
      if (sectionId) params.set('section_id', sectionId);

      const res = await fetch(getApiEndpoint(`staff/panel/students?${params.toString()}`));
      const data = await res.json();

      if (res.ok && data.success) {
        setStudents(data.payload?.students || []);
        setHasFiltered(true);
        toast.success(`Loaded ${(data.payload?.students || []).length} students.`);
      } else {
        toast.error(data.error || 'Failed to fetch student guardian records.');
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

  const openEditModal = async (student) => {
    setEditingStudent(student);
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/students?id=${student.id}`));
      const data = await res.json();
      const g = data.payload?.guardian || {};
      setFormData({
        father_name: g.father_name || '',
        father_phone: g.father_phone || '',
        father_nid: g.father_nid || '',
        mother_name: g.mother_name || '',
        mother_phone: g.mother_phone || '',
        guardian_name: g.guardian_name || '',
        guardian_relation: g.guardian_relation || 'Father',
        guardian_phone: g.guardian_phone || '',
        guardian_email: g.guardian_email || '',
        guardian_address: g.guardian_address || '',
      });
    } catch {
      setFormData({
        father_name: '',
        father_phone: '',
        father_nid: '',
        mother_name: '',
        mother_phone: '',
        guardian_name: '',
        guardian_relation: 'Father',
        guardian_phone: '',
        guardian_email: '',
        guardian_address: '',
      });
    }
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
          guardian: formData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update guardian info.');
      }

      toast.success('Guardian record updated successfully!');
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
      s.roll_no?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Student Guardian Directory
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to view and update student parents and legal guardian contact information.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        title="Filter Student Guardian Info"
        description="Select session, class, and section to load guardian records"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="👪"
          title="Filter by Session, Class & Section to View Guardians"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to display and edit student guardian records."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-4">
          {/* Active Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Active Filter:
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
              <span className="text-xs text-slate-400">({filtered.length} students)</span>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search by Reg, Roll, Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No students found for this session, class, and section.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Reg No</th>
                    <th className="px-3 py-2.5">Roll No</th>
                    <th className="px-3 py-2.5">Student Name</th>
                    <th className="px-3 py-2.5">Class / Section</th>
                    <th className="px-3 py-2.5">Student Phone</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-mono font-medium text-slate-900 dark:text-white">
                        {s.registration_no}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {s.roll_no || '—'}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                        {s.name || <span className="text-slate-400 italic">Not set</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {s.class_name} {s.section_name ? `(${s.section_name})` : ''}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {s.number || '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          👪 Edit Guardian
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

      {/* Edit Guardian Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Update Guardian Information
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {editingStudent.name || 'Student'} • Reg: {editingStudent.registration_no}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    placeholder="Father's full name"
                    className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Father's Phone
                  </label>
                  <input
                    type="text"
                    value={formData.father_phone}
                    onChange={(e) => setFormData({ ...formData, father_phone: e.target.value })}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mother's Name
                  </label>
                  <input
                    type="text"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    placeholder="Mother's full name"
                    className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mother's Phone
                  </label>
                  <input
                    type="text"
                    value={formData.mother_phone}
                    onChange={(e) => setFormData({ ...formData, mother_phone: e.target.value })}
                    placeholder="018xxxxxxxx"
                    className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Primary Guardian Details
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Guardian Name
                    </label>
                    <input
                      type="text"
                      value={formData.guardian_name}
                      onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                      placeholder="Primary guardian"
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      value={formData.guardian_relation}
                      onChange={(e) => setFormData({ ...formData, guardian_relation: e.target.value })}
                      placeholder="e.g. Father, Mother, Uncle"
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Guardian Phone
                    </label>
                    <input
                      type="text"
                      value={formData.guardian_phone}
                      onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                      placeholder="Emergency contact"
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Guardian Email
                    </label>
                    <input
                      type="email"
                      value={formData.guardian_email}
                      onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
                      placeholder="guardian@example.com"
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Guardian Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.guardian_address}
                    onChange={(e) => setFormData({ ...formData, guardian_address: e.target.value })}
                    placeholder="Guardian residential address"
                    className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-primary hover:bg-primary/90 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Guardian Info'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
