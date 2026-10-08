'use client';

import React, { useState } from 'react';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

/**
 * Extracts a clean short form / monogram / initials from an institution or website name.
 * Examples:
 * - "Afit" -> "AF"
 * - "Afit Academy" -> "AA"
 * - "Oxford Cambridge International School" -> "OCIS"
 * - "Dhaka Residential Model College" -> "DRMC"
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

  // Multi-word: take first letter of each word up to 4 characters
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * TenantLoader: Specialized loader for tenant educational websites.
 * Displays the institution's official logo if present.
 * If logo is missing or fails to load, gracefully falls back to the institution's short monogram.
 */
export default function TenantLoader({
  website: propWebsite,
  name: propName,
  logo: propLogo,
  primaryColor: propPrimaryColor,
  secondaryColor: propSecondaryColor,
  label = 'Loading institution portal...',
  sublabel,
  fullScreen = true,
  size = 'md',
  className = '',
}) {
  let contextWebsite = null;
  try {
    // Attempt context consumption if wrapped in TenantWebsiteProvider
    const ctx = useTenantWebsite();
    if (ctx && ctx.website) {
      contextWebsite = ctx.website;
    }
  } catch {
    // Outside provider context
  }

  const website = propWebsite || contextWebsite;
  const siteName = propName || website?.name || 'Academic Institution';
  const logoUrl = propLogo || website?.logo || null;
  const primaryColor = propPrimaryColor || website?.primary_color || '#1e40af';
  const secondaryColor = propSecondaryColor || website?.secondary_color || '#0ea5e9';

  const [imageError, setImageError] = useState(!logoUrl);
  const shortForm = getWebsiteShortName(siteName);

  const sizeMetrics = {
    sm: {
      container: 'w-12 h-12',
      emblem: 'w-8 h-8',
      text: 'text-xs',
      fontSize: 'text-[11px]',
      label: 'text-[11px] mt-2.5',
      sublabel: 'text-[9px]',
    },
    md: {
      container: 'w-20 h-20',
      emblem: 'w-14 h-14',
      text: 'text-sm font-semibold',
      fontSize: 'text-base font-semibold',
      label: 'text-xs font-medium mt-3',
      sublabel: 'text-[10px]',
    },
    lg: {
      container: 'w-28 h-28',
      emblem: 'w-20 h-20',
      text: 'text-base font-semibold',
      fontSize: 'text-xl font-semibold',
      label: 'text-sm font-semibold mt-4',
      sublabel: 'text-xs',
    },
  }[size] || {
    container: 'w-20 h-20',
    emblem: 'w-14 h-14',
    text: 'text-sm font-semibold',
    fontSize: 'text-base font-semibold',
    label: 'text-xs font-medium mt-3',
    sublabel: 'text-[10px]',
  };

  const hasLogo = Boolean(logoUrl) && !imageError;

  const containerLayout = fullScreen
    ? 'fixed inset-0 z-50 min-h-screen w-full bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-6'
    : 'w-full min-h-[220px] py-10 bg-transparent flex flex-col items-center justify-center p-4';

  return (
    <div
      className={`${containerLayout} text-slate-800 dark:text-slate-200 transition-all ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label || `${siteName} Loading`}
    >
      <div className={`relative ${sizeMetrics.container} flex items-center justify-center shrink-0`}>
        {/* Animated outer ring with brand gradient styling */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            borderWidth: '2.5px',
            borderStyle: 'solid',
            borderColor: `${primaryColor}20`,
            borderTopColor: primaryColor,
            borderRightColor: secondaryColor,
            animationDuration: '1.2s',
          }}
        />

        {/* Outer glowing pulse effect */}
        <div
          className="absolute -inset-1 rounded-full opacity-20 blur-xs animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          }}
        />

        {/* Inner Content: Official Logo or Short Name Monogram */}
        <div
          className={`relative ${sizeMetrics.emblem} rounded-full flex items-center justify-center overflow-hidden shadow-xs bg-white border border-slate-100 z-10`}
        >
          {hasLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoUrl}
              alt={siteName}
              className="w-full h-full object-contain p-1.5 select-none"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white tracking-wider select-none shadow-inner"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
            >
              <span className={`${sizeMetrics.fontSize} tracking-normal uppercase text-white drop-shadow-xs`}>
                {shortForm}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Institution Name & Loading Status */}
      <div className="flex flex-col items-center text-center mt-3 max-w-xs space-y-1">
        <h3 className="text-xs font-semibold text-slate-900 tracking-tight line-clamp-1">
          {siteName}
        </h3>

        {label ? (
          <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-ping shrink-0"
              style={{ backgroundColor: primaryColor }}
            />
            {label}
          </p>
        ) : null}

        {sublabel ? (
          <p className="text-[10px] text-slate-400">
            {sublabel}
          </p>
        ) : null}
      </div>

      {/* Subtle modern loading bar indicator */}
      <div className="w-24 h-0.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
        <div
          className="h-full rounded-full animate-[loading_1.5s_ease-in-out_infinite]"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
            width: '60%',
          }}
        />
      </div>
    </div>
  );
}
