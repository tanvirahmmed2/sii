'use client';
import React from 'react';
export default function LoadingScreen({ fullScreen = true, label = '', size = 'md', className = '', style = {}, }: any) {
    const sizeClass = ({
        sm: 'loader-sm',
        md: 'loader-md',
        lg: 'loader-lg',
    } as Record<string, string>)[size] || 'loader-md';
    const defaultContainer = fullScreen
        ? 'fixed inset-0 z-50 min-h-screen w-full bg-white flex flex-col items-center justify-center p-4'
        : 'w-full min-h-[160px] py-8 bg-transparent flex flex-col items-center justify-center p-4';
    return (<div className={`${defaultContainer} transition-colors ${className}`.trim()} role="status" aria-live="polite" aria-label={label || 'Loading'}>
      <div className={`loader ${sizeClass}`} style={style}/>
      {label && (
        <p className="text-xs font-semibold text-black tracking-wide mt-4">
          {label}
        </p>
      )}
    </div>);
}
