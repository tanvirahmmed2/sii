'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const POSTER_MERGE_TAGS = [
  { tag: '{{campaign_title}}', label: 'Campaign Title', sample: 'Annual Science Fair 2026' },
  { tag: '{{headline}}', label: 'Primary Headline', sample: 'Innovate The Future' },
  { tag: '{{subheadline}}', label: 'Sub-headline', sample: 'Join student innovators across all departments' },
  { tag: '{{event_date}}', label: 'Event Date & Time', sample: '25 Nov 2026 • 10:00 AM' },
  { tag: '{{venue}}', label: 'Campus Venue', sample: 'Auditorium Hall B' },
  { tag: '{{contact_info}}', label: 'Inquiries', sample: 'info@alpha.edu' },
  { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
  { tag: '{{website_url}}', label: 'Website Portal', sample: 'https://alpha.edu' },
];

function computeCanvasPixels(w, h, unit) {
  let widthVal = parseFloat(w) || 1080;
  let heightVal = parseFloat(h) || 1080;

  if (unit === 'px') {
    const maxDim = Math.max(widthVal, heightVal);
    const scale = maxDim > 720 ? 720 / maxDim : 1;
    return { pxW: Math.round(widthVal * scale), pxH: Math.round(heightVal * scale) };
  }
  if (unit === 'in') return { pxW: Math.round(widthVal * 96), pxH: Math.round(heightVal * 96) };
  return { pxW: Math.round(widthVal * 2.5), pxH: Math.round(heightVal * 2.5) };
}

export default function PosterStudio({ initialTemplate, onSave, onExitUrl = '/developer/templates/poster' }) {
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [activeTab, setActiveTab] = useState('elements');
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [selectedObject, setSelectedObject] = useState(null);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [canvasBg, setCanvasBg] = useState('#0f172a');

  // Manual dimensions state
  const [dimWidth, setDimWidth] = useState(parseFloat(initialTemplate?.dimension_width) || 1080);
  const [dimHeight, setDimHeight] = useState(parseFloat(initialTemplate?.dimension_height) || 1080);
  const [dimUnit, setDimUnit] = useState(initialTemplate?.dimension_unit || 'px');
  const [mobileView, setMobileView] = useState('canvas'); // 'canvas' | 'tools' | 'inspector'

  const [templateName, setTemplateName] = useState(initialTemplate?.name || 'Campus Event Promotional Poster');
  const [description, setDescription] = useState(initialTemplate?.description || '');

  const updateLayersList = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setCanvasObjects(canvas.getObjects().slice().reverse());
  }, []);

  const applyCanvasDimensions = useCallback((w, h, unit) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const { pxW, pxH } = computeCanvasPixels(w, h, unit);
    canvas.setWidth(pxW);
    canvas.setHeight(pxH);
    canvas.renderAll();
  }, []);

  const handleDimensionChange = (newW, newH, newUnit) => {
    setDimWidth(newW);
    setDimHeight(newH);
    setDimUnit(newUnit);
    applyCanvasDimensions(newW, newH, newUnit);
  };

  const handleSwapDimensions = () => {
    handleDimensionChange(dimHeight, dimWidth, dimUnit);
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const fabricModule = await import('fabric');
        const fabric = fabricModule.fabric || fabricModule.default || fabricModule;
        fabricRef.current = fabric;

        if (!isMounted || !canvasElRef.current) return;

        if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();

        const { pxW, pxH } = computeCanvasPixels(dimWidth, dimHeight, dimUnit);

        const canvas = new fabric.Canvas(canvasElRef.current, {
          width: pxW,
          height: pxH,
          backgroundColor: '#0f172a',
          preserveObjectStacking: true,
          selection: true,
        });
        fabricCanvasRef.current = canvas;

        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = '#a855f7';
        fabric.Object.prototype.cornerStrokeColor = '#9333ea';
        fabric.Object.prototype.borderColor = '#a855f7';
        fabric.Object.prototype.cornerSize = 8;
        fabric.Object.prototype.cornerStyle = 'rect';
        fabric.Object.prototype.padding = 4;

        canvas.on('selection:created', (e) => {
          setSelectedObject(e.selected ? e.selected[0] : null);
          updateLayersList();
        });
        canvas.on('selection:updated', (e) => {
          setSelectedObject(e.selected ? e.selected[0] : null);
          updateLayersList();
        });
        canvas.on('selection:cleared', () => {
          setSelectedObject(null);
          updateLayersList();
        });
        canvas.on('object:modified', updateLayersList);
        canvas.on('object:added', updateLayersList);
        canvas.on('object:removed', updateLayersList);

        const dataToLoad = initialTemplate?.fabric_data;
        if (dataToLoad && dataToLoad.objects && dataToLoad.objects.length > 0) {
          canvas.loadFromJSON(dataToLoad, () => {
            canvas.renderAll();
            updateLayersList();
            setStatusMessage('Poster layout loaded.');
          });
        } else {
          canvas.renderAll();
          updateLayersList();
        }
      } catch (err) {
        console.error('Error initializing poster canvas:', err);
        toast.error('Failed to initialize poster studio: ' + err.message);
      }
    }
    init();

    return () => {
      isMounted = false;
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
  }, []);

  const addHeading = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText('ANNUAL TECH EXPO 2026', {
      left: 120,
      top: 100,
      fontSize: 34,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#ffffff',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addMergeTag = (tagItem) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText(`${tagItem.label}: ${tagItem.tag}`, {
      left: 120,
      top: 250,
      fontSize: 18,
      fontFamily: 'Inter',
      fill: '#e2e8f0',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addBackgroundCard = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const rect = new fabric.Rect({
      left: 40,
      top: 40,
      width: 640,
      height: 640,
      fill: 'rgba(30, 41, 59, 0.7)',
      stroke: '#334155',
      strokeWidth: 2,
      rx: 12,
      ry: 12,
    });
    canvas.add(rect);
    canvas.sendToBack(rect);
    canvas.renderAll();
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    setSelectedObject(null);
    canvas.renderAll();
  };

  const bringForward = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.bringForward(selectedObject);
    canvas.renderAll();
    updateLayersList();
  };

  const sendBackward = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.sendBackwards(selectedObject);
    canvas.renderAll();
    updateLayersList();
  };

  const handleZoom = (delta) => {
    const next = Math.max(0.3, Math.min(2.0, zoomLevel + delta));
    setZoomLevel(next);
  };

  const handleSaveInternal = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setStatusMessage('Saving poster vector template...');

    try {
      const fabricJson = canvas.toJSON();
      const svg = canvas.toSVG();

      const payload = {
        name: templateName,
        task: 'poster',
        category: 'poster',
        description: description,
        dimension_width: dimWidth,
        dimension_height: dimHeight,
        dimension_unit: dimUnit,
        fabric_data: fabricJson,
        fabric_back_data: {},
        html_content: svg,
        available_merge_tags: POSTER_MERGE_TAGS,
      };

      if (onSave) {
        await onSave(payload);
      } else {
        const tplId = initialTemplate?.id;
        const res = await fetch(`/api/marketing/developer/templates/${tplId}?task=poster`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || 'Failed to save');
      }

      toast.success('Poster template saved successfully!');
      setStatusMessage('Template persisted.');
    } catch (e) {
      toast.error('Save failed: ' + e.message);
      setStatusMessage('Save error.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      <header className="min-h-12 border-b border-slate-800 bg-slate-900 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <a
            href={onExitUrl}
            className="px-2.5 py-1 text-xs rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            Exit
          </a>
          <span className="h-4 w-px bg-slate-700 hidden sm:inline" />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none focus:border-b focus:border-purple-500 max-w-[140px] sm:max-w-xs truncate"
              placeholder="Template Name..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="px-1 text-slate-400 hover:text-white cursor-pointer font-bold"
            >
              -
            </button>
            <span className="font-mono text-[11px] text-slate-300 px-1">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="px-1 text-slate-400 hover:text-white cursor-pointer font-bold"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveInternal}
            disabled={isSaving}
            className="px-3 sm:px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Manual Dimensions Bar */}
      <div className="min-h-9 bg-slate-900/70 border-b border-slate-800/80 px-3 py-1 flex items-center justify-between text-xs text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none gap-4">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-[11px] font-semibold text-slate-300">Dimensions:</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">W:</span>
            <input
              type="number"
              step="1"
              value={dimWidth}
              onChange={(e) => handleDimensionChange(parseFloat(e.target.value) || 0, dimHeight, dimUnit)}
              className="w-14 sm:w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">H:</span>
            <input
              type="number"
              step="1"
              value={dimHeight}
              onChange={(e) => handleDimensionChange(dimWidth, parseFloat(e.target.value) || 0, dimUnit)}
              className="w-14 sm:w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={dimUnit}
            onChange={(e) => handleDimensionChange(dimWidth, dimHeight, e.target.value)}
            className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="px">px</option>
            <option value="mm">mm</option>
            <option value="in">in</option>
          </select>

          <button
            type="button"
            onClick={handleSwapDimensions}
            className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            title="Click to swap dimensions (Landscape / Portrait)"
          >
            <span className="capitalize">{dimWidth >= dimHeight ? 'Landscape' : 'Portrait'}</span>
            <span className="text-[10px] text-slate-400">⇄ Swap</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`w-full lg:w-72 border-r border-slate-800 bg-slate-900/90 flex flex-col shrink-0 ${mobileView === 'tools' ? 'flex flex-1 z-20' : 'hidden lg:flex'}`}>
          <div className="grid grid-cols-2 border-b border-slate-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('elements')}
              className={`py-2.5 text-center cursor-pointer transition-colors ${
                activeTab === 'elements' ? 'bg-slate-800 text-white border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Elements
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`py-2.5 text-center cursor-pointer transition-colors ${
                activeTab === 'tags' ? 'bg-slate-800 text-white border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Merge Tags
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
            {activeTab === 'elements' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Typography</span>
                  <button
                    type="button"
                    onClick={addHeading}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Big Poster Title
                  </button>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Shapes</span>
                  <button
                    type="button"
                    onClick={addBackgroundCard}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Glass Card Box
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Dynamic Merge Tags</span>
                {POSTER_MERGE_TAGS.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    onClick={() => addMergeTag(t)}
                    className="w-full p-2 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left cursor-pointer flex flex-col"
                  >
                    <span className="font-semibold text-slate-200 text-xs">{t.label}</span>
                    <span className="font-mono text-[10px] text-purple-400">{t.tag}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">e.g. {t.sample}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className={`flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-950 items-center justify-center p-3 sm:p-6 relative ${mobileView === 'canvas' ? 'flex' : 'hidden lg:flex'}`}>
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out',
            }}
            className="shadow-2xl border border-slate-700 rounded-sm overflow-hidden bg-slate-900"
          >
            <canvas ref={canvasElRef} />
          </div>
        </main>

        <aside className={`w-full lg:w-64 border-l border-slate-800 bg-slate-900/90 flex flex-col shrink-0 text-xs p-3 space-y-4 overflow-y-auto ${mobileView === 'inspector' ? 'flex flex-1 z-20' : 'hidden lg:flex'}`}>
          <div className="border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-300 block">Properties & Layers</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {selectedObject ? selectedObject.type : 'No selection'}
            </span>
          </div>

          {selectedObject ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={bringForward}
                  className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                >
                  Bring Forward
                </button>
                <button
                  type="button"
                  onClick={sendBackward}
                  className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                >
                  Send Backward
                </button>
              </div>

              <button
                type="button"
                onClick={deleteSelected}
                className="w-full py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-semibold cursor-pointer"
              >
                Delete Element
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">Click any poster element to configure styling.</p>
          )}

          <div className="pt-3 border-t border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">Layers List</span>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {canvasObjects.map((obj, idx) => (
                <div
                  key={idx}
                  className="p-1.5 rounded bg-slate-800/60 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between"
                >
                  <span>{obj.type}</span>
                  <span className="font-mono text-[9px] text-slate-500">#{canvasObjects.length - idx}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Navigation Tab Bar */}
      <nav className="lg:hidden h-12 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 shrink-0 z-30">
        <button
          type="button"
          onClick={() => setMobileView('tools')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded cursor-pointer transition-colors ${
            mobileView === 'tools' ? 'text-purple-400 bg-slate-800 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🛠️</span>
          <span>Tools &amp; Tags</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('canvas')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded cursor-pointer transition-colors ${
            mobileView === 'canvas' ? 'text-purple-400 bg-slate-800 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🎨</span>
          <span>Canvas</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('inspector')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded cursor-pointer transition-colors ${
            mobileView === 'inspector' ? 'text-purple-400 bg-slate-800 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>⚙️</span>
          <span>Inspector</span>
        </button>
      </nav>
    </div>
  );
}
