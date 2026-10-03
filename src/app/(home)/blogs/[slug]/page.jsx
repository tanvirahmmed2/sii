'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BiArrowBack,
  BiCalendar,
  BiUser,
  BiBookOpen,
  BiRocket,
  BiImage,
  BiShareAlt,
  BiCheck,
  BiCategory,
} from 'react-icons/bi';

/**
 * Split article content/description evenly by the number of images.
 * Works seamlessly with both HTML and plain-text/markdown content.
 */
function splitContentByImages(content, imageCount) {
  if (!content) return [];
  if (imageCount <= 1) return [content];

  const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    // Split by closing block tags: </p>, </h2>, </h3>, </h4>, </div>, </ul>, </ol>, </blockquote>
    const blocks = content
      .split(/(<\/(?:p|h[1-6]|div|ul|ol|blockquote)>)/i)
      .reduce((acc, curr, idx, arr) => {
        if (idx % 2 === 0) {
          const closingTag = arr[idx + 1] || '';
          const fullBlock = (curr + closingTag).trim();
          if (fullBlock) acc.push(fullBlock);
        }
        return acc;
      }, []);

    if (blocks.length === 0) return [content];

    if (blocks.length <= imageCount) {
      const result = [];
      for (let i = 0; i < imageCount; i++) {
        result.push(blocks[i] || '');
      }
      return result;
    }

    const result = Array.from({ length: imageCount }, () => []);
    const blocksPerBucket = Math.ceil(blocks.length / imageCount);

    blocks.forEach((block, idx) => {
      const bucketIdx = Math.min(Math.floor(idx / blocksPerBucket), imageCount - 1);
      result[bucketIdx].push(block);
    });

    return result.map((bucket) => bucket.join('\n'));
  } else {
    // Plain text: split by double newlines (paragraphs)
    const paragraphs = content
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) return [content];

    if (paragraphs.length <= imageCount) {
      const result = [];
      for (let i = 0; i < imageCount; i++) {
        result.push(paragraphs[i] || '');
      }
      return result;
    }

    const result = Array.from({ length: imageCount }, () => []);
    const parasPerBucket = Math.ceil(paragraphs.length / imageCount);

    paragraphs.forEach((p, idx) => {
      const bucketIdx = Math.min(Math.floor(idx / parasPerBucket), imageCount - 1);
      result[bucketIdx].push(p);
    });

    return result.map((bucket) => bucket.join('\n\n'));
  }
}

export default function SingleBlogPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams?.slug;

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedZoomImage, setSelectedZoomImage] = useState(null);

  useEffect(() => {
    if (!slug) return;

    const fetchBlog = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/marketing/blogs?slug=${encodeURIComponent(slug)}`);
        const data = res.ok ? await res.json() : { success: false };
        if (data.success && data.blog) {
          setBlog(data.blog);
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
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center mx-auto animate-spin text-2xl">
            <BiRocket />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading article details...</p>
        </div>
      </main>
    );
  }

  if (error || !blog) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center mx-auto text-2xl">
            <BiBookOpen />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Article Unavailable</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || 'The requested article could not be found or has not been published.'}
          </p>
          <Link
            href="/blogs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiArrowBack /> Back to Articles Directory
          </Link>
        </div>
      </main>
    );
  }

  // Calculate and extract all images attached to the blog
  const rawGallery = Array.isArray(blog.images) ? blog.images : [];
  const images = [];
  rawGallery.forEach((img) => {
    const url = img.image_url || img.image;
    if (url && !images.some((i) => i.url === url)) {
      images.push({
        url,
        title: img.title || img.alt_text || img.caption || blog.title,
        caption: img.caption || '',
      });
    }
  });

  const coverUrl = blog.cover_image || blog.image;
  if (coverUrl && !images.some((i) => i.url === coverUrl)) {
    images.unshift({ url: coverUrl, title: blog.title, caption: '' });
  }

  const imageCount = images.length;
  const contentChunks = splitContentByImages(blog.content, imageCount);

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
    <main className="min-h-screen bg-slate-50/70 dark:bg-slate-950/70 pb-16">
      {/* 1. TOP: BRIEF DESCRIPTION / SUMMARY ON TOP */}
      {(blog.summary || blog.excerpt) && (
        <section className="bg-primary-light dark:bg-primary-dark border-b border-primary/20 dark:border-primary-dark/30 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 shadow-xs">
          <div className="max-w-4xl mx-auto text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Brief Overview
            </span>
            <p className="text-lg sm:text-2xl font-medium text-slate-900 dark:text-dark leading-relaxed tracking-tight">
              &ldquo;{blog.summary || blog.excerpt}&rdquo;
            </p>
          </div>
        </section>
      )}

      <div className="w-full py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
        {/* 2. THEN: TITLE & METADATA */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {blog.category && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                <BiCategory className="text-xs" /> {blog.category}
              </span>
            )}
            {blog.author_name && (
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <BiUser className="text-primary text-xs" /> {blog.author_name}
              </span>
            )}
            {publishedDate && (
              <span className="flex items-center gap-1">
                <BiCalendar className="text-xs" /> {publishedDate}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {blog.title}
            </h1>

            <button
              type="button"
              onClick={handleShare}
              className="self-start sm:self-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Share article link"
            >
              {copied ? <BiCheck className="text-emerald-500 text-base" /> : <BiShareAlt className="text-base" />}
              <span>{copied ? 'Link Copied!' : 'Share Article'}</span>
            </button>
          </div>
        </section>

        {/* 3. THEN: INTERLEAVED IMAGE AND SPLIT DESCRIPTION */}
        <section className="space-y-12">
          {imageCount > 0 ? (
            images.map((img, idx) => (
              <article key={idx} className="space-y-6">
                {/* Image */}
                <div
                  className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer group"
                  onClick={() => setSelectedZoomImage(img)}
                  title="Click to view full image"
                >
                  <Image
                    src={img.url}
                    alt={img.title || blog.title || `Article Image ${idx + 1}`}
                    fill
                    priority={idx === 0}
                    sizes="(max-width: 1200px) 100vw, 1200px"
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-xs text-white">
                      {img.caption}
                    </div>
                  )}
                </div>

                {/* Description chunk corresponding to this image */}
                {contentChunks[idx] && (
                  <div className="prose prose-slate dark:prose-invert max-w-none text-base text-slate-700 dark:text-slate-300 leading-relaxed font-sans [&_p]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-secondary [&_blockquote]:pl-4 [&_blockquote]:italic">
                    {isHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: contentChunks[idx] }} />
                    ) : (
                      <div className="whitespace-pre-line">{contentChunks[idx]}</div>
                    )}
                  </div>
                )}
              </article>
            ))
          ) : (
            // Fallback when no images exist
            <article className="prose prose-slate dark:prose-invert max-w-none text-base text-slate-700 dark:text-slate-300 leading-relaxed font-sans [&_p]:mb-4">
              {isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: blog.content }} />
              ) : (
                <div className="whitespace-pre-line">{blog.content}</div>
              )}
            </article>
          )}

          {/* Any remaining chunks beyond the image count (if applicable) */}
          {contentChunks.length > imageCount && (
            <div className="prose prose-slate dark:prose-invert max-w-none text-base text-slate-700 dark:text-slate-300 leading-relaxed font-sans [&_p]:mb-4">
              {contentChunks.slice(imageCount).map((rem, i) => (
                isHtml ? (
                  <div key={i} dangerouslySetInnerHTML={{ __html: rem }} />
                ) : (
                  <div key={i} className="whitespace-pre-line">{rem}</div>
                )
              ))}
            </div>
          )}
        </section>

        {/* 4. Full image zoom modal */}
        {selectedZoomImage && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
            onClick={() => setSelectedZoomImage(null)}
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden p-3 shadow-2xl relative border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-[70vh]">
                <Image
                  src={selectedZoomImage.url}
                  alt={selectedZoomImage.title || 'Full image preview'}
                  fill
                  sizes="100vw"
                  className="object-contain rounded-2xl"
                />
              </div>
              {selectedZoomImage.caption && (
                <p className="text-center text-xs text-slate-600 dark:text-slate-300 font-medium py-3">
                  {selectedZoomImage.caption}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 5. Bottom Navigation */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <BiArrowBack className="text-base" /> Back to Articles Directory
          </Link>
        </div>
      </div>
    </main>
  );
}
