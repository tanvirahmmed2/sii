'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import CampusMaintenanceScreen from './CampusMaintenanceScreen';

export default function CampusHomeWrapper({ children }) {
  const { website } = useTenantWebsite();
  const pathname = usePathname();

  const isModuleAllowed = useMemo(() => {
    if (!pathname || pathname === '/' || pathname === '') {
      return true;
    }

    const allowedPaths = website?.allowed_home_module_paths;
    if (!allowedPaths || !Array.isArray(allowedPaths) || allowedPaths.length === 0) {
      return true;
    }

    const cleanPath = pathname.toLowerCase().replace(/\/+$/, '') || '/';
    const cleanSegment = '/' + (cleanPath.split('/')[1] || '');

    return allowedPaths.some((p) => {
      const allowedClean = String(p).toLowerCase().replace(/\/+$/, '') || '/';
      return cleanPath === allowedClean || cleanSegment === allowedClean;
    });
  }, [pathname, website?.allowed_home_module_paths]);

  if (website?.is_maintenance_mode) {
    return <CampusMaintenanceScreen />;
  }

  if (!isModuleAllowed) {
    const matchedModule = website?.allowed_home_modules?.find((m) => {
      const p = String(m.path || '').toLowerCase().replace(/\/+$/, '') || '/';
      const cleanPath = (pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
      const cleanSegment = '/' + (cleanPath.split('/')[1] || '');
      return p === cleanPath || p === cleanSegment;
    });

    const moduleName = matchedModule?.name || 'This Section';

    return (
      <div className="min-h-[70vh] w-full flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Feature Not Available
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {moduleName} is not included in this institution&apos;s current subscription package ({website?.package?.name || 'Current Plan'}).
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs transition-colors"
            >
              Return to Campus Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
