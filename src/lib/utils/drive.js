/**
 * Utility functions for Google Drive links and file downloading.
 * Supports various Google Drive, Google Docs, Sheets, and Slides URLs,
 * as well as generic direct file links.
 */

/**
 * Extracts file metadata and generates preview, view, and download URLs.
 * @param {string} rawUrl - The drive or document URL
 * @returns {object|null}
 */
export function getDriveDetails(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const url = rawUrl.trim();

  // 1. Google Docs (/document/d/{ID})
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docMatch) {
    const id = docMatch[1];
    return {
      isGoogleDrive: true,
      type: 'gdoc',
      id,
      previewUrl: `https://docs.google.com/document/d/${id}/preview`,
      downloadUrl: `https://docs.google.com/document/d/${id}/export?format=pdf`,
      viewUrl: `https://docs.google.com/document/d/${id}/view`,
    };
  }

  // 2. Google Sheets (/spreadsheets/d/{ID})
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (sheetMatch) {
    const id = sheetMatch[1];
    return {
      isGoogleDrive: true,
      type: 'gsheet',
      id,
      previewUrl: `https://docs.google.com/spreadsheets/d/${id}/preview`,
      downloadUrl: `https://docs.google.com/spreadsheets/d/${id}/export?format=pdf`,
      viewUrl: `https://docs.google.com/spreadsheets/d/${id}/view`,
    };
  }

  // 3. Google Slides (/presentation/d/{ID})
  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
  if (slideMatch) {
    const id = slideMatch[1];
    return {
      isGoogleDrive: true,
      type: 'gslide',
      id,
      previewUrl: `https://docs.google.com/presentation/d/${id}/preview`,
      downloadUrl: `https://docs.google.com/presentation/d/${id}/export/pdf`,
      viewUrl: `https://docs.google.com/presentation/d/${id}/view`,
    };
  }

  // 4. Standard Google Drive Files (/file/d/{ID} or ?id={ID} or /d/{ID})
  const fileMatch =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/i) ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)/i);

  if (fileMatch) {
    const id = fileMatch[1];
    return {
      isGoogleDrive: true,
      type: 'gdrive',
      id,
      previewUrl: `https://drive.google.com/file/d/${id}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
      viewUrl: `https://drive.google.com/file/d/${id}/view`,
    };
  }

  // 5. Generic direct document or media link
  return {
    isGoogleDrive: false,
    type: 'generic',
    id: null,
    previewUrl: url,
    downloadUrl: url,
    viewUrl: url,
  };
}

/**
 * Triggers client-side download of a drive file or direct document.
 * @param {string} url - The file or drive URL
 * @param {string} [filename] - Suggested filename
 */
export function triggerDriveDownload(url, filename = 'notice-file') {
  if (!url || typeof window === 'undefined') return;

  const details = getDriveDetails(url);
  const targetUrl = details?.downloadUrl || url;

  const link = document.createElement('a');
  link.href = targetUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('download', filename);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
