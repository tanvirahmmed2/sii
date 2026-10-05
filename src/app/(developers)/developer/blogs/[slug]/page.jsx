'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import BlogForm from 'src/component/marketing/developer/forms/BlogForm';

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
      <div className="w-full py-16 text-center text-slate-400">
        <span className="text-xs font-normal">Loading article form...</span>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded p-6 text-center space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Article Not Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || 'The requested blog article was not found in the system.'}
        </p>
        <Link
          href="/developer/blogs"
          className="inline-flex items-center px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium"
        >
          Return to Blogs
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link href="/developer" className="hover:text-slate-800">Dashboard</Link>
            <span>/</span>
            <Link href="/developer/blogs" className="hover:text-slate-800">Blogs</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium truncate max-w-[200px]">{blog.title || 'Article'}</span>
          </div>

          <h1 className="text-base font-semibold text-slate-900">
            Edit Article
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
            Update content, featured media, category, and SEO metadata for &quot;{blog.title}&quot;
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/developer/blogs"
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            All Blogs
          </Link>

          {blog.is_published && (
            <a
              href={`/blogs/${blog.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              Public View
            </a>
          )}

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="px-3 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Direct Update Form */}
      <div className="bg-white border border-slate-200 rounded p-4">
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
