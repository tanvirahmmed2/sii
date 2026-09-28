'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiFileText, FiImage, FiExternalLink, FiCalendar, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import NewsCreateForm from '@/component/forms/NewsCreateForm';

const RegistrarNewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        setNews(data.paylod?.news || []);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleDelete = async (id, title) => {
    const confirm = window.confirm(`Are you sure you want to delete "${title}"?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/news/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete news article');
      toast.success(data.message || 'News article deleted successfully');
      setNews(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest">
            Registrar Panel
          </span>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            Campus News Registry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish official announcements, academic achievements, or events articles on the portal.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer"
        >
          {showAddForm ? (
            <>
              <FiX className="text-lg" /> Cancel
            </>
          ) : (
            <>
              <FiPlus className="text-lg" /> Write Article
            </>
          )}
        </button>
      </div>

      {showAddForm ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] max-w-3xl">
          <NewsCreateForm
            onSuccess={() => {
              setShowAddForm(false);
              fetchNews();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-slate-400">Loading published news...</span>
            </div>
          ) : news.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-650">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pl-6">Cover</th>
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Article Title</th>
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">URL Slug</th>
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400">Published Date</th>
                    <th className="p-4 font-semibold uppercase text-[10px] tracking-wider text-slate-400 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-800">
                  {news.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 pl-6">
                        {item.image ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                            <FiImage className="text-sm" />
                          </div>
                        )}
                      </td>
                      <td className="p-4 max-w-xs md:max-w-sm">
                        <div className="truncate font-semibold text-slate-900">{item.title}</div>
                        <div className="truncate text-slate-450 text-[10px] mt-0.5 max-w-[260px] font-medium">{item.content}</div>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-slate-500">{item.slug}</td>
                      <td className="p-4 text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <FiCalendar />
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-3.5">
                          <Link
                            href={`/news/${item.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-primary hover:text-sky-850 text-[11px] font-bold"
                          >
                            <span>View</span>
                            <FiExternalLink />
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="text-red-500 hover:text-red-750 transition-colors cursor-pointer"
                            title="Delete news article"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
                <FiFileText />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No news published</h3>
              <p className="text-slate-500 text-xs mt-1">
                Campus news articles published by registrar or administration will show here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RegistrarNewsPage;
