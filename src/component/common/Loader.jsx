import React from 'react';

export default function Loader({
  size = 'md',
  color,
  className = '',
  style = {},
  ...props
}) {
  const sizeClass = {
    sm: 'loader-sm',
    md: 'loader-md',
    lg: 'loader-lg',
  }[size] || '';

  const customStyle = { ...style };
  if (color) {
    customStyle['--loader-color'] = color;
    customStyle['--c'] = `linear-gradient(${color} 0 0)`;
    customStyle['--m'] = `radial-gradient(farthest-side, ${color} 92%, #0000)`;
  }

  return (
    <div
      className={`loader ${sizeClass} ${className}`.trim()}
      style={customStyle}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}
