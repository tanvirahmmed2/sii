'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import staffNavDataDefault, { staffNavData as staffNavDataNamed } from 'src/component/website/bars/admin/staffNavData';

const staffNavData = staffNavDataDefault || staffNavDataNamed || [];

const routeToModuleMap = (() => {
  const map = {};

  const traverse = (items) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (item.path && item.module) {
        const clean = item.path.startsWith('/') ? item.path : `/${item.path}`;
        map[clean] = { module: item.module, title: item.title || item.name || 'Workstation' };
        map[`/staff-panel${clean}`] = { module: item.module, title: item.title || item.name || 'Workstation' };
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
  const { website } = useTenantWebsite();

  const accessStatus = useMemo(() => {
    if (
      pathname === '/staff-panel' ||
      pathname === '/staff-panel/' ||
      pathname.endsWith('/staff-panel') ||
      pathname.includes('/staff-profile') ||
      pathname.includes('/staff-settings')
    ) {
      return { allowed: true };
    }

    const packagePaths = website?.allowed_control_module_paths;
    if (Array.isArray(packagePaths) && packagePaths.length > 0) {
      const cleanPath = pathname.toLowerCase().replace(/\/+$/, '') || '/staff-panel';
      const cleanPrefix = cleanPath.split('/').slice(0, 3).join('/');

      const isIncludedInPackage = packagePaths.some((p) => {
        const allowedClean = String(p).toLowerCase().replace(/\/+$/, '');
        return cleanPath === allowedClean || cleanPrefix === allowedClean;
      });

      if (!isIncludedInPackage) {
        const matchedItem = website?.allowed_control_modules?.find((m) => {
          const p = String(m.path || '').toLowerCase().replace(/\/+$/, '');
          return cleanPath === p || cleanPrefix === p;
        });

        return {
          allowed: false,
          reason: 'package_locked',
          title: matchedItem?.name || 'Academic Workstation',
        };
      }
    }

    if (isDevAdmin || !Array.isArray(allowedModules) || allowedModules.length === 0) {
      return { allowed: true };
    }

    let targetInfo = routeToModuleMap[pathname];

    if (!targetInfo) {
      for (const [pathKey, info] of Object.entries(routeToModuleMap)) {
        if (pathname === pathKey || pathname.startsWith(`${pathKey}/`)) {
          targetInfo = info;
          break;
        }
      }
    }

    if (!targetInfo) {
      return { allowed: true };
    }

    const targetModule = targetInfo.module;
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
      reason: 'permission_denied',
      title: targetInfo.title,
    };
  }, [pathname, allowedModules, isDevAdmin, website?.allowed_control_module_paths, website?.allowed_control_modules]);

  if (!accessStatus.allowed) {
    const isPkgLocked = accessStatus.reason === 'package_locked';

    return (
      <div className="w-full max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v.01M12 9v4m-7 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {accessStatus.title}
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {isPkgLocked ? 'Module Not Included in Subscription Package' : 'Access Restricted'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            {isPkgLocked
              ? `This workstation is not included in your institution's active subscription package (${website?.package?.name || 'Current Plan'}). Please contact campus administration to upgrade.`
              : 'This workstation has not been assigned to your staff profile permissions. Please contact your institution administrator to request access.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/staff-panel"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            Return to Staff Dashboard
          </Link>
          {!isPkgLocked && (
            <Link
              href="/staff-panel/staff-profile"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              View My Permissions
            </Link>
          )}
        </div>
      </div>
    );
  }

  return children;
}
