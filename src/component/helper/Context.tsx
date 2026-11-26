'use client';
import { useRouter, usePathname } from "next/navigation";
import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
export const Context = createContext<any>(null);
const PLATFORM_RESERVED = new Set([
    '',
    'creator',
    'developer',
    'developer-auth',
    'developers',
    'api',
    '_next',
    'marketing',
    'auth',
    'admin',
    'about',
    'blogs',
    'careers',
    'contact',
    'faqs',
    'packages',
    'policies',
    'reviews',
    'tutorials',
    'updates',
    'help',
    'terms',
    'privacy',
    'login',
    'register',
]);
const TENANT_DIRECT_PREFIXES = [
    '/staff-panel',
    '/student',
    '/teacher',
    '/officer',
    '/student-verify',
    '/officer-panel',
    '/websites',
    '/website',
    '/webite',
];
export function isTenantScope(pathname: any = '') {
    if (typeof window !== 'undefined') {
        const rawHostWithPort = window.location.host.toLowerCase();
        const rawHost = rawHostWithPort.split(':')[0];
        const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000').toLowerCase().trim();
        const baseHost = baseDomain.split(':')[0];
        if (rawHostWithPort.endsWith(`.${baseDomain}`)) {
            let sub = rawHostWithPort.slice(0, -(baseDomain.length + 1)).trim();
            if (sub.startsWith('www.'))
                sub = sub.slice(4).trim();
            if (sub && sub !== 'www')
                return true;
        }
        if (rawHost.endsWith(`.${baseHost}`)) {
            let sub = rawHost.slice(0, -(baseHost.length + 1)).trim();
            if (sub.startsWith('www.'))
                sub = sub.slice(4).trim();
            if (sub && sub !== 'www')
                return true;
        }
        if (rawHost.endsWith('.localhost')) {
            let sub = rawHost.replace('.localhost', '').trim();
            if (sub.startsWith('www.'))
                sub = sub.slice(4).trim();
            if (sub && sub !== 'www')
                return true;
        }
        if (rawHost &&
            rawHost !== baseHost &&
            rawHost !== `www.${baseHost}` &&
            rawHost !== 'localhost' &&
            rawHost !== '127.0.0.1') {
            return true;
        }
    }
    const path = (pathname || '').toLowerCase();
    for (const prefix of TENANT_DIRECT_PREFIXES) {
        if (path === prefix || path.startsWith(`${prefix}/`)) {
            return true;
        }
    }
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0) {
        const firstSegment = segments[0];
        if (!PLATFORM_RESERVED.has(firstSegment)) {
            return true;
        }
    }
    return false;
}
export const ContextProvider = ({ children }: any) => {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebar, setSidebar] = useState<any>(false);
    const [theme, setThemeState] = useState<any>('light');
    const [user, setUser] = useState<any>(null);
    const [creator, setCreator] = useState<any>(null);
    const [loading, setLoading] = useState<any>(true);
    const [reviews, setReviews] = useState<any>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [currency, setCurrencyState] = useState<string>('BDT');
    const [currencySymbol, setCurrencySymbol] = useState<string>('৳');

    const CURRENCY_SYMBOLS: Record<string, string> = {
        BDT: '৳',
        USD: '$',
        EUR: '€',
        GBP: '£',
        AUD: 'A$',
        CAD: 'C$',
    };

    const setCurrency = useCallback((newCode: string) => {
        const code = String(newCode || 'BDT').toUpperCase();
        setCurrencyState(code);
        setCurrencySymbol(CURRENCY_SYMBOLS[code] || '$');
        try {
            localStorage.setItem('preferred_currency', code);
        } catch (_: any) {}
    }, []);

    useEffect(() => {
        async function loadCurrencies() {
            try {
                const res = await fetch('/api/marketing/currencies');
                const data = await res.json();
                if (data.success && Array.isArray(data.currencies) && data.currencies.length > 0) {
                    setCurrencies(data.currencies);
                    const stored = typeof window !== 'undefined' ? localStorage.getItem('preferred_currency') : null;
                    const matched = data.currencies.find((c: any) => c.code === stored);
                    if (matched) {
                        setCurrencyState(matched.code);
                        setCurrencySymbol(matched.symbol || CURRENCY_SYMBOLS[matched.code] || '$');
                    } else {
                        const defaultCurr = data.currencies.find((c: any) => c.is_default) || data.currencies[0];
                        setCurrencyState(defaultCurr.code);
                        setCurrencySymbol(defaultCurr.symbol || CURRENCY_SYMBOLS[defaultCurr.code] || '$');
                    }
                }
            } catch (_: any) {
                const stored = typeof window !== 'undefined' ? localStorage.getItem('preferred_currency') || 'BDT' : 'BDT';
                setCurrencyState(stored);
                setCurrencySymbol(CURRENCY_SYMBOLS[stored] || '$');
            }
        }
        loadCurrencies();
    }, []);
    useEffect(() => {
        try {
            const storedTheme = localStorage.getItem('theme');
            if (storedTheme === 'dark' ||
                (!storedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                setThemeState('dark');
                document.documentElement.classList.add('dark');
            }
            else {
                setThemeState('light');
                document.documentElement.classList.remove('dark');
            }
        }
        catch (_: any) { }
    }, []);
    const setTheme = useCallback((newTheme: any) => {
        setThemeState(newTheme);
        try {
            localStorage.setItem('theme', newTheme);
            if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
            }
            else {
                document.documentElement.classList.remove('dark');
            }
        }
        catch (_: any) { }
    }, []);
    const toggleTheme = useCallback(() => {
        setThemeState((prev: any) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem('theme', next);
                if (next === 'dark') {
                    document.documentElement.classList.add('dark');
                }
                else {
                    document.documentElement.classList.remove('dark');
                }
            }
            catch (_: any) { }
            return next;
        });
    }, []);
    const goBack = () => {
        router.back();
    };
    const pathnameRef = useRef<string>(pathname || '');
    pathnameRef.current = pathname || '';
    const lastScopeRef = useRef<'tenant' | 'platform' | null>(null);
    const hasFetchedPlatformRef = useRef<boolean>(false);
    const prevPathnameRef = useRef<string>(pathname || '');

    const fetchCurrentUser = useCallback(async () => {
        const currentPath = pathnameRef.current || '';
        if (isTenantScope(currentPath)) {
            setUser(null);
            setCreator(null);
            setLoading(false);
            lastScopeRef.current = 'tenant';
            hasFetchedPlatformRef.current = false;
            return;
        }
        lastScopeRef.current = 'platform';
        try {
            const [devRes, creatorRes] = await Promise.all([
                fetch('/api/marketing/developer/me').catch(() => null),
                fetch('/api/marketing/creator/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'me' }),
                }).catch(() => null),
            ]);
            if (devRes && devRes.ok) {
                const devData = await devRes.json().catch(() => null);
                if (devData && devData.success && devData.user) {
                    setUser(devData.user);
                }
                else {
                    setUser(null);
                }
            }
            else {
                setUser(null);
            }
            if (creatorRes && creatorRes.ok) {
                const creatorData = await creatorRes.json().catch(() => null);
                if (creatorData && creatorData.success && creatorData.creator) {
                    setCreator(creatorData.creator);
                }
                else {
                    setCreator(null);
                }
            }
            else {
                setCreator(null);
            }
            hasFetchedPlatformRef.current = true;
        }
        catch (_: any) {
            setUser(null);
            setCreator(null);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        const currentPath = pathname || '';
        const prevPath = prevPathnameRef.current || '';
        prevPathnameRef.current = currentPath;
        const tenant = isTenantScope(currentPath);
        const currentScope: 'tenant' | 'platform' = tenant ? 'tenant' : 'platform';
        if (tenant) {
            if (lastScopeRef.current !== 'tenant') {
                fetchCurrentUser();
            }
            return;
        }
        const cameFromAuth =
            (prevPath.startsWith('/developer-auth') && currentPath.startsWith('/developer')) ||
            (prevPath.startsWith('/creator/login') && currentPath.startsWith('/creator'));
        if (!hasFetchedPlatformRef.current || lastScopeRef.current !== currentScope || cameFromAuth) {
            fetchCurrentUser();
        }
    }, [pathname, fetchCurrentUser]);
    return (<Context.Provider value={{
            goBack,
            sidebar,
            setSidebar,
            user,
            setUser,
            creator,
            setCreator,
            loading,
            setLoading,
            reviews,
            setReviews,
            fetchCurrentUser,
            refetchUser: fetchCurrentUser,
            theme,
            setTheme,
            toggleTheme,
            currencies,
            setCurrencies,
            currency,
            currencySymbol,
            setCurrency,
        }}>
      {children}
    </Context.Provider>);
};
