'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BiBookOpen, BiCalendar, BiUser, BiRightArrowAlt, BiImage } from 'react-icons/bi';

export default function HomeBlogCard({ blog }) {
  if (!blog) return null;

  const images = Array.isArray(blog.images) ? blog.images : [];
  const coverImage = images[0]?.image_url || images[0]?.image || blog.cover_image || null;

  // Clean HTML from summary/content for clean card snippet
  const cleanSnippet = blog.summary
    ? blog.summary.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : blog.content
    ? blog.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  const formattedDate = blog.published_at
    ? new Date(blog.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : blog.created_at
    ? new Date(blog.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="group rounded-3xl bg-white border border-slate-200/80 hover:border-secondary/40 transition-all duration-300 shadow-xs hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between overflow-hidden">
      <Link href={`/blogs/${blog.slug}`} className="flex flex-col h-full justify-between">
        <div>
          {/* Cover / Image Preview Area */}
          <div className="relative aspect-16/10 overflow-hidden bg-slate-900 flex items-center justify-center">
            {coverImage ? (
              <Image
                src={coverImage}
                alt={blog.title || 'Blog Cover'}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-2 shadow-inner">
                  <BiBookOpen className="text-3xl" />
                </div>
                <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 line-clamp-1">
                  {blog.title}
                </span>
              </div>
            )}

            {/* App Tag pill if associated with an app */}
            {blog.app_title && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white font-semibold text-[11px] border border-white/10">
                {blog.app_title}
              </div>
            )}

            {/* Gallery counter pill if multiple images */}
            {images.length > 0 && (
              <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white font-mono text-[10px] flex items-center gap-1">
                <BiImage className="text-xs" /> {images.length}
              </div>
            )}
          </div>

          {/* Content Details */}
          <div className="p-6 space-y-3">
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-secondary transition-colors tracking-tight line-clamp-2">
              {blog.title}
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
              {cleanSnippet || 'Read insights, architecture breakdowns, and development guides from our creator network.'}
            </p>
          </div>
        </div>

        {/* Footer Meta Row */}
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            {blog.author_name && (
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <BiUser className="text-xs text-primary" />
                <span className="truncate max-w-[110px]">{blog.author_name}</span>
              </span>
            )}
            {formattedDate && (
              <span className="flex items-center gap-1">
                <BiCalendar className="text-xs text-slate-400" />
                <span>{formattedDate}</span>
              </span>
            )}
          </div>

          <span className="text-secondary font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
            <span>Read</span>
            <BiRightArrowAlt className="text-base" />
          </span>
        </div>
      </Link>
    </div>
  );
}
