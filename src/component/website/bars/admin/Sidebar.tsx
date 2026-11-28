'use client';
import React, { useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    FiAward,
    FiBarChart2,
    FiBell,
    FiBook,
    FiBookOpen,
    FiBriefcase,
    FiCalendar,
    FiCheckCircle,
    FiCheckSquare,
    FiChevronRight,
    FiClipboard,
    FiClock,
    FiCpu,
    FiCreditCard,
    FiDollarSign,
    FiEdit3,
    FiExternalLink,
    FiFileText,
    FiFolder,
    FiGlobe,
    FiGrid,
    FiHome,
    FiImage,
    FiKey,
    FiLayers,
    FiList,
    FiLock,
    FiMail,
    FiMessageSquare,
    FiPlusCircle,
    FiRss,
    FiSearch,
    FiSettings,
    FiShare2,
    FiShield,
    FiShoppingBag,
    FiSliders,
    FiStar,
    FiTag,
    FiTrash2,
    FiTrendingUp,
    FiUser,
    FiUserCheck,
    FiUserPlus,
    FiUsers,
    FiX,
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import staffNavDataDefault, { staffNavData as staffNavDataNamed } from './staffNavData';
import {
    extractSlugFromStaffPath,
    getAcademicDimensionLockInfo,
    getStaffModuleAccessLevel,
    hasSlugOrPathInWebsite,
    isStaffAuthorizedForNavItem,
    normalizeStaffPath,
    PATH_ALIAS_SLUGS,
} from 'src/lib/modules/moduleMappings';
const staffNavData = staffNavDataDefault || staffNavDataNamed || [];

const TOP_SECTION_ICONS: Record<string, any> = {
    Class: FiBookOpen,
    Students: FiUsers,
    Admissions: FiUserPlus,
    Attendance: FiCheckSquare,
    Teachers: FiUserCheck,
    Timesheet: FiClock,
    Exams: FiClipboard,
    Documents: FiFileText,
    Library: FiBook,
    Residence: FiHome,
    Notices: FiBell,
    Clubs: FiShare2,
    Posters: FiImage,
    News: FiRss,
    Awards: FiAward,
    Events: FiCalendar,
    Alumni: FiStar,
    Institution: FiGlobe,
    Officers: FiBriefcase,
    Messages: FiMessageSquare,
    Salaries: FiCreditCard,
    Fees: FiDollarSign,
    Payments: FiCheckCircle,
    Purchase: FiShoppingBag,
    Enterprise: FiCpu,
    Config: FiSliders,
    Directory: FiGrid,
    Settings: FiSettings,
    Profile: FiUser,
    Preferences: FiKey,
};

function getSidebarItemIcon(item: any, FallbackIcon: any = FiFolder) {
    const title = String(item?.title || '');
    if (TOP_SECTION_ICONS[title]) {
        return TOP_SECTION_ICONS[title];
    }
    const p = String(item?.path || '').toLowerCase();
    if (!p) {
        if (/report/i.test(title)) return FiBarChart2;
        if (/idcard|card/i.test(title)) return FiCreditCard;
        if (/attend/i.test(title)) return FiCheckSquare;
        if (/migrat/i.test(title)) return FiTrendingUp;
        if (/search/i.test(title)) return FiSearch;
        if (/exit|delete|drop/i.test(title)) return FiTrash2;
        if (/edit|update/i.test(title)) return FiEdit3;
        if (/mark|result/i.test(title)) return FiAward;
        if (/issue|return/i.test(title)) return FiBook;
        if (/pay|fee|salary/i.test(title)) return FiDollarSign;
        if (/profile|basic|info/i.test(title)) return FiUser;
        return FallbackIcon;
    }
    if (p.includes('security')) return FiShield;
    if (p.includes('quota')) return FiBarChart2;
    if (p.includes('page-builder') || p.includes('poster')) return FiImage;
    if (p.includes('cbt') || p.includes('exam')) return FiClipboard;
    if (p.includes('lms') || p.includes('classroom')) return FiBookOpen;
    if (p.includes('progression') || p.includes('migration')) return FiTrendingUp;
    if (p.includes('mail')) return FiMail;
    if (p.includes('sms') || p.includes('message') || p.includes('contact')) return FiMessageSquare;
    if (p.includes('transaction') || p.includes('accounting') || p.includes('payment') || p.includes('fee')) return FiDollarSign;
    if (p.includes('salary') || p.includes('payroll')) return FiCreditCard;
    if (p.includes('create') || p.includes('registration') || p.includes('new') || p.includes('apply')) return FiPlusCircle;
    if (p.includes('delete') || p.includes('drop') || p.includes('exit') || p.includes('spam')) return FiTrash2;
    if (p.includes('search')) return FiSearch;
    if (p.includes('notice')) return FiBell;
    if (p.includes('event')) return FiCalendar;
    if (p.includes('award') || p.includes('merit')) return FiAward;
    if (p.includes('library') || p.includes('book')) return FiBook;
    if (p.includes('residence') || p.includes('hall')) return FiHome;
    if (p.includes('club')) return FiShare2;
    if (p.includes('template') || p.includes('tc') || p.includes('certificate') || p.includes('testimonial') || p.includes('receipt') || p.includes('admit')) return FiFileText;
    if (p.includes('attendance') || p.includes('verify')) return FiCheckSquare;
    if (p.includes('teacher') || p.includes('officer') || p.includes('board')) return FiUserCheck;
    if (p.includes('student') || p.includes('alumni') || p.includes('guardian')) return FiUsers;
    if (p.includes('department') || p.includes('subject') || p.includes('class')) return FiLayers;
    if (p.includes('configure') || p.includes('setting')) return FiSettings;
    if (p.includes('system')) return FiSliders;
    if (p.includes('module')) return FiGrid;
    if (p.includes('profile')) return FiUser;
    if (p.includes('list')) return FiList;
    if (p.includes('category') || p.includes('grade') || p.includes('designation')) return FiTag;
    return FallbackIcon;
}
const normalizePath = (p: any) => {
    if (!p)
        return '';
    const clean = p.split('?')[0].split('#')[0].replace(/\/+$/, '');
    return clean || '/';
};
const getStaffUrl = (rawPath: any) => {
    if (!rawPath)
        return '#';
    const clean = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    if (clean === '/' || clean === '/staff-panel')
        return '/staff-panel';
    return clean.startsWith('/staff-panel') ? clean : `/staff-panel${clean}`;
};
const checkIsActive = (itemPath: any, currentPathname: any) => {
    if (!itemPath)
        return false;
    const target = normalizePath(getStaffUrl(itemPath));
    const current = normalizePath(currentPathname);
    if (current === target)
        return true;
    if (target !== '/staff-panel' && current.startsWith(`${target}/`)) {
        return true;
    }
    if (target === '/staff-panel/board-members' &&
        (current === '/staff-panel/institutional-board-members' ||
            current.startsWith('/staff-panel/institutional-board-members/'))) {
        return true;
    }
    if (target === '/staff-panel/institutional-board-members' &&
        (current === '/staff-panel/board-members' || current.startsWith('/staff-panel/board-members/'))) {
        return true;
    }
    return false;
};
const hasActiveChild = (item: any, pathname: any) => {
    if (item.path && checkIsActive(item.path, pathname)) {
        return true;
    }
    if (item.children && Array.isArray(item.children)) {
        return item.children.some((child: any) => hasActiveChild(child, pathname));
    }
    return false;
};
function AccessBadge({ accessLevel, isLocked }: { accessLevel: string; isLocked?: boolean }) {
    if (isLocked) {
        return (<span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
        <FiLock className="w-2.5 h-2.5"/>
        <span>Locked</span>
      </span>);
    }
    const styles: Record<string, string> = {
        Owner: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        Full: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        Edit: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        View: 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
    const cls = styles[accessLevel];
    if (!cls)
        return null;
    return (<span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium border shrink-0 ${cls}`}>
      {accessLevel}
    </span>);
}
const SubCollapsibleGroup = ({ group, pathname, onCloseMobile, forceOpenState = null, parentIcon }: any) => {
    const isInitiallyActive = useMemo(() => hasActiveChild(group, pathname), [group, pathname]);
    const [userToggled, setUserToggled] = useState<any>(null);
    const [prevSync, setPrevSync] = useState<any>({ isInitiallyActive, forceOpenState });
    if (prevSync.isInitiallyActive !== isInitiallyActive || prevSync.forceOpenState !== forceOpenState) {
        setPrevSync({ isInitiallyActive, forceOpenState });
        setUserToggled(null);
    }
    const isOpen = userToggled !== null ? userToggled : (forceOpenState !== null ? forceOpenState : isInitiallyActive);
    const GroupIcon = getSidebarItemIcon(group, parentIcon || FiFolder);
    return (<div className="flex flex-col space-y-0.5 my-0.5">
      <button type="button" onClick={() => setUserToggled(!isOpen)} className={`flex items-center justify-between w-full px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${isInitiallyActive
            ? 'text-primary dark:text-primary-light font-semibold bg-primary/5'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/40'}`}>
        <span className="flex items-center gap-1.5 truncate pr-1">
          <GroupIcon className="w-3 h-3 shrink-0 opacity-80"/>
          <span className="truncate">{group.title}</span>
        </span>
        <FiChevronRight className={`w-3 h-3 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-90 text-primary' : 'text-slate-400 dark:text-slate-500'}`}/>
      </button>

      {isOpen && (<div className="flex flex-col space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800 ml-1.5 py-0.5">
          {group.children?.map((child: any, idx: any) => {
                if (child.children && Array.isArray(child.children)) {
                    return (<SubCollapsibleGroup key={child.title || idx} group={child} pathname={pathname} onCloseMobile={onCloseMobile} forceOpenState={forceOpenState} parentIcon={GroupIcon}/>);
                }
                const target = getStaffUrl(child.path);
                const isActive = checkIsActive(child.path, pathname);
                const ChildIcon = getSidebarItemIcon(child, GroupIcon);
                const label = child.displayTitle || child.title;
                return (<Link key={child.path || idx} href={target} onClick={onCloseMobile} className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded text-[11px] transition-colors ${isActive
                        ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
                        : child.isLocked
                            ? 'text-slate-400 dark:text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 font-normal'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/40 font-normal'}`} title={label}>
                <span className="flex items-center gap-1.5 min-w-0">
                  <ChildIcon className="w-3 h-3 shrink-0 opacity-75"/>
                  <span className="truncate">{label}</span>
                </span>
                <AccessBadge accessLevel={child.accessLevel} isLocked={child.isLocked}/>
              </Link>);
            })}
        </div>)}
    </div>);
};
const NavModuleAccordion = ({ module, pathname, onCloseMobile, forceOpenState = null }: any) => {
    const isInitiallyActive = useMemo(() => hasActiveChild(module, pathname), [module, pathname]);
    const [userToggled, setUserToggled] = useState<any>(null);
    const [prevSync, setPrevSync] = useState<any>({ isInitiallyActive, forceOpenState });
    if (prevSync.isInitiallyActive !== isInitiallyActive || prevSync.forceOpenState !== forceOpenState) {
        setPrevSync({ isInitiallyActive, forceOpenState });
        setUserToggled(null);
    }
    const isOpen = userToggled !== null ? userToggled : (forceOpenState !== null ? forceOpenState : isInitiallyActive);
    const ModuleIcon = getSidebarItemIcon(module, FiFolder);
    if (module.path && (!module.children || module.children.length === 0)) {
        const target = getStaffUrl(module.path);
        const isActive = checkIsActive(module.path, pathname);
        const label = module.displayTitle || module.title;
        return (<Link href={target} onClick={onCloseMobile} className={`flex items-center justify-between gap-2 w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${isActive
                ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
                : module.isLocked
                    ? 'text-slate-400 dark:text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'}`} title={label}>
        <span className="flex items-center gap-2 min-w-0">
          <ModuleIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}/>
          <span className="truncate">{label}</span>
        </span>
        <AccessBadge accessLevel={module.accessLevel} isLocked={module.isLocked}/>
      </Link>);
    }
    return (<div className="flex flex-col space-y-0.5">
      <button type="button" onClick={() => setUserToggled(!isOpen)} className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${isInitiallyActive
            ? 'bg-slate-100/80 dark:bg-slate-800/70 text-slate-900 dark:text-white font-semibold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'}`}>
        <span className="flex items-center gap-2 truncate pr-1">
          <ModuleIcon className={`w-3.5 h-3.5 shrink-0 ${isInitiallyActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}/>
          <span className="truncate">{module.title}</span>
        </span>
        <FiChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-90 text-primary' : 'text-slate-400 dark:text-slate-500'}`}/>
      </button>

      {isOpen && (<div className="flex flex-col space-y-0.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 ml-2 py-0.5">
          {module.children?.map((item: any, idx: any) => {
                if (item.children && Array.isArray(item.children)) {
                    return (<SubCollapsibleGroup key={item.title || idx} group={item} pathname={pathname} onCloseMobile={onCloseMobile} forceOpenState={forceOpenState} parentIcon={ModuleIcon}/>);
                }
                const target = getStaffUrl(item.path);
                const isActive = checkIsActive(item.path, pathname);
                const ItemIcon = getSidebarItemIcon(item, ModuleIcon);
                const label = item.displayTitle || item.title;
                return (<Link key={item.path || idx} href={target} onClick={onCloseMobile} className={`flex items-center justify-between gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${isActive
                        ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
                        : item.isLocked
                            ? 'text-slate-400 dark:text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 font-normal'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 font-normal'}`} title={label}>
                <span className="flex items-center gap-1.5 min-w-0">
                  <ItemIcon className={`w-3 h-3 shrink-0 ${isActive ? 'text-primary' : 'opacity-75'}`}/>
                  <span className="truncate">{label}</span>
                </span>
                <AccessBadge accessLevel={item.accessLevel} isLocked={item.isLocked}/>
              </Link>);
            })}
        </div>)}
    </div>);
};
const Sidebar = ({ allowedModules = null, allowedPaths = null, isDevAdmin = false, staffPermissions = null }: any) => {
    const pathname = usePathname();
    const router = useRouter();
    const context = useContext<any>(TenantWebsiteContext) || {};
    const { adminSidebar, setAdminSidebar, staffSidebar, setStaffSidebar, tenantUrl, website } = context;
    const [filterQuery, setFilterQuery] = useState<any>('');
    const [globalExpandState, setGlobalExpandState] = useState<any>(null);
    const [activeSearchIdx, setActiveSearchIdx] = useState<number>(0);
    const scrollContainerRef = useRef<any>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const closeMobile = useCallback(() => {
        if (typeof setAdminSidebar === 'function')
            setAdminSidebar(false);
        if (typeof setStaffSidebar === 'function')
            setStaffSidebar(false);
    }, [setAdminSidebar, setStaffSidebar]);
    const focusSearchInput = useCallback(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            if (typeof setAdminSidebar === 'function')
                setAdminSidebar(true);
            if (typeof setStaffSidebar === 'function')
                setStaffSidebar(true);
        }
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        requestAnimationFrame(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        });
    }, [setAdminSidebar, setStaffSidebar]);
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                focusSearchInput();
            }
        };
        const handleCustomFocus = () => {
            focusSearchInput();
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        window.addEventListener('focus-staff-sidebar-search', handleCustomFocus);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
            window.removeEventListener('focus-staff-sidebar-search', handleCustomFocus);
        };
    }, [focusSearchInput]);
    const isMobileOpen = Boolean(adminSidebar || staffSidebar);
    const websiteAllowedSlugs = useMemo(() => {
        if (Array.isArray(website?.allowed_control_module_slugs) && website.allowed_control_module_slugs.length > 0) {
            return website.allowed_control_module_slugs;
        }
        if (Array.isArray(website?.allowed_control_modules)) {
            return website.allowed_control_modules.map((m: any) => m?.slug).filter(Boolean);
        }
        return [];
    }, [website?.allowed_control_module_slugs, website?.allowed_control_modules]);
    const websiteAllowedPaths = useMemo(() => {
        if (Array.isArray(website?.allowed_control_module_paths) && website.allowed_control_module_paths.length > 0) {
            return website.allowed_control_module_paths;
        }
        if (Array.isArray(website?.allowed_control_modules)) {
            return website.allowed_control_modules.map((m: any) => m?.path).filter(Boolean);
        }
        return [];
    }, [website?.allowed_control_module_paths, website?.allowed_control_modules]);
    const moduleMetadataMap = useMemo(() => {
        const byPath = new Map<string, any>();
        const bySlug = new Map<string, any>();
        const list = Array.isArray(website?.allowed_control_modules) ? website.allowed_control_modules : [];
        for (const m of list) {
            if (!m)
                continue;
            const normP = normalizeStaffPath(m.path);
            if (normP)
                byPath.set(normP, m);
            if (m.slug)
                bySlug.set(String(m.slug).trim().toLowerCase(), m);
        }
        return { byPath, bySlug };
    }, [website?.allowed_control_modules]);
    const academicConfig = website?.academic_config || website?.academicConfig || null;
    const filteredNavData = useMemo(() => {
        const hasWebsiteModuleFilter = websiteAllowedSlugs.length > 0 || websiteAllowedPaths.length > 0;
        const staffAllowedSlugs = Array.isArray(allowedModules) ? allowedModules : [];
        const staffAllowedPaths = Array.isArray(allowedPaths) ? allowedPaths : [];
        const hasAllBypass = isDevAdmin || staffAllowedSlugs.some((m: any) => String(m).toLowerCase().trim() === 'all');

        const resolveModuleMeta = (item: any) => {
            const normP = normalizeStaffPath(item.path);
            if (normP && moduleMetadataMap.byPath.has(normP)) {
                return moduleMetadataMap.byPath.get(normP);
            }
            const slug = extractSlugFromStaffPath(normP);
            if (slug && moduleMetadataMap.bySlug.has(slug)) {
                return moduleMetadataMap.bySlug.get(slug);
            }
            const aliases = PATH_ALIAS_SLUGS[normP];
            if (aliases) {
                for (const a of aliases) {
                    if (moduleMetadataMap.bySlug.has(a))
                        return moduleMetadataMap.bySlug.get(a);
                }
            }
            return null;
        };

        const decorateLeaf = (item: any) => {
            if (!item?.path)
                return null;
            if (hasWebsiteModuleFilter && !hasSlugOrPathInWebsite(item.path, websiteAllowedSlugs, websiteAllowedPaths, item.module)) {
                return null;
            }
            if (!hasAllBypass && !isStaffAuthorizedForNavItem(item.path, staffAllowedSlugs, staffAllowedPaths, item.module)) {
                return null;
            }
            const meta = resolveModuleMeta(item);
            const lockInfo = getAcademicDimensionLockInfo(item.path, academicConfig);
            const accessLevel = getStaffModuleAccessLevel(item.path, staffPermissions, hasAllBypass, item.module);
            return {
                ...item,
                displayTitle: meta?.name || item.title,
                isLocked: lockInfo.locked,
                accessLevel,
            };
        };

        const filterItem = (item: any): any => {
            if (item.children && Array.isArray(item.children)) {
                const allowedChildren = item.children.map(filterItem).filter(Boolean);
                if (allowedChildren.length > 0) {
                    return {
                        ...item,
                        children: allowedChildren,
                    };
                }
                if (item.path) {
                    const decorated = decorateLeaf(item);
                    return decorated ? { ...decorated, children: [] } : null;
                }
                return null;
            }
            return decorateLeaf(item);
        };
        return staffNavData.map(filterItem).filter(Boolean);
    }, [allowedModules, allowedPaths, isDevAdmin, staffPermissions, websiteAllowedSlugs, websiteAllowedPaths, moduleMetadataMap, academicConfig]);
    const flatSearchList = useMemo(() => {
        if (!filterQuery.trim())
            return [];
        const q = filterQuery.toLowerCase().trim();
        const results: any[] = [];
        const recurse = (items: any, parent: any = '') => {
            for (const item of items) {
                const label = item.displayTitle || item.title;
                const fullTitle = parent ? `${parent} > ${label}` : label;
                if (item.path &&
                    (label.toLowerCase().includes(q) ||
                        item.title.toLowerCase().includes(q) ||
                        fullTitle.toLowerCase().includes(q) ||
                        item.path.toLowerCase().includes(q))) {
                    results.push({
                        title: label,
                        fullTitle,
                        path: item.path,
                        isLocked: item.isLocked,
                        accessLevel: item.accessLevel,
                        icon: getSidebarItemIcon(item, FiFolder),
                    });
                }
                if (item.children) {
                    recurse(item.children, fullTitle);
                }
            }
        };
        recurse(filteredNavData);
        return results.slice(0, 20);
    }, [filterQuery, filteredNavData]);
    const isDashboardActive = pathname === '/staff-panel' ||
        pathname === '/staff-panel/' ||
        normalizePath(pathname).endsWith('/staff-panel');
    const safeSearchIdx = flatSearchList.length > 0 ? Math.min(activeSearchIdx, flatSearchList.length - 1) : 0;
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setFilterQuery('');
            searchInputRef.current?.blur();
            return;
        }
        if (flatSearchList.length === 0)
            return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSearchIdx((prev) => (prev + 1) % flatSearchList.length);
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSearchIdx((prev) => (prev - 1 + flatSearchList.length) % flatSearchList.length);
        }
        else if (e.key === 'Enter') {
            const chosen = flatSearchList[safeSearchIdx];
            if (chosen?.path) {
                e.preventDefault();
                closeMobile();
                setFilterQuery('');
                router.push(getStaffUrl(chosen.path));
            }
        }
    };
    const toggleAllAccordions = () => {
        setGlobalExpandState((prev: any) => (prev === true ? false : true));
    };
    return (<>
      {isMobileOpen && (<div className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity" onClick={closeMobile}/>)}

      <aside className={`fixed md:sticky top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative flex items-center">
              <FiSearch className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none"/>
              <input ref={searchInputRef} type="text" aria-label="Search sidebar modules" value={filterQuery} onChange={(e: any) => {
            setFilterQuery(e.target.value);
            setActiveSearchIdx(0);
        }} onKeyDown={handleSearchKeyDown} className="w-full text-xs pl-8 pr-12 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"/>
              {filterQuery ? (<button type="button" onClick={() => setFilterQuery('')} aria-label="Clear sidebar search" className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <FiX className="w-3.5 h-3.5"/>
                </button>) : (<kbd className="absolute right-1.5 px-1.5 py-0.2 rounded text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 pointer-events-none">
                  Ctrl+K
                </kbd>)}
            </div>
          </div>

          {filterQuery.trim() ? (<div className="space-y-1 pt-1">
              <div className="flex items-center justify-between px-1 pb-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Matching Modules ({flatSearchList.length})
                </p>
                <button type="button" onClick={() => setFilterQuery('')} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  Clear
                </button>
              </div>
              {flatSearchList.length === 0 ? (<p className="text-xs text-slate-400 py-4 text-center">No matching modules found</p>) : (flatSearchList.map((res: any, idx: number) => {
                const target = getStaffUrl(res.path);
                const isActive = checkIsActive(res.path, pathname);
                const isHighlighted = idx === safeSearchIdx;
                const ResultIcon = res.icon || FiFolder;
                return (<Link key={`${res.path}-${res.fullTitle}`} href={target} onClick={() => {
                        closeMobile();
                        setFilterQuery('');
                    }} className={`flex items-start gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${isActive
                        ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
                        : isHighlighted
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                      <ResultIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isActive ? 'text-primary' : 'text-slate-400'}`}/>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`font-medium truncate ${isActive ? 'text-primary' : res.isLocked ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {res.title}
                          </span>
                          <AccessBadge accessLevel={res.accessLevel} isLocked={res.isLocked}/>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{res.fullTitle}</div>
                      </div>
                    </Link>);
            }))}
            </div>) : (<>
              <div className="pt-0.5">
                <Link href="/staff-panel" onClick={closeMobile} className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${isDashboardActive
                ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'}`}>
                  <span className="flex items-center gap-2">
                    <FiHome className={`w-3.5 h-3.5 shrink-0 ${isDashboardActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}/>
                    <span>Overview</span>
                  </span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${isDashboardActive
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
                    Main
                  </span>
                </Link>
              </div>

              <div className="pt-2 space-y-1">
                <div className="flex items-center justify-between px-2 pb-1">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Modules ({filteredNavData.length})
                  </p>
                  <button type="button" onClick={toggleAllAccordions} className="text-[10px] text-slate-400 hover:text-primary dark:hover:text-primary-light transition-colors cursor-pointer">
                    {globalExpandState === true ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>

                {filteredNavData.map((module: any, idx: any) => (<NavModuleAccordion key={`${module.title}-${idx}`} module={module} pathname={pathname} onCloseMobile={closeMobile} forceOpenState={globalExpandState}/>))}
              </div>
            </>)}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <Link href={typeof tenantUrl === 'function' ? tenantUrl('/') : '/'} className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-primary/50 transition-colors">
            <FiExternalLink className="w-3.5 h-3.5 text-slate-400"/>
            <span>Portal</span>
          </Link>
        </div>
      </aside>
    </>);
};
export default Sidebar;
