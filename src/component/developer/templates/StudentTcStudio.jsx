'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { COMPREHENSIVE_TC_TAGS, DATA_CATEGORIES } from 'src/lib/templates/mergeTags';

function computeCanvasPixels(w, h, unit) {
  let widthVal = parseFloat(w) || 210;
  let heightVal = parseFloat(h) || 297;

  if (unit === 'px') return { pxW: Math.round(widthVal), pxH: Math.round(heightVal) };
  if (unit === 'in') return { pxW: Math.round(widthVal * 96), pxH: Math.round(heightVal * 96) };
  // mm: scale factor 2.85 for A4 (210x297 -> ~600x848px)
  return { pxW: Math.round(widthVal * 2.85), pxH: Math.round(heightVal * 2.85) };
}

export default function StudentTcStudio({ initialTemplate, onSave, onExitUrl = '/developer/templates/tc' }) {
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [activeTab, setActiveTab] = useState('elements');
  const [mobileView, setMobileView] = useState('canvas'); // 'canvas' | 'tools' | 'inspector'
  const [zoomLevel, setZoomLevel] = useState(0.85);
  const [selectedObject, setSelectedObject] = useState(null);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [canvasBg, setCanvasBg] = useState('#ffffff');
  const [tagCategoryFilter, setTagCategoryFilter] = useState('all');
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // Manual dimensions state
  const [dimWidth, setDimWidth] = useState(parseFloat(initialTemplate?.dimension_width) || 210);
  const [dimHeight, setDimHeight] = useState(parseFloat(initialTemplate?.dimension_height) || 297);
  const [dimUnit, setDimUnit] = useState(initialTemplate?.dimension_unit || 'mm');

  const [templateName, setTemplateName] = useState(initialTemplate?.name || 'Formal Transfer Certificate (TC)');
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
          backgroundColor: '#ffffff',
          preserveObjectStacking: true,
          selection: true,
        });
        fabricCanvasRef.current = canvas;

        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = '#2563eb';
        fabric.Object.prototype.cornerStrokeColor = '#1d4ed8';
        fabric.Object.prototype.borderColor = '#2563eb';
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
            setStatusMessage('TC template layout loaded.');
          });
        } else {
          canvas.renderAll();
          updateLayersList();
        }
      } catch (err) {
        console.error('Error initializing TC canvas:', err);
        toast.error('Failed to initialize TC studio: ' + err.message);
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
      left: 120,
      top: 50,
      fontSize: 20,
      fontFamily: 'Outfit',
      fontWeight: 'bold',
      fill: '#1e3a8a',
      name: 'Academy Header',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addDocTitle = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText('TRANSFER CERTIFICATE', {
      left: 170,
      top: 85,
      fontSize: 15,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#b45309',
      name: 'TC Title',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addCertBody = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText(
      'This is to officially certify that {{student_name}}, son/daughter of {{father_name}} and {{mother_name}}, was a student of this institution admitted on {{admission_date}}.\n\nHe/She has cleared {{last_class_passed}} and has been promoted to {{promoted_class}}.\nAll institutional dues have been: {{dues_status}}.',
      {
        left: 45,
        top: 180,
        fontSize: 13,
        fontFamily: 'Inter',
        fill: '#1e293b',
        lineHeight: 1.4,
        name: 'Certification Body',
      }
    );
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addMergeTag = (tag, withLabel = false) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const content = withLabel ? `${tag.label}: ${tag.tag}` : tag.tag;
    const text = new fabric.IText(content, {
      left: 50,
      top: 140,
      fontSize: 13,
      fontFamily: 'Inter',
      fontWeight: withLabel ? 'normal' : 'bold',
      fill: '#0f172a',
      name: tag.label || tag.tag,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    toast.success(`Inserted ${tag.label}`);
  };

  const addFrame = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const outer = new fabric.Rect({
      left: 20,
      top: 20,
      width: canvasWidth - 40,
      height: canvasHeight - 40,
      fill: 'transparent',
      stroke: '#1e3a8a',
      strokeWidth: 3,
      name: 'Outer Border Frame',
    });
    canvas.add(outer);
    canvas.setActiveObject(outer);
    canvas.renderAll();
  };

  const addSignatures = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const line1 = new fabric.Line([45, canvasHeight - 100, 195, canvasHeight - 100], {
      stroke: '#94a3b8',
      strokeWidth: 1.5,
      name: 'Registrar Sig Line',
    });
    const label1 = new fabric.IText('Registrar / Prepared By', {
      left: 45,
      top: canvasHeight - 85,
      fontSize: 11,
      fontFamily: 'Inter',
      fill: '#64748b',
      name: 'Registrar Label',
    });
    const line2 = new fabric.Line([canvasWidth - 195, canvasHeight - 100, canvasWidth - 45, canvasHeight - 100], {
      stroke: '#94a3b8',
      strokeWidth: 1.5,
      name: 'Principal Sig Line',
    });
    const label2 = new fabric.IText('Principal / Head of Institution', {
      left: canvasWidth - 210,
      top: canvasHeight - 85,
      fontSize: 11,
      fontFamily: 'Inter',
      fill: '#64748b',
      name: 'Principal Label',
    });
    canvas.add(line1, label1, line2, label2);
    canvas.renderAll();
    toast.success('Inserted dual signature blocks');
  };

  const updateSelectedProp = (key, value) => {
    const canvas = fabricCanvasRef.current;
    const obj = selectedObject;
    if (!canvas || !obj) return;
    obj.set(key, value);
    canvas.renderAll();
    setSelectedObject({ ...obj });
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

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    setSelectedObject(null);
    canvas.renderAll();
    updateLayersList();
    toast.success('Element removed');
  };

  const handleSave = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    setStatusMessage('Compiling TC document canvas...');
    try {
      const currentCanvasJSON = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
      const svgOutput = canvas.toSVG();
      const payload = {
        name: templateName,
        task: 'student_tc',
        category: 'tc',
        description,
        dimension_width: dimWidth,
        dimension_height: dimHeight,
        dimension_unit: dimUnit,
        fabric_data: currentCanvasJSON,
        fabric_back_data: {},
        html_content: svgOutput,
        css_content: '',
      };

      if (onSave) {
        await onSave(payload);
      } else {
        const tplId = initialTemplate?.id;
        const res = await fetch(`/api/marketing/developer/templates/${tplId}?task=student_tc`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || 'Failed to save');
      }
      toast.success('Transfer certificate template saved successfully!');
      setStatusMessage('Template persisted.');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save TC template.');
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
              className="bg-transparent text-xs font-semibold text-white focus:outline-none focus:border-b focus:border-sky-500 w-32 sm:w-64 truncate"
              placeholder="Template Name..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            className="px-3.5 py-1 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white shadow transition-colors cursor-pointer disabled:opacity-50 shrink-0"
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
              className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">H:</span>
            <input
              type="number"
              step="1"
              value={dimHeight}
              onChange={(e) => handleDimensionChange(dimWidth, parseFloat(e.target.value) || 0, dimUnit)}
              className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <select
            value={dimUnit}
            onChange={(e) => handleDimensionChange(dimWidth, dimHeight, e.target.value)}
            className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
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
            <span className="text-[10px] text-sky-400">⇄ Swap</span>
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
                activeTab === 'elements' ? 'border-sky-500 text-sky-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Elements
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'tags' ? 'border-sky-500 text-sky-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              TC Tags
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'layers' ? 'border-sky-500 text-sky-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Layers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('canvas')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'canvas' ? 'border-sky-500 text-sky-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Setup
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
            {activeTab === 'elements' && (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-2">
                    TC Document Blocks
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={addHeading}
                      className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 cursor-pointer"
                    >
                      + Academy Title
                    </button>
                    <button
                      type="button"
                      onClick={addDocTitle}
                      className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 cursor-pointer"
                    >
                      + Transfer Certificate Heading
                    </button>
                    <button
                      type="button"
                      onClick={addCertBody}
                      className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-normal border border-slate-700 cursor-pointer"
                    >
                      + Certification Paragraph
                    </button>
                    <button
                      type="button"
                      onClick={addFrame}
                      className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      + Ornate Outer Frame
                    </button>
                    <button
                      type="button"
                      onClick={addSignatures}
                      className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      + Dual Signature Blocks
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1.5">
                    Database Merge Fields
                  </span>
                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search student or TC fields..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1">
                  {DATA_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTagCategoryFilter(cat.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                        tagCategoryFilter === cat.id
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Tags List */}
                <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-0.5">
                  {COMPREHENSIVE_TC_TAGS.filter((tag) => {
                    const matchesCategory = tagCategoryFilter === 'all' || tag.category === tagCategoryFilter;
                    const matchesSearch =
                      !tagSearchQuery.trim() ||
                      tag.label.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
                      tag.tag.toLowerCase().includes(tagSearchQuery.toLowerCase());
                    return matchesCategory && matchesSearch;
                  }).map((tag) => (
                    <div
                      key={tag.tag}
                      className="p-2 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-200 text-xs">{tag.label}</span>
                        <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-900 text-slate-400">
                          {tag.category}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-sky-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {tag.tag}
                      </span>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => addMergeTag(tag, true)}
                          className="flex-1 py-1 text-[10px] font-medium rounded bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer text-center"
                          title="Insert both field label and tag token"
                        >
                          + Label: Value
                        </button>
                        <button
                          type="button"
                          onClick={() => addMergeTag(tag, false)}
                          className="flex-1 py-1 text-[10px] font-medium rounded bg-sky-600 hover:bg-sky-500 text-white cursor-pointer text-center"
                          title="Insert dynamic value token only"
                        >
                          + Value Only
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'layers' && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Document Objects ({canvasObjects.length})
                </span>
                {canvasObjects.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No objects on canvas.</p>
                ) : (
                  <div className="space-y-1">
                    {canvasObjects.map((obj, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const canvas = fabricCanvasRef.current;
                          if (canvas) {
                            canvas.setActiveObject(obj);
                            canvas.renderAll();
                            setSelectedObject(obj);
                          }
                        }}
                        className={`p-2 rounded border text-xs flex items-center justify-between cursor-pointer ${
                          selectedObject === obj
                            ? 'bg-sky-950/60 border-sky-600 text-sky-200'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-medium truncate max-w-[140px]">{obj.name || obj.type}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">{obj.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'canvas' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Template Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-700 bg-slate-950 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-700 bg-slate-950 text-slate-100 resize-none"
                  />
                </div>
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
            className="transition-transform duration-150 shadow-2xl border border-slate-800/80 rounded max-w-full"
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
          className={`w-full lg:w-64 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 ${
            mobileView === 'inspector' ? 'flex flex-1 z-20' : 'hidden lg:flex'
          }`}
        >
          <div className="h-10 border-b border-slate-800 px-3 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Inspector &amp; Properties</span>
            {selectedObject && (
              <span className="text-[10px] text-sky-400 font-mono uppercase">{selectedObject.type}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
            {!selectedObject ? (
              <div className="p-4 text-center text-slate-500 italic space-y-1">
                <p>No element selected.</p>
                <p className="text-[11px]">Click any item on the TC canvas to customize.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Element Name</label>
                  <input
                    type="text"
                    value={selectedObject.name || ''}
                    onChange={(e) => updateSelectedProp('name', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-700 bg-slate-950 text-slate-100"
                  />
                </div>

                {selectedObject.type === 'i-text' && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Typography</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Font Size</label>
                        <input
                          type="number"
                          value={selectedObject.fontSize || 13}
                          onChange={(e) => updateSelectedProp('fontSize', parseInt(e.target.value, 10))}
                          className="w-full text-xs px-2 py-1 rounded border border-slate-700 bg-slate-950 text-slate-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Color</label>
                        <input
                          type="color"
                          value={selectedObject.fill || '#000000'}
                          onChange={(e) => updateSelectedProp('fill', e.target.value)}
                          className="w-full h-7 rounded border border-slate-700 bg-slate-950 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Layer Ordering</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={bringForward}
                      className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                    >
                      Bring Forward
                    </button>
                    <button
                      type="button"
                      onClick={sendBackward}
                      className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                    >
                      Send Backward
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="w-full py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-semibold cursor-pointer"
                  >
                    Delete Element
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden h-12 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 shrink-0 z-30">
        <button
          type="button"
          onClick={() => setMobileView('tools')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs rounded transition-colors ${
            mobileView === 'tools' ? 'text-sky-400 bg-slate-800/80 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm">🛠️</span>
          <span className="text-[10px]">Elements</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('canvas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs rounded transition-colors ${
            mobileView === 'canvas' ? 'text-sky-400 bg-slate-800/80 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm">🎨</span>
          <span className="text-[10px]">Canvas</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('inspector')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs rounded transition-colors ${
            mobileView === 'inspector' ? 'text-sky-400 bg-slate-800/80 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm">⚙️</span>
          <span className="text-[10px]">Inspector</span>
        </button>
      </nav>
    </div>
  );
}
