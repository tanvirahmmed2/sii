'use client';

import React from 'react';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

/**
 * Extracts a clean short form / monogram / initials from an institution or website name.
 */
export function getWebsiteShortName(name) {
  if (!name || typeof name !== 'string') return 'EDU';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s-]/g, '');
  const words = clean.split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return 'EDU';
  if (words.length === 1) {
    const single = words[0];
    return single.length >= 2 ? single.slice(0, 2).toUpperCase() : single.toUpperCase();
  }
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * TenantLoader: Specialized loader for tenant educational websites.
 * Uses the system animated loader style tinted with the institution's color theme
 * from the `websites` table (`primary_color`).
 * No icons, no text.
 */
export default function TenantLoader({
  website: propWebsite,
  primaryColor: propPrimaryColor,
  label = '',
  fullScreen = true,
  size = 'md',
  className = '',
  style = {},
}) {
  let contextWebsite = null;
  try {
    const ctx = useTenantWebsite();
    if (ctx && ctx.website) {
      contextWebsite = ctx.website;
    }
  } catch {
    // Outside provider context
  }

  const website = propWebsite || contextWebsite;
  const primaryColor = propPrimaryColor || website?.primary_color || 'var(--primary, #1e40af)';

  const sizeClass = {
    sm: 'loader-sm',
    md: 'loader-md',
    lg: 'loader-lg',
  }[size] || 'loader-md';

  const defaultContainer = fullScreen
    ? 'fixed inset-0 z-50 min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4'
    : 'w-full min-h-[160px] py-8 bg-transparent flex items-center justify-center p-4';

  const customLoaderStyle = {
    '--loader-color': primaryColor,
    '--c': `linear-gradient(${primaryColor} 0 0)`,
    '--m': `radial-gradient(farthest-side, ${primaryColor} 92%, #0000)`,
    ...style,
  };

  return (
    <div
      className={`${defaultContainer} transition-colors ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      <div
        className={`loader ${sizeClass}`}
        style={customLoaderStyle}
      />
    </div>
  );
}
