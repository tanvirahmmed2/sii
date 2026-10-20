'use client';

import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import staffNavDataDefault, { staffNavData as staffNavDataNamed } from './staffNavData';

const staffNavData = staffNavDataDefault || staffNavDataNamed || [];

// Normalize path by stripping query params, hash, and trailing slashes
const normalizePath = (p) => {
  if (!p) return '';
  const clean = p.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return clean || '/';
};

// Helper to convert route to clean staff-panel path
const getStaffUrl = (rawPath) => {
  if (!rawPath) return '#';
  const clean = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  if (clean === '/' || clean === '/staff-panel') return '/staff-panel';
  return clean.startsWith('/staff-panel') ? clean : `/staff-panel${clean}`;
};

// Check if a path matches current pathname
const checkIsActive = (itemPath, currentPathname) => {
  if (!itemPath) return false;
  const target = normalizePath(getStaffUrl(itemPath));
  const current = normalizePath(currentPathname);

  // Exact match
  if (current === target) return true;

  // Prefix match for nested dynamic sub-pages (e.g. /staff-panel/news-list/[slug])
  // Special exception: don't match root /staff-panel for every page!
  if (target !== '/staff-panel' && current.startsWith(`${target}/`)) {
    return true;
  }

  // Handle route aliases
  if (
    target === '/staff-panel/board-members' &&
    (current === '/staff-panel/institutional-board-members' ||
      current.startsWith('/staff-panel/institutional-board-members/'))
  ) {
    return true;
  }
  if (
    target === '/staff-panel/institutional-board-members' &&
    (current === '/staff-panel/board-members' || current.startsWith('/staff-panel/board-members/'))
  ) {
    return true;
  }

  return false;
};

// Check if any descendant path matches current pathname
const hasActiveChild = (item, pathname) => {
  if (item.path && checkIsActive(item.path, pathname)) {
    return true;
  }
  if (item.children && Array.isArray(item.children)) {
    return item.children.some((child) => hasActiveChild(child, pathname));
  }
  return false;
};

// Sub-level collapsible group (for nested menus like Update, Migration, ID Card, etc.)
const SubCollapsibleGroup = ({ group, pathname, onCloseMobile, forceOpenState = null }) => {
  const isInitiallyActive = useMemo(() => hasActiveChild(group, pathname), [group, pathname]);
  const [userToggled, setUserToggled] = useState(null);
  const [prevSync, setPrevSync] = useState({ isInitiallyActive, forceOpenState });

  if (prevSync.isInitiallyActive !== isInitiallyActive || prevSync.forceOpenState !== forceOpenState) {
    setPrevSync({ isInitiallyActive, forceOpenState });
    setUserToggled(null);
  }

  const isOpen = userToggled !== null ? userToggled : (forceOpenState !== null ? forceOpenState : isInitiallyActive);

  return (
    <div className="flex flex-col space-y-0.5 my-0.5">
      <button
        type="button"
        onClick={() => setUserToggled(!isOpen)}
        className={`flex items-center justify-between w-full px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
          isInitiallyActive
            ? 'text-primary dark:text-primary-light font-semibold bg-primary/5'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
        }`}
      >
        <span className="truncate pr-1">{group.title}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-90 text-primary' : 'text-slate-400 dark:text-slate-500'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isOpen && (
        <div className="flex flex-col space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800 ml-1.5 py-0.5">
          {group.children?.map((child, idx) => {
            if (child.children && Array.isArray(child.children)) {
              return (
                <SubCollapsibleGroup
                  key={child.title || idx}
                  group={child}
                  pathname={pathname}
                  onCloseMobile={onCloseMobile}
                  forceOpenState={forceOpenState}
                />
              );
            }

            const target = getStaffUrl(child.path);
            const isActive = checkIsActive(child.path, pathname);

            return (
              <Link
                key={child.path || idx}
                href={target}
                onClick={onCloseMobile}
                className={`block px-2 py-1 rounded text-[11px] transition-colors truncate ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/40 font-normal'
                }`}
                title={child.title}
              >
                {child.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Top-level accordion module
const NavModuleAccordion = ({ module, pathname, onCloseMobile, forceOpenState = null }) => {
  const isInitiallyActive = useMemo(() => hasActiveChild(module, pathname), [module, pathname]);
  const [userToggled, setUserToggled] = useState(null);
  const [prevSync, setPrevSync] = useState({ isInitiallyActive, forceOpenState });

  if (prevSync.isInitiallyActive !== isInitiallyActive || prevSync.forceOpenState !== forceOpenState) {
    setPrevSync({ isInitiallyActive, forceOpenState });
    setUserToggled(null);
  }

  const isOpen = userToggled !== null ? userToggled : (forceOpenState !== null ? forceOpenState : isInitiallyActive);

  // If module is a direct link without children
  if (module.path && (!module.children || module.children.length === 0)) {
    const target = getStaffUrl(module.path);
    const isActive = checkIsActive(module.path, pathname);

    return (
      <Link
        href={target}
        onClick={onCloseMobile}
        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
          isActive
            ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'
        }`}
      >
        <span>{module.title}</span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col space-y-0.5">
      <button
        type="button"
        onClick={() => setUserToggled(!isOpen)}
        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
          isInitiallyActive
            ? 'bg-slate-100/80 dark:bg-slate-800/70 text-slate-900 dark:text-white font-semibold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'
        }`}
      >
        <span className="flex items-center gap-1.5 truncate pr-1">
          {isInitiallyActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
          <span>{module.title}</span>
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-90 text-primary' : 'text-slate-400 dark:text-slate-500'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isOpen && (
        <div className="flex flex-col space-y-0.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 ml-2 py-0.5">
          {module.children?.map((item, idx) => {
            // Nested group with its own children
            if (item.children && Array.isArray(item.children)) {
              return (
                <SubCollapsibleGroup
                  key={item.title || idx}
                  group={item}
                  pathname={pathname}
                  onCloseMobile={onCloseMobile}
                  forceOpenState={forceOpenState}
                />
              );
            }

            // Direct leaf link inside top accordion
            const target = getStaffUrl(item.path);
            const isActive = checkIsActive(item.path, pathname);

            return (
              <Link
                key={item.path || idx}
                href={target}
                onClick={onCloseMobile}
                className={`block px-2.5 py-1 rounded text-xs transition-colors truncate ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 font-normal'
                }`}
                title={item.title}
              >
                {item.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ allowedModules = null, isDevAdmin = false }) => {
  const pathname = usePathname();
  const context = useContext(TenantWebsiteContext) || {};
  const { adminSidebar, setAdminSidebar, staffSidebar, setStaffSidebar, tenantUrl } = context;

  const [filterQuery, setFilterQuery] = useState('');
  const [globalExpandState, setGlobalExpandState] = useState(null); // null = auto, true = expand all, false = collapse all
  const scrollContainerRef = useRef(null);

  // Safe handler to close mobile drawer
  const closeMobile = () => {
    if (typeof setAdminSidebar === 'function') setAdminSidebar(false);
    if (typeof setStaffSidebar === 'function') setStaffSidebar(false);
  };

  const isMobileOpen = Boolean(adminSidebar || staffSidebar);

  // Filter navigation items by allowedModules if specified
  const filteredNavData = useMemo(() => {
    // If dev admin, no restrictions provided, or empty array, allow all modules
    if (isDevAdmin || !Array.isArray(allowedModules) || allowedModules.length === 0) {
      return staffNavData;
    }

    const allowedSet = new Set(allowedModules.map((m) => String(m).toLowerCase().trim()));

    const filterItem = (item) => {
      // If item has a specific module, check if allowed (supports array or comma-separated)
      let isSelfAllowed = !item.module;
      if (item.module) {
        if (Array.isArray(item.module)) {
          isSelfAllowed = item.module.some((m) => allowedSet.has(m.toLowerCase().trim()));
        } else if (typeof item.module === 'string' && item.module.includes(',')) {
          isSelfAllowed = item.module.split(',').some((m) => allowedSet.has(m.toLowerCase().trim()));
        } else {
          isSelfAllowed = allowedSet.has(String(item.module).toLowerCase().trim());
        }
      }

      if (item.children && Array.isArray(item.children)) {
        const allowedChildren = item.children.map(filterItem).filter(Boolean);

        // If at least one child is allowed, keep the group with allowed children
        if (allowedChildren.length > 0) {
          return {
            ...item,
            children: allowedChildren,
          };
        }

        // If no children allowed, keep only if item itself has direct path and is allowed
        if (item.path && isSelfAllowed) {
          return { ...item, children: [] };
        }

        return null;
      }

      // Leaf item
      return isSelfAllowed ? item : null;
    };

    return staffNavData.map(filterItem).filter(Boolean);
  }, [allowedModules, isDevAdmin]);

  // Extract flat list of links for quick search from filteredNavData
  const flatSearchList = useMemo(() => {
    if (!filterQuery.trim()) return [];
    const q = filterQuery.toLowerCase().trim();
    const results = [];

    const recurse = (items, parent = '') => {
      for (const item of items) {
        const fullTitle = parent ? `${parent} > ${item.title}` : item.title;
        if (
          item.path &&
          (item.title.toLowerCase().includes(q) ||
            fullTitle.toLowerCase().includes(q) ||
            item.path.toLowerCase().includes(q))
        ) {
          results.push({
            title: item.title,
            fullTitle,
            path: item.path,
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

  const isDashboardActive =
    pathname === '/staff-panel' ||
    pathname === '/staff-panel/' ||
    normalizePath(pathname).endsWith('/staff-panel');

  const toggleAllAccordions = () => {
    setGlobalExpandState((prev) => (prev === true ? false : true));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed md:sticky top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Scrollable Navigation Container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin"
        >
          {/* Quick Search / Filter Input */}
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <input
              type="text"
              placeholder="Search portal modules..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* If filtering, show quick results */}
          {filterQuery.trim() ? (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between px-1 pb-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Matching Modules ({flatSearchList.length})
                </p>
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Clear
                </button>
              </div>
              {flatSearchList.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No matching modules found</p>
              ) : (
                flatSearchList.map((res) => {
                  const target = getStaffUrl(res.path);
                  const isActive = checkIsActive(res.path, pathname);
                  return (
                    <Link
                      key={`${res.path}-${res.fullTitle}`}
                      href={target}
                      onClick={() => {
                        closeMobile();
                        setFilterQuery('');
                      }}
                      className={`block px-2.5 py-1.5 rounded text-xs transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`font-medium ${isActive ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                        {res.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{res.fullTitle}</div>
                    </Link>
                  );
                })
              )}
            </div>
          ) : (
            <>
              {/* Primary Dashboard Link */}
              <div className="pt-0.5">
                <Link
                  href="/staff-panel"
                  onClick={closeMobile}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                    isDashboardActive
                      ? 'bg-primary/10 text-primary dark:text-primary-light font-semibold border-l-2 border-primary'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <span>Overview Dashboard</span>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                      isDashboardActive
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Main
                  </span>
                </Link>
              </div>

              {/* Dynamic Module Tree */}
              <div className="pt-2 space-y-1">
                <div className="flex items-center justify-between px-2 pb-1">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Modules ({filteredNavData.length})
                  </p>
                  <button
                    type="button"
                    onClick={toggleAllAccordions}
                    className="text-[10px] text-slate-400 hover:text-primary dark:hover:text-primary-light transition-colors cursor-pointer"
                  >
                    {globalExpandState === true ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>

                {filteredNavData.map((module, idx) => (
                  <NavModuleAccordion
                    key={`${module.title}-${idx}`}
                    module={module}
                    pathname={pathname}
                    onCloseMobile={closeMobile}
                    forceOpenState={globalExpandState}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Quick Return */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <Link
            href={typeof tenantUrl === 'function' ? tenantUrl('/') : '/'}
            className="w-full block text-center px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-primary/50 transition-colors"
          >
            Return to Campus Portal
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;