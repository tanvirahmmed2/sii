'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import staffNavDataDefault, { staffNavData as staffNavDataNamed } from 'src/component/website/bars/admin/staffNavData';
import {
    ALWAYS_ALLOWED_STAFF_PATHS,
    getAcademicDimensionLockInfo,
    hasSlugOrPathInWebsite,
    isStaffAuthorizedForNavItem,
    normalizeStaffPath,
} from 'src/lib/modules/moduleMappings';
const staffNavData = staffNavDataDefault || staffNavDataNamed || [];
const routeToModuleMap = (() => {
    const map: any = {};
    const traverse = (items: any) => {
        if (!Array.isArray(items))
            return;
        for (const item of items) {
            if (item.path) {
                const clean = item.path.startsWith('/') ? item.path : `/${item.path}`;
                map[clean] = { module: item.module || null, title: item.title || item.name || 'Workstation' };
                map[`/staff-panel${clean}`] = { module: item.module || null, title: item.title || item.name || 'Workstation' };
            }
            if (item.children && Array.isArray(item.children)) {
                traverse(item.children);
            }
        }
    };
    traverse(staffNavData);
    return map;
})();
export default function StaffModuleRouteGuard({ children, allowedModules = null, allowedPaths = null, isDevAdmin = false }: any) {
    const pathname = usePathname();
    const { website } = useTenantWebsite();
    const accessStatus = useMemo(() => {
        const normPath = normalizeStaffPath(pathname);
        if (!normPath || ALWAYS_ALLOWED_STAFF_PATHS.has(normPath)) {
            return { allowed: true };
        }
        const websiteAllowedSlugs = Array.isArray(website?.allowed_control_module_slugs) && website.allowed_control_module_slugs.length > 0
            ? website.allowed_control_module_slugs
            : (Array.isArray(website?.allowed_control_modules) ? website.allowed_control_modules.map((m: any) => m?.slug).filter(Boolean) : []);
        const websiteAllowedPaths = Array.isArray(website?.allowed_control_module_paths) && website.allowed_control_module_paths.length > 0
            ? website.allowed_control_module_paths
            : (Array.isArray(website?.allowed_control_modules) ? website.allowed_control_modules.map((m: any) => m?.path).filter(Boolean) : []);

        let targetInfo = routeToModuleMap[normPath] || routeToModuleMap[pathname];
        if (!targetInfo) {
            for (const [pathKey, info] of Object.entries(routeToModuleMap)) {
                if (normPath === pathKey || normPath.startsWith(`${pathKey}/`)) {
                    targetInfo = info;
                    break;
                }
            }
        }

        if (websiteAllowedSlugs.length > 0 || websiteAllowedPaths.length > 0) {
            const isIncludedInPackage = hasSlugOrPathInWebsite(
                normPath,
                websiteAllowedSlugs,
                websiteAllowedPaths,
                targetInfo?.module || null
            );
            if (!isIncludedInPackage) {
                return {
                    allowed: false,
                    reason: 'package_locked',
                    title: targetInfo?.title || 'Subscription Restricted Workstation',
                };
            }
        }

        const staffAllowedSlugs = Array.isArray(allowedModules) ? allowedModules : [];
        const staffAllowedPaths = Array.isArray(allowedPaths) ? allowedPaths : [];
        const hasAllBypass = isDevAdmin || staffAllowedSlugs.some((m: any) => String(m).toLowerCase().trim() === 'all');
        if (!hasAllBypass) {
            const isAllowed = isStaffAuthorizedForNavItem(
                normPath,
                staffAllowedSlugs,
                staffAllowedPaths,
                targetInfo?.module || null
            );
            if (!isAllowed) {
                return {
                    allowed: false,
                    reason: 'permission_denied',
                    title: targetInfo?.title || 'Academic Workstation',
                };
            }
        }
        const academicLock = getAcademicDimensionLockInfo(normPath, website?.academic_config || website?.academicConfig);
        if (academicLock.locked) {
            return {
                allowed: false,
                reason: 'dimension_locked',
                dimension: academicLock.dimension,
                dimensionLabel: academicLock.label,
                title: targetInfo?.title || academicLock.label || 'Academic Module',
            };
        }
        return { allowed: true };
    }, [pathname, allowedModules, allowedPaths, isDevAdmin, website?.allowed_control_module_slugs, website?.allowed_control_module_paths, website?.allowed_control_modules, website?.academic_config, website?.academicConfig]);
    if (!accessStatus.allowed) {
        const isPkgLocked = accessStatus.reason === 'package_locked';
        const isDimensionLocked = accessStatus.reason === 'dimension_locked';
        return (<div className="w-full max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v.01M12 9v4m-7 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>

        <div className="space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {accessStatus.title}
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {isPkgLocked
                ? 'Module Not Included in Subscription Package'
                : isDimensionLocked
                    ? `${accessStatus.dimensionLabel || 'Academic'} Module Locked by Education System`
                    : 'Access Restricted'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            {isPkgLocked
                ? `This workstation is not included in your institution's active subscription package (${website?.package?.name || 'Current Plan'}). Please contact campus administration to upgrade.`
                : isDimensionLocked
                    ? `The "${accessStatus.dimensionLabel}" dimension is currently disabled under this institution's Academic Hierarchy (${website?.academic_config?.hierarchy_type || 'CLASS_SEC'}). Allowed staff can enable or customize it in System & Architecture.`
                    : 'This workstation has not been assigned to your staff profile permissions. Please contact your institution administrator to request access.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/staff-panel" className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors">
            Return to Staff Dashboard
          </Link>
          {isDimensionLocked && (<Link href="/staff-panel/system" className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
              Configure Education System
            </Link>)}
          {!isPkgLocked && !isDimensionLocked && (<Link href="/staff-panel/staff-profile" className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              View My Permissions
            </Link>)}
        </div>
      </div>);
    }
    return children;
}
