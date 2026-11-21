'use client';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlusCircle } from 'react-icons/fi';
const NewsCreateForm = ({ onSuccess, onCancel }: any) => {
    const [title, setTitle] = useState<any>('');
    const [slug, setSlug] = useState<any>('');
    const [image, setImage] = useState<any>(null);
    const [content, setContent] = useState<any>('');
    const [submitting, setSubmitting] = useState<any>(false);
    const handleFileChange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result);
            };
            reader.onerror = () => {
                toast.error('Failed to read image file.');
            };
            reader.readAsDataURL(file);
        }
    };
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            toast.error('Title and content are required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, slug, image, content })
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || 'Failed to publish news.');
            toast.success(data.message || 'News article published successfully!');
            if (onSuccess)
                onSuccess();
        }
        catch (err: any) {
            toast.error(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FiPlusCircle className="text-primary"/> Write News Article
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">News Title *</label>
          <input type="text" required value={title} onChange={(e: any) => setTitle(e.target.value)} className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">SEO URL Slug (Optional)</label>
          <input type="text" value={slug} onChange={(e: any) => setSlug(e.target.value)} className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"/>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cover Image File</label>
        <input type="file" accept="image/*" onChange={handleFileChange} className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-850 outline-none cursor-pointer file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary-light"/>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Article Body Content *</label>
        <textarea required rows={8} value={content} onChange={(e: any) => setContent(e.target.value)} className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"/>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (<button type="button" onClick={onCancel} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all cursor-pointer">
            Cancel
          </button>)}
        <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-secondary rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-60">
          {submitting ? 'Publishing...' : 'Publish Article'}
        </button>
      </div>
    </form>);
};
export default NewsCreateForm;
