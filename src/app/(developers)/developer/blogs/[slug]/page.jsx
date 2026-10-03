'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import BlogForm from 'src/component/marketing/developer/forms/BlogForm';
import {
  BiBookContent,
  BiArrowBack,
  BiTrash,
  BiLinkExternal,
  BiErrorCircle,
  BiRefresh,
} from 'react-icons/bi';

export default function BlogDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchBlog = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/marketing/developer/blogs/${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.success && data.record) {
        setBlog(data.record);
      } else {
        setError(data.error || 'Blog article not found');
      }
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

    fetch(`/api/marketing/developer/blogs/${encodeURIComponent(slug)}`)
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
      const res = await fetch(`/api/marketing/developer/blogs/${encodeURIComponent(slug)}`, {
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
    if (updated?.id && String(slug) !== String(updated.id)) {
      router.replace(`/developer/blogs/${updated.id}`);
    } else {
      fetchBlog();
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <BiRefresh className="text-3xl animate-spin text-blue-600" />
        <span className="text-xs font-normal">Loading article form...</span>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-500 mx-auto flex items-center justify-center text-2xl">
          <BiErrorCircle />
        </div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Article Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {error || 'The requested blog article was not found in the system.'}
        </p>
        <Link
          href="/developer/blogs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition-all"
        >
          <BiArrowBack className="text-sm" />
          <span>Return to Blogs</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-normal text-slate-500 dark:text-slate-400">
            <Link href="/developer" className="hover:text-blue-600 dark:hover:text-blue-400">Dashboard</Link>
            <span>/</span>
            <Link href="/developer/blogs" className="hover:text-blue-600 dark:hover:text-blue-400">Blogs</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{blog.title || 'Article'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center text-xl shrink-0">
              <BiBookContent />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white tracking-tight">
                Edit Article
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-lg">
                Update content, featured media, category, and SEO metadata for &quot;{blog.title}&quot;
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/developer/blogs"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-all"
          >
            <BiArrowBack className="text-sm" />
            <span>All Blogs</span>
          </Link>

          {blog.is_published && (
            <a
              href={`/blogs/${blog.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-all"
            >
              <BiLinkExternal className="text-sm" />
              <span>Public View</span>
            </a>
          )}

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            title="Delete this article permanently"
          >
            <BiTrash className="text-sm" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Direct Update Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 shadow-xs">
        <BlogForm
          blog={blog}
          initialData={blog}
          onSuccess={handleUpdateSuccess}
          onCancel={() => router.push('/developer/blogs')}
        />
      </div>
    </div>
  );
}
