'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const CERTIFICATE_MERGE_TAGS = [
  { tag: '{{certificate_no}}', label: 'Certificate No', sample: 'CERT-2026-9932' },
  { tag: '{{recipient_name}}', label: 'Recipient Name', sample: 'Julian Drake' },
  { tag: '{{award_title}}', label: 'Award Title', sample: 'Valedictorian Honors' },
  { tag: '{{achievement_description}}', label: 'Achievement Description', sample: 'For outstanding distinction in academic sciences.' },
  { tag: '{{event_date}}', label: 'Ceremony Date', sample: '15 Oct 2026' },
  { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
  { tag: '{{issue_date}}', label: 'Issue Date', sample: '18 Oct 2026' },
];

function computeCanvasPixels(w, h, unit) {
  let widthVal = parseFloat(w) || 297;
  let heightVal = parseFloat(h) || 210;

  if (unit === 'px') return { pxW: Math.round(widthVal), pxH: Math.round(heightVal) };
  if (unit === 'in') return { pxW: Math.round(widthVal * 96), pxH: Math.round(heightVal * 96) };
  // mm: scale factor 3.2 for certificates (297x210 -> ~950x672px)
  return { pxW: Math.round(widthVal * 3.2), pxH: Math.round(heightVal * 3.2) };
}

export default function StudentCertificateStudio({ initialTemplate, onSave, onExitUrl = '/developer/templates/certificate' }) {
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [activeTab, setActiveTab] = useState('elements');
  const [mobileView, setMobileView] = useState('canvas'); // 'canvas' | 'tools' | 'inspector'
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [selectedObject, setSelectedObject] = useState(null);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [canvasBg, setCanvasBg] = useState('#fffdf5');

  // Manual dimensions state
  const [dimWidth, setDimWidth] = useState(parseFloat(initialTemplate?.dimension_width) || 297);
  const [dimHeight, setDimHeight] = useState(parseFloat(initialTemplate?.dimension_height) || 210);
  const [dimUnit, setDimUnit] = useState(initialTemplate?.dimension_unit || 'mm');

  const [templateName, setTemplateName] = useState(initialTemplate?.name || 'Gold Excellence Award Certificate');
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
          backgroundColor: '#fffdf5',
          preserveObjectStacking: true,
          selection: true,
        });
        fabricCanvasRef.current = canvas;

        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = '#d97706';
        fabric.Object.prototype.cornerStrokeColor = '#b45309';
        fabric.Object.prototype.borderColor = '#d97706';
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
            setStatusMessage('Certificate layout loaded.');
          });
        } else {
          canvas.renderAll();
          updateLayersList();
        }
      } catch (err) {
        console.error('Error initializing certificate canvas:', err);
        toast.error('Failed to initialize certificate studio: ' + err.message);
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
    const text = new fabric.IText('ALPHA INTERNATIONAL ACADEMY', {
      left: Math.round(canvas.width * 0.25),
      top: 50,
      fontSize: 22,
      fontFamily: 'Outfit',
      fontWeight: 'bold',
      fill: '#78350f',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addCertTitle = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText('CERTIFICATE OF EXCELLENCE', {
      left: Math.round(canvas.width * 0.22),
      top: 110,
      fontSize: 26,
      fontFamily: 'Playfair Display',
      fontWeight: 'bold',
      fill: '#b45309',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addGoldBorder = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const outer = new fabric.Rect({
      left: 15,
      top: 15,
      width: canvas.width - 30,
      height: canvas.height - 30,
      fill: 'transparent',
      stroke: '#d97706',
      strokeWidth: 4,
      rx: 8,
      ry: 8,
      selectable: false,
    });
    const inner = new fabric.Rect({
      left: 24,
      top: 24,
      width: canvas.width - 48,
      height: canvas.height - 48,
      fill: 'transparent',
      stroke: '#fef3c7',
      strokeWidth: 1.5,
      rx: 4,
      ry: 4,
      selectable: false,
    });
    canvas.add(outer);
    canvas.add(inner);
    canvas.sendToBack(inner);
    canvas.sendToBack(outer);
    canvas.renderAll();
  };

  const addMergeTag = (tag) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText(`${tag.label}: ${tag.tag}`, {
      left: 120,
      top: 240,
      fontSize: 16,
      fontFamily: 'Inter',
      fill: '#1e293b',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    setSelectedObject(null);
    canvas.renderAll();
    updateLayersList();
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

  const handleSave = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setStatusMessage('Saving certificate template...');

    try {
      const currentCanvasJSON = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
      const svgOutput = canvas.toSVG();

      const payload = {
        name: templateName,
        description: description,
        dimension_width: dimWidth,
        dimension_height: dimHeight,
        dimension_unit: dimUnit,
        fabric_data: currentCanvasJSON,
        fabric_back_data: {},
        html_content: svgOutput,
        css_content: '',
        available_merge_tags: CERTIFICATE_MERGE_TAGS,
      };

      if (onSave) {
        await onSave(payload);
      } else {
        const tplId = initialTemplate?.id;
        const res = await fetch(`/api/marketing/developer/templates/${tplId}?task=student_certificate`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || 'Failed to save');
      }

      toast.success('Certificate template saved successfully!');
      setStatusMessage('Template persisted.');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save certificate template.');
      setStatusMessage('Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      <header className="min-h-12 py-2 border-b border-slate-800 bg-slate-900 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={onExitUrl}
            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            Exit Studio
          </a>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none focus:border-b focus:border-amber-500 w-32 sm:w-64 truncate"
              placeholder="Template Name..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 rounded border border-slate-800 text-[11px] p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.1))}
              className="px-2 py-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              -
            </button>
            <span className="px-1 text-slate-300 font-mono text-[10px]">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.1))}
              className="px-2 py-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-white shadow transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </header>

      {/* Manual Dimensions Bar */}
      <div className="min-h-9 py-1 bg-slate-900/70 border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between text-xs text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-semibold text-slate-300">Dimensions:</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">W:</span>
            <input
              type="number"
              step="1"
              value={dimWidth}
              onChange={(e) => handleDimensionChange(parseFloat(e.target.value) || 0, dimHeight, dimUnit)}
              className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">H:</span>
            <input
              type="number"
              step="1"
              value={dimHeight}
              onChange={(e) => handleDimensionChange(dimWidth, parseFloat(e.target.value) || 0, dimUnit)}
              className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            value={dimUnit}
            onChange={(e) => handleDimensionChange(dimWidth, dimHeight, e.target.value)}
            className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="mm">mm</option>
            <option value="px">px</option>
            <option value="in">in</option>
          </select>
          <button
            type="button"
            onClick={handleSwapDimensions}
            className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Click to swap dimensions (Landscape / Portrait)"
          >
            <span className="capitalize">{dimWidth >= dimHeight ? 'Landscape' : 'Portrait'}</span>
            <span className="text-[10px] text-amber-400">⇄ Swap</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`w-full lg:w-64 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0 ${mobileView === 'tools' ? 'flex flex-1 z-20' : 'hidden lg:flex'}`}>
          <div className="flex border-b border-slate-800 text-[11px] font-medium bg-slate-950/60">
            <button
              type="button"
              onClick={() => setActiveTab('elements')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'elements' ? 'border-amber-500 text-amber-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Elements
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'tags' ? 'border-amber-500 text-amber-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Merge Tags
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'layers' ? 'border-amber-500 text-amber-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Layers
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
            {activeTab === 'elements' && (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-2">
                    Honors &amp; Borders
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={addHeading}
                      className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 cursor-pointer"
                    >
                      + Academy Heading
                    </button>
                    <button
                      type="button"
                      onClick={addCertTitle}
                      className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 cursor-pointer"
                    >
                      + Certificate Title
                    </button>
                    <button
                      type="button"
                      onClick={addGoldBorder}
                      className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 cursor-pointer"
                    >
                      + Framed Gold Border
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Certificate Dynamic Tags
                </span>
                <div className="space-y-1.5">
                  {CERTIFICATE_MERGE_TAGS.map((tag) => (
                    <button
                      key={tag.tag}
                      type="button"
                      onClick={() => addMergeTag(tag)}
                      className="w-full text-left p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer flex flex-col"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-200">{tag.label}</span>
                        <span className="text-[10px] text-amber-400 font-mono">Insert</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{tag.tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'layers' && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Objects ({canvasObjects.length})
                </span>
                {canvasObjects.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No objects on canvas.</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {canvasObjects.map((obj, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 rounded bg-slate-800/80 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between"
                      >
                        <span>{obj.type}</span>
                        <span className="font-mono text-[9px] text-slate-500">#{canvasObjects.length - idx}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <main
          className={`flex-1 min-w-0 flex flex-col bg-slate-950 overflow-hidden items-center justify-center p-3 sm:p-6 overflow-auto relative ${
            mobileView === 'canvas' ? 'flex' : 'hidden lg:flex'
          }`}
          style={{
            backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div
            className="transition-transform duration-150 shadow-2xl border border-slate-800/80 rounded bg-amber-50/20 max-w-full"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas ref={canvasElRef} />
          </div>
          <div className="absolute bottom-3 left-3 sm:left-6 text-[11px] text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded shadow pointer-events-none">
            Status: {statusMessage}
          </div>
        </main>

        <aside
          className={`w-full lg:w-64 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 text-xs p-3 space-y-4 overflow-y-auto ${
            mobileView === 'inspector' ? 'flex flex-1 z-20' : 'hidden lg:flex'
          }`}
        >
          <div className="border-b border-slate-800 pb-2">
            <span className="font-semibold text-slate-200 block">Element Properties</span>
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
            <p className="text-[11px] text-slate-500 italic">Click any certificate element to modify properties.</p>
          )}

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Canvas Background</span>
            <input
              type="color"
              value={canvasBg}
              onChange={(e) => {
                setCanvasBg(e.target.value);
                fabricCanvasRef.current?.setBackgroundColor(e.target.value, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current));
              }}
              className="w-full h-8 rounded border border-slate-700 bg-slate-950 cursor-pointer"
            />
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden h-12 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 shrink-0 z-30">
        <button
          type="button"
          onClick={() => setMobileView('tools')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs rounded transition-colors ${
            mobileView === 'tools' ? 'text-amber-400 bg-slate-800/80 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm">🛠️</span>
          <span className="text-[10px]">Elements</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('canvas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs rounded transition-colors ${
            mobileView === 'canvas' ? 'text-amber-400 bg-slate-800/80 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm">🎨</span>
          <span className="text-[10px]">Canvas</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('inspector')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs rounded transition-colors ${
            mobileView === 'inspector' ? 'text-amber-400 bg-slate-800/80 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm">⚙️</span>
          <span className="text-[10px]">Inspector</span>
        </button>
      </nav>
    </div>
  );
}
