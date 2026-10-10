'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function OfficerSidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [officer, setOfficer] = useState(null);
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    async function loadOfficerSession() {
      try {
        const res = await fetch(getApiEndpoint('officer/me'));
        if (res.ok) {
          const data = await res.json();
          setOfficer(data.officer || data.payload?.officer);
          setPermissions(data.permissions || data.payload?.permissions || {});
        }
      } catch (err) {
        console.warn('Failed to load officer permissions in Sidebar:', err);
      }
    }
    loadOfficerSession();
  }, [getApiEndpoint]);

  // Core navigation links
  const coreLinks = [
    { label: 'Workstation Overview', href: '/officer' },
  ];

  // Dynamic modules based on permissions
  const moduleLinks = [];
  const hasHall = permissions['hostel']?.can_view || permissions['residence']?.can_view || officer?.department === 'Hall';
  if (hasHall || officer?.department === 'Hall') {
    moduleLinks.push({ label: 'Residential & Hall Desk', href: '/officer/residential' });
  }

  const hasLibrary = permissions['library']?.can_view || officer?.department === 'Library';
  if (hasLibrary || officer?.department === 'Library') {
    moduleLinks.push({ label: 'Library Management', href: '/officer/library' });
  }

  const hasClub = permissions['club']?.can_view || officer?.department === 'Club';
  if (hasClub || officer?.department === 'Club') {
    moduleLinks.push({ label: 'Clubs & Student Activities', href: '/officer/club' });
  }

  const accountLinks = [
    { label: 'Officer Profile & Security', href: '/officer/profile' },
    { label: 'Panel Preferences', href: '/officer/settings' },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:sticky top-14 z-30 h-[calc(100vh-3.5rem)] w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 space-y-3">
          {/* Officer identity block */}
          {officer && (
            <div className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded space-y-0.5">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {officer.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {officer.designation || 'Officer'} • {officer.department || 'General'}
              </div>
            </div>
          )}

          {/* General Navigation */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 pt-1 pb-1">
              General Operations
            </p>
            <nav className="flex flex-col space-y-0.5">
              {coreLinks.map((link) => {
                const target = tenantUrl(link.href);
                const isActive = pathname === target || pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={target}
                    onClick={onClose}
                    className={`px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                    }`}
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Granted Package Modules */}
          {moduleLinks.length > 0 && (
            <div className="space-y-0.5 pt-1">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 pt-1 pb-1">
                Assigned Modules
              </p>
              <nav className="flex flex-col space-y-0.5">
                {moduleLinks.map((link) => {
                  const target = tenantUrl(link.href);
                  const isActive = pathname === target || pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={target}
                      onClick={onClose}
                      className={`px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                      }`}
                    >
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Account Settings */}
          <div className="space-y-0.5 pt-1">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 pt-1 pb-1">
              Account & Desk
            </p>
            <nav className="flex flex-col space-y-0.5">
              {accountLinks.map((link) => {
                const target = tenantUrl(link.href);
                const isActive = pathname === target || pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={target}
                    onClick={onClose}
                    className={`px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                    }`}
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer note */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
          Campus Officer Desk v2.4
        </div>
      </aside>
    </>
  );
}
