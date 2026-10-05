'use client';

import React from 'react';

/**
 * Minimalist Loading Screen conforming to STYLE.md.
 * Displays the website logo in the center with a rotating circle outside.
 */
export default function LoadingScreen({
  logo = '/icon.png',
  fullScreen = true,
  label = '',
}) {
  return (
    <div
      className={`w-full ${
        fullScreen ? 'min-h-screen' : 'min-h-[300px]'
      } flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Rounding circle outside of the logo */}
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />

        {/* Website logo in the middle */}
        <img
          src={logo}
          alt="Website Logo"
          className="w-8 h-8 object-contain select-none"
          onError={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        />
      </div>

      {label ? (
        <span className="text-xs font-medium text-slate-500 mt-3">
          {label}
        </span>
      ) : null}
    </div>
  );
}
