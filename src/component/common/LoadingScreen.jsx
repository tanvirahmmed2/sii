'use client';

import React from 'react';

/**
 * Minimalist Loading Screen conforming to STYLE.md.
 * Displays the website logo in the center with a rotating circle outside.
 * Supports full-screen, embedded, compact sizing, and dark mode.
 */
export default function LoadingScreen({
  logo = '/icon.png',
  fullScreen = true,
  label = '',
  size = 'md',
  className = '',
}) {
  const sizeClasses = {
    sm: {
      container: 'w-10 h-10',
      logo: 'w-5 h-5',
      spinner: 'border-2',
      label: 'text-[11px] mt-2',
    },
    md: {
      container: 'w-16 h-16',
      logo: 'w-8 h-8',
      spinner: 'border-2',
      label: 'text-xs mt-3',
    },
    lg: {
      container: 'w-20 h-20',
      logo: 'w-10 h-10',
      spinner: 'border-[3px]',
      label: 'text-sm mt-4',
    },
  }[size] || {
    container: 'w-16 h-16',
    logo: 'w-8 h-8',
    spinner: 'border-2',
    label: 'text-xs mt-3',
  };

  const defaultContainer = fullScreen
    ? 'min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100'
    : 'w-full min-h-[160px] py-8 bg-transparent text-slate-800 dark:text-slate-100';

  return (
    <div
      className={`${defaultContainer} flex flex-col items-center justify-center p-4 transition-colors ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      <div className={`relative ${sizeClasses.container} flex items-center justify-center shrink-0`}>
        {/* Rotating circle outside of the logo */}
        <div
          className={`absolute inset-0 rounded-full border-slate-200 dark:border-slate-800 border-t-slate-800 dark:border-t-slate-200 animate-spin ${sizeClasses.spinner}`}
        />

        {/* Website logo in the middle */}
        <img
          src={logo}
          alt="Website Logo"
          className={`${sizeClasses.logo} object-contain select-none`}
          onError={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        />
      </div>

      {label ? (
        <span className={`font-medium text-slate-500 dark:text-slate-400 text-center ${sizeClasses.label}`}>
          {label}
        </span>
      ) : null}
    </div>
  );
}

