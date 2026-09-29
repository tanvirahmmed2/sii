'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BiGridAlt, BiRightArrowAlt, BiCheckCircle, BiImage } from 'react-icons/bi';

export default function HomeAppCard({ app }) {
  const images = Array.isArray(app?.images) ? app.images : [];
  const primaryImage = images[0]?.image || images[0]?.url || null;

  // Clean description HTML tags for preview text
  const cleanSnippet = app?.description
    ? app.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  return (
    <div className="group rounded-3xl bg-white border border-slate-200/80 hover:border-secondary/40 transition-all duration-300 shadow-xs hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between overflow-hidden">
      <Link
          href={`/apps/${app.slug}`}>
        {/* Cover / Image Preview Area */}
        <div className="relative aspect-16/10 overflow-hidden bg-slate-900 flex items-center justify-center">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={app.title || 'App Cover'}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-2 shadow-inner">
                <BiGridAlt className="text-3xl" />
              </div>
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                {app.title}
              </span>
            </div>
          )}

          
          {/* Screenshot counter pill if multiple images */}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white font-mono text-[10px] flex items-center gap-1">
              <BiImage className="text-xs" /> {images.length}
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-secondary transition-colors tracking-tight">
                {app.title}
              </h3>
            </div>
          </div>

          {app.short_description && (
            <p className="text-xs font-semibold text-slate-700 leading-snug">
              {app.short_description}
            </p>
          )}

          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
            {cleanSnippet || 'Explore features, integrations, and capabilities included in this platform app.'}
          </p>

          {/* Extra Thumbnail Gallery Preview */}
          {images.length > 1 && (
            <div className="pt-2 flex items-center gap-1.5 overflow-x-auto">
              {images.slice(0, 4).map((img, i) => (
                <div
                  key={i}
                  className="relative w-10 h-7 rounded-md overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                >
                  <Image
                    src={img.image || img.url}
                    alt={img.title || app.title || 'App thumbnail'}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Link>

      
    </div>
  );
}
