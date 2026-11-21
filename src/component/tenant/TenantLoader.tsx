'use client';
import React from 'react';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
export function getWebsiteShortName(name: any) {
    if (!name || typeof name !== 'string')
        return 'EDU';
    const clean = name.trim().replace(/[^a-zA-Z0-9\s-]/g, '');
    const words = clean.split(/[\s-]+/).filter(Boolean);
    if (words.length === 0)
        return 'EDU';
    if (words.length === 1) {
        const single = words[0];
        return single.length >= 2 ? single.slice(0, 2).toUpperCase() : single.toUpperCase();
    }
    return words
        .slice(0, 4)
        .map((w: any) => w[0])
        .join('')
        .toUpperCase();
}
export default function TenantLoader({ website: propWebsite, label = '', fullScreen = true, size = 'md', className = '', style = {}, }: any) {
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
