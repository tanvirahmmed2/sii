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
  BiRightArrowAlt,
  BiShareAlt,
  BiCheck,
  BiPalette,
  BiGridAlt,
  BiPackage,
} from 'react-icons/bi';

export default function SingleBlogPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams?.slug;

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  useEffect(() => {
    if (!slug) return;

    const fetchBlog = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/blogs?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
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

  const rawGallery = Array.isArray(blog.images) ? blog.images : [];
  // Build unified images array from blogs_image (or fallback cover_image)
  const images = [];
  rawGallery.forEach((img) => {
    const url = img.image_url || img.image;
    if (url && !images.some((i) => i.url === url)) {
      images.push({ url, title: img.title || img.alt_text || img.caption || blog.title });
    }
  });
  if (blog.cover_image && !images.some((i) => i.url === blog.cover_image)) {
    images.unshift({ url: blog.cover_image, title: blog.title });
  }

  const currentImgObj = images[activeImageIndex] || images[0] || null;
  const activeImage = currentImgObj?.url || null;

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
    <main className="min-h-screen bg-slate-50/70 dark:bg-slate-950/70">
      <div className="w-full space-y-10">
        {/* 1. TOP: Summary Banner (matching /apps/[slug]) */}
        {blog.summary && (
          <section className="bg-primary-light dark:bg-primary-dark border border-primary/20 dark:border-primary-dark/30 p-6 sm:p-8 shadow-xs space-y-3">
            <p className="text-lg text-center sm:text-2xl font-semibold py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-slate-900 dark:text-dark leading-relaxed tracking-tight">
              {blog.summary}
            </p>
          </section>
        )}

        <div className="w-full py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-10">
          {/* 2. THEN: IMAGE SHOWCASE & THUMBNAILS */}
          <section className="bg-white dark:bg-slate-900">
            <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/40 dark:border-slate-800 flex items-center justify-center">
              {activeImage ? (
                <Image
                  src={activeImage}
                  alt={blog.title || 'Article Image'}
                  fill
                  priority
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover"
                />
              ) : (
                <div className="text-slate-400 dark:text-slate-500 text-sm flex items-center gap-2">
                  <BiImage className="text-2xl" /> Visual Preview Unavailable
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto py-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      idx === activeImageIndex
                        ? 'border-secondary shadow-md scale-105'
                        : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`Show image ${idx + 1}`}
                  >
                    <Image
                      src={img.url}
                      alt={img.title || blog.title || 'Thumbnail'}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 3. THEN: TITLE & ACTIONS */}
          <section className="">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {blog.app_title && (
                    <Link
                      href={`/apps/${blog.app_slug}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 transition-colors"
                    >
                      <BiRocket className="text-xs" /> {blog.app_title}
                    </Link>
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

                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {blog.title}
                </h1>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pt-1">
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <BiCheck className="text-emerald-500 text-base" /> : <BiShareAlt className="text-base" />}
                  <span>{copied ? 'Link Copied!' : 'Share Article'}</span>
                </button>

                {blog.app_slug && (
                  <Link
                    href={`/apps/${blog.app_slug}`}
                    className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View App</span>
                    <BiRightArrowAlt className="text-base" />
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* 4. THEN: FULL DESCRIPTION / CONTENT */}
          <section className="">
            {blog.content ? (
              isHtml ? (
                <div
                  className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_blockquote]:border-l-4 [&_blockquote]:border-secondary [&_blockquote]:pl-4 [&_blockquote]:italic [&_p]:mb-4"
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />
              ) : (
                <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                  {blog.content}
                </div>
              )
            ) : (
              <p className="text-xs text-slate-500 italic">No article content available.</p>
            )}
          </section>

          {/* 5. THEN: ARTICLE VISUAL GALLERY (if attached images exist) */}
          {rawGallery.length > 0 && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <BiImage className="text-secondary text-2xl" />
                    <span>Article Visual Gallery</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Screenshots, architecture diagrams, and illustrative assets attached to this article.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {rawGallery.length} Image{rawGallery.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rawGallery.map((img) => (
                  <div
                    key={img.id}
                    className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 hover:border-secondary/40 transition-all shadow-xs flex flex-col justify-between gap-3 group cursor-pointer"
                    onClick={() => setSelectedGalleryImage(img)}
                  >
                    <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-slate-900">
                      <Image
                        src={img.image_url}
                        alt={img.alt_text || blog.title || 'Gallery image'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    {(img.alt_text || img.caption) && (
                      <div className="px-1 text-xs space-y-0.5">
                        {img.alt_text && (
                          <div className="font-semibold text-slate-900 dark:text-white">{img.alt_text}</div>
                        )}
                        {img.caption && (
                          <div className="text-slate-500 dark:text-slate-400 italic text-[11px]">&ldquo;{img.caption}&rdquo;</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Modal for full image zoom */}
          {selectedGalleryImage && (
            <div
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
              onClick={() => setSelectedGalleryImage(null)}
            >
              <div
                className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden p-3 shadow-2xl relative border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative w-full h-[70vh]">
                  <Image
                    src={selectedGalleryImage.image_url}
                    alt={selectedGalleryImage.alt_text || 'Full image'}
                    fill
                    sizes="100vw"
                    className="object-contain rounded-2xl"
                  />
                </div>
                {selectedGalleryImage.caption && (
                  <p className="text-center text-xs text-slate-600 dark:text-slate-300 font-medium py-3">
                    {selectedGalleryImage.caption}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 6. THEN: EXPLORE ECOSYSTEM CARDS (matching /apps/[slug]) */}
          <section className="space-y-6 pt-2">
            <div className="pb-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                Explore More Solutions
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Browse turnkey applications and responsive design themes to expand your web presence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Go to Themes Card */}
              <div className="bg-linear-to-br from-primary/10 via-white dark:via-slate-900 to-primary-dark/10 border border-primary/20 dark:border-primary/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-xs hover:shadow-lg transition-all group">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary-dark dark:text-primary-light border border-primary/20 flex items-center justify-center text-2xl font-semibold">
                    <BiPalette />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                      Explore Themes
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Browse modern, responsive themes built for creator storefronts, portfolios, and blogs with fluid styling.
                    </p>
                  </div>
                </div>

                <Link
                  href="/themes"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-slate-950 dark:text-white font-semibold text-xs sm:text-sm shadow-md transition-all group-hover:gap-3 cursor-pointer"
                >
                  <span>Go to Themes</span>
                  <BiRightArrowAlt className="text-lg" />
                </Link>
              </div>

              {/* Go to Applications Card */}
              <div className="bg-linear-to-br from-secondary/10 via-white dark:via-slate-900 to-secondary-dark/10 border border-secondary/20 dark:border-secondary/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-xs hover:shadow-lg transition-all group">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center text-2xl font-semibold">
                    <BiGridAlt />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                      {blog.app_title ? `About ${blog.app_title}` : 'Turnkey Applications'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {blog.app_title
                        ? `Deploy ${blog.app_title} with integrated databases, instant hosting, and customized components.`
                        : 'Explore all pre-integrated ecosystem applications ready to deploy to your workspace.'}
                    </p>
                  </div>
                </div>

                <Link
                  href={blog.app_slug ? `/apps/${blog.app_slug}` : '/apps'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-semibold text-xs sm:text-sm shadow-md transition-all group-hover:gap-3 cursor-pointer"
                >
                  <span>{blog.app_title ? `Explore ${blog.app_title}` : 'Browse Apps'}</span>
                  <BiRightArrowAlt className="text-lg" />
                </Link>
              </div>
            </div>
          </section>

          {/* 7. Bottom Navigation */}
          <div className="pt-4 text-center">
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <BiArrowBack className="text-base" /> Back to Articles Directory
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
