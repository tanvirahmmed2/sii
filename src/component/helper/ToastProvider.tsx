'use client';
import { Toaster } from 'react-hot-toast';
export default function ToastProvider() {
    return (<Toaster position="top-center" reverseOrder={false} gutter={8} toastOptions={{
            duration: 4000,
            style: {
                background: 'var(--white, #ffffff)',
                color: 'var(--navy, #0f172a)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                fontWeight: '500',
                borderRadius: 'var(--r-md, 10px)',
                boxShadow: 'var(--s-lg, 0 8px 32px rgba(0,0,0,0.10))',
                border: '1px solid var(--border, #e2e8f0)',
                padding: '12px 24px',
                maxWidth: '450px',
            },
            success: {
                duration: 3000,
                iconTheme: {
                    primary: 'var(--green, #16a34a)',
                    secondary: 'var(--white, #ffffff)',
                },
            },
            error: {
                duration: 4000,
                iconTheme: {
                    primary: 'var(--red, #dc2626)',
                    secondary: 'var(--white, #ffffff)',
                },
            },
        }}/>);
}
