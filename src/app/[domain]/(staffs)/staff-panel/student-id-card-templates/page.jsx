'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import StudentFilterEmptyState from 'src/component/staff/StudentFilterEmptyState';

export default function StudentIdCardTemplatesPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('classic'); // 'classic', 'modern', 'dark', 'minimal'

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
        toast.success(`Loaded ${(data.payload?.students || []).length} students for template preview.`);
      } else {
        toast.error(data.error || 'Failed to fetch students.');
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
  };

  const sampleStudent = students[0] || {
    name: 'Sample Student',
    registration_no: 'REG-2026-0001',
    roll_no: '01',
    student_unique_id: 'STU-SAMPLE-101',
    class_name: filterInfo?.className || 'Class 10',
    section_name: filterInfo?.sectionName || 'Section A',
    session_name: filterInfo?.sessionName || '2026-2027',
  };

  const templates = [
    {
      id: 'classic',
      name: 'Classic Academic Blue',
      headerClass: 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white',
      borderClass: 'border-blue-400 dark:border-blue-700',
    },
    {
      id: 'modern',
      name: 'Modern Emerald Campus',
      headerClass: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white',
      borderClass: 'border-emerald-400 dark:border-emerald-700',
    },
    {
      id: 'dark',
      name: 'Sleek Obsidian Slate',
      headerClass: 'bg-gradient-to-r from-slate-900 to-slate-800 text-amber-400',
      borderClass: 'border-slate-700 dark:border-slate-600',
    },
    {
      id: 'minimal',
      name: 'Crisp Minimalist Crimson',
      headerClass: 'bg-gradient-to-r from-rose-700 to-rose-900 text-white',
      borderClass: 'border-rose-400 dark:border-rose-700',
    },
  ];

  const currentTheme = templates.find((t) => t.id === selectedTemplate) || templates[0];

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Student ID Card Design Templates
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by session, class, and section to preview and configure ID card visual styles for institutional issuance.
        </p>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        title="Filter Roster for Template Preview"
        description="Select session, class, and section to sample student cards"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          icon="🎨"
          title="Filter by Session, Class & Section to Preview Templates"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to preview live student data in various card themes."
        />
      ) : (
        <div className="space-y-4">
          {/* Template Selector Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Select ID Card Visual Theme
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(tpl.id);
                    toast.success(`Active theme: ${tpl.name}`);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedTemplate === tpl.id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{tpl.name}</p>
                  <span className="text-[10px] text-slate-400">Click to apply</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Card Preview Surface */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-2xs flex flex-col items-center space-y-4">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Live Sample Card Preview ({sampleStudent.name})
            </h4>

            {/* Render Card Preview */}
            <div
              className={`w-80 rounded-xl overflow-hidden border-2 shadow-lg bg-white dark:bg-slate-900 ${currentTheme.borderClass}`}
            >
              {/* Header */}
              <div className={`p-3 text-center ${currentTheme.headerClass}`}>
                <h5 className="font-bold text-xs uppercase tracking-wide truncate">
                  {website?.name || 'Educational Institution'}
                </h5>
                <p className="text-[9px] uppercase tracking-widest opacity-90">
                  Student Identity Card
                </p>
              </div>

              {/* Body */}
              <div className="p-4 flex gap-3 items-center">
                <div className="w-20 h-24 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                  {sampleStudent.primary_photo_url ? (
                    <img
                      src={sampleStudent.primary_photo_url}
                      alt="Student"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-slate-400">👤</span>
                  )}
                </div>

                <div className="space-y-0.5 text-xs min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {sampleStudent.name || 'Unnamed Student'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Reg: <strong className="text-slate-800 dark:text-slate-200">{sampleStudent.registration_no}</strong>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Class: <strong className="text-slate-800 dark:text-slate-200">{sampleStudent.class_name}</strong>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Section: <strong className="text-slate-800 dark:text-slate-200">{sampleStudent.section_name || 'A'}</strong>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Roll: <strong className="text-slate-800 dark:text-slate-200">{sampleStudent.roll_no || '—'}</strong>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 dark:bg-slate-950 p-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[9px] text-slate-500">
                <span className="font-mono">{sampleStudent.student_unique_id}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Authorized Signature</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
