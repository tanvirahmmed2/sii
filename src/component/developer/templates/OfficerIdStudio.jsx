'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { generateStarterFabricJSON, generateStarterFabricBackJSON, patchFabric } from 'src/lib/templates/fabricTemplates';
import { COMPREHENSIVE_OFFICER_TAGS, DATA_CATEGORIES } from 'src/lib/templates/mergeTags';

const OFFICER_MERGE_TAGS = COMPREHENSIVE_OFFICER_TAGS;

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
  let widthVal = parseFloat(w) || 86;
  let heightVal = parseFloat(h) || 54;

  if (unit === 'px') return { pxW: Math.round(widthVal), pxH: Math.round(heightVal) };
  if (unit === 'in') return { pxW: Math.round(widthVal * 96), pxH: Math.round(heightVal * 96) };
  return { pxW: Math.round(widthVal * 7.5), pxH: Math.round(heightVal * 7.5) };
}

export default function OfficerIdStudio({ initialTemplate, onSave, onExitUrl = '/developer/templates/officer-id-card' }) {
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fabricRef = useRef(null);

  // Dual-sided state: 'front' or 'back'
  const [activeSide, setActiveSide] = useState('front');
  const [activeTab, setActiveTab] = useState('elements');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedObject, setSelectedObject] = useState(null);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [canvasBg, setCanvasBg] = useState('#ffffff');
  const [showGrid, setShowGrid] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [selectedTagCategory, setSelectedTagCategory] = useState('all');

  // Manual dimensions state
  const [dimWidth, setDimWidth] = useState(parseFloat(initialTemplate?.dimension_width) || 86);
  const [dimHeight, setDimHeight] = useState(parseFloat(initialTemplate?.dimension_height) || 54);
  const [dimUnit, setDimUnit] = useState(initialTemplate?.dimension_unit || 'mm');
  const [mobileView, setMobileView] = useState('canvas'); // 'canvas' | 'tools' | 'inspector'

  // Both sides vector JSON storage
  const [frontData, setFrontData] = useState(() => {
    if (initialTemplate?.fabric_data && typeof initialTemplate.fabric_data === 'object' && initialTemplate.fabric_data.objects?.length > 0) {
      return initialTemplate.fabric_data;
    }
    return generateStarterFabricJSON('officer_id');
  });

  const [backData, setBackData] = useState(() => {
    if (initialTemplate?.fabric_back_data && typeof initialTemplate.fabric_back_data === 'object' && initialTemplate.fabric_back_data.objects?.length > 0) {
      return initialTemplate.fabric_back_data;
    }
    return generateStarterFabricBackJSON('officer_id');
  });

  // Cached SVGs for instant dual export
  const [frontSvg, setFrontSvg] = useState(initialTemplate?.html_content || '');
  const [backSvg, setBackSvg] = useState(initialTemplate?.html_back_content || '');

  const [templateName, setTemplateName] = useState(initialTemplate?.name || 'Administrative Officer ID Pass');
  const [description, setDescription] = useState(initialTemplate?.description || '');

  // Undo / Redo history
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
      console.warn('Failed to capture canvas history state:', err);
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

  // Switch between Front & Back side
  const handleSwitchSide = (side) => {
    if (side === activeSide) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const currentJSON = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
    const currentSvgString = canvas.toSVG();

    let updatedFront = frontData;
    let updatedBack = backData;

    if (activeSide === 'front') {
      updatedFront = currentJSON;
      setFrontData(currentJSON);
      setFrontSvg(currentSvgString);
    } else {
      updatedBack = currentJSON;
      setBackData(currentJSON);
      setBackSvg(currentSvgString);
    }

    setActiveSide(side);
    setSelectedObject(null);

    const nextJSON = side === 'front' ? updatedFront : updatedBack;
    canvas.clear();
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));

    // Reset history for the side
    historyRef.current = [];
    historyIndexRef.current = -1;

    if (nextJSON && nextJSON.objects && nextJSON.objects.length > 0) {
      isHistoryActionRef.current = true;
      canvas.loadFromJSON(nextJSON, () => {
        isHistoryActionRef.current = false;
        canvas.renderAll();
        updateLayersList();
        saveHistoryState();
        setStatusMessage(`Loaded ${side.toUpperCase()} side.`);
      });
    } else if (side === 'back') {
      loadStandardOfficerBackLayout();
      setStatusMessage('Initialized standard back layout.');
    } else {
      canvas.renderAll();
      updateLayersList();
      saveHistoryState();
      setStatusMessage(`Initialized blank ${side.toUpperCase()} side.`);
    }
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
          backgroundColor: '#ffffff',
          preserveObjectStacking: true,
          selection: true,
        });
        fabricCanvasRef.current = canvas;

        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = '#f59e0b';
        fabric.Object.prototype.cornerStrokeColor = '#d97706';
        fabric.Object.prototype.borderColor = '#f59e0b';
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

        const dataToLoad = activeSide === 'front' ? frontData : backData;
        if (dataToLoad && dataToLoad.objects && dataToLoad.objects.length > 0) {
          isHistoryActionRef.current = true;
          canvas.loadFromJSON(dataToLoad, () => {
            isHistoryActionRef.current = false;
            canvas.renderAll();
            updateLayersList();
            saveHistoryState();
            setStatusMessage('Officer ID Layout loaded.');
          });
        } else {
          canvas.renderAll();
          updateLayersList();
          saveHistoryState();
        }
      } catch (err) {
        isHistoryActionRef.current = false;
        console.error('Error initializing officer canvas:', err);
        toast.error('Failed to initialize studio: ' + err.message);
      }
    }
    init();

    return () => {
      isMounted = false;
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
  }, []);

  // ================= ALIGNMENT UTILITIES =================
  const alignLeft = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set({ left: 10 });
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
    selectedObject.set({ left: canvas.width - w - 10 });
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
    toast.success('Aligned Right');
  };

  const alignTop = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set({ top: 10 });
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
    selectedObject.set({ top: canvas.height - h - 10 });
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
        left: selectedObject.left + 15,
        top: selectedObject.top + 15,
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
  };

  // ================= SHAPES PALETTE =================
  const addRectangle = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const rect = new fabric.Rect({
      left: 50,
      top: 50,
      width: 140,
      height: 70,
      fill: '#0f172a',
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
      left: 50,
      top: 50,
      width: 140,
      height: 70,
      fill: '#f8fafc',
      stroke: '#94a3b8',
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
      left: 60,
      top: 60,
      radius: 35,
      fill: '#f59e0b',
      stroke: '#d97706',
      strokeWidth: 1,
      name: 'Circle',
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
      left: 60,
      top: 60,
      width: 80,
      height: 70,
      fill: '#3b82f6',
      stroke: '#1d4ed8',
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
    const points = vertical ? [50, 20, 50, 160] : [20, 50, 220, 50];
    const line = new fabric.Line(points, {
      stroke: '#f59e0b',
      strokeWidth: 2,
      name: vertical ? 'Vertical Line' : 'Divider Line',
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
      left: 50,
      top: 50,
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
      left: 40,
      top: 40,
      width: 120,
      height: 32,
      fill: '#1e293b',
      stroke: '#f59e0b',
      strokeWidth: 1.5,
      rx: 16,
      ry: 16,
      name: 'Pill Badge',
    });
    canvas.add(badge);
    canvas.setActiveObject(badge);
    canvas.renderAll();
    toast.success('Added Pill Badge');
  };

  // Standard Officer Back Layout
  const loadStandardOfficerBackLayout = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    canvas.clear();
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));

    const topBar = new fabric.Rect({
      left: 0,
      top: 0,
      width: canvas.width,
      height: 36,
      fill: '#1e293b',
      name: 'Back Header Ribbon',
    });
    canvas.add(topBar);

    const topText = new fabric.IText('ADMINISTRATIVE SECURITY & ACCESS RULES', {
      left: 18,
      top: 10,
      fontSize: 11,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#f59e0b',
      name: 'Instructions Header',
    });
    canvas.add(topText);

    const terms = new fabric.IText(
      '1. Official administrative pass of Alpha International Academy.\n' +
      '2. Non-transferable; grants entrance to secured executive offices.\n' +
      '3. Surrender immediately upon resignation or transfer of duties.\n' +
      '4. Emergency Administration Desk: +880 1900-445566',
      {
        left: 18,
        top: 52,
        fontSize: 10,
        fontFamily: 'Inter',
        lineHeight: 1.45,
        fill: '#334155',
        name: 'Terms Text',
      }
    );
    canvas.add(terms);

    const returnBox = new fabric.Rect({
      left: 18,
      top: 145,
      width: canvas.width - 36,
      height: 48,
      fill: '#f8fafc',
      stroke: '#cbd5e1',
      strokeWidth: 1,
      rx: 4,
      ry: 4,
      name: 'Security Address Container',
    });
    canvas.add(returnBox);

    const returnText = new fabric.IText(
      'If found, please return to: Security & Administration Secretariat\nBuilding B, Alpha International Academy Main Campus',
      {
        left: 28,
        top: 157,
        fontSize: 10,
        fontFamily: 'Inter',
        fill: '#475569',
        name: 'Return Address Text',
      }
    );
    canvas.add(returnText);

    const sigLine = new fabric.Line([canvas.width - 180, 248, canvas.width - 25, 248], {
      stroke: '#0f172a',
      strokeWidth: 1.5,
      name: 'Signature Line',
    });
    canvas.add(sigLine);

    const sigText = new fabric.IText('Executive Director / Registrar', {
      left: canvas.width - 175,
      top: 254,
      fontSize: 10,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#0f172a',
      name: 'Signature Label',
    });
    canvas.add(sigText);

    const barcodeBox = new fabric.Rect({
      left: 18,
      top: 215,
      width: 170,
      height: 44,
      fill: '#ffffff',
      stroke: '#94a3b8',
      strokeWidth: 1,
      rx: 3,
      ry: 3,
      name: 'Barcode Box',
    });
    canvas.add(barcodeBox);

    const barcodeText = new fabric.IText('*OFF2026009*', {
      left: 28,
      top: 228,
      fontSize: 14,
      fontFamily: 'Courier',
      fontWeight: 'bold',
      fill: '#0f172a',
      name: 'Barcode Text',
    });
    canvas.add(barcodeText);

    canvas.renderAll();
    updateLayersList();
    const newBackJSON = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
    setBackData(newBackJSON);
    setBackSvg(canvas.toSVG());
    saveHistoryState();
  };

  // Add Front Elements
  const addHeading = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText('ALPHA INTERNATIONAL ACADEMY', {
      left: 20,
      top: 16,
      fontSize: 16,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#ffffff',
      name: 'Institute Header',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addSubheading = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText('ADMINISTRATIVE STAFF / OFFICER', {
      left: 20,
      top: 40,
      fontSize: 11,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#f59e0b',
      name: 'Badge Subheader',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addPhotoBox = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const box = new fabric.Rect({
      left: 24,
      top: 80,
      width: 120,
      height: 140,
      fill: '#f1f5f9',
      stroke: '#94a3b8',
      strokeWidth: 2,
      rx: 6,
      ry: 6,
      name: 'Photo Frame',
    });
    const label = new fabric.IText('OFFICER PHOTO', {
      left: 36,
      top: 140,
      fontSize: 10,
      fontFamily: 'Inter',
      fill: '#64748b',
      name: 'Photo Placeholder',
    });
    canvas.add(box);
    canvas.add(label);
    canvas.renderAll();
  };

  const addMergeTag = (tag, withLabel = true) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const content = withLabel ? `${tag.label}: ${tag.tag}` : tag.tag;
    const text = new fabric.IText(content, {
      left: 40,
      top: 90,
      fontSize: 12,
      fontFamily: 'Inter',
      fill: '#0f172a',
      name: tag.label,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveHistoryState();
    toast.success(`Added ${tag.label}`);
  };

  // ================= SAVE BOTH SIDES (ZERO THUMBNAILS) =================
  const handleSave = async () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setStatusMessage('Saving Officer ID Template with dual-sided vector data...');

    try {
      const activeJSON = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
      const activeSvg = canvas.toSVG();

      let finalFrontData = activeSide === 'front' ? activeJSON : (frontData || generateStarterFabricJSON('officer_id'));
      let finalBackData = activeSide === 'back' ? activeJSON : (backData || generateStarterFabricBackJSON('officer_id'));
      let finalFrontSvg = activeSide === 'front' ? activeSvg : frontSvg;
      let finalBackSvg = activeSide === 'back' ? activeSvg : backSvg;

      // If one side's SVG is missing, render offscreen to guarantee full vector exports
      if (!finalFrontSvg && finalFrontData && fabric) {
        const offCanvas = new fabric.StaticCanvas(null, { width: canvas.width, height: canvas.height });
        await new Promise((res) => {
          offCanvas.loadFromJSON(finalFrontData, () => {
            offCanvas.renderAll();
            finalFrontSvg = offCanvas.toSVG();
            offCanvas.dispose();
            res();
          });
        });
      }

      if (!finalBackSvg && finalBackData && fabric) {
        const offCanvas = new fabric.StaticCanvas(null, { width: canvas.width, height: canvas.height });
        await new Promise((res) => {
          offCanvas.loadFromJSON(finalBackData, () => {
            offCanvas.renderAll();
            finalBackSvg = offCanvas.toSVG();
            offCanvas.dispose();
            res();
          });
        });
      }

      const payload = {
        name: templateName,
        description: description,
        dimension_width: dimWidth,
        dimension_height: dimHeight,
        dimension_unit: dimUnit,
        fabric_data: finalFrontData,
        fabric_back_data: finalBackData,
        html_content: finalFrontSvg || '',
        html_back_content: finalBackSvg || '',
        available_merge_tags: OFFICER_MERGE_TAGS,
      };

      if (onSave) {
        await onSave(payload);
      } else {
        const tplId = initialTemplate?.id;
        const res = await fetch(`/api/marketing/developer/templates/${tplId}?task=officer_id`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || 'Failed to save template');
      }

      // Update state caches
      if (activeSide === 'front') {
        setFrontData(finalFrontData);
        setFrontSvg(finalFrontSvg);
      } else {
        setBackData(finalBackData);
        setBackSvg(finalBackSvg);
      }

      toast.success('Officer ID template saved (Front & Back)!');
      setStatusMessage('Template persisted with dual-sided vector support.');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save template.');
      setStatusMessage('Save failed.');
    } finally {
      setIsSaving(false);
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
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-amber-500 w-64"
              placeholder="Officer ID Template Name"
            />
          </div>
        </div>

        {/* Center: DUAL-SIDED SWITCHER & SIZING */}
        <div className="flex items-center gap-3">
          {/* Dual Side Toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => handleSwitchSide('front')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeSide === 'front'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Front Side
            </button>
            <button
              type="button"
              onClick={() => handleSwitchSide('back')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeSide === 'back'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Back Side
            </button>
          </div>

          {/* Quick Dimensions Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
            <span>{dimWidth} × {dimHeight} {dimUnit}</span>
            <span className="text-slate-500 capitalize">({dimWidth >= dimHeight ? 'Landscape' : 'Portrait'})</span>
          </div>

          {/* Undo / Redo */}
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

        {/* Right Action: Save */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden lg:inline">{statusMessage}</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSaving ? 'Saving Dual Sides...' : 'Save Template'}
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
                activeTab === 'elements' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Elements
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shapes')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'shapes' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Shapes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'tags' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tags
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'layers' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Layers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'settings' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Canvas
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {activeTab === 'elements' && (
              <>
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                    Currently Editing: {activeSide.toUpperCase()} SIDE
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeSide === 'front'
                      ? 'Configure primary ID credentials, photo frame, and staff details.'
                      : 'Configure administrative guidelines, access rules, security signature, and barcode.'}
                  </p>
                </div>

                {activeSide === 'back' && (
                  <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded">
                    <span className="text-amber-400 font-semibold block mb-1">Back Quick Setup</span>
                    <button
                      type="button"
                      onClick={loadStandardOfficerBackLayout}
                      className="w-full py-1.5 px-3 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors"
                    >
                      Load Standard Officer Back Layout
                    </button>
                  </div>
                )}

                <div>
                  <h4 className="text-slate-400 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                    {activeSide === 'front' ? 'Front Structures' : 'Back Structures'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={addHeading}
                      className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium"
                    >
                      + Institute Title
                    </button>
                    <button
                      type="button"
                      onClick={addSubheading}
                      className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium"
                    >
                      + Badge Label
                    </button>
                    {activeSide === 'front' && (
                      <button
                        type="button"
                        onClick={addPhotoBox}
                        className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium"
                      >
                        + Photo Box
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const canvas = fabricCanvasRef.current;
                        const fabric = fabricRef.current;
                        if (!canvas || !fabric) return;
                        const t = new fabric.IText('New Text Element', {
                          left: 40,
                          top: 40,
                          fontSize: 12,
                          fontFamily: 'Inter',
                          fill: '#0f172a',
                        });
                        canvas.add(t);
                        canvas.setActiveObject(t);
                        canvas.renderAll();
                      }}
                      className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium"
                    >
                      + Custom Text
                    </button>
                  </div>
                </div>

              </>
            )}

            {/* Shapes Palette Tab */}
            {activeTab === 'shapes' && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                    Shape Geometry Palette
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Add clean geometric vector shapes, badges, and separators to your template.
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
                    <span className="text-[10px] text-slate-400">Card container</span>
                  </button>

                  <button
                    type="button"
                    onClick={addCircle}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>Circle</span>
                    <span className="text-[10px] text-slate-400">Badge & avatar</span>
                  </button>

                  <button
                    type="button"
                    onClick={addTriangle}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium flex flex-col gap-1"
                  >
                    <span>Triangle</span>
                    <span className="text-[10px] text-slate-400">Arrow & pointer</span>
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
                    <span className="text-[10px] text-slate-400">Status pill</span>
                  </button>
                </div>
              </div>
            )}

            {/* Merge Tags Tab */}
            {activeTab === 'tags' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                    Officer Profile Data Fields
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {COMPREHENSIVE_OFFICER_TAGS.length} Fields
                  </span>
                </div>

                {/* Field Search */}
                <div>
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Search officer fields (e.g. designation, NID, department)..."
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Category Chips */}
                <div className="flex flex-wrap gap-1">
                  {DATA_CATEGORIES.filter(c => c.id !== 'guardian').map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedTagCategory(cat.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        selectedTagCategory === cat.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Filtered Fields List */}
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {COMPREHENSIVE_OFFICER_TAGS.filter((tag) => {
                    const matchesCat = selectedTagCategory === 'all' || tag.category === selectedTagCategory;
                    const matchesSearch = !tagSearch.trim() || 
                      tag.label.toLowerCase().includes(tagSearch.toLowerCase()) ||
                      tag.tag.toLowerCase().includes(tagSearch.toLowerCase()) ||
                      (tag.sample && tag.sample.toLowerCase().includes(tagSearch.toLowerCase()));
                    return matchesCat && matchesSearch;
                  }).map((tag) => (
                    <div
                      key={tag.tag}
                      className="p-2 rounded bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-colors flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200 text-xs">{tag.label}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 font-mono">
                          {tag.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-amber-400">{tag.tag}</span>
                        {tag.sample && <span className="text-slate-400 italic truncate max-w-[100px]">Ex: {tag.sample}</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => addMergeTag(tag, true)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-amber-600 hover:text-white text-slate-300 text-[10px] font-medium text-center transition-colors cursor-pointer"
                          title={`Insert as "${tag.label}: ${tag.tag}"`}
                        >
                          + Label: Value
                        </button>
                        <button
                          type="button"
                          onClick={() => addMergeTag(tag, false)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-amber-600 hover:text-white text-slate-300 text-[10px] font-medium text-center transition-colors cursor-pointer"
                          title={`Insert value only "${tag.tag}"`}
                        >
                          + Value Only
                        </button>
                      </div>
                    </div>
                  ))}
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
                        ? 'bg-amber-950/40 border-amber-600 text-white'
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
                  <h4 className="text-amber-400 font-semibold uppercase text-[10px] tracking-wider">
                    Dimensions (Manual Freedom)
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
                        <option value="mm">mm (Millimeters)</option>
                        <option value="in">in (Inches)</option>
                        <option value="px">px (Pixels)</option>
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
                      value={canvasBg}
                      onChange={(e) => {
                        setCanvasBg(e.target.value);
                        if (fabricCanvasRef.current) {
                          fabricCanvasRef.current.setBackgroundColor(e.target.value, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current));
                          saveHistoryState();
                        }
                      }}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-slate-300 text-xs">{canvasBg}</span>
                  </div>
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
                className="px-2 py-0.5 rounded border border-amber-800/80 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 disabled:opacity-40 transition-colors font-medium ml-1"
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
                    ? 'border-amber-600 bg-amber-950 text-amber-300'
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
                    ? 'border-amber-500 bg-amber-950 text-amber-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Grid: {showGrid ? 'On' : 'Off'}
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
                  className="hover:text-white"
                >
                  -
                </button>
                <span className="font-mono text-[11px] w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.1).toFixed(1))))}
                  className="hover:text-white"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
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
                ? 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950'
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
              <span>Side: <b className="text-amber-400 capitalize">{activeSide}</b></span>
              <span>•</span>
              <span>Dimensions: {dimWidth} × {dimHeight} {dimUnit}</span>
              <span>•</span>
              <span>Objects: {canvasObjects.length}</span>
            </div>
            <div>
              <span>Select an object to inspect & edit properties.</span>
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
                  <span className="font-mono text-amber-400">
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
                  className="w-full accent-amber-500"
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
                        max="120"
                        value={selectedObject.fontSize || 12}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 12;
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
                          ? 'border-amber-600 bg-amber-950 text-amber-300'
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
                          ? 'border-amber-600 bg-amber-950 text-amber-300'
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
                          ? 'border-amber-600 bg-amber-950 text-amber-300'
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
            mobileView === 'tools' ? 'text-amber-400 bg-slate-800 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🛠️</span>
          <span>Tools &amp; Tags</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('canvas')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded cursor-pointer transition-colors ${
            mobileView === 'canvas' ? 'text-amber-400 bg-slate-800 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🎨</span>
          <span>Canvas</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('inspector')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded cursor-pointer transition-colors ${
            mobileView === 'inspector' ? 'text-amber-400 bg-slate-800 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>⚙️</span>
          <span>Inspector</span>
        </button>
      </nav>
    </div>
  );
}
