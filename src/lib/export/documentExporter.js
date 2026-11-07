
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
