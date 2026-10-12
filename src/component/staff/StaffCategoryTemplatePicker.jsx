'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function StaffCategoryTemplatePicker({
  category,
  categoryLabel,
  description,
  downloadRoute,
  sampleReplacements = {},
}) {
  const { website, getApiEndpoint } = useTenantWebsite();

  const [systemTemplates, setSystemTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // Fetch templates for category
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/templates?category=${category}`));
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
        toast.error(data.error || 'Failed to load templates');
      }
    } catch {
      toast.error('Network error loading templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [category]);

  // Activate selected template as default for this school
  const handleActivate = async (templateId) => {
    setActivating(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/templates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_template_id: templateId,
          category,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Template activated as school default.');
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

  const currentTpl =
    systemTemplates.find((t) => t.id === selectedTemplateId) ||
    activeTemplate ||
    systemTemplates[0];

  // Helper to compile HTML with sample replacements
  const renderPreviewHtml = (tpl) => {
    if (!tpl) return '';
    let html = tpl.html_content || '';
    const css = tpl.css_content || '';

    // Merge default institution variables with category-specific sample replacements
    const defaultVars = {
      '{{school_name}}': website?.name || 'Academic Institution',
      '{{school_address}}': website?.address || 'Campus Secretariat, Main Road',
      '{{school_logo}}': website?.logo_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120',
      '{{issue_date}}': new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{emergency_contact}}': website?.phone || '+1 (555) 019-2834',
    };

    const merged = { ...defaultVars, ...sampleReplacements };

    Object.entries(merged).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v || '');
    });

    return `
      <style>
        ${css}
        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }
      </style>
      <div style="width: 100%; height: 100%; box-sizing: border-box;">
        ${html}
      </div>
    `;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {categoryLabel} Templates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {description}
          </p>
        </div>

        {downloadRoute && (
          <div className="flex items-center gap-2">
            <Link
              href={downloadRoute}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
            >
              Go to Document Generator
            </Link>
          </div>
        )}
      </div>

      {/* KPI Stats / Status Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Available Templates:</span>
            <span className="font-mono font-medium text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              {systemTemplates.length}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500">Active Default:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {activeTemplate ? activeTemplate.name : 'None Selected (Using System Default)'}
            </span>
          </div>

          {currentTpl && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleActivate(currentTpl.id)}
                disabled={activating || activeTemplate?.system_template_id === currentTpl.id}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {activating ? (
                  <div className="loader loader-sm loader-white" />
                ) : activeTemplate?.system_template_id === currentTpl.id ? (
                  'Active Default Template'
                ) : (
                  'Activate Selected Template'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Split View: Template Cards & Live Sample Preview */}
      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <div className="loader loader-md" />
        </div>
      ) : systemTemplates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-10 text-center space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No templates available for {categoryLabel}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Developer has not yet published templates for this document category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Template Selection Cards */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Available Master Designs
            </h2>

            <div className="space-y-2.5">
              {systemTemplates.map((tpl) => {
                const isSelected = (selectedTemplateId || activeTemplate?.system_template_id) === tpl.id;
                const isActiveDefault = activeTemplate?.system_template_id === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`bg-white dark:bg-slate-900 border rounded p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                            {tpl.name}
                          </h3>
                          {isActiveDefault && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              Active Default
                            </span>
                          )}
                        </div>
                        {tpl.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {tpl.description}
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">
                        {tpl.dimension_width}x{tpl.dimension_height}{tpl.dimension_unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-400 capitalize">
                        {tpl.orientation} layout
                      </span>

                      <div className="flex items-center gap-2">
                        {isActiveDefault ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                            Default
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivate(tpl.id);
                            }}
                            disabled={activating}
                            className="text-slate-800 dark:text-slate-200 hover:underline font-medium text-xs cursor-pointer"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Sample Preview Pane */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sample Live Preview ({currentTpl?.name || 'Selected'})
              </h2>
              {currentTpl && (
                <span className="text-[10px] font-mono text-slate-500">
                  {currentTpl.dimension_width} × {currentTpl.dimension_height} {currentTpl.dimension_unit} ({currentTpl.orientation})
                </span>
              )}
            </div>

            <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-4 flex items-center justify-center min-h-[460px] overflow-auto">
              {currentTpl ? (
                <div
                  className="bg-white shadow-md border border-slate-200 transition-all overflow-hidden"
                  style={{
                    width:
                      currentTpl.dimension_unit === 'px'
                        ? `${Math.min(currentTpl.dimension_width, 500)}px`
                        : `${currentTpl.dimension_width}${currentTpl.dimension_unit}`,
                    height:
                      currentTpl.dimension_unit === 'px'
                        ? `${Math.min(currentTpl.dimension_height, 600)}px`
                        : `${currentTpl.dimension_height}${currentTpl.dimension_unit}`,
                    maxHeight: '520px',
                    maxWidth: '100%',
                    transform: currentTpl.dimension_width > 150 && currentTpl.dimension_unit === 'mm' ? 'scale(0.7)' : 'scale(1)',
                    transformOrigin: 'top center',
                  }}
                  dangerouslySetInnerHTML={{ __html: renderPreviewHtml(currentTpl) }}
                />
              ) : (
                <p className="text-xs text-slate-400">Select a template to view preview.</p>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Ready to customize recipient records with this template?
              </span>

              {downloadRoute && (
                <Link
                  href={downloadRoute}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer text-center"
                >
                  Proceed to Document Generator
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
