'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const ADMIT_CARD_MERGE_TAGS = [
  { tag: '{{applicant_name}}', label: 'Applicant Name', sample: 'Tanvir Hossain' },
  { tag: '{{application_no}}', label: 'Application Number', sample: 'APP-2026-9081' },
  { tag: '{{exam_roll}}', label: 'Exam Roll Number', sample: 'EXAM-10492' },
  { tag: '{{roll_no}}', label: 'Roll Number (Alt)', sample: 'EXAM-10492' },
  { tag: '{{father_name}}', label: 'Father Name', sample: 'Muhammad Ali Hossain' },
  { tag: '{{mother_name}}', label: 'Mother Name', sample: 'Fatema Begum' },
  { tag: '{{date_of_birth}}', label: 'Date of Birth', sample: '15 Aug 2008' },
  { tag: '{{gender}}', label: 'Gender', sample: 'Male' },
  { tag: '{{phone}}', label: 'Phone Number', sample: '+880 1700-112233' },
  { tag: '{{email}}', label: 'Email Address', sample: 'applicant@example.com' },
  { tag: '{{class_name}}', label: 'Class / Program', sample: 'Class 11 (Science)' },
  { tag: '{{session_name}}', label: 'Academic Session', sample: '2026-2027' },
  { tag: '{{circular_title}}', label: 'Circular Title', sample: 'Higher Secondary Admission 2026' },
  { tag: '{{exam_date}}', label: 'Exam Date', sample: 'Saturday, 15 Nov 2026' },
  { tag: '{{exam_time}}', label: 'Exam Time', sample: '10:00 AM - 12:00 PM' },
  { tag: '{{exam_venue}}', label: 'Exam Venue / Hall', sample: 'Main Academic Building, Room 402' },
  { tag: '{{exam_instructions}}', label: 'Exam Instructions', sample: '1. Arrive 30 minutes early.\n2. Bring printed admit card.\n3. Electronic devices prohibited.' },
  { tag: '{{institution_name}}', label: 'Institute Name', sample: 'Alpha International Academy' },
  { tag: '{{candidate_photo}}', label: 'Candidate Photo URL', sample: '/default-avatar.png' },
  { tag: '{{candidate_signature}}', label: 'Candidate Signature URL', sample: '' },
  { tag: '{{qr_code}}', label: 'QR / Barcode Serial', sample: 'APP-2026-9081' },
];

function computeCanvasPixels(w, h, unit) {
  let widthVal = parseFloat(w) || 210;
  let heightVal = parseFloat(h) || 297;

  if (unit === 'px') return { pxW: Math.round(widthVal), pxH: Math.round(heightVal) };
  if (unit === 'in') return { pxW: Math.round(widthVal * 96), pxH: Math.round(heightVal * 96) };
  // mm: scale factor ~2.85 for A4 (210x297 -> ~600x848px)
  const factor = 600 / 210;
  return { pxW: Math.round(widthVal * factor), pxH: Math.round(heightVal * factor) };
}

export default function AdmitCardStudio({
  initialTemplate,
  onSave,
  onExitUrl = '/developer/templates/admit-card'
}) {
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [activeTab, setActiveTab] = useState('elements'); // 'elements' | 'tags' | 'presets'
  const [mobileView, setMobileView] = useState('canvas'); // 'canvas' | 'tools' | 'inspector'
  const [zoomLevel, setZoomLevel] = useState(0.85);
  const [selectedObject, setSelectedObject] = useState(null);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');

  // Manual dimensions state
  const [dimWidth, setDimWidth] = useState(parseFloat(initialTemplate?.dimension_width) || 210);
  const [dimHeight, setDimHeight] = useState(parseFloat(initialTemplate?.dimension_height) || 297);
  const [dimUnit, setDimUnit] = useState(initialTemplate?.dimension_unit || 'mm');

  const [templateName, setTemplateName] = useState(initialTemplate?.name || 'Standard Official Admit Card');
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
            setStatusMessage('Admit card layout loaded.');
          });
        } else {
          canvas.renderAll();
          updateLayersList();
        }
      } catch (err) {
        console.error('Error initializing admit card canvas:', err);
        toast.error('Failed to initialize admit card studio: ' + err.message);
      }
    }
    init();

    return () => {
      isMounted = false;
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addHeading = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText('ADMISSION TEST ADMIT CARD', {
      left: 150,
      top: 40,
      fontSize: 18,
      fontFamily: 'Outfit',
      fontWeight: 'bold',
      fill: '#1e3a8a',
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
      left: 45,
      top: 200,
      fontSize: 12,
      fontFamily: 'Inter',
      fill: '#0f172a',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addPhotoFrame = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const rect = new fabric.Rect({
      left: 440,
      top: 120,
      width: 120,
      height: 140,
      fill: '#f8fafc',
      stroke: '#94a3b8',
      strokeWidth: 1.5,
      rx: 4,
      ry: 4,
      name: 'Passport Photo Frame',
    });
    const label = new fabric.IText('PASSPORT\nPHOTO', {
      left: 500,
      top: 175,
      originX: 'center',
      fontSize: 11,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#94a3b8',
      textAlign: 'center',
    });
    canvas.add(rect);
    canvas.add(label);
    canvas.renderAll();
  };

  const addRollBox = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const rect = new fabric.Rect({
      left: 35,
      top: 115,
      width: 380,
      height: 52,
      fill: '#f0fdf4',
      stroke: '#86efac',
      strokeWidth: 1,
      rx: 4,
      ry: 4,
      name: 'Roll Highlight Box',
    });
    const rollLbl = new fabric.IText('EXAM ROLL NO: {{exam_roll}}', {
      left: 50,
      top: 125,
      fontSize: 14,
      fontFamily: 'Outfit',
      fontWeight: 'bold',
      fill: '#15803d',
    });
    const appLbl = new fabric.IText('APPLICATION NO: {{application_no}}', {
      left: 50,
      top: 146,
      fontSize: 11,
      fontFamily: 'Inter',
      fontWeight: '600',
      fill: '#166534',
    });
    canvas.add(rect);
    canvas.add(rollLbl);
    canvas.add(appLbl);
    canvas.renderAll();
  };

  const addScheduleBox = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const header = new fabric.Rect({
      left: 35,
      top: 320,
      width: 530,
      height: 24,
      fill: '#1e3a8a',
    });
    const headerText = new fabric.IText('EXAMINATION SCHEDULE & TEST CENTER', {
      left: 45,
      top: 326,
      fontSize: 10,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#ffffff',
    });
    const body = new fabric.Rect({
      left: 35,
      top: 344,
      width: 530,
      height: 90,
      fill: '#f8fafc',
      stroke: '#cbd5e1',
      strokeWidth: 1,
    });
    const details = new fabric.IText(
      'Exam Date: {{exam_date}}\nExam Time: {{exam_time}}\nAssigned Venue: {{exam_venue}}',
      {
        left: 50,
        top: 355,
        fontSize: 11,
        fontFamily: 'Inter',
        lineHeight: 1.6,
        fill: '#0f172a',
      }
    );
    canvas.add(header);
    canvas.add(headerText);
    canvas.add(body);
    canvas.add(details);
    canvas.renderAll();
  };

  const addInstructionsBox = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const header = new fabric.Rect({
      left: 35,
      top: 455,
      width: 530,
      height: 24,
      fill: '#0f172a',
    });
    const headerText = new fabric.IText('ESSENTIAL RULES & INSTRUCTIONS', {
      left: 45,
      top: 461,
      fontSize: 10,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#ffffff',
    });
    const body = new fabric.Rect({
      left: 35,
      top: 479,
      width: 530,
      height: 180,
      fill: '#ffffff',
      stroke: '#cbd5e1',
      strokeWidth: 1,
    });
    const text = new fabric.IText(
      '1. Candidate must present this printed admit card along with valid identification.\n2. Arrive at least 30 minutes before exam time.\n3. Mobile phones and electronic items are strictly prohibited.\n4. Signatures will be verified against application documents.',
      {
        left: 50,
        top: 495,
        fontSize: 10,
        fontFamily: 'Inter',
        lineHeight: 1.6,
        fill: '#334155',
      }
    );
    canvas.add(header);
    canvas.add(headerText);
    canvas.add(body);
    canvas.add(text);
    canvas.renderAll();
  };

  const addSignatureLines = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const candLine = new fabric.Line([50, 750, 210, 750], {
      stroke: '#94a3b8',
      strokeWidth: 1,
    });
    const candLbl = new fabric.IText("Candidate's Signature", {
      left: 60,
      top: 756,
      fontSize: 10,
      fontFamily: 'Inter',
      fontWeight: '600',
      fill: '#475569',
    });
    const ctrlLine = new fabric.Line([390, 750, 550, 750], {
      stroke: '#94a3b8',
      strokeWidth: 1,
    });
    const ctrlLbl = new fabric.IText('Controller of Examinations', {
      left: 400,
      top: 756,
      fontSize: 10,
      fontFamily: 'Inter',
      fontWeight: '600',
      fill: '#1e3a8a',
    });
    canvas.add(candLine);
    canvas.add(candLbl);
    canvas.add(ctrlLine);
    canvas.add(ctrlLbl);
    canvas.renderAll();
  };

  const addRectangle = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const rect = new fabric.Rect({
      left: 35,
      top: 100,
      width: 530,
      height: 120,
      fill: '#f8fafc',
      stroke: '#cbd5e1',
      strokeWidth: 1,
      rx: 4,
      ry: 4,
    });
    canvas.add(rect);
    canvas.sendToBack(rect);
    canvas.renderAll();
  };

  const addDividerLine = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const line = new fabric.Line([35, 100, 565, 100], {
      stroke: '#1e3a8a',
      strokeWidth: 1.5,
    });
    canvas.add(line);
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
    const next = Math.max(0.4, Math.min(2.0, zoomLevel + delta));
    setZoomLevel(next);
  };

  const handleSaveInternal = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setStatusMessage('Saving admit card vector template...');

    try {
      const fabricJson = canvas.toJSON();
      const svg = canvas.toSVG();

      const payload = {
        name: templateName,
        task: 'admit_card',
        category: 'admit_card',
        description: description,
        dimension_width: dimWidth,
        dimension_height: dimHeight,
        dimension_unit: dimUnit,
        fabric_data: fabricJson,
        fabric_back_data: {},
        html_content: svg,
        available_merge_tags: ADMIT_CARD_MERGE_TAGS,
      };

      if (onSave) {
        await onSave(payload);
      } else {
        const tplId = initialTemplate?.id;
        const res = await fetch(`/api/marketing/developer/templates/${tplId}?task=admit_card`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || 'Failed to save');
      }

      toast.success('Admit card template saved successfully!');
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
      <header className="min-h-12 py-2 border-b border-slate-800 bg-slate-900 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={onExitUrl}
            className="px-2.5 py-1 text-xs rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            Exit Studio
          </a>
          <span className="h-4 w-px bg-slate-700 hidden sm:inline" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
              Admit Card Studio
            </span>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none focus:border-b focus:border-emerald-500 w-32 sm:w-64 truncate"
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
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
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
              className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">H:</span>
            <input
              type="number"
              step="1"
              value={dimHeight}
              onChange={(e) => handleDimensionChange(dimWidth, parseFloat(e.target.value) || 0, dimUnit)}
              className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={dimUnit}
            onChange={(e) => handleDimensionChange(dimWidth, dimHeight, e.target.value)}
            className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="mm">mm (A4: 210 x 297)</option>
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
            <span className="text-[10px] text-emerald-400">⇄ Swap</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleDimensionChange(210, 297, 'mm')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
          >
            Standard A4
          </button>
          <button
            type="button"
            onClick={() => handleDimensionChange(210, 148, 'mm')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
          >
            Half-Sheet A5
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
                activeTab === 'elements' ? 'bg-slate-800 text-white border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admit Blocks
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`py-2.5 text-center cursor-pointer transition-colors ${
                activeTab === 'tags' ? 'bg-slate-800 text-white border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Merge Tags
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
            {activeTab === 'elements' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Admit Sections</span>
                  <button
                    type="button"
                    onClick={addHeading}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Header Title
                  </button>
                  <button
                    type="button"
                    onClick={addRollBox}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Exam Roll Callout Box
                  </button>
                  <button
                    type="button"
                    onClick={addPhotoFrame}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Passport Photo Box
                  </button>
                  <button
                    type="button"
                    onClick={addScheduleBox}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Exam Schedule &amp; Venue
                  </button>
                  <button
                    type="button"
                    onClick={addInstructionsBox}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Rules &amp; Instructions Box
                  </button>
                  <button
                    type="button"
                    onClick={addSignatureLines}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Signatures Block
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Primitives</span>
                  <button
                    type="button"
                    onClick={addRectangle}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Container Box
                  </button>
                  <button
                    type="button"
                    onClick={addDividerLine}
                    className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    + Add Divider Line
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Candidate &amp; Exam Tags</span>
                {ADMIT_CARD_MERGE_TAGS.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    onClick={() => addMergeTag(t)}
                    className="w-full p-2 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left cursor-pointer flex flex-col"
                  >
                    <span className="font-semibold text-slate-200 text-xs">{t.label}</span>
                    <span className="font-mono text-[10px] text-emerald-400">{t.tag}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">e.g. {t.sample}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main
          className={`flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-950 items-center justify-center p-3 sm:p-6 relative ${
            mobileView === 'canvas' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out',
            }}
            className="shadow-2xl border border-slate-700 rounded-sm overflow-hidden bg-white max-w-full"
          >
            <canvas ref={canvasElRef} />
          </div>
          <div className="absolute bottom-3 left-3 sm:left-6 text-[11px] text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded shadow pointer-events-none">
            Status: {statusMessage}
          </div>
        </main>

        <aside
          className={`w-full lg:w-64 border-l border-slate-800 bg-slate-900/90 flex flex-col shrink-0 text-xs p-3 space-y-4 overflow-y-auto ${
            mobileView === 'inspector' ? 'flex flex-1 z-20' : 'hidden lg:flex'
          }`}
        >
          <div className="border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-300 block">Properties &amp; Layers</span>
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
            <p className="text-[11px] text-slate-500 italic">Click any element on the canvas to configure styling.</p>
          )}

          <div className="pt-3 border-t border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">Layers List</span>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {canvasObjects.map((obj, idx) => (
                <div
                  key={idx}
                  className="p-1.5 rounded bg-slate-800/60 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between"
                >
                  <span>{obj.name || obj.type}</span>
                  <span className="font-mono text-[9px] text-slate-500">#{canvasObjects.length - idx}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden h-12 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 shrink-0 z-30">
        <button
          type="button"
          onClick={() => setMobileView('tools')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs rounded transition-colors ${
            mobileView === 'tools' ? 'text-emerald-400 bg-slate-800/80 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm">🛠️</span>
          <span className="text-[10px]">Blocks</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('canvas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs rounded transition-colors ${
            mobileView === 'canvas' ? 'text-emerald-400 bg-slate-800/80 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm">🎨</span>
          <span className="text-[10px]">Canvas</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('inspector')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs rounded transition-colors ${
            mobileView === 'inspector' ? 'text-emerald-400 bg-slate-800/80 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm">⚙️</span>
          <span className="text-[10px]">Inspector</span>
        </button>
      </nav>
    </div>
  );
}
