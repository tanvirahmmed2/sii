'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StudentFilterBar from 'src/component/staff/StudentFilterBar';
import {
  FiCheck,
  FiSave,
  FiLayers,
  FiCreditCard,
  FiArrowRight,
  FiCheckCircle,
  FiMaximize2,
  FiEye,
  FiCompass,
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw,
} from 'react-icons/fi';

export default function StudentIdCardTemplatesPage() {
  const { website, getApiEndpoint } = useTenantWebsite();

  // Templates from Database
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // Gallery Filters & Preview Controls
  const [orientationFilter, setOrientationFilter] = useState('all'); // 'all' | 'portrait' | 'landscape'
  const [previewSide, setPreviewSide] = useState('both'); // 'both' | 'front' | 'back'
  const [previewScale, setPreviewScale] = useState(1); // 1 | 1.15 | 1.3

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
        const sysList = data.system_templates || [];
        setSystemTemplates(sysList);
        setActiveTemplate(data.active_template || null);
        setClassAssignments(data.class_assignments || []);

        if (data.active_template?.system_template_id) {
          setSelectedTemplateId(data.active_template.system_template_id);
        } else if (sysList[0]) {
          setSelectedTemplateId(sysList[0].id);
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
        const studentList = data.payload?.students || [];
        setStudents(studentList);
        setHasFiltered(true);
        toast.success(`Loaded ${studentList.length} students for preview.`);
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
    department_name: 'Science & Humanities',
    blood_group: 'B+',
    date_of_birth: '12 May 2010',
    primary_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    emergency_contact: website?.phone || '+1 (555) 019-2834',
  };

  const currentTpl =
    systemTemplates.find((t) => t.id === selectedTemplateId) ||
    activeTemplate ||
    systemTemplates[0];

  const isCurrentLandscape = useMemo(() => {
    if (!currentTpl) return false;
    return parseFloat(currentTpl.dimension_width || 54) >= parseFloat(currentTpl.dimension_height || 86);
  }, [currentTpl]);

  // Filter templates by orientation
  const filteredTemplates = useMemo(() => {
    if (orientationFilter === 'all') return systemTemplates;
    return systemTemplates.filter((t) => {
      const isLand = parseFloat(t.dimension_width || 54) >= parseFloat(t.dimension_height || 86);
      return orientationFilter === 'landscape' ? isLand : !isLand;
    });
  }, [systemTemplates, orientationFilter]);

  // Helper to compile clean, fully styled card HTML for front or back side
  const renderCardHtml = (tpl, student, side = 'front') => {
    if (!tpl) return '';

    let contentHtml = '';
    if (side === 'back') {
      contentHtml = tpl.html_back_content || tpl.custom_html_back || '';
      // Fallback clean back side if template has no back side HTML
      if (!contentHtml.trim()) {
        contentHtml = `
          <div style="width: 100%; height: 100%; box-sizing: border-box; background: #0f172a; color: #f8fafc; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
            <div style="background: #1e293b; padding: 5px 10px; border-radius: 6px; font-size: 8.5px; font-weight: 700; color: #38bdf8; letter-spacing: 0.8px;">
              OFFICIAL STUDENT PASS TERMS
            </div>
            <div style="font-size: 8.5px; color: #94a3b8; line-height: 1.5; text-align: left; padding: 0 4px;">
              <p style="margin: 0 0 3px;">&bull; This card certifies enrollment at {{school_name}}.</p>
              <p style="margin: 0 0 3px;">&bull; Non-transferable; must be presented upon campus authority request.</p>
              <p style="margin: 0;">&bull; Report loss immediately to the Registrar's Office.</p>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data={{registration_no}}" alt="QR" style="width: 46px; height: 46px; background: white; padding: 2px; border-radius: 4px;" />
              <span style="font-family: monospace; font-size: 8px; color: #38bdf8;">{{registration_no}}</span>
            </div>
            <div style="font-size: 7.5px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 4px;">
              Property of {{school_name}} &bull; Hotline: {{emergency_contact}}
            </div>
          </div>
        `;
      }
    } else {
      contentHtml = tpl.html_content || tpl.custom_html || '';
    }

    const css = tpl.css_content || tpl.custom_css || '';

    const replacements = {
      '{{student_name}}': student.name || 'Student Name',
      '{{registration_no}}': student.registration_no || student.student_unique_id || 'REG-0001',
      '{{roll_no}}': student.roll_no || '01',
      '{{student_unique_id}}': student.student_unique_id || student.registration_no || 'STU-0001',
      '{{class_name}}': student.class_name || 'Class 10',
      '{{section_name}}': student.section_name || 'Sec A',
      '{{session_name}}': student.session_name || '2026-2027',
      '{{department_name}}': student.department_name || 'Science',
      '{{blood_group}}': student.blood_group || 'O+',
      '{{date_of_birth}}': student.date_of_birth || '15/08/2009',
      '{{student_photo}}': student.primary_photo_url || student.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
      '{{school_name}}': website?.name || 'Educational Institution',
      '{{institution_name}}': website?.name || 'Educational Institution',
      '{{school_logo}}': website?.logo_url || 'https://api.iconify.design/lucide:graduation-cap.svg',
      '{{institution_logo}}': website?.logo_url || 'https://api.iconify.design/lucide:graduation-cap.svg',
      '{{valid_upto}}': 'Dec 2027',
      '{{expiry_date}}': '31 Dec 2027',
      '{{card_number}}': `STU-${student.registration_no || '0041'}`,
      '{{emergency_contact}}': website?.phone || '+1 (555) 019-2834',
      '{{emergency_phone}}': website?.phone || '+1 (555) 019-2834',
      '{{institution_address}}': website?.address || 'Main Campus Secretariat',
      '{{website_url}}': website?.domain ? 'https://' + website.domain : 'https://campus.edu',
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      contentHtml = contentHtml.replace(reg, v);
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
    }
    svg {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      display: block;
    }
    ${css}
  </style>
</head>
<body>
  <div style="width: 100%; height: 100%; display: flex; align-items: stretch; justify-content: stretch;">
    ${contentHtml}
  </div>
</body>
</html>`;
  };

  // Dimensions helper
  const getCardPixelDimensions = (tpl, scale = 1) => {
    if (!tpl) return { width: 204 * scale, height: 325 * scale };
    const isLand = parseFloat(tpl.dimension_width || 54) >= parseFloat(tpl.dimension_height || 86);
    // Base preview scale factor: 1mm ~ 3.78px
    const w = isLand ? 325 : 204;
    const h = isLand ? 204 : 325;
    return {
      width: Math.round(w * scale),
      height: Math.round(h * scale),
      isLandscape: isLand,
    };
  };

  const previewDims = getCardPixelDimensions(currentTpl, previewScale);

  return (
    <div className="w-full space-y-6 pb-16 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FiCreditCard className="text-sky-600 dark:text-sky-400" />
            Student ID Card Templates &amp; Class Assignments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Browse master identity card designs, inspect dual-sided layouts, activate institutional defaults, and assign templates per class.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/staff-panel/student-id-card-download"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer shadow-xs"
          >
            <span>Issue &amp; Download ID Cards</span>
            <FiArrowRight className="text-xs" />
          </Link>
        </div>
      </div>

      {/* Section 1: Institutional Master Templates Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Master Institutional ID Card Designs ({systemTemplates.length})
              </h2>
              {activeTemplate && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium px-2 py-0.5 rounded-full">
                  <FiCheckCircle className="text-xs text-emerald-600" />
                  School Default: {activeTemplate.name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Click any design card to inspect dual-sided details below or set as institutional default.
            </p>
          </div>

          {/* Orientation Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setOrientationFilter('all')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                orientationFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({systemTemplates.length})
            </button>
            <button
              type="button"
              onClick={() => setOrientationFilter('portrait')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                orientationFilter === 'portrait'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Portrait (54×86mm)
            </button>
            <button
              type="button"
              onClick={() => setOrientationFilter('landscape')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                orientationFilter === 'landscape'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Landscape (86×54mm)
            </button>
          </div>
        </div>

        {templatesLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2">
            <div className="loader loader-sm" />
            <span className="text-xs text-slate-400">Loading student ID card templates...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No student ID card master templates found for this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              const isActive = activeTemplate?.system_template_id === tpl.id;
              const isLand = parseFloat(tpl.dimension_width || 54) >= parseFloat(tpl.dimension_height || 86);

              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`group rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900 ${
                    isSelected
                      ? 'border-sky-600 dark:border-sky-400 ring-2 ring-sky-500/30 dark:ring-sky-400/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                  }`}
                >
                  {/* Visual Card Thumbnail / Miniature Preview */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800">
                    <div
                      className={`relative overflow-hidden rounded shadow-xs border border-slate-300 dark:border-slate-700 bg-white transition-transform group-hover:scale-[1.02] ${
                        isLand ? 'w-[180px] h-[114px]' : 'w-[114px] h-[180px]'
                      }`}
                    >
                      <iframe
                        title={`Mini Preview ${tpl.name}`}
                        srcDoc={renderCardHtml(tpl, sampleStudent, 'front')}
                        className="w-full h-full border-0 pointer-events-none select-none bg-white"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Card Content & Metadata */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {tpl.name}
                        </h3>
                        {isActive && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-semibold px-1.5 py-0.5 rounded shrink-0">
                            Default
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {tpl.description || 'Master identity credential layout.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-400">
                        {tpl.dimension_width} × {tpl.dimension_height} {tpl.dimension_unit} ({isLand ? 'Landscape' : 'Portrait'})
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="text-sky-600 dark:text-sky-400 font-bold flex items-center gap-0.5">
                            <FiEye /> Inspecting
                          </span>
                        )}

                        {!isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivateDefaultTemplate(tpl.id);
                            }}
                            disabled={activating}
                            className="px-2 py-0.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-white cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Live Dual-Sided Template Verification & Sample Preview */}
      <div className="space-y-4">
        <StudentFilterBar
          onFilter={loadData}
          onReset={handleReset}
          loading={loading}
          title="Sample Enrolled Student for Live Verification (Optional)"
          description="Filter roster to preview selected template populated with real student credentials"
        />

        {/* Live Card Preview Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-2xs flex flex-col items-center space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live Dual-Sided Verification: {sampleStudent.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {currentTpl?.dimension_width} × {currentTpl?.dimension_height} {currentTpl?.dimension_unit} ({isCurrentLandscape ? 'Landscape' : 'Portrait'})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Rendering template: <strong className="text-slate-800 dark:text-slate-200">{currentTpl?.name || 'Default'}</strong>
              </p>
            </div>

            {/* View Side & Zoom Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Side Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewSide('both')}
                  className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                    previewSide === 'both'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Both Sides
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSide('front')}
                  className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                    previewSide === 'front'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Front Only
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSide('back')}
                  className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                    previewSide === 'back'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Back Only
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewScale((s) => Math.max(0.85, s - 0.15))}
                  className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
                  title="Zoom Out"
                >
                  <FiZoomOut />
                </button>
                <span className="text-[10px] font-mono px-1 font-semibold text-slate-600 dark:text-slate-300">
                  {Math.round(previewScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewScale((s) => Math.min(1.45, s + 0.15))}
                  className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
                  title="Zoom In"
                >
                  <FiZoomIn />
                </button>
              </div>
            </div>
          </div>

          {/* Card Presentation Display */}
          {currentTpl && (
            <div className="flex flex-wrap items-center justify-center gap-8 p-6 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl w-full overflow-x-auto min-h-[360px]">
              {/* FRONT SIDE */}
              {(previewSide === 'both' || previewSide === 'front') && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <FiCreditCard className="text-sky-500" /> Front Side
                  </span>
                  <div
                    className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 shadow-md bg-white transition-all"
                    style={{
                      width: `${previewDims.width}px`,
                      height: `${previewDims.height}px`,
                      maxWidth: '100%',
                    }}
                  >
                    <iframe
                      title="Front Side Preview"
                      srcDoc={renderCardHtml(currentTpl, sampleStudent, 'front')}
                      className="w-full h-full border-0 select-none bg-white"
                    />
                  </div>
                </div>
              )}

              {/* BACK SIDE */}
              {(previewSide === 'both' || previewSide === 'back') && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <FiLayers className="text-emerald-500" /> Back Side
                  </span>
                  <div
                    className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 shadow-md bg-white transition-all"
                    style={{
                      width: `${previewDims.width}px`,
                      height: `${previewDims.height}px`,
                      maxWidth: '100%',
                    }}
                  >
                    <iframe
                      title="Back Side Preview"
                      srcDoc={renderCardHtml(currentTpl, sampleStudent, 'back')}
                      className="w-full h-full border-0 select-none bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Specifications Table */}
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
              <span>Student: <strong className="text-slate-900 dark:text-white">{sampleStudent.name}</strong></span>
              <span>Reg: <strong className="text-slate-900 dark:text-white font-mono">{sampleStudent.registration_no}</strong></span>
              <span>Class: <strong className="text-slate-900 dark:text-white">{sampleStudent.class_name} ({sampleStudent.section_name})</strong></span>
              <span>Blood Group: <strong className="text-rose-600 font-bold">{sampleStudent.blood_group}</strong></span>
            </div>

            <Link
              href="/staff-panel/student-id-card-download"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              Generate Cards for this Class &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Section 3: Class-Wise Student ID Card Assignment */}
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
    </div>
  );
}
