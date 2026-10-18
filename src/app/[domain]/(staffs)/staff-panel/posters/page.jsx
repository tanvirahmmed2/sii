'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

// Helper to calculate canvas pixel dimensions directly from dimensions
function computeExportCanvasPixels(w, h, unit) {
  let widthVal = parseFloat(w) || 1080;
  let heightVal = parseFloat(h) || 1080;

  if (unit === 'px') {
    const maxDim = Math.max(widthVal, heightVal);
    const scale = maxDim > 1080 ? 1080 / maxDim : 1;
    return { pxW: Math.round(widthVal * scale), pxH: Math.round(heightVal * scale) };
  }
  if (unit === 'in') return { pxW: Math.round(widthVal * 150), pxH: Math.round(heightVal * 150) };
  return { pxW: Math.round(widthVal * 4), pxH: Math.round(heightVal * 4) };
}

export default function StaffPostersHubPage() {
  const router = useRouter();
  const { website, getApiEndpoint } = useTenantWebsite();

  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [orientationFilter, setOrientationFilter] = useState('all');
  const [exportingId, setExportingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Load posters for this institution
  const loadPosters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint('staff/panel/posters'));
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.posters)) {
        setPosters(data.posters);
      } else {
        toast.error(data.error || 'Failed to load website posters.');
      }
    } catch (err) {
      console.error('Error loading posters:', err);
      toast.error('Network error loading posters.');
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint]);

  useEffect(() => {
    loadPosters();
  }, [loadPosters]);

  // Filtered poster list
  const filteredPosters = useMemo(() => {
    return posters.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const posterOrient = parseFloat(p.dimension_width) >= parseFloat(p.dimension_height) ? 'landscape' : 'portrait';
      const matchesOrientation =
        orientationFilter === 'all' || posterOrient === orientationFilter;

      return matchesSearch && matchesOrientation;
    });
  }, [posters, searchQuery, orientationFilter]);

  // Helper to render poster into data URL using Fabric
  const renderPosterDataUrl = async (poster) => {
    const fabricData = poster.custom_fabric_data || poster.fabric_data;
    if (!fabricData || !fabricData.objects || fabricData.objects.length === 0) {
      throw new Error('No visual layout found for this poster.');
    }

    const fabricModule = await import('fabric');
    const fabric = fabricModule.fabric || fabricModule.default || fabricModule;

    const { pxW, pxH } = computeExportCanvasPixels(
      poster.dimension_width,
      poster.dimension_height,
      poster.dimension_unit
    );

    const hiddenCanvasEl = document.createElement('canvas');
    hiddenCanvasEl.width = pxW;
    hiddenCanvasEl.height = pxH;

    const staticCanvas = new fabric.StaticCanvas(hiddenCanvasEl, {
      width: pxW,
      height: pxH,
      backgroundColor: '#0f172a',
    });

    return new Promise((resolve, reject) => {
      staticCanvas.loadFromJSON(fabricData, () => {
        try {
          staticCanvas.renderAll();
          const dataUrl = staticCanvas.toDataURL({
            format: 'jpeg',
            quality: 1.0,
            multiplier: 2,
          });
          staticCanvas.dispose();
          resolve(dataUrl);
        } catch (e) {
          staticCanvas.dispose();
          reject(e);
        }
      });
    });
  };

  // Direct Download JPEG handler
  const handleDownloadJpeg = async (poster) => {
    setExportingId(poster.id);
    const toastId = toast.loading(`Generating high-resolution JPEG for "${poster.name}"...`);
    try {
      const dataUrl = await renderPosterDataUrl(poster);
      const filename = `${(poster.name || 'Website_Poster').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.jpeg`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('JPEG poster downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('JPEG download error:', err);
      toast.error('Failed to export JPEG: ' + err.message, { id: toastId });
    } finally {
      setExportingId(null);
    }
  };

  // Direct Download PDF handler
  const handleDownloadPdf = async (poster) => {
    setExportingId(poster.id);
    const toastId = toast.loading(`Generating print-ready PDF for "${poster.name}"...`);
    try {
      const dataUrl = await renderPosterDataUrl(poster);

      let targetWidthMm = 210;
      let targetHeightMm = 297;

      if (poster.dimension_unit === 'mm') {
        targetWidthMm = parseFloat(poster.dimension_width) || 210;
        targetHeightMm = parseFloat(poster.dimension_height) || 297;
      } else if (poster.dimension_unit === 'in') {
        targetWidthMm = (parseFloat(poster.dimension_width) || 8.27) * 25.4;
        targetHeightMm = (parseFloat(poster.dimension_height) || 11.69) * 25.4;
      } else {
        const wPx = parseFloat(poster.dimension_width) || 1080;
        const hPx = parseFloat(poster.dimension_height) || 1080;
        targetWidthMm = Math.round(wPx * 0.264583);
        targetHeightMm = Math.round(hPx * 0.264583);
      }

      const isLandscape = targetWidthMm >= targetHeightMm;

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [targetWidthMm, targetHeightMm],
      });

      pdf.addImage(dataUrl, 'JPEG', 0, 0, targetWidthMm, targetHeightMm);
      const filename = `${(poster.name || 'Website_Poster').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
      pdf.save(filename);

      toast.success('PDF poster downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to export PDF: ' + err.message, { id: toastId });
    } finally {
      setExportingId(null);
    }
  };

  // Delete Poster handler
  const handleDeletePoster = async (poster) => {
    if (!window.confirm(`Are you sure you want to delete "${poster.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(poster.id);
    const toastId = toast.loading(`Deleting poster...`);
    try {
      const res = await fetch(getApiEndpoint(`staff/panel/posters/${poster.id}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete poster.');
      }

      toast.success('Poster deleted successfully.', { id: toastId });
      setPosters((prev) => prev.filter((p) => p.id !== poster.id));
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Error deleting poster.', { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full space-y-5 pb-10">
      {/* Top Hub Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Website Posters &amp; Visual Studio
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              Staff Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Create, visually customize, save, and export high-resolution promotional posters, admissions announcements, and campus event flyers for {website?.name || 'your institution'}.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/staff-panel/poster-templates"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Base Templates
          </Link>
          <Link
            href="/staff-panel/posters/studio/new"
            className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            + Create New Poster
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search posters by title or copy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-xs">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
            <span>Orientation:</span>
            <select
              value={orientationFilter}
              onChange={(e) => setOrientationFilter(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
            >
              <option value="all">All Formats</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>

          <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">
            {filteredPosters.length} {filteredPosters.length === 1 ? 'Poster' : 'Posters'}
          </span>
        </div>
      </div>

      {/* Content State: Loading, Empty, or Poster Grid */}
      {loading ? (
        <div className="w-full py-16 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-xs font-medium text-slate-400 animate-pulse">
            Loading institution posters...
          </div>
        </div>
      ) : filteredPosters.length === 0 ? (
        <div className="w-full py-14 px-6 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="p-3 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold">
            POSTERS &bull; CANVAS
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No Website Posters Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            {searchQuery
              ? 'No posters match your current search criteria. Try clearing the search query.'
              : 'Your school website does not have any custom posters yet. Launch the Visual Studio to design admission banners, announcements, and flyers with custom dimensions.'}
          </p>
          <div className="pt-2">
            <Link
              href="/staff-panel/posters/studio/new"
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition-colors cursor-pointer inline-block"
            >
              + Create Your First Poster
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosters.map((poster) => {
            const isPortrait = parseFloat(poster.dimension_width) < parseFloat(poster.dimension_height);
            const isCurrentlyExporting = exportingId === poster.id;
            const isCurrentlyDeleting = deletingId === poster.id;

            return (
              <div
                key={poster.id}
                className="flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
              >
                {/* Poster Preview Window */}
                <div className="relative w-full h-52 bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800/80 group">
                  {poster.custom_html || poster.html_content ? (
                    <div
                      className="w-full h-full p-2 flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:object-contain transition-transform duration-200 group-hover:scale-105 pointer-events-none select-none"
                      dangerouslySetInnerHTML={{ __html: poster.custom_html || poster.html_content }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 bg-sky-950/60 px-2.5 py-0.5 rounded border border-sky-800">
                        {isPortrait ? 'Portrait Poster' : 'Landscape Poster'}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 max-w-[200px]">
                        {poster.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {poster.dimension_width} × {poster.dimension_height} {poster.dimension_unit}
                      </p>
                    </div>
                  )}

                  {/* Badges on top */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700/80 shadow">
                      {poster.dimension_width}×{poster.dimension_height} {poster.dimension_unit}
                    </span>
                    <span className="text-[10px] font-medium capitalize px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700/80 shadow">
                      {parseFloat(poster.dimension_width) >= parseFloat(poster.dimension_height) ? 'landscape' : 'portrait'}
                    </span>
                  </div>

                  {poster.is_default && (
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-600/40 shadow">
                        School Default
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay Button to Studio */}
                  <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                    <Link
                      href={`/staff-panel/posters/studio/${poster.id}`}
                      className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition-colors"
                    >
                      Open in Studio
                    </Link>
                  </div>
                </div>

                {/* Poster Details Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1" title={poster.name}>
                      {poster.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {poster.description || `Official visual poster for ${website?.name || 'institution website'}.`}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>
                      {poster.updated_at
                        ? `Updated ${new Date(poster.updated_at).toLocaleDateString()}`
                        : 'Custom Layout'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      ID #{poster.id}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Download JPEG Button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadJpeg(poster)}
                      disabled={isCurrentlyExporting}
                      className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                      title="Download high-resolution JPEG"
                    >
                      Download JPEG
                    </button>

                    {/* Download PDF Button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(poster)}
                      disabled={isCurrentlyExporting}
                      className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                      title="Download print-ready PDF"
                    >
                      Download PDF
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Open in Studio Link */}
                    <Link
                      href={`/staff-panel/posters/studio/${poster.id}`}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer"
                    >
                      Studio
                    </Link>

                    {/* Delete Poster Button */}
                    <button
                      type="button"
                      onClick={() => handleDeletePoster(poster)}
                      disabled={isCurrentlyDeleting}
                      className="px-2 py-1 text-[11px] font-medium rounded border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete poster"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
