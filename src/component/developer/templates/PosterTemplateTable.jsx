'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function PosterTemplateTable() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // New Template Modal State with manual dimensions
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newWidth, setNewWidth] = useState(1080);
  const [newHeight, setNewHeight] = useState(1080);
  const [newUnit, setNewUnit] = useState('px');
  const [isCreating, setIsCreating] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ task: 'poster' });
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      const res = await fetch(`/api/marketing/developer/templates?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.records || []);
      } else {
        toast.error(data.error || 'Failed to fetch poster templates');
      }
    } catch {
      toast.error('Network error loading poster templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [searchTerm]);

  const handleClone = async (id, name) => {
    try {
      const res = await fetch(`/api/marketing/developer/templates/${id}?task=poster`, {
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/marketing/developer/templates/${id}?task=poster`, {
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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error('Template name is required');

    setIsCreating(true);
    try {
      const res = await fetch('/api/marketing/developer/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'poster',
          name: newName.trim(),
          description: newDescription.trim(),
          dimension_width: parseFloat(newWidth) || 1080,
          dimension_height: parseFloat(newHeight) || 1080,
          dimension_unit: newUnit,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Template created! Opening Studio...');
        setIsNewModalOpen(false);
        setNewName('');
        setNewDescription('');
        router.push(`/developer/templates/poster/builder/${data.record.id}`);
      } else {
        toast.error(data.error || 'Failed to create poster template');
      }
    } catch {
      toast.error('Error creating template');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Website &amp; Event Poster Templates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Design promotional posters, admission announcements, science fairs, and campus event graphics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-3.5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            + Create Poster Template
          </button>
        </div>
      </div>

      {/* Staff Panel Transition Notice */}
      <div className="p-3.5 rounded bg-sky-950/40 border border-sky-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sky-200">
        <div>
          <span className="font-semibold text-sky-300">Staff Portal Feature Available:</span> Institutional staff can design, customize, save, and download posters as PDF and high-res JPEG directly inside their campus staff portal.
        </div>
        <Link
          href="/staff-panel/posters"
          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium shrink-0 text-center transition-colors"
        >
          View Staff Poster Studio
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded">
        <div className="w-full max-w-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search poster templates..."
            className="w-full px-3 py-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {templates.length} template{templates.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">
          Loading poster templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-300 dark:border-slate-800 rounded text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            No poster templates found.
          </p>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="mt-3 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium cursor-pointer"
          >
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    ID #{tpl.id}
                  </span>
                  {tpl.is_system_default && (
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Default
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {tpl.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {tpl.description || 'Square promotional banner/poster layout for web publication.'}
                </p>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 pt-1">
                  <span>{tpl.dimension_width}x{tpl.dimension_height} {tpl.dimension_unit}</span>
                  <span>•</span>
                  <span className="capitalize">{parseFloat(tpl.dimension_width) >= parseFloat(tpl.dimension_height) ? 'Landscape' : 'Portrait'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-4">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleClone(tpl.id, tpl.name)}
                    className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    className="px-2 py-1 text-[11px] rounded border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>

                <Link
                  href={`/developer/templates/poster/builder/${tpl.id}`}
                  className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium cursor-pointer"
                >
                  Edit in Studio
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Create Website Poster Template
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Admission Open Announcement"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Campaign highlights or social media description..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Manual dimensions controls */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Manual Size &amp; Orientation
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Width</label>
                    <input
                      type="number"
                      step="1"
                      value={newWidth}
                      onChange={(e) => setNewWidth(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Height</label>
                    <input
                      type="number"
                      step="1"
                      value={newHeight}
                      onChange={(e) => setNewHeight(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Unit</label>
                    <select
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="px">px</option>
                      <option value="mm">mm</option>
                      <option value="in">in</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Orientation</label>
                    <button
                      type="button"
                      onClick={() => {
                        const tempW = newWidth;
                        setNewWidth(newHeight);
                        setNewHeight(tempW);
                      }}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                      title="Click to swap dimensions"
                    >
                      <span className="capitalize">{parseFloat(newWidth) >= parseFloat(newHeight) ? 'Landscape' : 'Portrait'}</span>
                      <span className="text-[10px] text-slate-400">⇄ Swap</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create & Open Studio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
