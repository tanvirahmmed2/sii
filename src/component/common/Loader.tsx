import React from 'react';
export default function Loader({ size = 'md', className = '', style = {}, ...props }: any) {
    const sizeClass = ({
        sm: 'loader-sm',
        md: 'loader-md',
        lg: 'loader-lg',
    } as Record<string, string>)[size] || '';
    return (<div className={`loader ${sizeClass} ${className}`.trim()} style={style} role="status" aria-label="Loading" {...props}/>);
}
