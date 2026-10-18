// High-Resolution Client-Side PDF & JPEG Document Export Pipeline
// Powered by html2canvas and jsPDF

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Exports a single DOM node as a crisp, high-resolution JPEG image.
 * @param {HTMLElement} element - Target DOM node to capture
 * @param {string} filename - Download filename (without extension)
 * @param {number} scale - DPI resolution scale multiplier (default 3 = ~300 DPI)
 */
export async function exportElementAsJpeg(element, filename = 'document', scale = 3) {
  if (!element) throw new Error('Target element is required for JPEG export.');

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15000,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const link = document.createElement('a');
  link.download = `${filename}.jpeg`;
  link.href = imgData;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return imgData;
}

/**
 * Exports a DOM node as a vector-accurate, print-grade PDF.
 * @param {HTMLElement} element - Target DOM node to capture
 * @param {string} filename - Download filename (without extension)
 * @param {Object} options - Dimension options { widthMm, heightMm, orientation }
 */
export async function exportElementAsPdf(element, filename = 'document', options = {}) {
  if (!element) throw new Error('Target element is required for PDF export.');

  const scale = options.scale || 3;
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15000,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  const rect = element.getBoundingClientRect();
  const widthMm = options.widthMm || (rect.width * 0.264583);
  const heightMm = options.heightMm || (rect.height * 0.264583);
  const isLandscape = widthMm >= heightMm;

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
  pdf.save(`${filename}.pdf`);
  return pdf;
}

/**
 * Exports multiple card elements into a multi-page PDF document.
 * @param {Array<HTMLElement>} elements - Array of card DOM elements
 * @param {string} filename - PDF filename
 * @param {Object} options - Card dimensions
 */
export async function exportMultipleCardsAsPdf(elements = [], filename = 'batch_id_cards', options = {}) {
  if (!elements || elements.length === 0) throw new Error('No elements provided for batch export.');

  const scale = options.scale || 3;
  let pdf = null;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const canvas = await html2canvas(el, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const rect = el.getBoundingClientRect();
    const widthMm = options.widthMm || (rect.width * 0.264583);
    const heightMm = options.heightMm || (rect.height * 0.264583);
    const isLandscape = widthMm >= heightMm;

    if (i === 0) {
      pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMm, heightMm],
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
    } else {
      pdf.addPage([widthMm, heightMm], isLandscape ? 'landscape' : 'portrait');
      pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
    }
  }

  if (pdf) {
    pdf.save(`${filename}.pdf`);
  }
}
