'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { FiCheckCircle, FiEye, FiLayers, FiCreditCard } from 'react-icons/fi';

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
  const [previewSide, setPreviewSide] = useState('front'); // 'front' | 'back' | 'both'

  const hasBackSide = category.includes('id_card');

  // Fetch templates for category
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/templates?category=${category}`));
      const data = await res.json();
      if (res.ok && data.success) {
        const sysList = data.system_templates || [];
        setSystemTemplates(sysList);
        setActiveTemplate(data.active_template || null);
        if (data.active_template?.system_template_id) {
          setSelectedTemplateId(data.active_template.system_template_id);
        } else if (sysList[0]) {
          setSelectedTemplateId(sysList[0].id);
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

  // Helper to compile HTML with sample replacements and responsive SVG rules
  const renderPreviewHtml = (tpl, side = 'front') => {
    if (!tpl) return '';
    let html = '';
    if (side === 'back' && (tpl.html_back_content || tpl.custom_html_back)) {
      html = tpl.html_back_content || tpl.custom_html_back || '';
    } else {
      html = tpl.html_content || tpl.custom_html || '';
    }

    const css = tpl.css_content || tpl.custom_css || '';

    // Merge default institution variables with category-specific sample replacements
    const defaultVars = {
      '{{school_name}}': website?.name || 'Academic Institution',
      '{{institution_name}}': website?.name || 'Academic Institution',
      '{{school_address}}': website?.address || 'Campus Secretariat, Main Road',
      '{{institution_address}}': website?.address || 'Campus Secretariat, Main Road',
      '{{school_logo}}': website?.logo_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120',
      '{{institution_logo}}': website?.logo_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120',
      '{{issue_date}}': new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{emergency_contact}}': website?.phone || '+1 (555) 019-2834',
      '{{valid_upto}}': 'December 2028',
      '{{expiry_date}}': '31 Dec 2028',
      '{{card_number}}': 'ID-2026-0091',
      '{{website_url}}': website?.domain ? 'https://' + website.domain : 'https://campus.edu',
    };

    const merged = { ...defaultVars, ...sampleReplacements };

    Object.entries(merged).forEach(([k, v]) => {
      const reg = new RegExp(k.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(reg, v || '');
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
    ${html}
  </div>
</body>
</html>`;
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
              {activeTemplate ? activeTemplate.name : 'System Standard'}
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
          {/* Left Column: Template Selection Cards with Visual Thumbnails */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Available Master Designs ({systemTemplates.length})
            </h2>

            <div className="space-y-3">
              {systemTemplates.map((tpl) => {
                const isSelected = (selectedTemplateId || activeTemplate?.system_template_id) === tpl.id;
                const isActiveDefault = activeTemplate?.system_template_id === tpl.id;
                const isLand = parseFloat(tpl.dimension_width || 54) >= parseFloat(tpl.dimension_height || 86);

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-3 cursor-pointer transition-all flex flex-col gap-2.5 overflow-hidden ${
                      isSelected
                        ? 'border-sky-600 dark:border-sky-400 ring-2 ring-sky-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      {/* Mini Thumbnail */}
                      <div
                        className={`rounded border border-slate-200 dark:border-slate-700 bg-white overflow-hidden shadow-2xs shrink-0 ${
                          isLand ? 'w-24 h-15' : 'w-15 h-22'
                        }`}
                      >
                        <iframe
                          title={tpl.name}
                          srcDoc={renderPreviewHtml(tpl, 'front')}
                          className="w-full h-full border-0 pointer-events-none select-none bg-white"
                          loading="lazy"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {tpl.name}
                          </h3>
                          {isActiveDefault && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              Default
                            </span>
                          )}
                        </div>
                        {tpl.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {tpl.description}
                          </p>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 block mt-1">
                          {tpl.dimension_width} × {tpl.dimension_height} {tpl.dimension_unit} ({isLand ? 'Landscape' : 'Portrait'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-400 font-medium">
                        {isSelected ? 'Currently Previewing' : 'Click to inspect'}
                      </span>

                      {!isActiveDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivate(tpl.id);
                          }}
                          disabled={activating}
                          className="text-slate-800 dark:text-slate-200 hover:underline font-semibold text-xs cursor-pointer"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Sample Preview Pane */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sample Live Preview ({currentTpl?.name || 'Selected'})
              </h2>

              <div className="flex items-center gap-2">
                {hasBackSide && currentTpl?.html_back_content && (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewSide('front')}
                      className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                        previewSide === 'front'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewSide('back')}
                      className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                        previewSide === 'back'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Back
                    </button>
                  </div>
                )}

                {currentTpl && (
                  <span className="text-[10px] font-mono text-slate-500">
                    {currentTpl.dimension_width} × {currentTpl.dimension_height} {currentTpl.dimension_unit}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-center justify-center min-h-[480px] overflow-auto">
              {currentTpl ? (
                <div
                  className="bg-white shadow-lg border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden transition-all"
                  style={{
                    width:
                      currentTpl.dimension_unit === 'px'
                        ? `${Math.min(currentTpl.dimension_width, 600)}px`
                        : `${parseFloat(currentTpl.dimension_width) * 3.78}px`,
                    height:
                      currentTpl.dimension_unit === 'px'
                        ? `${Math.min(currentTpl.dimension_height, 700)}px`
                        : `${parseFloat(currentTpl.dimension_height) * 3.78}px`,
                    maxWidth: '100%',
                    maxHeight: '520px',
                  }}
                >
                  <iframe
                    title="Live Preview"
                    srcDoc={renderPreviewHtml(currentTpl, previewSide)}
                    className="w-full h-full border-0 select-none bg-white"
                  />
                </div>
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
