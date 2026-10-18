'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import { FiCheck, FiSave, FiLayers, FiCreditCard, FiArrowRight, FiCheckCircle } from 'react-icons/fi';

export default function StudentIdCardTemplatesPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  // Templates from Database
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // Class-wise Template Assignments State
  const [classAssignments, setClassAssignments] = useState([]);
  const [savingClasses, setSavingClasses] = useState(false);
  const [bulkClassTemplateId, setBulkClassTemplateId] = useState('default');

  // Preview Filter State
  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterInfo, setFilterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  // Fetch available templates and class assignments
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/templates?category=student_id_card'));
      const data = await res.json();
      if (res.ok && data.success) {
        setSystemTemplates(data.system_templates || []);
        setActiveTemplate(data.active_template || null);
        setClassAssignments(data.class_assignments || []);

        if (data.active_template?.system_template_id) {
          setSelectedTemplateId(data.active_template.system_template_id);
        } else if (data.system_templates?.[0]) {
          setSelectedTemplateId(data.system_templates[0].id);
        }
      } else {
        toast.error(data.error || 'Failed to fetch templates');
      }
    } catch {
      toast.error('Network error loading templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Update a single class assignment in local state
  const handleClassAssignmentChange = (classId, systemTemplateId) => {
    setClassAssignments((prev) =>
      prev.map((c) =>
        c.class_id === classId
          ? {
              ...c,
              system_template_id:
                systemTemplateId === 'default' ? null : Number(systemTemplateId),
            }
          : c
      )
    );
  };

  // Bulk apply selected template to all classes
  const handleBulkApplyToAll = () => {
    setClassAssignments((prev) =>
      prev.map((c) => ({
        ...c,
        system_template_id:
          bulkClassTemplateId === 'default' ? null : Number(bulkClassTemplateId),
      }))
    );
    toast.success('Applied to all classes in editor. Click "Save Class Assignments" to persist.');
  };

  // Save all class assignments to backend
  const handleSaveClassAssignments = async () => {
    setSavingClasses(true);
    try {
      const assignments = classAssignments.map((c) => ({
        class_id: c.class_id,
        system_template_id: c.system_template_id,
      }));

      const res = await fetch(getApiEndpoint('staff/panel/templates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_classes',
          category: 'student_id_card',
          class_assignments: assignments,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Class-specific templates saved successfully!');
        loadTemplates();
      } else {
        toast.error(data.error || 'Failed to save class assignments');
      }
    } catch {
      toast.error('Error saving class template assignments');
    } finally {
      setSavingClasses(false);
    }
  };

  // Activate selected template as school-wide default
  const handleActivateDefaultTemplate = async (templateId) => {
    setActivating(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/templates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_template_id: templateId,
          category: 'student_id_card',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Template set as school default!');
        loadTemplates();
      } else {
        toast.error(data.error || 'Failed to activate template');
      }
    } catch {
      toast.error('Error activating template');
    } finally {
      setActivating(false);
    }
  };

  // Filter students for sample preview
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
        toast.success(`Loaded ${(data.payload?.students || []).length} students for preview.`);
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
    name: 'Julianna Hayes',
    registration_no: 'REG-2026-0041',
    roll_no: '01',
    student_unique_id: 'STU-SAMPLE-101',
    class_name: filterInfo?.className || 'Grade 10',
    section_name: filterInfo?.sectionName || 'Section A',
    session_name: filterInfo?.sessionName || '2026-2027',
    blood_group: 'B+',
    primary_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
  };

  const currentTpl =
    systemTemplates.find((t) => t.id === selectedTemplateId) ||
    activeTemplate ||
    systemTemplates[0];

  // Helper to render populated card HTML
  const renderCardHtml = (tpl, student) => {
    if (!tpl) return '';
    let html = tpl.html_content || '';
    const css = tpl.css_content || '';

    const replacements = {
      '{{student_name}}': student.name || 'Student Name',
      '{{registration_no}}': student.registration_no || student.student_unique_id || 'REG-0001',
      '{{roll_no}}': student.roll_no || '01',
      '{{class_name}}': student.class_name || 'Class',
      '{{section_name}}': student.section_name || 'Sec A',
      '{{blood_group}}': student.blood_group || 'O+',
      '{{student_photo}}': student.primary_photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{school_logo}}': website?.logo_url || 'https://api.iconify.design/lucide:graduation-cap.svg',
      '{{valid_upto}}': 'Dec 2027',
      '{{emergency_contact}}': website?.phone || '+1 (555) 019-2834',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v);
    });

    return `
      <style>${css}</style>
      <div style="width: 100%; height: 100%; box-sizing: border-box;">
        ${html}
      </div>
    `;
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FiCreditCard className="text-slate-700 dark:text-slate-300" />
            Student ID Card Templates &amp; Class Assignments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Browse master identity card designs, activate the institutional default, and assign dedicated card templates per class.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/staff-panel/student-id-card-download"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
          >
            <span>Issue &amp; Download ID Cards</span>
            <FiArrowRight className="text-xs" />
          </a>
        </div>
      </div>

      {/* Section 1: Institutional Master Templates Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Master Institutional ID Card Designs ({systemTemplates.length} Available)
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select any design to preview layout or click &quot;Set As Default&quot; to make it the school-wide default.
            </p>
          </div>
          {activeTemplate && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium px-2 py-0.5 rounded">
              <FiCheckCircle className="text-xs" />
              School Default: {activeTemplate.name}
            </span>
          )}
        </div>

        {templatesLoading ? (
          <div className="p-8 flex justify-center items-center">
            <div className="loader loader-sm" />
          </div>
        ) : systemTemplates.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No student ID card master templates found in the system.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {systemTemplates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              const isActive = activeTemplate?.system_template_id === tpl.id;

              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white bg-slate-50 dark:bg-slate-800/40'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {tpl.name}
                      </p>
                      {isActive && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-medium px-1.5 py-0.2 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {tpl.description || 'Institutional identity card design.'}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {tpl.dimension_width} × {tpl.dimension_height} {tpl.dimension_unit} ({parseFloat(tpl.dimension_width) >= parseFloat(tpl.dimension_height) ? 'Landscape' : 'Portrait'})
                    </span>
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                      {isSelected ? 'Previewing' : 'Click to preview'}
                    </span>
                    {!isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateDefaultTemplate(tpl.id);
                        }}
                        disabled={activating}
                        className="px-2 py-0.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-medium hover:bg-slate-800 dark:hover:bg-white cursor-pointer disabled:opacity-50"
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Class-Wise Student ID Card Assignment */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FiLayers className="text-slate-600 dark:text-slate-300" />
              Class-Wise Template Assignment
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Assign distinct ID card styles to specific classes (e.g. Nursery, Primary, High School, College) or leave as School Default.
            </p>
          </div>

          {/* Quick Bulk Action */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkClassTemplateId}
              onChange={(e) => setBulkClassTemplateId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="default">Use School Default ({activeTemplate?.name || 'Default'})</option>
              {systemTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkApplyToAll}
              className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
            >
              Apply to All
            </button>
            <button
              type="button"
              onClick={handleSaveClassAssignments}
              disabled={savingClasses}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              <FiSave className="text-xs" />
              {savingClasses ? 'Saving...' : 'Save Class Assignments'}
            </button>
          </div>
        </div>

        {classAssignments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No institutional classes configured in Class Setup yet. Please create classes first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-16">#</th>
                  <th className="py-2.5 px-3">Class Name</th>
                  <th className="py-2.5 px-3">Numeric Rank</th>
                  <th className="py-2.5 px-3">Assigned ID Card Template</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {classAssignments.map((cls, idx) => {
                  const isAssigned = Boolean(cls.system_template_id);
                  const selectedVal = cls.system_template_id ? String(cls.system_template_id) : 'default';

                  return (
                    <tr key={cls.class_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold">{cls.class_name}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{cls.numeric_value ?? '—'}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={selectedVal}
                          onChange={(e) => handleClassAssignmentChange(cls.class_id, e.target.value)}
                          className="w-full max-w-sm text-xs px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="default">
                            School Default ({activeTemplate?.name || 'Institutional Default'})
                          </option>
                          {systemTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({parseFloat(t.dimension_width) >= parseFloat(t.dimension_height) ? 'Landscape' : 'Portrait'})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                            Custom Template
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            Using Default
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Live Card Preview & Student Data Filter */}
      <div className="space-y-4">
        <StudentFilterBar
          onFilter={loadData}
          onReset={handleReset}
          loading={loading}
          title="Sample Enrolled Student for Live Template Verification (Optional)"
          description="Filter roster to preview selected template populated with real student credentials"
        />

        {/* Live Card Preview Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-2xs flex flex-col items-center space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full max-w-2xl pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Live Sample Card Preview: {sampleStudent.name}
              </h4>
              <p className="text-[11px] text-slate-400">
                Rendering template: <strong className="text-slate-700 dark:text-slate-300">{currentTpl?.name || 'Default'}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">
                {currentTpl?.dimension_width} × {currentTpl?.dimension_height} {currentTpl?.dimension_unit}
              </span>
            </div>
          </div>

          {currentTpl && (
            <div
              className="overflow-hidden rounded border border-slate-300 dark:border-slate-700 shadow-sm bg-white"
              style={{
                width: currentTpl.dimension_unit === 'px' ? `${currentTpl.dimension_width}px` : `${currentTpl.dimension_width * 3.7795}px`,
                height: currentTpl.dimension_unit === 'px' ? `${currentTpl.dimension_height}px` : `${currentTpl.dimension_height * 3.7795}px`,
              }}
            >
              <iframe
                title="Card Preview"
                srcDoc={renderCardHtml(currentTpl, sampleStudent)}
                className="w-full h-full border-0 pointer-events-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
