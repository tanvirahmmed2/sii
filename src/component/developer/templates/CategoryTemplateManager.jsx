'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function CategoryTemplateManager({
  category,
  title,
  description,
  defaultDimensions = { width: 86, height: 54, unit: 'mm', orientation: 'landscape' },
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // New Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category });
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      const res = await fetch(`/api/marketing/developer/templates?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.records || []);
      } else {
        toast.error(data.error || 'Failed to fetch templates');
      }
    } catch {
      toast.error('Network error loading templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [category, searchTerm]);

  // Clone template
  const handleClone = async (id, name) => {
    try {
      const res = await fetch(`/api/marketing/developer/templates/${id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Duplicated "${name}" successfully.`);
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to duplicate');
      }
    } catch {
      toast.error('Error duplicating template');
    }
  };

  // Delete template
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete template "${name}"?`)) return;
    try {
      const res = await fetch(`/api/marketing/developer/templates/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted template "${name}".`);
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to delete template');
      }
    } catch {
      toast.error('Error deleting template');
    }
  };

  // Create new template
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Template name is required.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/marketing/developer/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          category,
          description: newDescription.trim(),
          dimension_width: defaultDimensions.width,
          dimension_height: defaultDimensions.height,
          dimension_unit: defaultDimensions.unit,
          orientation: defaultDimensions.orientation,
          html_content: `<div style="padding: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; background: white;">
            <h2 style="margin: 0; font-size: 16px; font-weight: 600;">${newName.trim()}</h2>
            <p style="margin: 6px 0 0; color: #64748b; font-size: 11px;">Customize this visual layout in GrapesJS Studio</p>
          </div>`,
          css_content: '',
        }),
      });

      const data = await res.json();
      if (data.success && data.record) {
        toast.success('Template created. Opening Studio...');
        setIsNewModalOpen(false);
        router.push(`/developer/templates/builder/${data.record.id}`);
      } else {
        toast.error(data.error || 'Failed to create template');
      }
    } catch {
      toast.error('Error creating template');
    } finally {
      setIsCreating(false);
    }
  };

  // Open Preview
  const handleOpenPreview = async (tpl) => {
    try {
      const res = await fetch(`/api/marketing/developer/templates/${tpl.id}`);
      const data = await res.json();
      if (data.success && data.record) {
        const fullTpl = data.record;
        let html = fullTpl.html_content || '';
        const css = fullTpl.css_content || '';

        const tags = Array.isArray(fullTpl.available_merge_tags) ? fullTpl.available_merge_tags : [];
        tags.forEach((item) => {
          const regex = new RegExp(item.tag.replace(/([{}])/g, '\\$1'), 'g');
          html = html.replace(regex, item.sample || item.tag);
        });

        const frameHtml = `
          <style>
            ${css}
            body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          </style>
          <div style="width: ${fullTpl.dimension_width}${fullTpl.dimension_unit}; height: ${fullTpl.dimension_height}${fullTpl.dimension_unit}; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background: #ffffff;">
            ${html}
          </div>
        `;

        setPreviewTemplate({ ...fullTpl, frameHtml });
      } else {
        toast.error('Could not fetch template preview');
      }
    } catch {
      toast.error('Error loading preview');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/developer/templates"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Templates
            </Link>
            <span className="text-xs text-slate-400">/</span>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/developer/templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors"
          >
            All Categories
          </Link>
          <button
            type="button"
            onClick={() => {
              setNewName('');
              setNewDescription('');
              setIsNewModalOpen(true);
            }}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
          >
            New Template
          </button>
        </div>
      </div>

      {/* KPI Stats & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Total Designs:</span>
            <span className="font-mono font-medium text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              {templates.length}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500">Default Spec:</span>
            <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
              {defaultDimensions.width} × {defaultDimensions.height} {defaultDimensions.unit} ({defaultDimensions.orientation})
            </span>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder={`Search ${title}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Templates List Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-10 text-center space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No {title} templates found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Get started by creating a new visual layout using the GrapesJS drag-and-drop studio.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setNewName('');
                setNewDescription('');
                setIsNewModalOpen(true);
              }}
              className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium text-xs cursor-pointer"
            >
              Create First Template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {tpl.name}
                  </h3>
                  {tpl.is_system_default && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                      Default
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {tpl.description || 'Institutional document template.'}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-500">
                  <span className="bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {tpl.dimension_width} × {tpl.dimension_height} {tpl.dimension_unit}
                  </span>
                  <span className="bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase">
                    {tpl.orientation}
                  </span>
                  <span className="bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {Array.isArray(tpl.available_merge_tags) ? tpl.available_merge_tags.length : 0} tags
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(tpl)}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  Preview
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleClone(tpl.id, tpl.name)}
                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
                  >
                    Clone
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    className="px-2 py-1 rounded border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 font-medium text-xs transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                  <Link
                    href={`/developer/templates/builder/${tpl.id}`}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors"
                  >
                    Edit Studio
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Template Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-lg max-w-md w-full p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">New {title} Template</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure layout metadata</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. Modern ${title} Layout`}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Design overview..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Open Studio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{previewTemplate.name}</h3>
                <p className="text-[11px] text-slate-500">Live preview with sample institutional variables</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              <iframe
                title="Preview"
                srcDoc={previewTemplate.frameHtml}
                className="border border-slate-200 dark:border-slate-700 rounded bg-white shadow-xs"
                style={{
                  width:
                    previewTemplate.dimension_unit === 'px'
                      ? `${previewTemplate.dimension_width}px`
                      : `${previewTemplate.dimension_width * 3.7795}px`,
                  height:
                    previewTemplate.dimension_unit === 'px'
                      ? `${previewTemplate.dimension_height}px`
                      : `${previewTemplate.dimension_height * 3.7795}px`,
                  maxWidth: '100%',
                  maxHeight: '70vh',
                }}
              />
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <span className="text-[11px] text-slate-500 font-mono">
                {previewTemplate.dimension_width} × {previewTemplate.dimension_height} {previewTemplate.dimension_unit} ({previewTemplate.orientation})
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/developer/templates/builder/${previewTemplate.id}`}
                  className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium text-xs cursor-pointer"
                >
                  Edit in Studio
                </Link>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
