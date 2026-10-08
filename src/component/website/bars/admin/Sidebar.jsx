'use client';

import React, { useContext, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import staffNavData from './staffNavData';

// Helper to convert route to staff-panel tenant path
const getStaffUrl = (rawPath, tenantUrl) => {
  if (!rawPath) return '#';
  if (rawPath === '/' || rawPath === '/staff-panel') return tenantUrl('/staff-panel');
  const clean = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const staffPath = clean.startsWith('/staff-panel') ? clean : `/staff-panel${clean}`;
  return tenantUrl(staffPath);
};

// Check if any descendant path matches current pathname
const hasActiveChild = (item, pathname, tenantUrl) => {
  if (item.path) {
    const target = getStaffUrl(item.path, tenantUrl);
    if (pathname === target || pathname.startsWith(target + '/')) {
      return true;
    }
  }
  if (item.children && Array.isArray(item.children)) {
    return item.children.some((child) => hasActiveChild(child, pathname, tenantUrl));
  }
  return false;
};

// Sub-level collapsible group (for nested menus like Update, Migration, ID Card, etc.)
const SubCollapsibleGroup = ({ group, pathname, tenantUrl, setAdminSidebar }) => {
  const isInitiallyActive = useMemo(
    () => hasActiveChild(group, pathname, tenantUrl),
    [group, pathname, tenantUrl]
  );
  const [isOpen, setIsOpen] = useState(isInitiallyActive);

  return (
    <div className="flex flex-col space-y-0.5 my-0.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
          isInitiallyActive
            ? 'text-slate-900 dark:text-white font-semibold bg-slate-100/70 dark:bg-slate-800/60'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
        }`}
      >
        <span>{group.title}</span>
        <span className="text-[9px] text-slate-400 font-mono">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen && (
        <div className="flex flex-col space-y-0.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 ml-1.5 py-0.5">
          {group.children?.map((child, idx) => {
            const target = getStaffUrl(child.path, tenantUrl);
            const isActive = pathname === target || pathname.startsWith(target + '/');

            return (
              <Link
                key={child.path || idx}
                href={target}
                onClick={() => setAdminSidebar(false)}
                className={`px-2 py-1 rounded text-[11px] transition-colors truncate ${
                  isActive
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
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
const NavModuleAccordion = ({ module, pathname, tenantUrl, setAdminSidebar }) => {
  const isInitiallyActive = useMemo(
    () => hasActiveChild(module, pathname, tenantUrl),
    [module, pathname, tenantUrl]
  );
  const [isOpen, setIsOpen] = useState(isInitiallyActive);

  // If module is a direct link without children
  if (module.path && (!module.children || module.children.length === 0)) {
    const target = getStaffUrl(module.path, tenantUrl);
    const isActive = pathname === target || pathname.startsWith(target + '/');

    return (
      <Link
        href={target}
        onClick={() => setAdminSidebar(false)}
        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
          isActive
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold border-l-2 border-slate-900 dark:border-white'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
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
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
          isInitiallyActive
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
        }`}
      >
        <span className="truncate pr-1">{module.title}</span>
        <span className="text-[10px] text-slate-400 font-mono shrink-0">
          {isOpen ? '−' : '+'}
        </span>
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
                  tenantUrl={tenantUrl}
                  setAdminSidebar={setAdminSidebar}
                />
              );
            }

            // Direct leaf link inside top accordion
            const target = getStaffUrl(item.path, tenantUrl);
            const isActive = pathname === target || pathname.startsWith(target + '/');

            return (
              <Link
                key={item.path || idx}
                href={target}
                onClick={() => setAdminSidebar(false)}
                className={`px-2 py-1 rounded text-xs transition-colors truncate ${
                  isActive
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
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
  const { adminSidebar, setAdminSidebar, tenantUrl } = useContext(TenantWebsiteContext);
  const [filterQuery, setFilterQuery] = useState('');

  // Extract flat list of links for quick search
  const flatSearchList = useMemo(() => {
    if (!filterQuery.trim()) return [];
    const q = filterQuery.toLowerCase();
    const results = [];

    const recurse = (items, parent = '') => {
      for (const item of items) {
        const fullTitle = parent ? `${parent} > ${item.title}` : item.title;
        if (item.path && item.title.toLowerCase().includes(q)) {
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

    recurse(staffNavData);
    return results.slice(0, 15);
  }, [filterQuery]);

  const dashboardTarget = tenantUrl('/staff-panel');
  const isDashboardActive = pathname === dashboardTarget || pathname === '/staff-panel';

  return (
    <>
      {/* Mobile Backdrop */}
      {adminSidebar && (
        <div
          className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setAdminSidebar(false)}
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed md:sticky top-14 z-30 h-[calc(100vh-3.5rem)] w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          adminSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Scrollable Navigation Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {/* Quick Search / Filter Input */}
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <input
              type="text"
              placeholder="Search portal modules..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
          </div>

          {/* If filtering, show quick results */}
          {filterQuery.trim() ? (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                Matching Modules ({flatSearchList.length})
              </p>
              {flatSearchList.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No matching modules found</p>
              ) : (
                flatSearchList.map((res) => {
                  const target = getStaffUrl(res.path, tenantUrl);
                  return (
                    <Link
                      key={res.path}
                      href={target}
                      onClick={() => {
                        setAdminSidebar(false);
                        setFilterQuery('');
                      }}
                      className="block px-2.5 py-1.5 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <div className="font-medium text-slate-900 dark:text-white">{res.title}</div>
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
                  href={dashboardTarget}
                  onClick={() => setAdminSidebar(false)}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                    isDashboardActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <span>Overview Dashboard</span>
                  <span className="text-[9px] font-mono uppercase bg-slate-200 dark:bg-slate-700 px-1 py-0.2 rounded text-slate-700 dark:text-slate-200">
                    Main
                  </span>
                </Link>
              </div>

              {/* Dynamic Module Tree */}
              <div className="pt-2 space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 pb-1">
                  System Modules
                </p>

                {staffNavData.map((module, idx) => (
                  <NavModuleAccordion
                    key={module.title || idx}
                    module={module}
                    pathname={pathname}
                    tenantUrl={tenantUrl}
                    setAdminSidebar={setAdminSidebar}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Quick Return */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <Link
            href={tenantUrl('/')}
            className="w-full block text-center px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            Return to Campus Portal
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;