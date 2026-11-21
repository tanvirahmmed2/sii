import 'react';

declare module 'react' {
  interface StyleHTMLAttributes<T> extends React.HTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
  }
}

declare global {
  interface Window {
    XLSX?: any;
    performance?: any;
    [key: string]: any;
  }
}
