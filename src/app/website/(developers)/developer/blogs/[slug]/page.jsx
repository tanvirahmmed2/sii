'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiArrowBack,
  BiTrash,
  BiLinkExternal,
  BiLoaderAlt,
  BiFile,
} from 'react-icons/bi';
import BlogForm from '@/components/developer/forms/BlogForm';

export default function BlogDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [blog, setBlog] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchBlog = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/developer/blogs/${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.success && data.record) {
        setBlog(data.record);
      } else {
        setError(data.error || 'Blog article not found');
      }

      const appsRes = await fetch('/api/developer/apps');
      const appsData = await appsRes.json();
      if (appsData.apps) setApps(appsData.apps);
      else if (appsData.records) setApps(appsData.records);
    } catch (err) {
      console.error('Error fetching blog details:', err);
      setError(err.message || 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!slug) return;

    fetch(`/api/developer/blogs/${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success && data.record) {
          setBlog(data.record);
        } else {
          setError(data.error || 'Blog article not found');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load article');
        setLoading(false);
      });

    fetch('/api/developer/apps')
      .then((res) => res.json())
      .then((appsData) => {
        if (!active) return;
        if (appsData.apps) setApps(appsData.apps);
        else if (appsData.records) setApps(appsData.records);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [slug]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${blog?.title}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/developer/blogs/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/developer/blogs');
      } else {
        alert(data.error || 'Failed to delete blog article');
      }
    } catch (err) {
      alert(err.message || 'Error deleting article');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateSuccess = (updated) => {
    if (updated?.slug && updated.slug !== slug) {
      router.push(`/developer/blogs/${updated.slug}`);
    } else {
      fetchBlog();
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <BiLoaderAlt className="text-4xl animate-spin text-secondary" />
        <span className="text-xs font-semibold">Loading article form...</span>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center text-2xl">
          <BiFile />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Article Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {error || `No blog article matching slug "${slug}" exists in the system.`}
        </p>
        <Link
          href="/developer/blogs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all"
        >
          <BiArrowBack />
          <span>Return to Blogs</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/developer" className="hover:text-secondary">Dashboard</Link>
            <span>/</span>
            <Link href="/developer/blogs" className="hover:text-secondary">Blogs</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{blog.title || 'Article'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center text-xl shrink-0">
              <BiFile />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Edit Article
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-lg">
                Update content, featured media, and publication status for &quot;{blog.title}&quot;
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/developer/blogs"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
          >
            <BiArrowBack className="text-base" />
            <span>All Blogs</span>
          </Link>

          {blog.is_published && (
            <a
              href={`/blogs/${blog.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
            >
              <BiLinkExternal className="text-base" />
              <span>Public View</span>
            </a>
          )}

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Delete this article permanently"
          >
            {deleting ? <BiLoaderAlt className="animate-spin text-base" /> : <BiTrash className="text-base" />}
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Direct Update Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <BlogForm
          blog={blog}
          initialData={blog}
          apps={apps}
          onSuccess={handleUpdateSuccess}
          onCancel={() => router.push('/developer/blogs')}
        />
      </div>
    </div>
  );
}
