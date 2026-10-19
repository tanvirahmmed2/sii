'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import staffNavDataDefault, { staffNavData as staffNavDataNamed } from 'src/component/website/bars/admin/staffNavData';

const staffNavData = staffNavDataDefault || staffNavDataNamed || [];

// Build a fast lookup map from route paths to their assigned module
const routeToModuleMap = (() => {
  const map = {};

  const traverse = (items) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (item.path && item.module) {
        const clean = item.path.startsWith('/') ? item.path : `/${item.path}`;
        map[clean] = item.module;
        map[`/staff-panel${clean}`] = item.module;
      }
      if (item.children && Array.isArray(item.children)) {
        traverse(item.children);
      }
    }
  };

  traverse(staffNavData);
  return map;
})();

export default function StaffModuleRouteGuard({ children, allowedModules = null, isDevAdmin = false }) {
  const pathname = usePathname();

  const accessStatus = useMemo(() => {
    if (isDevAdmin || !Array.isArray(allowedModules) || allowedModules.length === 0) {
      return { allowed: true };
    }

    // Dashboard root and personal profile are always accessible
    if (
      pathname === '/staff-panel' ||
      pathname === '/staff-panel/' ||
      pathname.endsWith('/staff-panel') ||
      pathname.includes('/staff-profile') ||
      pathname.includes('/staff-settings')
    ) {
      return { allowed: true };
    }

    // Check exact path match or prefix match in route-to-module map
    let targetModule = routeToModuleMap[pathname];

    if (!targetModule) {
      // Check if pathname starts with any known path
      for (const [pathKey, mod] of Object.entries(routeToModuleMap)) {
        if (pathname === pathKey || pathname.startsWith(`${pathKey}/`)) {
          targetModule = mod;
          break;
        }
      }
    }

    if (!targetModule) {
      // Route has no specific module restriction
      return { allowed: true };
    }

    const allowedSet = new Set(allowedModules.map((m) => String(m).toLowerCase().trim()));
    let isAllowed = false;
    if (Array.isArray(targetModule)) {
      isAllowed = targetModule.some((m) => allowedSet.has(m.toLowerCase().trim()));
    } else if (typeof targetModule === 'string' && targetModule.includes(',')) {
      isAllowed = targetModule.split(',').some((m) => allowedSet.has(m.toLowerCase().trim()));
    } else {
      isAllowed = allowedSet.has(String(targetModule).toLowerCase().trim());
    }

    return {
      allowed: isAllowed,
      module: targetModule,
    };
  }, [pathname, allowedModules, isDevAdmin]);

  if (!accessStatus.allowed) {
    return (
      <div className="w-full max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v.01M12 9v4m-7 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Module: {accessStatus.module}
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            This workstation belongs to the <span className="font-semibold text-slate-900 dark:text-slate-200 uppercase">{accessStatus.module}</span> module, which is either not included in your institution&apos;s current subscription package or has not been granted to your staff profile.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/staff-panel"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            Return to Staff Dashboard
          </Link>
          <Link
            href="/staff-panel/staff-profile"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            View My Permissions
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
