'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

const CATEGORIES = [
  { id: 'all', label: 'All Templates', path: '/developer/templates' },
  { id: 'student_id_card', label: 'Student ID Cards', path: '/developer/templates/student-id-card' },
  { id: 'teacher_id_card', label: 'Teacher ID Cards', path: '/developer/templates/teacher-id-card' },
  { id: 'tc', label: 'Transfer Certificates (TC)', path: '/developer/templates/tc' },
  { id: 'testimonial', label: 'Testimonials', path: '/developer/templates/testimonial' },
  { id: 'certificate', label: 'Academic Certificates', path: '/developer/templates/certificate' },
  { id: 'payment_receipt', label: 'Payment Receipts', path: '/developer/templates/payment-receipt' },
  { id: 'poster', label: 'Website Posters', path: '/developer/templates/poster' },
];

export default function DeveloperTemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // New Template Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('student_id_card');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Fetch templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory && activeCategory !== 'all') {
        params.set('category', activeCategory);
      }
      if (searchTerm) {
        params.set('search', searchTerm);
      }

      const res = await fetch(`/api/marketing/developer/templates?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.records || []);
        setCounts(data.counts || {});
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
    fetchTemplates();
  }, [activeCategory, searchTerm]);

  // Clone Template
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

  // Delete Template
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

  // Seed Default Starter Templates
  const handleSeed = async () => {
    try {
      const res = await fetch('/api/marketing/developer/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Starter templates synchronized successfully.');
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to seed templates');
      }
    } catch {
      toast.error('Error running seeder');
    }
  };

  // Create New Template
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Template name is required.');
      return;
    }

    setIsCreating(true);
    try {
      let width = 86;
      let height = 54;
      let unit = 'mm';
      let orientation = 'landscape';

      if (newCategory === 'student_id_card') {
        width = 54;
        height = 86;
        orientation = 'portrait';
      } else if (newCategory === 'tc' || newCategory === 'testimonial') {
        width = 210;
        height = 297;
        orientation = 'portrait';
      } else if (newCategory === 'certificate') {
        width = 297;
        height = 210;
        orientation = 'landscape';
      } else if (newCategory === 'payment_receipt') {
        width = 210;
        height = 148;
        orientation = 'landscape';
      } else if (newCategory === 'poster') {
        width = 1080;
        height = 1080;
        unit = 'px';
        orientation = 'portrait';
      }

      const res = await fetch('/api/marketing/developer/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory,
          description: newDescription.trim(),
          dimension_width: width,
          dimension_height: height,
          dimension_unit: unit,
          orientation: orientation,
          html_content: `<div style="padding: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; background: white;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 600;">${newName.trim()}</h2>
            <p style="margin: 6px 0 0; color: #64748b; font-size: 12px;">Customize this visual layout in GrapesJS Studio</p>
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

  // Open Preview Modal with Live Data
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

  const totalCount = useMemo(() => {
    return Object.values(counts).reduce((acc, c) => acc + c, 0);
  }, [counts]);

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Template Studio &amp; Design
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create, edit, and maintain institutional document templates via GrapesJS drag-and-drop builder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSeed}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            Seed Defaults
          </button>
          <button
            type="button"
            onClick={() => {
              setNewName('');
              setNewDescription('');
              setNewCategory(activeCategory !== 'all' ? activeCategory : 'student_id_card');
              setIsNewModalOpen(true);
            }}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
          >
            New Template
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Master Templates</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">{totalCount}</span>
            <span className="text-[10px] font-medium text-slate-500">All Categories</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">ID Cards Catalog</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {(counts['student_id_card'] || 0) + (counts['teacher_id_card'] || 0)}
            </span>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Student &amp; Faculty</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Certificates &amp; TC</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {(counts['tc'] || 0) + (counts['testimonial'] || 0) + (counts['certificate'] || 0)}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Academic Passes</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Receipts &amp; Posters</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {(counts['payment_receipt'] || 0) + (counts['poster'] || 0)}
            </span>
            <span className="text-[10px] font-medium text-slate-500">Invoices &amp; Media</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar with Category Select Dropdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Select Type List */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <label htmlFor="category-select" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
              Document Type:
            </label>
            <select
              id="category-select"
              value={activeCategory}
              onChange={(e) => {
                const val = e.target.value;
                setActiveCategory(val);
                router.push(`/developer/templates${val !== 'all' ? `?category=${val}` : ''}`);
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All Templates ({totalCount})</option>
              {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label} ({counts[cat.id] || 0})
                </option>
              ))}
            </select>

            {activeCategory !== 'all' && (
              <Link
                href={CATEGORIES.find((c) => c.id === activeCategory)?.path || `/developer/templates?category=${activeCategory}`}
                className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
                title="Go to dedicated page for this category"
              >
                Open Page
              </Link>
            )}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="py-16 flex justify-center items-center">
          <div className="loader loader-md" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-10 text-center space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No templates found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No templates match your criteria. Create a new master template or restore defaults.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSeed}
              className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium text-xs cursor-pointer"
            >
              Seed Default Templates
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
                  <div className="space-y-1">
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 uppercase font-mono">
                      {tpl.category?.replace(/_/g, ' ')}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                      {tpl.name}
                    </h3>
                  </div>
                  {tpl.is_system_default && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                      Default
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {tpl.description || 'Custom institutional document template.'}
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
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Create New Document Template</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure template metadata and category</p>
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
                  placeholder="e.g. Modern Sapphire Student ID"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 cursor-pointer"
                >
                  <option value="student_id_card">Student ID Card (CR80)</option>
                  <option value="teacher_id_card">Teacher ID Card (CR80)</option>
                  <option value="tc">Transfer Certificate (TC - A4)</option>
                  <option value="testimonial">Testimonial (A4)</option>
                  <option value="certificate">Academic Certificate (A4 Landscape)</option>
                  <option value="payment_receipt">Payment Receipt (Slip / A4)</option>
                  <option value="poster">Website Poster (Square / Banner)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of design..."
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
