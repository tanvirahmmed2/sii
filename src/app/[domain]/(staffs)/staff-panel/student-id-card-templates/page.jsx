'use client';

import React, { useState, useEffect } from 'react';
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

  // Templates from Database
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // Fetch available templates
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/templates?category=student_id_card'));
      const data = await res.json();
      if (res.ok && data.success) {
        setSystemTemplates(data.system_templates || []);
        setActiveTemplate(data.active_template || null);
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

  // Activate selected template as default for this school
  const handleActivateTemplate = async (templateId) => {
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
        toast.success(data.message || 'Template activated for your school!');
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

    // Replace merge tags
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
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Student ID Card Templates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Browse master templates designed in the Studio, select the default design for your school, and preview with student data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/staff-panel/student-id-card-download"
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
          >
            Go to ID Card Download
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar
        onFilter={loadData}
        onReset={handleReset}
        loading={loading}
        title="Filter Roster for Template Preview"
        description="Select session, class, and section to sample live student cards"
      />

      {/* Show Data Only After Filter */}
      {!hasFiltered ? (
        <StudentFilterEmptyState
          title="Filter by Session, Class & Section to Preview Templates"
          description="Please select Academic Session, Class, and Section above, then click 'View Data' to preview live student cards in developer templates."
        />
      ) : (
        <div className="space-y-4">
          {/* Template Selector Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Institutional ID Card Designs ({systemTemplates.length} Available)
              </h3>
              {activeTemplate && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Active School Template: {activeTemplate.name}
                </span>
              )}
            </div>

            {templatesLoading ? (
              <div className="p-8 flex justify-center items-center">
                <div className="loader loader-sm" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {systemTemplates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  const isActive = activeTemplate?.system_template_id === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-3.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
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
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-medium px-1.5 py-0.5 rounded">
                              Current Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {tpl.description || 'Standard institutional card layout.'}
                        </p>
                        <span className="text-[10px] font-mono text-slate-400">
                          {tpl.dimension_width} × {tpl.dimension_height} {tpl.dimension_unit} ({tpl.orientation})
                        </span>
                      </div>

                      <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                          {isSelected ? 'Selected for Preview' : 'Click to preview'}
                        </span>
                        {!isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivateTemplate(tpl.id);
                            }}
                            disabled={activating}
                            className="px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-medium hover:bg-slate-800 dark:hover:bg-white cursor-pointer disabled:opacity-50"
                          >
                            Set As Default
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Card Preview Surface */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-2xs flex flex-col items-center space-y-4">
            <div className="flex items-center justify-between w-full max-w-md pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Live Sample Card Preview: {sampleStudent.name}
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentTpl?.name}
              </span>
            </div>

            {/* Render Card Preview */}
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
      )}
    </div>
  );
}
