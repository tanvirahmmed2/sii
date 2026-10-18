'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { generateStarterFabricJSON, generateStarterFabricBackJSON, patchFabric } from 'src/lib/templates/fabricTemplates';
import { COMPREHENSIVE_STUDENT_TAGS, DATA_CATEGORIES } from 'src/lib/templates/mergeTags';

const STUDENT_MERGE_TAGS = COMPREHENSIVE_STUDENT_TAGS;

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
  // mm: scale factor 7.5 for sharp vector canvas
  return { pxW: Math.round(widthVal * 7.5), pxH: Math.round(heightVal * 7.5) };
}

export default function StudentIdStudio({ initialTemplate, onSave, onExitUrl = '/developer/templates/student-id-card' }) {
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
    return generateStarterFabricJSON('student_id');
  });

  const [backData, setBackData] = useState(() => {
    if (initialTemplate?.fabric_back_data && typeof initialTemplate.fabric_back_data === 'object' && initialTemplate.fabric_back_data.objects?.length > 0) {
      return initialTemplate.fabric_back_data;
    }
    return generateStarterFabricBackJSON('student_id');
  });

  // Cached SVGs for instant dual export
  const [frontSvg, setFrontSvg] = useState(initialTemplate?.html_content || '');
  const [backSvg, setBackSvg] = useState(initialTemplate?.html_back_content || '');

  const [templateName, setTemplateName] = useState(initialTemplate?.name || 'Standard Student ID Card');
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
        setStatusMessage(`Loaded ${side} side of student ID card.`);
      });
    } else if (side === 'back') {
      loadStandardStudentBackLayout();
      setStatusMessage('Initialized standard back layout.');
    } else {
      canvas.renderAll();
      updateLayersList();
      saveHistoryState();
      setStatusMessage(`Initialized blank ${side} side.`);
    }
  };

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
        fabric.Object.prototype.cornerColor = '#0284c7';
        fabric.Object.prototype.cornerStrokeColor = '#0369a1';
        fabric.Object.prototype.borderColor = '#0284c7';
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
            setStatusMessage('Student ID layout loaded.');
          });
        } else {
          canvas.renderAll();
          updateLayersList();
          saveHistoryState();
        }
      } catch (err) {
        isHistoryActionRef.current = false;
        console.error('Error initializing student ID canvas:', err);
        toast.error('Failed to initialize studio: ' + err.message);
      }
    }
    init();

    return () => {
      isMounted = false;
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
  }, []);

  // Keyboard shortcuts (Undo, Redo, Delete, Duplicate)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObject && !selectedObject.isEditing) {
          deleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject]);

  // Undo / Redo
  const undo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    isHistoryActionRef.current = true;
    historyIndexRef.current -= 1;
    const prevState = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(prevState, () => {
      canvas.renderAll();
      updateLayersList();
      isHistoryActionRef.current = false;
      toast.success('Undo', { duration: 800 });
    });
  };

  const redo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    isHistoryActionRef.current = true;
    historyIndexRef.current += 1;
    const nextState = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      updateLayersList();
      isHistoryActionRef.current = false;
      toast.success('Redo', { duration: 800 });
    });
  };

  // ================= ALIGNMENT TOOLS =================
  const alignLeft = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    selectedObject.set('left', 10);
    selectedObject.setCoords();
    fabricCanvasRef.current.renderAll();
    saveHistoryState();
  };

  const alignCenterH = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    fabricCanvasRef.current.centerObjectH(selectedObject);
    selectedObject.setCoords();
    fabricCanvasRef.current.renderAll();
    saveHistoryState();
  };

  const alignRight = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    selectedObject.set('left', canvas.width - (selectedObject.getScaledWidth() + 10));
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
  };

  const alignTop = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    selectedObject.set('top', 10);
    selectedObject.setCoords();
    fabricCanvasRef.current.renderAll();
    saveHistoryState();
  };

  const alignCenterV = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    fabricCanvasRef.current.centerObjectV(selectedObject);
    selectedObject.setCoords();
    fabricCanvasRef.current.renderAll();
    saveHistoryState();
  };

  const alignBottom = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    selectedObject.set('top', canvas.height - (selectedObject.getScaledHeight() + 10));
    selectedObject.setCoords();
    canvas.renderAll();
    saveHistoryState();
  };

  const centerOnCanvas = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    fabricCanvasRef.current.centerObject(selectedObject);
    selectedObject.setCoords();
    fabricCanvasRef.current.renderAll();
    saveHistoryState();
  };

  // ================= ADVANCED OBJECT TOOLS =================
  const duplicateSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!selectedObject || !canvas) return;
    selectedObject.clone((cloned) => {
      cloned.set({
        left: selectedObject.left + 16,
        top: selectedObject.top + 16,
        evented: true,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      updateLayersList();
      saveHistoryState();
      toast.success('Element duplicated');
    });
  };

  const flipHorizontal = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    fabricCanvasRef.current.renderAll();
    saveHistoryState();
  };

  const flipVertical = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    fabricCanvasRef.current.renderAll();
    saveHistoryState();
  };

  const toggleLock = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    const isLocked = !selectedObject.lockMovementX;
    selectedObject.set({
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      lockRotation: isLocked,
      lockScalingX: isLocked,
      lockScalingY: isLocked,
      hasControls: !isLocked,
    });
    fabricCanvasRef.current.renderAll();
    setSelectedObject(Object.assign(Object.create(Object.getPrototypeOf(selectedObject)), selectedObject));
    toast.success(isLocked ? 'Element locked' : 'Element unlocked');
  };

  const bringToFront = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    fabricCanvasRef.current.bringToFront(selectedObject);
    fabricCanvasRef.current.renderAll();
    updateLayersList();
    saveHistoryState();
  };

  const sendToBack = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    fabricCanvasRef.current.sendToBack(selectedObject);
    fabricCanvasRef.current.renderAll();
    updateLayersList();
    saveHistoryState();
  };

  const bringForward = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    fabricCanvasRef.current.bringForward(selectedObject);
    fabricCanvasRef.current.renderAll();
    updateLayersList();
    saveHistoryState();
  };

  const sendBackward = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    fabricCanvasRef.current.sendBackwards(selectedObject);
    fabricCanvasRef.current.renderAll();
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
    toast.success('Element removed');
  };

  const updateSelectedProp = (prop, value) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set(prop, value);
    selectedObject.setCoords();
    canvas.renderAll();
    setSelectedObject(Object.assign(Object.create(Object.getPrototypeOf(selectedObject)), selectedObject));
    saveHistoryState();
  };

  // ================= SHAPES TOOL PALETTE =================
  const addRectangle = (rounded = false) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const rect = new fabric.Rect({
      left: 50,
      top: 50,
      width: 140,
      height: 70,
      fill: '#0284c7',
      stroke: '#0369a1',
      strokeWidth: 1,
      rx: rounded ? 10 : 0,
      ry: rounded ? 10 : 0,
      name: rounded ? 'Rounded Box' : 'Rectangle',
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    toast.success(`Added ${rounded ? 'Rounded Box' : 'Rectangle'}`);
  };

  const addCircle = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const circle = new fabric.Circle({
      left: 60,
      top: 60,
      radius: 35,
      fill: '#38bdf8',
      stroke: '#0284c7',
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
    const points = vertical ? [50, 20, 50, 160] : [20, 50, 220, 50];
    const line = new fabric.Line(points, {
      stroke: '#0284c7',
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
      stroke: '#d97706',
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
      fill: '#0f172a',
      stroke: '#38bdf8',
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

  // Standard Back Layout Generator
  const loadStandardStudentBackLayout = () => {
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
      fill: '#0f172a',
      name: 'Back Header Ribbon',
    });
    canvas.add(topBar);

    const topText = new fabric.IText('STUDENT ID CARD INSTRUCTIONS', {
      left: 18,
      top: 10,
      fontSize: 11,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#38bdf8',
      name: 'Instructions Header',
    });
    canvas.add(topText);

    const terms = new fabric.IText(
      '1. Carry this card at all times within academy premises.\n' +
      '2. Required for examinations, library borrowing & laboratory sessions.\n' +
      '3. In case of lost card, notify student affairs immediately.\n' +
      '4. Emergency Hotline: {{emergency_contact}}',
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
      name: 'Return Box Container',
    });
    canvas.add(returnBox);

    const returnText = new fabric.IText(
      'If found, please return to: Student Affairs Secretariat\nHotline: +880 1700-000000 • Email: registrar@alpha.edu',
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

    const sigText = new fabric.IText('Principal Signature', {
      left: canvas.width - 165,
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

    const barcodeText = new fabric.IText('*STU202600109*', {
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
      name: 'School Header',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addSubheading = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.IText('STUDENT IDENTITY CARD', {
      left: 20,
      top: 40,
      fontSize: 11,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#38bdf8',
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
      name: 'Student Photo Frame',
    });
    const label = new fabric.IText('PHOTO', {
      left: 60,
      top: 140,
      fontSize: 11,
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

  // ================= SAVE BOTH SIDES =================
  const handleSave = async () => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setStatusMessage('Saving Student ID Template with dual-sided data...');

    try {
      const activeJSON = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
      const activeSvg = canvas.toSVG();

      let finalFrontData = activeSide === 'front' ? activeJSON : (frontData || generateStarterFabricJSON('student_id'));
      let finalBackData = activeSide === 'back' ? activeJSON : (backData || generateStarterFabricBackJSON('student_id'));
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
        available_merge_tags: STUDENT_MERGE_TAGS,
      };

      if (onSave) {
        await onSave(payload);
      } else {
        const tplId = initialTemplate?.id;
        const res = await fetch(`/api/marketing/developer/templates/${tplId}?task=student_id`, {
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

      toast.success('Student ID Template saved with both Front and Back sides!');
      setStatusMessage('Both sides saved successfully.');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save student ID template.');
      setStatusMessage('Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <header className="min-h-12 border-b border-slate-800 bg-slate-900 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <a
            href={onExitUrl}
            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Exit
          </a>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none focus:border-b focus:border-sky-500 max-w-[140px] sm:max-w-xs truncate"
              placeholder="Template Name..."
            />
          </div>
        </div>

        {/* Dual-Sided Switcher */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => handleSwitchSide('front')}
            className={`px-2.5 sm:px-3 py-1 rounded font-medium transition-colors cursor-pointer text-xs ${
              activeSide === 'front' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => handleSwitchSide('back')}
            className={`px-2.5 sm:px-3 py-1 rounded font-medium transition-colors cursor-pointer text-xs ${
              activeSide === 'back' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Back
          </button>
        </div>

        {/* Undo/Redo & Zoom & Save */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="hidden sm:flex items-center bg-slate-950 rounded border border-slate-800 text-xs">
            <button
              type="button"
              onClick={undo}
              title="Undo (Ctrl+Z)"
              className="px-2 py-1 text-slate-300 hover:text-white cursor-pointer"
            >
              Undo
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={redo}
              title="Redo (Ctrl+Y)"
              className="px-2 py-1 text-slate-300 hover:text-white cursor-pointer"
            >
              Redo
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 rounded border border-slate-800 text-[11px] p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.1))}
              className="px-1.5 py-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              -
            </button>
            <span className="px-1 text-slate-300 font-mono text-[10px]">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.1))}
              className="px-1.5 py-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 sm:px-3.5 py-1 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white shadow transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Manual Dimensions & Alignment Bar */}
      <div className="min-h-9 bg-slate-900/80 border-b border-slate-800 px-3 py-1 flex items-center justify-between text-xs text-slate-400 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none gap-4">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-[11px] font-semibold text-slate-300">Size:</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">W:</span>
            <input
              type="number"
              step="0.5"
              value={dimWidth}
              onChange={(e) => handleDimensionChange(parseFloat(e.target.value) || 0, dimHeight, dimUnit)}
              className="w-14 sm:w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">H:</span>
            <input
              type="number"
              step="0.5"
              value={dimHeight}
              onChange={(e) => handleDimensionChange(dimWidth, parseFloat(e.target.value) || 0, dimUnit)}
              className="w-14 sm:w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
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
            className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            title="Click to swap dimensions (Landscape / Portrait)"
          >
            <span className="capitalize">{dimWidth >= dimHeight ? 'Landscape' : 'Portrait'}</span>
            <span className="text-[10px] text-slate-400">⇄ Swap</span>
          </button>
        </div>

        {/* Alignment quick toolbar */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] uppercase font-semibold text-slate-500">Align:</span>
          <button
            type="button"
            disabled={!selectedObject}
            onClick={alignLeft}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-[11px] cursor-pointer"
            title="Align Left"
          >
            Left
          </button>
          <button
            type="button"
            disabled={!selectedObject}
            onClick={alignCenterH}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-[11px] cursor-pointer"
            title="Center Horizontally"
          >
            Center
          </button>
          <button
            type="button"
            disabled={!selectedObject}
            onClick={alignRight}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-[11px] cursor-pointer"
            title="Align Right"
          >
            Right
          </button>
          <button
            type="button"
            disabled={!selectedObject}
            onClick={alignTop}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-[11px] cursor-pointer"
            title="Align Top"
          >
            Top
          </button>
          <button
            type="button"
            disabled={!selectedObject}
            onClick={alignCenterV}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-[11px] cursor-pointer"
            title="Center Vertically"
          >
            Middle
          </button>
          <button
            type="button"
            disabled={!selectedObject}
            onClick={alignBottom}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-[11px] cursor-pointer"
            title="Align Bottom"
          >
            Bottom
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] shrink-0">
          <span className="text-slate-500">Side:</span>
          <span className="font-semibold text-sky-400 uppercase tracking-wider">{activeSide} Side</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Elements & Shapes Sidebar */}
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
              onClick={() => setActiveTab('shapes')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'shapes' ? 'border-sky-500 text-sky-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Shapes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'tags' ? 'border-sky-500 text-sky-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Tags
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
          </div>

          <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
            {/* Elements Tab */}
            {activeTab === 'elements' && (
              <div className="space-y-4">
                {activeSide === 'front' ? (
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-2">
                      Front ID Blocks
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        onClick={addHeading}
                        className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 cursor-pointer"
                      >
                        + Academy Name Header
                      </button>
                      <button
                        type="button"
                        onClick={addSubheading}
                        className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 cursor-pointer"
                      >
                        + Student Pass Title
                      </button>
                      <button
                        type="button"
                        onClick={addPhotoBox}
                        className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                      >
                        + Student Photo Frame
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-2">
                      Back ID Blocks
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        onClick={loadStandardStudentBackLayout}
                        className="w-full text-left px-3 py-2 rounded bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 font-semibold border border-sky-800 cursor-pointer"
                      >
                        Reset Standard Back Layout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Shapes Tab */}
            {activeTab === 'shapes' && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Add Geometric Shapes
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => addRectangle(false)}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center cursor-pointer flex flex-col items-center gap-1"
                  >
                    <div className="w-6 h-4 bg-sky-500 rounded-xs" />
                    <span>Rectangle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addRectangle(true)}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center cursor-pointer flex flex-col items-center gap-1"
                  >
                    <div className="w-6 h-4 bg-sky-500 rounded-md" />
                    <span>Rounded Box</span>
                  </button>
                  <button
                    type="button"
                    onClick={addCircle}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center cursor-pointer flex flex-col items-center gap-1"
                  >
                    <div className="w-5 h-5 bg-sky-400 rounded-full" />
                    <span>Circle</span>
                  </button>
                  <button
                    type="button"
                    onClick={addTriangle}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center cursor-pointer flex flex-col items-center gap-1"
                  >
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[18px] border-b-amber-500" />
                    <span>Triangle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addLine(false)}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center cursor-pointer flex flex-col items-center gap-1"
                  >
                    <div className="w-6 h-0.5 bg-sky-400 my-2" />
                    <span>H-Divider</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addLine(true)}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center cursor-pointer flex flex-col items-center gap-1"
                  >
                    <div className="w-0.5 h-6 bg-sky-400 mx-auto" />
                    <span>V-Divider</span>
                  </button>
                  <button
                    type="button"
                    onClick={addStar}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center cursor-pointer flex flex-col items-center gap-1"
                  >
                    <span className="text-amber-400 text-sm">★</span>
                    <span>Star Badge</span>
                  </button>
                  <button
                    type="button"
                    onClick={addBadge}
                    className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center cursor-pointer flex flex-col items-center gap-1"
                  >
                    <div className="w-7 h-3 border border-sky-400 rounded-full" />
                    <span>Pill Tag</span>
                  </button>
                </div>
              </div>
            )}

            {/* Merge Tags Tab */}
            {activeTab === 'tags' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                    Student Profile Data Fields
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono">
                    {COMPREHENSIVE_STUDENT_TAGS.length} Fields
                  </span>
                </div>

                {/* Field Search */}
                <div>
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Search fields (e.g. father, blood, roll)..."
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Category Chips */}
                <div className="flex flex-wrap gap-1">
                  {DATA_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedTagCategory(cat.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        selectedTagCategory === cat.id
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Filtered Fields List */}
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {COMPREHENSIVE_STUDENT_TAGS.filter((tag) => {
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
                        <span className="font-mono text-sky-400">{tag.tag}</span>
                        {tag.sample && <span className="text-slate-400 italic truncate max-w-[100px]">Ex: {tag.sample}</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => addMergeTag(tag, true)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-sky-600 hover:text-white text-slate-300 text-[10px] font-medium text-center transition-colors cursor-pointer"
                          title={`Insert as "${tag.label}: ${tag.tag}"`}
                        >
                          + Label: Value
                        </button>
                        <button
                          type="button"
                          onClick={() => addMergeTag(tag, false)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-sky-600 hover:text-white text-slate-300 text-[10px] font-medium text-center transition-colors cursor-pointer"
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
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Layers on {activeSide} ({canvasObjects.length})
                </span>
                {canvasObjects.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No objects on canvas.</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
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
                        className={`p-1.5 rounded border text-[11px] flex items-center justify-between cursor-pointer ${
                          selectedObject === obj
                            ? 'bg-sky-950/60 border-sky-600 text-sky-200 font-semibold'
                            : 'bg-slate-800/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate max-w-[130px]">{obj.name || obj.type}</span>
                        <span className="font-mono text-[9px] text-slate-500">#{canvasObjects.length - idx}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Center Workspace */}
        <main
          className={`flex-1 min-w-0 bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 overflow-auto relative ${mobileView === 'canvas' ? 'flex' : 'hidden lg:flex'}`}
          style={{
            backgroundImage: showGrid
              ? 'radial-gradient(#334155 1px, transparent 1px)'
              : 'radial-gradient(#1e293b 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div
            className="transition-transform duration-150 shadow-2xl border border-slate-800/80 rounded bg-white"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas ref={canvasElRef} />
          </div>

          <div className="absolute bottom-3 left-6 flex items-center gap-3">
            <div className="text-[11px] text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded shadow">
              Status: {statusMessage}
            </div>
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className="text-[10px] text-slate-400 hover:text-white bg-slate-900/90 border border-slate-800 px-2 py-1 rounded cursor-pointer"
            >
              {showGrid ? 'Hide Grid' : 'Show Grid'}
            </button>
          </div>
        </main>

        {/* Right Inspector & Advance Tools */}
        <aside className={`w-full lg:w-64 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 text-xs p-3 space-y-4 overflow-y-auto ${mobileView === 'inspector' ? 'flex flex-1 z-20' : 'hidden lg:flex'}`}>
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-semibold text-slate-200 block">Object Inspector</span>
            <span className="text-[10px] text-sky-400 font-mono uppercase">
              {selectedObject ? selectedObject.type : 'Empty'}
            </span>
          </div>

          {selectedObject ? (
            <div className="space-y-4">
              {/* Quick Actions (Duplicate, Flip, Lock, Delete) */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={duplicateSelected}
                  className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={toggleLock}
                  className={`py-1 rounded border text-xs cursor-pointer ${
                    selectedObject.lockMovementX
                      ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {selectedObject.lockMovementX ? 'Unlock' : 'Lock'}
                </button>
                <button
                  type="button"
                  onClick={flipHorizontal}
                  className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                >
                  Flip X
                </button>
                <button
                  type="button"
                  onClick={flipVertical}
                  className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                >
                  Flip Y
                </button>
              </div>

              {/* Layer Stacking */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Layer Stacking</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={bringForward}
                    className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    onClick={sendBackward}
                    className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                  >
                    Backward
                  </button>
                  <button
                    type="button"
                    onClick={bringToFront}
                    className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                  >
                    To Front
                  </button>
                  <button
                    type="button"
                    onClick={sendToBack}
                    className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
                  >
                    To Back
                  </button>
                </div>
              </div>

              {/* Typography controls */}
              {(selectedObject.type === 'i-text' || selectedObject.type === 'text') && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Typography</span>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Font Family</label>
                    <select
                      value={selectedObject.fontFamily || 'Inter'}
                      onChange={(e) => updateSelectedProp('fontFamily', e.target.value)}
                      className="w-full text-xs px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                    >
                      {GOOGLE_FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Font Size</label>
                      <input
                        type="number"
                        value={selectedObject.fontSize || 14}
                        onChange={(e) => updateSelectedProp('fontSize', parseInt(e.target.value, 10))}
                        className="w-full text-xs px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Text Color</label>
                      <input
                        type="color"
                        value={selectedObject.fill || '#000000'}
                        onChange={(e) => updateSelectedProp('fill', e.target.value)}
                        className="w-full h-7 rounded border border-slate-700 bg-slate-950 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => updateSelectedProp('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`py-1 rounded border text-xs cursor-pointer ${
                        selectedObject.fontWeight === 'bold'
                          ? 'bg-sky-950 border-sky-600 text-sky-200 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedProp('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
                      className={`py-1 rounded border text-xs italic cursor-pointer ${
                        selectedObject.fontStyle === 'italic'
                          ? 'bg-sky-950 border-sky-600 text-sky-200'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      Italic
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedProp('underline', !selectedObject.underline)}
                      className={`py-1 rounded border text-xs underline cursor-pointer ${
                        selectedObject.underline
                          ? 'bg-sky-950 border-sky-600 text-sky-200'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      Underline
                    </button>
                  </div>
                </div>
              )}

              {/* Color & Stroke */}
              {selectedObject.type !== 'i-text' && selectedObject.type !== 'text' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Colors &amp; Border</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Fill Color</label>
                      <input
                        type="color"
                        value={selectedObject.fill || '#0284c7'}
                        onChange={(e) => updateSelectedProp('fill', e.target.value)}
                        className="w-full h-7 rounded border border-slate-700 bg-slate-950 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Border Color</label>
                      <input
                        type="color"
                        value={selectedObject.stroke || '#0369a1'}
                        onChange={(e) => updateSelectedProp('stroke', e.target.value)}
                        className="w-full h-7 rounded border border-slate-700 bg-slate-950 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Border Width</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={selectedObject.strokeWidth || 0}
                        onChange={(e) => updateSelectedProp('strokeWidth', parseInt(e.target.value, 10))}
                        className="w-full text-xs px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    {selectedObject.type === 'rect' && (
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Corner Radius</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={selectedObject.rx || 0}
                          onChange={(e) => {
                            const r = parseInt(e.target.value, 10) || 0;
                            selectedObject.set({ rx: r, ry: r });
                            fabricCanvasRef.current?.renderAll();
                            saveHistoryState();
                          }}
                          className="w-full text-xs px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Opacity slider */}
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Opacity</span>
                  <span className="font-mono">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((selectedObject.opacity ?? 1) * 100)}
                  onChange={(e) => updateSelectedProp('opacity', parseFloat(e.target.value) / 100)}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Delete button */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="w-full py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-semibold cursor-pointer"
                >
                  Delete Element
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">Click any element on canvas to modify properties.</p>
          )}

          {/* Canvas Background Color */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Canvas Background</span>
            <input
              type="color"
              value={canvasBg}
              onChange={(e) => {
                setCanvasBg(e.target.value);
                fabricCanvasRef.current?.setBackgroundColor(e.target.value, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current));
                saveHistoryState();
              }}
              className="w-full h-8 rounded border border-slate-700 bg-slate-950 cursor-pointer"
            />
          </div>
        </aside>
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
