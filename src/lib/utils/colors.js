// Utility functions for dynamic tenant color calculations (safe for both Server and Client Components)

export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function mixColor(rgb, targetRgb, weight) {
  const r = Math.round(rgb.r + (targetRgb.r - rgb.r) * weight);
  const g = Math.round(rgb.g + (targetRgb.g - rgb.g) * weight);
  const b = Math.round(rgb.b + (targetRgb.b - rgb.b) * weight);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function calculateColorShades(hexColor, fallbackHex = '#1e40af') {
  const baseHex = hexColor || fallbackHex;
  const rgb = hexToRgb(baseHex) || hexToRgb(fallbackHex) || { r: 30, g: 64, b: 175 };
  const light = mixColor(rgb, { r: 255, g: 255, b: 255 }, 0.65);
  const dark = mixColor(rgb, { r: 0, g: 0, b: 0 }, 0.25);
  const formattedBase = `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)}`;
  return { base: formattedBase, light, dark };
}
