'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { patchFabric } from 'src/lib/templates/fabricTemplates';

const POSTER_MERGE_TAGS = [
  { tag: '{{school_name}}', label: 'School Name' },
  { tag: '{{headline}}', label: 'Main Headline' },
  { tag: '{{subheadline}}', label: 'Sub-headline / Note' },
  { tag: '{{event_date}}', label: 'Event Date & Time' },
  { tag: '{{venue}}', label: 'Campus Venue' },
  { tag: '{{contact_info}}', label: 'Contact & Hotline' },
  { tag: '{{website_url}}', label: 'Website URL' },
  { tag: '{{call_to_action}}', label: 'Action Button Text' },
];

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Montserrat',
  'Oswald',
  'Playfair Display',
  'Courier New',
  'Arial',
  'Georgia',
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

export default function StaffPosterStudio({ initialPoster, onExitUrl = '/staff-panel/posters' }) {
  const { website, getApiEndpoint } = useTenantWebsite();
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [activeTab, setActiveTab] = useState('elements');
  const [zoomLevel, setZoomLevel] = useState(0.75);
  const [selectedObject, setSelectedObject] = useState(null);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [showGrid, setShowGrid] = useState(false);

  // Manual dimensions state
  const [dimWidth, setDimWidth] = useState(parseFloat(initialPoster?.dimension_width) || 1080);
  const [dimHeight, setDimHeight] = useState(parseFloat(initialPoster?.dimension_height) || 1080);
  const [dimUnit, setDimUnit] = useState(initialPoster?.dimension_unit || 'px');
  const [mobileView, setMobileView] = useState('canvas'); // 'canvas' | 'tools' | 'inspector'

  const [posterName, setPosterName] = useState(initialPoster?.name || `${website?.name || 'School'} Promotional Poster`);
  const [description, setDescription] = useState(initialPoster?.description || '');
  const [currentPosterId, setCurrentPosterId] = useState(initialPoster?.id && initialPoster.id !== 'new' ? initialPoster.id : null);

  // History stack for Undo / Redo
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isHistoryActionRef = useRef(false);

  const saveHistoryState = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isHistoryActionRef.current) return;
    try {
      const json = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
      const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      nextHistory.push(json);
      if (nextHistory.length > 25) nextHistory.shift();
      historyRef.current = nextHistory;
      historyIndexRef.current = nextHistory.length - 1;
    } catch (err) {
      console.warn('Failed to capture poster history state:', err);
    }
  }, []);

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

  const handleUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    isHistoryActionRef.current = true;
    historyIndexRef.current -= 1;
    const targetState = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(targetState, () => {
      canvas.renderAll();
      updateLayersList();
      setSelectedObject(canvas.getActiveObject() || null);
      isHistoryActionRef.current = false;
      toast.success('Undo');
    });
  };

  const handleRedo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    isHistoryActionRef.current = true;
    historyIndexRef.current += 1;
    const targetState = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(targetState, () => {
      canvas.renderAll();
      updateLayersList();
      setSelectedObject(canvas.getActiveObject() || null);
      isHistoryActionRef.current = false;
      toast.success('Redo');
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const canvas = fabricCanvasRef.current;
        if (canvas && canvas.getActiveObject() && !canvas.getActiveObject().isEditing) {
          e.preventDefault();
          deleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize Canvas
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const fabricModule = await import('fabric');
        const fabric = fabricModule.fabric || fabricModule.default || fabricModule;
        patchFabric(fabric);
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
        fabric.Object.prototype.cornerColor = '#38bdf8';
        fabric.Object.prototype.cornerStrokeColor = '#0284c7';
        fabric.Object.prototype.borderColor = '#38bdf8';
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
        canvas.on('object:modified', () => {
          updateLayersList();
          saveHistoryState();
        });
        canvas.on('object:added', () => {
          updateLayersList();
          saveHistoryState();
        });
        canvas.on('object:removed', () => {
          updateLayersList();
          saveHistoryState();
        });

        const dataToLoad = initialPoster?.custom_fabric_data || initialPoster?.fabric_data;
        if (dataToLoad && dataToLoad.objects && dataToLoad.objects.length > 0) {
          isHistoryActionRef.current = true;
          canvas.loadFromJSON(dataToLoad, () => {
            isHistoryActionRef.current = false;
            canvas.renderAll();
            updateLayersList();
            saveHistoryState();
            setStatusMessage('Poster visual layout loaded.');
          });
        } else {
          loadDefaultSchoolPoster();
          setStatusMessage('Default visual poster layout created.');
        }
      } catch (err) {
        isHistoryActionRef.current = false;
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

  // Standard Starter Layout
  const loadDefaultSchoolPoster = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    canvas.clear();
    canvas.setBackgroundColor('#090d16', canvas.renderAll.bind(canvas));

    const headerBar = new fabric.Rect({
      left: 0,
      top: 0,
      width: canvas.width,
      height: 90,
      fill: '#0284c7',
      name: 'Top Blue Banner',
    });
    canvas.add(headerBar);

    const schoolTitle = new fabric.IText(website?.name?.toUpperCase() || 'METROPOLITAN ACADEMY', {
      left: 36,
      top: 30,
      fontSize: 22,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#ffffff',
      name: 'School Header Text',
    });
    canvas.add(schoolTitle);

    const headline = new fabric.IText('ADMISSIONS OPEN 2026-2027', {
      left: 36,
      top: 130,
      fontSize: 28,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#38bdf8',
      name: 'Main Headline',
    });
    canvas.add(headline);

    const subheadline = new fabric.IText(
      'World-Class STEM Curriculum • Modern Laboratories • Global Excellence',
      {
        left: 36,
        top: 175,
        fontSize: 13,
        fontFamily: 'Inter',
        fill: '#94a3b8',
        name: 'Sub-headline',
      }
    );
    canvas.add(subheadline);

    const card = new fabric.Rect({
      left: 36,
      top: 220,
      width: canvas.width - 72,
      height: 140,
      fill: '#1e293b',
      stroke: '#334155',
      strokeWidth: 1.5,
      rx: 8,
      ry: 8,
      name: 'Event Info Container',
    });
    canvas.add(card);

    const cardText = new fabric.IText(
      'Key Information:\n' +
      '• Application Deadline: November 30, 2026\n' +
      '• Entrance Assessment: December 15, 2026\n' +
      '• Merit Scholarships Available for Exceptional Candidates',
      {
        left: 54,
        top: 242,
        fontSize: 12,
        fontFamily: 'Inter',
        lineHeight: 1.6,
        fill: '#e2e8f0',
        name: 'Card Info Bulletins',
      }
    );
    canvas.add(cardText);

    const ctaBox = new fabric.Rect({
      left: 36,
      top: 385,
      width: 200,
      height: 44,
      fill: '#0284c7',
      rx: 6,
      ry: 6,
      name: 'Action Button',
    });
    canvas.add(ctaBox);

    const ctaText = new fabric.IText('APPLY ONLINE NOW', {
      left: 60,
      top: 398,
      fontSize: 12,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#ffffff',
      name: 'Button Label',
    });
    canvas.add(ctaText);

    const footerText = new fabric.IText(
      `Website: ${website?.domain || 'www.yourschool.edu'}  |  Hotline: +880 1800-000000`,
      {
        left: 36,
        top: canvas.height - 45,
        fontSize: 11,
        fontFamily: 'Inter',
        fill: '#64748b',
        name: 'Contact Footer',
      }
    );
    canvas.add(footerText);

    canvas.renderAll();
    updateLayersList();
    saveHistoryState();
  };

  // ================= ALIGNMENT UTILITIES =================
  const alignLeft = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set({ left: 20 });
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
    toast.success('Aligned Left');
  };

  const alignCenterH = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.centerH();
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
    toast.success('Centered Horizontally');
  };

  const alignRight = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    const w = selectedObject.getScaledWidth();
    selectedObject.set({ left: canvas.width - w - 20 });
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
    toast.success('Aligned Right');
  };

  const alignTop = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set({ top: 20 });
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
    toast.success('Aligned Top');
  };

  const alignCenterV = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.centerV();
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
    toast.success('Centered Vertically');
  };

  const alignBottom = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    const h = selectedObject.getScaledHeight();
    selectedObject.set({ top: canvas.height - h - 20 });
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
    toast.success('Aligned Bottom');
  };

  const alignCenterCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.center();
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
    toast.success('Centered on Canvas');
  };

  // ================= ADVANCE TOOLS =================
  const duplicateSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.clone((cloned) => {
      cloned.set({
        left: selectedObject.left + 20,
        top: selectedObject.top + 20,
        evented: true,
      });
      if (cloned.type === 'activeSelection') {
        cloned.canvas = canvas;
        cloned.forEachObject((obj) => canvas.add(obj));
        cloned.setCoords();
      } else {
        canvas.add(cloned);
      }
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      saveHistoryState();
      toast.success('Duplicated Object');
    });
  };

  const flipX = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    canvas.renderAll();
    saveHistoryState();
  };

  const flipY = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    canvas.renderAll();
    saveHistoryState();
  };

  const toggleLock = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    const nextLocked = !selectedObject.lockMovementX;
    selectedObject.set({
      lockMovementX: nextLocked,
      lockMovementY: nextLocked,
      lockRotation: nextLocked,
      lockScalingX: nextLocked,
      lockScalingY: nextLocked,
      hasControls: !nextLocked,
    });
    canvas.renderAll();
    setSelectedObject({ ...selectedObject });
    saveHistoryState();
    toast.success(nextLocked ? 'Locked Position' : 'Unlocked Position');
  };

  const bringToFront = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.bringToFront(selectedObject);
    canvas.renderAll();
    updateLayersList();
    saveHistoryState();
  };

  const sendToBack = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.sendToBack(selectedObject);
    canvas.renderAll();
    updateLayersList();
    saveHistoryState();
  };

  const bringForward = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.bringForward(selectedObject);
    canvas.renderAll();
    updateLayersList();
    saveHistoryState();
  };

  const sendBackward = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.sendBackwards(selectedObject);
    canvas.renderAll();
    updateLayersList();
    saveHistoryState();
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    setSelectedObject(null);
    canvas.renderAll();
    updateLayersList();
    saveHistoryState();
    toast.success('Removed Object');
  };

  // ================= SHAPES PALETTE =================
  const addRectangle = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const rect = new fabric.Rect({
      left: 60,
      top: 60,
      width: 200,
      height: 100,
      fill: '#1e293b',
      stroke: '#334155',
      strokeWidth: 1,
      name: 'Rectangle',
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    toast.success('Added Rectangle');
  };

  const addRoundedBox = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const box = new fabric.Rect({
      left: 60,
      top: 60,
      width: 240,
      height: 120,
      fill: '#0f172a',
      stroke: '#0284c7',
      strokeWidth: 1.5,
      rx: 12,
      ry: 12,
      name: 'Rounded Box',
    });
    canvas.add(box);
    canvas.setActiveObject(box);
    canvas.renderAll();
    toast.success('Added Rounded Box');
  };

  const addCircle = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const circle = new fabric.Circle({
      left: 70,
      top: 70,
      radius: 45,
      fill: '#0284c7',
      stroke: '#38bdf8',
      strokeWidth: 1.5,
      name: 'Circle Badge',
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    toast.success('Added Circle');
  };

  const addTriangle = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const triangle = new fabric.Triangle({
      left: 70,
      top: 70,
      width: 90,
      height: 80,
      fill: '#f59e0b',
      stroke: '#d97706',
      strokeWidth: 1,
      name: 'Triangle',
    });
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    canvas.renderAll();
    toast.success('Added Triangle');
  };

  const addLine = (vertical = false) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const points = vertical ? [100, 40, 100, 260] : [40, 100, 320, 100];
    const line = new fabric.Line(points, {
      stroke: '#0284c7',
      strokeWidth: 2,
      name: vertical ? 'Vertical Separator' : 'Divider Line',
    });
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
    toast.success(vertical ? 'Added Vertical Line' : 'Added Divider Line');
  };

  const addStar = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const points = [
      { x: 35, y: 0 }, { x: 45, y: 22 }, { x: 70, y: 24 }, { x: 51, y: 40 },
      { x: 57, y: 65 }, { x: 35, y: 52 }, { x: 13, y: 65 }, { x: 19, y: 40 },
      { x: 0, y: 24 }, { x: 25, y: 22 }
    ];
    const star = new fabric.Polygon(points, {
      left: 60,
      top: 60,
      fill: '#f59e0b',
      stroke: '#b45309',
      strokeWidth: 1,
      name: 'Star Badge',
    });
    canvas.add(star);
    canvas.setActiveObject(star);
    canvas.renderAll();
    toast.success('Added Star Badge');
  };

  const addBadge = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const badge = new fabric.Rect({
      left: 50,
      top: 50,
      width: 150,
      height: 38,
      fill: '#1e293b',
      stroke: '#38bdf8',
      strokeWidth: 1.5,
      rx: 19,
      ry: 19,
      name: 'Pill Badge',
    });
    canvas.add(badge);
    canvas.setActiveObject(badge);
    canvas.renderAll();
    toast.success('Added Pill Badge');
  };

  const addTextElement = (textString, fontSize = 16, fontWeight = 'normal', fill = '#ffffff', name = 'Text Block') => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    const itext = new fabric.IText(textString, {
      left: 50,
      top: 100,
      fontSize,
      fontFamily: 'Inter',
      fontWeight,
      fill,
      name,
    });
    canvas.add(itext);
    canvas.setActiveObject(itext);
    canvas.renderAll();
    saveHistoryState();
  };

  const addMergeTag = (tag) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    const itext = new fabric.IText(tag.tag, {
      left: 60,
      top: 120,
      fontSize: 16,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#38bdf8',
      name: tag.label,
    });
    canvas.add(itext);
    canvas.setActiveObject(itext);
    canvas.renderAll();
    saveHistoryState();
    toast.success(`Inserted ${tag.label}`);
  };

  // ================= SAVE POSTER (ZERO THUMBNAILS) =================
  const handleSavePoster = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setStatusMessage('Saving poster to institutional registry...');

    try {
      const fabricJSON = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
      const svgOutput = canvas.toSVG();

      // STRICTLY ZERO THUMBNAIL OVERHEAD
      const payload = {
        name: posterName,
        description: description,
        dimension_width: dimWidth,
        dimension_height: dimHeight,
        dimension_unit: dimUnit,
        fabric_data: fabricJSON,
        custom_fabric_data: fabricJSON,
        html_content: svgOutput,
        custom_html: svgOutput,
      };

      const endpoint = currentPosterId
        ? getApiEndpoint(`staff/panel/posters/${currentPosterId}`)
        : getApiEndpoint('staff/panel/posters');

      const method = currentPosterId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save poster.');
      }

      if (data.poster?.id) {
        setCurrentPosterId(data.poster.id);
      }

      toast.success('Poster saved successfully!');
      setStatusMessage('Saved to institutional database.');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save poster.');
      setStatusMessage('Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // DOWNLOAD HIGH-RES JPEG
  const handleDownloadJpeg = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    toast.loading('Generating high-resolution JPEG...', { id: 'poster-dl' });
    try {
      const dataUrl = canvas.toDataURL({
        format: 'jpeg',
        quality: 1.0,
        multiplier: 2,
      });

      const filename = `${posterName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Website_Poster'}_${Date.now()}.jpeg`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('JPEG poster downloaded successfully!', { id: 'poster-dl' });
    } catch (err) {
      console.error('JPEG download error:', err);
      toast.error('Failed to export JPEG: ' + err.message, { id: 'poster-dl' });
    } finally {
      setIsExporting(false);
    }
  };

  // DOWNLOAD PRINT-GRADE PDF
  const handleDownloadPdf = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    toast.loading('Generating print-ready PDF document...', { id: 'poster-dl' });
    try {
      const dataUrl = canvas.toDataURL({
        format: 'jpeg',
        quality: 1.0,
        multiplier: 2,
      });

      let targetWidthMm = 210;
      let targetHeightMm = 297;

      if (dimUnit === 'mm') {
        targetWidthMm = dimWidth;
        targetHeightMm = dimHeight;
      } else if (dimUnit === 'in') {
        targetWidthMm = dimWidth * 25.4;
        targetHeightMm = dimHeight * 25.4;
      } else {
        targetWidthMm = Math.round(dimWidth * 0.264583);
        targetHeightMm = Math.round(dimHeight * 0.264583);
      }

      const isLandscape = targetWidthMm >= targetHeightMm;

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [targetWidthMm, targetHeightMm],
      });

      pdf.addImage(dataUrl, 'JPEG', 0, 0, targetWidthMm, targetHeightMm);
      const filename = `${posterName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Website_Poster'}_${Date.now()}.pdf`;
      pdf.save(filename);

      toast.success('PDF poster downloaded successfully!', { id: 'poster-dl' });
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to export PDF: ' + err.message, { id: 'poster-dl' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Bar */}
      <header className="h-12 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <a
            href={onExitUrl}
            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Exit Studio
          </a>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={posterName}
              onChange={(e) => setPosterName(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-sky-500 w-64"
              placeholder="Poster Title..."
            />
          </div>
        </div>

        {/* Center: Quick dimensions badge & Undo/Redo */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
            <span>{dimWidth} × {dimHeight} {dimUnit}</span>
            <span className="text-slate-500 capitalize">({dimWidth >= dimHeight ? 'Landscape' : 'Portrait'})</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded border border-slate-700">
            <button
              type="button"
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
              className="px-2 py-0.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleRedo}
              title="Redo (Ctrl+Y)"
              className="px-2 py-0.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Redo
            </button>
          </div>
        </div>

        {/* Right Actions: Export and Save */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadJpeg}
            disabled={isExporting}
            className="px-3 py-1 text-xs font-medium rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Download high-resolution JPEG"
          >
            Download JPEG
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="px-3 py-1 text-xs font-medium rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Download print-grade PDF"
          >
            Download PDF
          </button>

          <button
            type="button"
            onClick={handleSavePoster}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Poster'}
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <div className={`w-full lg:w-80 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0 ${mobileView === 'tools' ? 'flex flex-1 z-20' : 'hidden lg:flex'}`}>
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('elements')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'elements' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Elements
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shapes')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'shapes' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Shapes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'layers' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Layers ({canvasObjects.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'settings' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Canvas
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {activeTab === 'elements' && (
              <>
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-[10px] font-bold tracking-wider text-sky-400 uppercase">
                    Institutional Visual Builder
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Compose campaigns, event announcements, admissions banners, and social posts.
                  </p>
                </div>

                <div>
                  <h4 className="text-slate-400 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                    Text Blocks
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => addTextElement(website?.name || 'CAMPUS ACADEMY', 22, 'bold', '#38bdf8', 'School Title')}
                      className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-semibold"
                    >
                      + School Name Header
                    </button>
                    <button
                      type="button"
                      onClick={() => addTextElement('ANNUAL SCIENCE & TECH FAIR 2026', 26, 'bold', '#ffffff', 'Event Headline')}
                      className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-semibold"
                    >
                      + Main Event Headline
                    </button>
                    <button
                      type="button"
                      onClick={() => addTextElement('Join innovative student researchers across all departments.', 14, 'normal', '#94a3b8', 'Subheadline')}
                      className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-left"
                    >
                      + Sub-headline Description
                    </button>
                    <button
                      type="button"
                      onClick={() => addTextElement('Date: Nov 25, 2026 • 10:00 AM', 13, 'bold', '#f59e0b', 'Date Line')}
                      className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-left"
                    >
                      + Date &amp; Time Line
                    </button>
                    <button
                      type="button"
                      onClick={() => addTextElement('Venue: Main Auditorium Complex', 13, 'normal', '#cbd5e1', 'Venue Line')}
                      className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-left"
                    >
                      + Venue Location
                    </button>
                    <button
                      type="button"
                      onClick={loadDefaultSchoolPoster}
                      className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-center"
                    >
                      Reset to Standard School Layout
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-slate-400 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                    School Dynamic Merge Tags
                  </h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {POSTER_MERGE_TAGS.map((tag) => (
                      <button
                        key={tag.tag}
                        type="button"
                        onClick={() => addMergeTag(tag)}
                        className="w-full flex items-center justify-between p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors text-left"
                      >
                        <div>
                          <div className="font-medium text-slate-200">{tag.label}</div>
                          <div className="text-[10px] text-sky-400/80 font-mono">{tag.tag}</div>
                        </div>
                        <span className="text-[10px] text-slate-500">Insert</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Shapes Palette Tab */}
            {activeTab === 'shapes' && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-[10px] font-bold tracking-wider text-sky-400 uppercase">
                    Vector Shape Geometry
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Add clean geometric vector shapes, badges, and separators to your poster.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={addRectangle}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>Rectangle</span>
                    <span className="text-[10px] text-slate-400">Box container</span>
                  </button>

                  <button
                    type="button"
                    onClick={addRoundedBox}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>Rounded Box</span>
                    <span className="text-[10px] text-slate-400">Content panel</span>
                  </button>

                  <button
                    type="button"
                    onClick={addCircle}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>Circle</span>
                    <span className="text-[10px] text-slate-400">Badge & emblem</span>
                  </button>

                  <button
                    type="button"
                    onClick={addTriangle}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>Triangle</span>
                    <span className="text-[10px] text-slate-400">Pointer & graphic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addLine(false)}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>H-Divider</span>
                    <span className="text-[10px] text-slate-400">Horizontal rule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addLine(true)}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>V-Divider</span>
                    <span className="text-[10px] text-slate-400">Vertical separator</span>
                  </button>

                  <button
                    type="button"
                    onClick={addStar}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>Star Badge</span>
                    <span className="text-[10px] text-slate-400">5-point emblem</span>
                  </button>

                  <button
                    type="button"
                    onClick={addBadge}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>Pill Tag</span>
                    <span className="text-[10px] text-slate-400">CTA button pill</span>
                  </button>
                </div>
              </div>
            )}

            {/* Layers Tab */}
            {activeTab === 'layers' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Layer Stack (Top to Bottom)</span>
                </div>
                {canvasObjects.map((obj, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const canvas = fabricCanvasRef.current;
                      if (!canvas) return;
                      canvas.setActiveObject(obj);
                      canvas.renderAll();
                    }}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer border text-xs ${
                      selectedObject === obj
                        ? 'bg-sky-950/40 border-sky-600 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">
                      {obj.name || obj.text || obj.type || `Layer ${canvasObjects.length - i}`}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">{obj.type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Canvas Settings */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-3">
                  <h4 className="text-sky-400 font-semibold uppercase text-[10px] tracking-wider">
                    Poster Dimensions (Manual Freedom)
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Width</label>
                      <input
                        type="number"
                        step="any"
                        value={dimWidth}
                        onChange={(e) => handleDimensionChange(parseFloat(e.target.value) || 0, dimHeight, dimUnit)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Height</label>
                      <input
                        type="number"
                        step="any"
                        value={dimHeight}
                        onChange={(e) => handleDimensionChange(dimWidth, parseFloat(e.target.value) || 0, dimUnit)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Unit</label>
                      <select
                        value={dimUnit}
                        onChange={(e) => handleDimensionChange(dimWidth, dimHeight, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      >
                        <option value="px">px (Pixels)</option>
                        <option value="mm">mm (Millimeters)</option>
                        <option value="in">in (Inches)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Orientation</label>
                      <button
                        type="button"
                        onClick={handleSwapDimensions}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-800"
                        title="Click to swap width and height"
                      >
                        <span className="capitalize">{dimWidth >= dimHeight ? 'Landscape' : 'Portrait'}</span>
                        <span className="text-[10px] text-slate-400">⇄ Swap</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                  <h4 className="text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                    Background Color
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      defaultValue="#090d16"
                      onChange={(e) => {
                        if (fabricCanvasRef.current) {
                          fabricCanvasRef.current.setBackgroundColor(e.target.value, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current));
                          saveHistoryState();
                        }
                      }}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-slate-300 text-xs">Canvas Base Fill</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Description / Notes</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-xs resize-none"
                    placeholder="Campaign notes, target audience, social handles..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Workstation & Alignment Toolbar */}
        <div className={`flex-1 min-w-0 flex flex-col bg-slate-950 overflow-hidden ${mobileView === 'canvas' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Alignment & Quick Tools Sub-bar */}
          <div className="min-h-10 border-b border-slate-800 bg-slate-900/90 px-3 py-1 flex items-center justify-between text-xs shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
            {/* Alignment Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Align:</span>
              <button
                type="button"
                disabled={!selectedObject}
                onClick={alignLeft}
                className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                title="Align Left"
              >
                Left
              </button>
              <button
                type="button"
                disabled={!selectedObject}
                onClick={alignCenterH}
                className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                title="Center Horizontally"
              >
                Center H
              </button>
              <button
                type="button"
                disabled={!selectedObject}
                onClick={alignRight}
                className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                title="Align Right"
              >
                Right
              </button>
              <span className="text-slate-700 mx-1">|</span>
              <button
                type="button"
                disabled={!selectedObject}
                onClick={alignTop}
                className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                title="Align Top"
              >
                Top
              </button>
              <button
                type="button"
                disabled={!selectedObject}
                onClick={alignCenterV}
                className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                title="Center Vertically"
              >
                Middle V
              </button>
              <button
                type="button"
                disabled={!selectedObject}
                onClick={alignBottom}
                className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                title="Align Bottom"
              >
                Bottom
              </button>
              <button
                type="button"
                disabled={!selectedObject}
                onClick={alignCenterCanvas}
                className="px-2 py-0.5 rounded border border-sky-800/80 bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 disabled:opacity-40 transition-colors font-medium ml-1"
                title="Center in Canvas"
              >
                Center All
              </button>
            </div>

            {/* Quick Actions (Duplicate, Flip, Lock, Delete) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!selectedObject}
                onClick={duplicateSelected}
                className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
                title="Duplicate Object (Ctrl+D)"
              >
                Duplicate
              </button>

              <button
                type="button"
                disabled={!selectedObject}
                onClick={flipX}
                className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
                title="Flip Horizontal"
              >
                Flip X
              </button>

              <button
                type="button"
                disabled={!selectedObject}
                onClick={flipY}
                className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
                title="Flip Vertical"
              >
                Flip Y
              </button>

              <button
                type="button"
                disabled={!selectedObject}
                onClick={toggleLock}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  selectedObject?.lockMovementX
                    ? 'border-sky-600 bg-sky-950 text-sky-300'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                } disabled:opacity-40`}
                title="Lock / Unlock Position"
              >
                {selectedObject?.lockMovementX ? 'Unlock' : 'Lock'}
              </button>

              <button
                type="button"
                disabled={!selectedObject}
                onClick={deleteSelected}
                className="px-2 py-0.5 rounded border border-rose-900/70 bg-rose-950/50 hover:bg-rose-900 text-rose-300 disabled:opacity-40 transition-colors"
                title="Delete Object (Del)"
              >
                Delete
              </button>

              <span className="text-slate-700 mx-1">|</span>

              {/* Grid Toggle */}
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2 py-0.5 rounded border text-[11px] transition-colors ${
                  showGrid
                    ? 'border-sky-500 bg-sky-950 text-sky-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Grid: {showGrid ? 'On' : 'Off'}
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.3, Number((z - 0.1).toFixed(1))))}
                  className="hover:text-white"
                >
                  -
                </button>
                <span className="font-mono text-[11px] w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
                  className="hover:text-white"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(0.75)}
                  className="ml-1 text-[10px] text-slate-400 hover:text-slate-200"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            className={`flex-1 overflow-auto flex items-center justify-center p-8 ${
              showGrid
                ? 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950'
                : 'bg-slate-950'
            }`}
          >
            <div
              className="relative shadow-2xl transition-transform duration-100 ease-out border border-slate-700"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              <canvas ref={canvasElRef} />
            </div>
          </div>

          {/* Canvas Footer Status */}
          <div className="h-6 border-t border-slate-800 bg-slate-900 px-3 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <div className="flex items-center gap-3">
              <span>Dimensions: {dimWidth} × {dimHeight} {dimUnit}</span>
              <span>•</span>
              <span>Objects: {canvasObjects.length}</span>
            </div>
            <div>
              <span>Status: {statusMessage}</span>
            </div>
          </div>
        </div>

        {/* Right Inspector Sidebar */}
        <div className={`w-full lg:w-72 border-l border-slate-800 bg-slate-900 p-4 overflow-y-auto text-xs space-y-4 shrink-0 ${mobileView === 'inspector' ? 'flex flex-1 z-20' : 'hidden lg:flex'}`}>
          <div className="border-b border-slate-800 pb-2">
            <h3 className="font-bold text-slate-200 uppercase text-[11px] tracking-wider">
              {selectedObject ? 'Object Properties' : 'Inspector'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {selectedObject ? selectedObject.type?.toUpperCase() : 'No element selected'}
            </p>
          </div>

          {selectedObject ? (
            <div className="space-y-4">
              {/* Layer Stacking Order */}
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Layer Ordering</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={bringToFront}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-center"
                  >
                    To Front
                  </button>
                  <button
                    type="button"
                    onClick={sendToBack}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-center"
                  >
                    To Back
                  </button>
                  <button
                    type="button"
                    onClick={bringForward}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-center"
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    onClick={sendBackward}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-center"
                  >
                    Backward
                  </button>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Opacity</span>
                  <span className="font-mono text-sky-400">
                    {Math.round((selectedObject.opacity ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedObject.opacity ?? 1}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    selectedObject.set('opacity', val);
                    fabricCanvasRef.current?.renderAll();
                    setSelectedObject({ ...selectedObject });
                    saveHistoryState();
                  }}
                  className="w-full accent-sky-500"
                />
              </div>

              {/* Color & Fills */}
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Colors & Stroke</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fill Color:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000'}
                      onChange={(e) => {
                        selectedObject.set('fill', e.target.value);
                        fabricCanvasRef.current?.renderAll();
                        setSelectedObject({ ...selectedObject });
                        saveHistoryState();
                      }}
                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-slate-300 text-[11px]">
                      {typeof selectedObject.fill === 'string' ? selectedObject.fill : 'complex'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Stroke Color:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={typeof selectedObject.stroke === 'string' ? selectedObject.stroke : '#000000'}
                      onChange={(e) => {
                        selectedObject.set('stroke', e.target.value);
                        fabricCanvasRef.current?.renderAll();
                        setSelectedObject({ ...selectedObject });
                        saveHistoryState();
                      }}
                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-slate-300 text-[11px]">
                      {typeof selectedObject.stroke === 'string' ? selectedObject.stroke : 'none'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Stroke Width:</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={selectedObject.strokeWidth ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      selectedObject.set('strokeWidth', val);
                      fabricCanvasRef.current?.renderAll();
                      setSelectedObject({ ...selectedObject });
                      saveHistoryState();
                    }}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-slate-200"
                  />
                </div>

                {selectedObject.type === 'rect' && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Corner Radius:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={selectedObject.rx ?? 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        selectedObject.set({ rx: val, ry: val });
                        fabricCanvasRef.current?.renderAll();
                        setSelectedObject({ ...selectedObject });
                        saveHistoryState();
                      }}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Typography if Text Object */}
              {(selectedObject.type === 'i-text' || selectedObject.type === 'text') && (
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Typography</span>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Font Family</label>
                    <select
                      value={selectedObject.fontFamily || 'Inter'}
                      onChange={(e) => {
                        selectedObject.set('fontFamily', e.target.value);
                        fabricCanvasRef.current?.renderAll();
                        setSelectedObject({ ...selectedObject });
                        saveHistoryState();
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    >
                      {GOOGLE_FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Font Size</label>
                      <input
                        type="number"
                        min="6"
                        max="140"
                        value={selectedObject.fontSize || 16}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 16;
                          selectedObject.set('fontSize', val);
                          fabricCanvasRef.current?.renderAll();
                          setSelectedObject({ ...selectedObject });
                          saveHistoryState();
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Line Height</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="3"
                        value={selectedObject.lineHeight || 1.2}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1.2;
                          selectedObject.set('lineHeight', val);
                          fabricCanvasRef.current?.renderAll();
                          setSelectedObject({ ...selectedObject });
                          saveHistoryState();
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Font Styling Buttons */}
                  <div className="flex gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const isBold = selectedObject.fontWeight === 'bold';
                        selectedObject.set('fontWeight', isBold ? 'normal' : 'bold');
                        fabricCanvasRef.current?.renderAll();
                        setSelectedObject({ ...selectedObject });
                        saveHistoryState();
                      }}
                      className={`flex-1 py-1 rounded border text-center font-bold ${
                        selectedObject.fontWeight === 'bold'
                          ? 'border-sky-600 bg-sky-950 text-sky-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300'
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const isItalic = selectedObject.fontStyle === 'italic';
                        selectedObject.set('fontStyle', isItalic ? 'normal' : 'italic');
                        fabricCanvasRef.current?.renderAll();
                        setSelectedObject({ ...selectedObject });
                        saveHistoryState();
                      }}
                      className={`flex-1 py-1 rounded border text-center italic ${
                        selectedObject.fontStyle === 'italic'
                          ? 'border-sky-600 bg-sky-950 text-sky-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300'
                      }`}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const isUnderline = !!selectedObject.underline;
                        selectedObject.set('underline', !isUnderline);
                        fabricCanvasRef.current?.renderAll();
                        setSelectedObject({ ...selectedObject });
                        saveHistoryState();
                      }}
                      className={`flex-1 py-1 rounded border text-center underline ${
                        selectedObject.underline
                          ? 'border-sky-600 bg-sky-950 text-sky-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300'
                      }`}
                    >
                      U
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              Click any element on canvas to modify its properties, alignment, layers, or styling.
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Tab Bar */}
      <nav className="lg:hidden h-12 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 shrink-0 z-30">
        <button
          type="button"
          onClick={() => setMobileView('tools')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded cursor-pointer transition-colors ${
            mobileView === 'tools' ? 'text-sky-400 bg-slate-800 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🛠️</span>
          <span>Tools &amp; Tags</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('canvas')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded cursor-pointer transition-colors ${
            mobileView === 'canvas' ? 'text-sky-400 bg-slate-800 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🎨</span>
          <span>Canvas</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('inspector')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded cursor-pointer transition-colors ${
            mobileView === 'inspector' ? 'text-sky-400 bg-slate-800 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>⚙️</span>
          <span>Inspector</span>
        </button>
      </nav>
    </div>
  );
}
