'use client';
import React from 'react';
const RichTextDisplay = ({ html, className = '' }: any) => {
    if (!html)
        return null;
    return (<div className={`rich-text-content leading-relaxed text-slate-700 ${className}`} dangerouslySetInnerHTML={{ __html: html }}/>);
};
export default RichTextDisplay;
