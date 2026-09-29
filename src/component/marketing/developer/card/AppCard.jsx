'use client';

import Link from 'next/link';
import {
  BiGridAlt,
  BiCheckCircle,
  BiTimeFive,
  BiImage,
  BiCodeAlt,
  BiLinkExternal,
  BiGlobe,
  BiEdit,
  BiTrash,
  BiLoaderAlt,
  BiLayer,
} from 'react-icons/bi';

export default function DeveloperAppCard({
  app,
  canManage = false,
  deletingAppId = null,
  onTogglePublish,
  onDelete,
}) {
  const images = Array.isArray(app.images) ? app.images : [];
  const primaryImage = images[0]?.image || images[0]?.url || null;
  const isDeleting = deletingAppId === app.id;

  // Clean HTML tags from rich text description for snippet preview
  const descriptionSnippet = app.description
    ? app.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  return (
    <div
      className="group bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between hover:shadow-md"
    >
      <div className="space-y-3">
        {/* Header / Icon & Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 overflow-hidden">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={app.title}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <BiGridAlt className="text-xl text-slate-500" />
              )}
            </div>
            <div className="min-w-0">
              <Link href={`/developer/apps/${app.slug}`} className="hover:underline">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-secondary transition-colors truncate">
                  {app.title}
                </h3>
              </Link>
              <div className="text-[11px] font-mono text-slate-400 truncate">/{app.slug}</div>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
              app.is_published
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {app.is_published ? (
              <>
                <BiCheckCircle className="text-xs" /> Published
              </>
            ) : (
              <>
                <BiTimeFive className="text-xs" /> Draft
              </>
            )}
          </span>
        </div>

        {/* Descriptions */}
        <div className="space-y-1">
          {app.short_description && (
            <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2">
              {app.short_description}
            </p>
          )}
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
            {descriptionSnippet || 'No detailed description provided yet.'}
          </p>
        </div>

        {/* Linked Website Modules Preview */}
        {Array.isArray(app.modules) && app.modules.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <BiLayer className="text-xs text-secondary" /> Linked Modules
              </span>
              <span className="text-secondary font-mono">
                {app.modules.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {app.modules.slice(0, 3).map((mod) => (
                <span
                  key={mod.id}
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200 truncate max-w-[120px]"
                  title={mod.name}
                >
                  {mod.name}
                </span>
              ))}
              {app.modules.length > 3 && (
                <span className="px-1.5 py-0.5 rounded-md bg-secondary/10 text-secondary text-[10px] font-bold">
                  +{app.modules.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Gallery Preview */}
        {images.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <BiImage className="text-xs" /> Gallery Preview
              </span>
              <span>
                {images.length} Image{images.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto py-1">
              {images.slice(0, 4).map((img, idx) => (
                <div
                  key={idx}
                  className="w-12 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                >
                  <img
                    src={img.url}
                    alt={img.title || app.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ))}
              {images.length > 4 && (
                <div className="w-12 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                  +{images.length - 4}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400 truncate">
          <BiCodeAlt className="text-sm shrink-0" />
          <span className="truncate">/apps/{app.slug}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Launch Public Route */}
          <Link
            href={`/apps/${app.slug}`}
            className="p-1.5 rounded-lg text-slate-500 hover:text-secondary hover:bg-slate-50 transition-colors"
            title="Launch app public page"
          >
            <BiLinkExternal className="text-base" />
          </Link>

          {/* Admin / Manager Only Controls */}
          {canManage && (
            <>
              {/* Inline Publish / Unpublish Button */}
              {onTogglePublish && (
                <button
                  type="button"
                  onClick={() => onTogglePublish(app)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer text-sm ${
                    app.is_published
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-amber-600 hover:bg-amber-50'
                  }`}
                  title={app.is_published ? 'Switch to Draft' : 'Publish App'}
                >
                  <BiGlobe className="text-base" />
                </button>
              )}

              {/* Edit Application in Workspace */}
              <Link
                href={`/developer/apps/${app.slug}`}
                className="p-1.5 rounded-lg text-slate-500 hover:text-secondary hover:bg-secondary/10 transition-colors text-sm"
                title="Edit Application in Workspace"
              >
                <BiEdit className="text-base" />
              </Link>

              {/* Delete Button */}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(app.id, app.title)}
                  disabled={isDeleting}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                  title="Delete application"
                >
                  {isDeleting ? (
                    <BiLoaderAlt className="animate-spin text-base" />
                  ) : (
                    <BiTrash className="text-base" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
