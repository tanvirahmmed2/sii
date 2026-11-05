'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlusCircle, FiUploadCloud, FiPaperclip } from 'react-icons/fi';

const NoticeCreateForm = ({ onSuccess, onCancel, endpoint = '/api/notices' }) => {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Please select a valid PDF file.');
        e.target.value = '';
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Notice title is required.');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (pdfFile) {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('is_pinned', isPinned ? 'true' : 'false');
        if (link.trim()) formData.append('drive_url', link.trim());
        formData.append('pdf', pdfFile);

        res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            drive_url: link.trim() || null,
            is_pinned: isPinned,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create notice');
      toast.success('Notice published successfully!');
      if (onSuccess) onSuccess(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <FiPlusCircle className="text-primary" /> Publish Notice Details
        </h2>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Notice Title *
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Mid-Term Examination Routine 2026"
          className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:bg-white focus:border-primary"
        />
      </div>


      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <FiUploadCloud className="text-primary" /> Attach Official PDF (Uploaded to Cloudinary CDN)
        </label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
        />
        {pdfFile && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <FiPaperclip className="w-3.5 h-3.5" />
            <span>Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Optional Drive or External Document Link
        </label>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://drive.google.com/file/d/..."
          className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:bg-white focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-2.5 mt-2">
        <input
          type="checkbox"
          id="isPinned"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
        />
        <label htmlFor="isPinned" className="text-xs font-bold text-slate-500 select-none cursor-pointer">
          Pin this notice to the top of notice bulletin (Featured)
        </label>
      </div>

      <div className="flex justify-end gap-3 mt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          {submitting ? 'Publishing...' : 'Publish Notice'}
        </button>
      </div>
    </form>
  );
};

export default NoticeCreateForm;
