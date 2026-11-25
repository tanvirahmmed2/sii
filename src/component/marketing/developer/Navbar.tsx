'use client';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SITE_NAME } from 'src/lib/database/secret';
import { useRouter } from 'next/navigation';
import { Context } from 'src/component/helper/Context';
import { getAllowedDeveloperLinks, getDeveloperModuleIcon } from 'src/component/marketing/developer/Sidebar';
import { filterDeveloperModules } from 'src/lib/developer/navModules';
import {
    FiLogOut,
    FiMenu,
    FiMoon,
    FiSearch,
    FiSettings,
    FiSun,
    FiTerminal,
    FiUser,
    FiX,
} from 'react-icons/fi';

export default function AdminNavbar({ onToggleSidebar, currentUser = null }: any) {
    const router = useRouter();
    const { theme = 'light', toggleTheme } = useContext<any>(Context) || {};
    const isDark = theme === 'dark';

    const [searchQuery, setSearchQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [remoteResultState, setRemoteResultState] = useState<{ query: string; modules: any[] } | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mobileSearchInputRef = useRef<HTMLInputElement>(null);

    const allowedModules = useMemo(() => getAllowedDeveloperLinks(currentUser), [currentUser]);
    const localFilteredModules = useMemo(
        () => filterDeveloperModules(allowedModules, searchQuery),
        [allowedModules, searchQuery]
    );
    const filteredModules =
        searchOpen && remoteResultState && remoteResultState.query === searchQuery
            ? remoteResultState.modules
            : localFilteredModules;

    useEffect(() => {
        if (!searchOpen) {
            return;
        }

        const controller = new AbortController();
        const currentQuery = searchQuery;
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(
                    `/api/marketing/developer/module-search?q=${encodeURIComponent(currentQuery)}`,
                    { signal: controller.signal }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data?.success && Array.isArray(data.modules)) {
                        setRemoteResultState({ query: currentQuery, modules: data.modules });
                    }
                }
            }
            catch (err: any) {
                if (err?.name !== 'AbortError') {
                    setRemoteResultState(null);
                }
            }
            finally {
                setIsSearching(false);
            }
        }, currentQuery.trim() ? 100 : 0);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchOpen, searchQuery]);

    const safeActiveIndex = filteredModules.length > 0 ? Math.min(activeIndex, filteredModules.length - 1) : 0;

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                if (isMobile) {
                    setMobileSearchOpen(true);
                    setSearchOpen(true);
                    setTimeout(() => {
                        mobileSearchInputRef.current?.focus();
                        mobileSearchInputRef.current?.select();
                    }, 0);
                }
                else {
                    setSearchOpen(true);
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeSearch = () => {
        setSearchOpen(false);
        setMobileSearchOpen(false);
        setSearchQuery('');
        setActiveIndex(0);
    };

    const handleSelectModule = (href: string) => {
        closeSearch();
        searchInputRef.current?.blur();
        mobileSearchInputRef.current?.blur();
        router.push(href);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setSearchOpen(false);
            setMobileSearchOpen(false);
            e.currentTarget.blur();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!searchOpen) {
                setSearchOpen(true);
            }
            if (filteredModules.length > 0) {
                setActiveIndex((prev) => (prev + 1) % filteredModules.length);
            }
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredModules.length > 0) {
                setActiveIndex((prev) => (prev - 1 + filteredModules.length) % filteredModules.length);
            }
            return;
        }
        if (e.key === 'Enter' && filteredModules.length > 0) {
            e.preventDefault();
            const target = filteredModules[safeActiveIndex];
            if (target?.href) {
                handleSelectModule(target.href);
            }
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/marketing/developer/me/logout', {
                method: 'POST',
            });
        }
        catch (_: any) { }
        router.push('/developer-auth/login');
        router.refresh();
    };

    const renderResultsDropdown = () => {
        if (!searchOpen) {
            return null;
        }
        return (<div role="listbox" aria-label="Allowed developer modules" className="absolute left-0 right-0 top-full mt-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-50">
            <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span>Allowed Modules ({filteredModules.length}){isSearching ? ' · Searching...' : ''}</span>
                <span className="hidden sm:inline font-normal normal-case">↑↓ navigate · ↵ open · Esc close</span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredModules.length === 0 ? (<div className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                    No allowed modules match &ldquo;{searchQuery}&rdquo;.
                </div>) : (filteredModules.map((item: any, idx: number) => {
                    const Icon = getDeveloperModuleIcon(item.iconKey);
                    const isSelected = idx === safeActiveIndex;
                    return (<button key={item.href} type="button" role="option" aria-selected={isSelected} onMouseEnter={() => setActiveIndex(idx)} onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectModule(item.href);
                    }} className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                            {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} />}
                            <span className="text-xs font-medium truncate">{item.label}</span>
                        </div>
                    </button>);
                }))}
            </div>
        </div>);
    };

    return (<header ref={searchContainerRef} className="w-full bg-white dark:bg-slate-900 sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800">
        <nav className="w-full flex flex-row items-center justify-between gap-2 px-4 lg:px-6 h-12">
            <div className="flex items-center gap-2.5 shrink-0">
                <button type="button" onClick={onToggleSidebar} className="md:hidden inline-flex items-center gap-1.5 text-xs font-normal text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" aria-label="Toggle navigation">
                    <FiMenu className="w-3.5 h-3.5" />
                    <span className="sr-only sm:not-sr-only">Menu</span>
                </button>
                <Link href="/developer" className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white hover:opacity-90 transition-opacity">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shrink-0">
                        <FiTerminal className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate max-w-[140px] sm:max-w-none">{SITE_NAME} Developer</span>
                </Link>
            </div>

            <div className="hidden sm:block relative flex-1 max-w-sm lg:max-w-md mx-2">
                <div className="relative flex items-center">
                    <FiSearch className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 pointer-events-none" />
                    <input ref={searchInputRef} type="text" value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchOpen(true);
                        setActiveIndex(0);
                    }} onKeyDown={handleSearchKeyDown} placeholder="Search allowed modules..." aria-label="Search allowed modules" className="w-full pl-8 pr-16 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 transition-colors" />
                    {searchQuery ? (<button type="button" onClick={() => {
                        setSearchQuery('');
                        setActiveIndex(0);
                        searchInputRef.current?.focus();
                    }} className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" aria-label="Clear search">
                        <FiX className="w-3.5 h-3.5" />
                    </button>) : (<kbd className="absolute right-2 pointer-events-none inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">
                        Ctrl+K
                    </kbd>)}
                </div>
                {renderResultsDropdown()}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button type="button" onClick={() => {
                    setMobileSearchOpen((prev) => {
                        const next = !prev;
                        if (next) {
                            setSearchOpen(true);
                            setTimeout(() => mobileSearchInputRef.current?.focus(), 0);
                        }
                        else {
                            setSearchOpen(false);
                        }
                        return next;
                    });
                }} className="sm:hidden inline-flex items-center justify-center p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" title="Search allowed modules (Ctrl+K)" aria-label="Search allowed modules">
                    <FiSearch className="w-3.5 h-3.5" />
                </button>

                <button type="button" onClick={toggleTheme} className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal cursor-pointer" title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`} aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}>
                    {isDark ? <FiSun className="w-3.5 h-3.5" /> : <FiMoon className="w-3.5 h-3.5" />}
                    <span className="hidden lg:inline">{isDark ? 'Light' : 'Dark'}</span>
                </button>

                <Link href="/developer/profile" className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" title="My Profile">
                    <FiUser className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="max-w-[120px] truncate">{currentUser?.name || currentUser?.email || 'Profile'}</span>
                </Link>

                <Link href="/developer/settings" className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal" title="Settings" aria-label="Settings">
                    <FiSettings className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Settings</span>
                </Link>

                <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 text-xs font-normal transition-colors cursor-pointer" title="Sign Out" aria-label="Sign Out">
                    <FiLogOut className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Sign Out</span>
                </button>
            </div>
        </nav>

        {mobileSearchOpen && (<div className="sm:hidden px-4 pb-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="relative flex items-center">
                <FiSearch className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 pointer-events-none" />
                <input ref={mobileSearchInputRef} type="text" value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                    setActiveIndex(0);
                }} onKeyDown={handleSearchKeyDown} placeholder="Search allowed modules..." aria-label="Search allowed modules" className="w-full pl-8 pr-8 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500" />
                <button type="button" onClick={closeSearch} className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" aria-label="Close search">
                    <FiX className="w-3.5 h-3.5" />
                </button>
                {renderResultsDropdown()}
            </div>
        </div>)}
    </header>);
}
