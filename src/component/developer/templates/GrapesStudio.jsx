'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import 'grapesjs/dist/css/grapes.min.css';

export default function GrapesStudio({ initialTemplate, onSave, onExitUrl = '/developer/templates' }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [template, setTemplate] = useState(initialTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState('html');
  const [rawHtml, setRawHtml] = useState('');
  const [rawCss, setRawCss] = useState('');

  // Dimensions & Presets
  const [dimensionWidth, setDimensionWidth] = useState(initialTemplate.dimension_width || 86);
  const [dimensionHeight, setDimensionHeight] = useState(initialTemplate.dimension_height || 54);
  const [dimensionUnit, setDimensionUnit] = useState(initialTemplate.dimension_unit || 'mm');
  const [orientation, setOrientation] = useState(initialTemplate.orientation || 'landscape');

  const dimensionPresets = [
    { label: 'CR80 ID Card Portrait (54 × 86 mm)', width: 54, height: 86, unit: 'mm', orientation: 'portrait' },
    { label: 'CR80 ID Card Landscape (86 × 54 mm)', width: 86, height: 54, unit: 'mm', orientation: 'landscape' },
    { label: 'A4 Document Portrait (210 × 297 mm)', width: 210, height: 297, unit: 'mm', orientation: 'portrait' },
    { label: 'A4 Document Landscape (297 × 210 mm)', width: 297, height: 210, unit: 'mm', orientation: 'landscape' },
    { label: 'Half-A4 Receipt (210 × 148 mm)', width: 210, height: 148, unit: 'mm', orientation: 'landscape' },
    { label: 'POS Thermal Slip (80 × 180 mm)', width: 80, height: 180, unit: 'mm', orientation: 'portrait' },
    { label: 'Social Square Poster (1080 × 1080 px)', width: 1080, height: 1080, unit: 'px', orientation: 'portrait' },
    { label: 'Website Hero Poster (1200 × 630 px)', width: 1200, height: 630, unit: 'px', orientation: 'landscape' },
  ];

  const applyPreset = (preset) => {
    setDimensionWidth(preset.width);
    setDimensionHeight(preset.height);
    setDimensionUnit(preset.unit);
    setOrientation(preset.orientation);
    toast.success(`Canvas resized to ${preset.label}`);
  };

  useEffect(() => {
    let editor = null;

    async function initGrapes() {
      if (!containerRef.current) return;
      const grapesjs = (await import('grapesjs')).default;

      if (editorRef.current) {
        editorRef.current.destroy();
      }

      editor = grapesjs.init({
        container: containerRef.current,
        fromElement: false,
        height: '100%',
        width: '100%',
        storageManager: false,
        panels: { defaults: [] },
        deviceManager: {
          devices: [
            {
              id: 'custom-doc',
              name: 'Document Canvas',
              width: dimensionUnit === 'px' ? `${dimensionWidth}px` : `${dimensionWidth * 3.7795}px`,
            },
          ],
        },
        blockManager: {
          appendTo: '#gjs-blocks-container',
        },
      });

      if (initialTemplate.grapes_data && Object.keys(initialTemplate.grapes_data).length > 0) {
        editor.loadProjectData(initialTemplate.grapes_data);
      } else {
        editor.setComponents(initialTemplate.html_content || '<div class="document-root">Start designing here</div>');
        if (initialTemplate.css_content) {
          editor.setStyle(initialTemplate.css_content);
        }
      }

      const bm = editor.BlockManager;

      // Layout Blocks
      bm.add('sect-container', {
        label: 'Container Section',
        category: 'Layout',
        content: `<div style="padding: 16px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; min-height: 100px;">
          <p style="margin: 0; color: #64748b; font-size: 11px;">Container Section</p>
        </div>`,
      });

      bm.add('grid-2col', {
        label: '2-Column Split',
        category: 'Layout',
        content: `<div style="display: flex; gap: 12px; width: 100%;">
          <div style="flex: 1; min-width: 0; padding: 8px; border: 1px dashed #e2e8f0;">Left Column</div>
          <div style="flex: 1; min-width: 0; padding: 8px; border: 1px dashed #e2e8f0;">Right Column</div>
        </div>`,
      });

      // ID Cards Blocks
      bm.add('student-photo-block', {
        label: 'Student / User Photo',
        category: 'ID Cards',
        content: `<div style="text-align: center; margin: 8px 0;">
          <img src="{{student_photo}}" alt="Photo" style="width: 70px; height: 85px; object-fit: cover; border-radius: 4px; border: 2px solid #2563eb; background: #f1f5f9; display: inline-block;" />
        </div>`,
      });

      bm.add('card-header-crest', {
        label: 'Institution Header Bar',
        category: 'ID Cards',
        content: `<div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 8px 12px; display: flex; align-items: center; gap: 8px;">
          <img src="{{school_logo}}" alt="Logo" style="width: 24px; height: 24px; background: white; border-radius: 4px; padding: 2px;" />
          <div>
            <h4 style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase;">{{school_name}}</h4>
            <span style="font-size: 7.5px; color: #bfdbfe; font-weight: 600; letter-spacing: 0.5px;">IDENTITY PASS</span>
          </div>
        </div>`,
      });

      bm.add('student-details-grid', {
        label: 'Student Details Table',
        category: 'ID Cards',
        content: `<div style="display: flex; flex-direction: column; gap: 3px; font-size: 9px; padding: 6px 10px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 2px;"><span style="color: #64748b;">Name:</span><strong>{{student_name}}</strong></div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 2px;"><span style="color: #64748b;">Reg No:</span><strong style="font-family: monospace;">{{registration_no}}</strong></div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 2px;"><span style="color: #64748b;">Class:</span><strong>{{class_name}} ({{section_name}})</strong></div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 2px;"><span style="color: #64748b;">Roll:</span><strong style="font-family: monospace;">{{roll_no}}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Blood Group:</span><strong style="color: #dc2626;">{{blood_group}}</strong></div>
        </div>`,
      });

      bm.add('barcode-qr-block', {
        label: 'Barcode & QR Box',
        category: 'ID Cards',
        content: `<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
          <div style="font-family: monospace; font-size: 8px; color: #475569;">{{registration_no}}</div>
          <div style="width: 28px; height: 28px; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-size: 6px; border-radius: 2px;">QR</div>
        </div>`,
      });

      bm.add('signature-box-block', {
        label: 'Signature Box',
        category: 'General',
        content: `<div style="text-align: center; width: 100px; margin: 10px auto;">
          <div style="border-bottom: 1px solid #334155; height: 16px; margin-bottom: 3px;"></div>
          <span style="font-size: 8px; color: #475569; text-transform: uppercase; font-weight: 600;">Authorized Signatory</span>
        </div>`,
      });

      // Certificates & TC Blocks
      bm.add('ornate-cert-border', {
        label: 'Gold Certificate Frame',
        category: 'Certificates & TC',
        content: `<div style="border: 6px solid #d97706; padding: 8px; background: #ffffff;">
          <div style="border: 2px dashed #b45309; padding: 24px; text-align: center;">
            <h2 style="color: #b45309; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px; font-weight: 700;">Certificate of Achievement</h2>
            <p style="color: #64748b; font-size: 11px;">PROUDLY PRESENTED TO</p>
            <h3 style="color: #1e3a8a; font-size: 24px; margin: 12px 0;">{{recipient_name}}</h3>
            <p style="color: #475569; font-size: 12px; line-height: 1.6; max-width: 500px; margin: 0 auto;">In recognition of outstanding performance in {{award_title}}.</p>
          </div>
        </div>`,
      });

      bm.add('tc-statement-table', {
        label: 'TC Record Particulars',
        category: 'Certificates & TC',
        content: `<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin: 12px 0;">
          <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; width: 30px; font-weight: bold;">1.</td><td style="padding: 6px; width: 220px; color: #64748b;">Name of Student:</td><td style="padding: 6px; font-weight: bold; color: #1e3a8a;">{{student_name}}</td></tr>
          <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; font-weight: bold;">2.</td><td style="padding: 6px; color: #64748b;">Registration No:</td><td style="padding: 6px; font-family: monospace;">{{registration_no}}</td></tr>
          <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; font-weight: bold;">3.</td><td style="padding: 6px; color: #64748b;">Last Class Studied:</td><td style="padding: 6px; font-weight: bold;">{{last_class_passed}}</td></tr>
          <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; font-weight: bold;">4.</td><td style="padding: 6px; color: #64748b;">Date of Departure:</td><td style="padding: 6px;">{{leaving_date}}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">5.</td><td style="padding: 6px; color: #64748b;">Character & Conduct:</td><td style="padding: 6px; color: #059669; font-weight: bold;">{{conduct}}</td></tr>
        </table>`,
      });

      // Receipt Blocks
      bm.add('receipt-item-table', {
        label: 'Fee Receipt Items',
        category: 'Receipts',
        content: `<div style="margin: 10px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead style="background: #f1f5f9; text-transform: uppercase; color: #475569;">
              <tr><th style="padding: 4px 8px; text-align: left;">SL</th><th style="padding: 4px 8px; text-align: left;">Description</th><th style="padding: 4px 8px; text-align: right;">Amount</th></tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 4px 8px;">1</td><td style="padding: 4px 8px;">Tuition & Term Fee</td><td style="padding: 4px 8px; text-align: right;">{{paid_amount}}</td></tr>
            </tbody>
          </table>
          <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
            <div style="width: 160px; font-size: 10px; display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Total:</span><strong>{{total_amount}}</strong></div>
              <div style="display: flex; justify-content: space-between; color: #059669; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 3px;"><span>Paid:</span><strong>{{paid_amount}}</strong></div>
            </div>
          </div>
        </div>`,
      });

      // Poster Blocks
      bm.add('poster-hero-banner', {
        label: 'Poster Headline & Banner',
        category: 'Posters',
        content: `<div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #1e3a8a, #0f172a); color: white; border-radius: 8px;">
          <span style="background: #3b82f6; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">{{school_name}}</span>
          <h1 style="font-size: 28px; font-weight: 800; margin: 12px 0 6px;">{{poster_title}}</h1>
          <p style="color: #93c5fd; font-size: 13px; margin: 0 0 16px;">{{poster_subtitle}}</p>
          <div style="display: inline-block; background: #2563eb; color: white; font-weight: 600; font-size: 11px; padding: 6px 14px; border-radius: 4px;">{{event_date}}</div>
        </div>`,
      });

      editorRef.current = editor;
      setEditorInstance(editor);
    }

    initGrapes();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!editorInstance) return;
    const canvasFrame = editorInstance.Canvas.getFrameEl();
    if (canvasFrame) {
      const pxWidth = dimensionUnit === 'px' ? dimensionWidth : Math.round(dimensionWidth * 3.7795);
      const pxHeight = dimensionUnit === 'px' ? dimensionHeight : Math.round(dimensionHeight * 3.7795);
      canvasFrame.style.width = `${pxWidth}px`;
      canvasFrame.style.height = `${pxHeight}px`;
      canvasFrame.style.margin = '20px auto';
      canvasFrame.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    }
  }, [editorInstance, dimensionWidth, dimensionHeight, dimensionUnit]);

  const handleSave = async () => {
    if (!editorInstance) return;
    setIsSaving(true);
    try {
      const html = editorInstance.getHtml();
      const css = editorInstance.getCss();
      const projectData = editorInstance.getProjectData();

      const payload = {
        name: template.name,
        category: template.category,
        description: template.description,
        dimension_width: dimensionWidth,
        dimension_height: dimensionHeight,
        dimension_unit: dimensionUnit,
        orientation: orientation,
        grapes_data: projectData,
        html_content: html,
        css_content: css,
        available_merge_tags: template.available_merge_tags || [],
      };

      await onSave(payload);
      toast.success('Template saved successfully.');
    } catch (e) {
      toast.error(e.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPreview = () => {
    if (!editorInstance) return;
    let html = editorInstance.getHtml();
    const css = editorInstance.getCss();

    const tags = template.available_merge_tags || [];
    tags.forEach((item) => {
      const regex = new RegExp(item.tag.replace(/([{}])/g, '\\$1'), 'g');
      html = html.replace(regex, item.sample || item.tag);
    });

    const fullPreview = `
      <style>
        ${css}
        body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      </style>
      <div style="width: ${dimensionWidth}${dimensionUnit}; height: ${dimensionHeight}${dimensionUnit}; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        ${html}
      </div>
    `;

    setPreviewHtml(fullPreview);
    setPreviewModalOpen(true);
  };

  const handleOpenCode = () => {
    if (!editorInstance) return;
    setRawHtml(editorInstance.getHtml());
    setRawCss(editorInstance.getCss());
    setCodeModalOpen(true);
  };

  const copyMergeTag = (tag) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(tag);
      toast.success(`Copied ${tag}`);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <header className="h-12 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href={onExitUrl}
            className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Exit Studio
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <input
            type="text"
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            className="text-xs font-semibold bg-transparent border-b border-transparent hover:border-slate-700 focus:border-slate-400 px-1.5 py-0.5 text-white focus:outline-none transition"
            placeholder="Template Name..."
          />
          <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
            {template.category?.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Center Canvas Dimension Controls */}
        <div className="hidden md:flex items-center gap-2">
          <select
            onChange={(e) => {
              const selected = dimensionPresets.find((p) => p.label === e.target.value);
              if (selected) applyPreset(selected);
            }}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            <option value="">Dimension Presets...</option>
            {dimensionPresets.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
            <span>{dimensionWidth}</span>
            <span>×</span>
            <span>{dimensionHeight}</span>
            <span>{dimensionUnit}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCode}
            className="text-xs px-2.5 py-1 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Code
          </button>
          <button
            type="button"
            onClick={handleOpenPreview}
            className="text-xs px-3 py-1 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs px-3.5 py-1 rounded bg-slate-100 hover:bg-white text-slate-900 font-medium transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </header>

      {/* Merge Tag Helper Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex items-center gap-2 overflow-x-auto shrink-0 z-10 text-[11px]">
        <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px] shrink-0">
          Merge Tags:
        </span>
        <div className="flex items-center gap-1.5 flex-nowrap">
          {(template.available_merge_tags || []).map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => copyMergeTag(t.tag)}
              title={`Sample: ${t.sample || ''} (Click to copy)`}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-mono text-[10px] cursor-pointer transition shrink-0"
            >
              {t.tag}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Area: Left Blocks + Center Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 z-10">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Palette Blocks
            </span>
            <span className="text-[10px] text-slate-500 font-mono">GrapesJS</span>
          </div>
          <div id="gjs-blocks-container" className="flex-1 overflow-y-auto p-2" />
        </aside>

        <main className="flex-1 bg-slate-900 relative overflow-hidden flex flex-col">
          <div ref={containerRef} className="w-full h-full" />
        </main>
      </div>

      {/* Live Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Live Mock Preview</h3>
                <p className="text-[11px] text-slate-500">Populated with sample institutional student/teacher data</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-100">
              <iframe
                title="Template Preview"
                srcDoc={previewHtml}
                className="border border-slate-200 rounded bg-white shadow-xs"
                style={{
                  width: dimensionUnit === 'px' ? `${dimensionWidth}px` : `${dimensionWidth * 3.7795}px`,
                  height: dimensionUnit === 'px' ? `${dimensionHeight}px` : `${dimensionHeight * 3.7795}px`,
                  maxWidth: '100%',
                  maxHeight: '70vh',
                }}
              />
            </div>
            <div className="p-3 border-t border-slate-200 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Inspector Modal */}
      {codeModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab('html')}
                  className={`text-xs font-medium px-2.5 py-1 rounded cursor-pointer ${
                    activeCodeTab === 'html' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  HTML Template
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab('css')}
                  className={`text-xs font-medium px-2.5 py-1 rounded cursor-pointer ${
                    activeCodeTab === 'css' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CSS Styles
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCodeModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-3.5 overflow-auto">
              <textarea
                readOnly
                value={activeCodeTab === 'html' ? rawHtml : rawCss}
                className="w-full h-80 font-mono text-xs bg-slate-950 text-slate-200 p-3 rounded border border-slate-800 focus:outline-none resize-none"
              />
            </div>
            <div className="p-3 border-t border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const content = activeCodeTab === 'html' ? rawHtml : rawCss;
                  navigator.clipboard.writeText(content);
                  toast.success('Code copied to clipboard');
                }}
                className="text-xs px-3 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Copy to Clipboard
              </button>
              <button
                type="button"
                onClick={() => setCodeModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-100 text-slate-900 text-xs font-medium cursor-pointer"
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
