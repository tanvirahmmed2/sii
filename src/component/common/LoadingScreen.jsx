'use client';

import React from 'react';

/**
 * System Loading Screen conforming to the global loader style.
 * Displays only the clean custom animated loader.
 * No icons, no text. Uses globals.css color palette (--primary).
 */
export default function LoadingScreen({
  fullScreen = true,
  label = '',
  size = 'md',
  color,
  className = '',
  style = {},
}) {
  const sizeClass = {
    sm: 'loader-sm',
    md: 'loader-md',
    lg: 'loader-lg',
  }[size] || 'loader-md';

  const defaultContainer = fullScreen
    ? 'fixed inset-0 z-50 min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4'
    : 'w-full min-h-[160px] py-8 bg-transparent flex items-center justify-center p-4';

  const customLoaderStyle = {
    '--loader-color': color || 'var(--primary, #A2AB73)',
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

