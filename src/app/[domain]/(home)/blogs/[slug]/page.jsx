'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function SingleBlogPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams?.slug;
  const { website, tenantUrl } = useTenantWebsite();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchBlog = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/marketing/blogs?slug=${encodeURIComponent(slug)}`);
        const data = res.ok ? await res.json() : { success: false };
        if (data.success && (data.blog || data.record)) {
          setBlog(data.blog || data.record);
        } else {
          setError(data.error || 'Article not found or unpublished.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load article.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center py-20">
        <span className="text-xs font-medium text-slate-400">Loading article...</span>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-md p-6 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
            [Article Unavailable]
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Article Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || 'The requested article could not be located in this archive.'}
          </p>
          <div className="pt-2">
            <Link
              href={tenantUrl('/blogs')}
              className="inline-block px-4 py-2 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              ← Back to Articles Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const coverUrl = blog.cover_image || blog.image;
  const publishedDate = blog.published_at
    ? new Date(blog.published_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : blog.created_at
    ? new Date(blog.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const isHtml = /<\/?[a-z][\s\S]*>/i.test(blog.content || '');

  return (
    <div className="w-full min-h-screen py-8 md:py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-4">
          <Link
            href={tenantUrl('/blogs')}
            className="hover:text-primary transition-colors font-medium"
          >
            ← Back to Articles
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
              {blog.slug}
            </span>
            <button
              type="button"
              onClick={handleShare}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
            >
              {copied ? '[Link Copied]' : 'Share Link'}
            </button>
          </div>
        </div>

        {/* Article Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {blog.category && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-medium">
                {blog.category}
              </span>
            )}
            {blog.author_name && (
              <span className="font-medium text-slate-700 dark:text-slate-300">
                By {blog.author_name}
              </span>
            )}
            {publishedDate && <span>• {publishedDate}</span>}
          </div>

          <h1 className="text-2xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
            {blog.title}
          </h1>

          {(blog.summary || blog.excerpt) && (
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-2 border-primary/40 pl-3 pt-1">
              &ldquo;{blog.summary || blog.excerpt}&rdquo;
            </p>
          )}
        </div>

        {/* Featured Cover Image */}
        {coverUrl && (
          <div className="aspect-16/9 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Body Content */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs">
          {isHtml ? (
            <div
              className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans [&_p]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          ) : (
            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-sans">
              {blog.content}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <Link
            href={tenantUrl('/blogs')}
            className="text-primary hover:underline font-medium"
          >
            ← Back to All Articles
          </Link>
          <span className="text-slate-400">
            {website?.name || 'Academic Editorial Board'}
          </span>
        </div>

      </div>
    </div>
  );
}
