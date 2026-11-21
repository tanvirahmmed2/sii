'use client';
import React from 'react';
export default function LoadingScreen({ fullScreen = true, label = '', size = 'md', className = '', style = {}, }: any) {
    const sizeClass = ({
        sm: 'loader-sm',
        md: 'loader-md',
        lg: 'loader-lg',
    } as Record<string, string>)[size] || 'loader-md';
    const defaultContainer = fullScreen
        ? 'fixed inset-0 z-50 min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4'
        : 'w-full min-h-[160px] py-8 bg-transparent flex items-center justify-center p-4';
    return (<div className={`${defaultContainer} transition-colors ${className}`.trim()} role="status" aria-live="polite" aria-label={label || 'Loading'}>
      <div className={`loader ${sizeClass}`} style={style}/>
    </div>);
}
