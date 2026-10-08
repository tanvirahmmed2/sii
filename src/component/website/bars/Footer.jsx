'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Footer = () => {
  const {
    website,
    websiteSettings,
    tenantUrl,
    theme,
    isDark,
    toggleTheme,
  } = useContext(TenantWebsiteContext);

  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;
  const phone = website?.contact_phone || websiteSettings?.contact_phone || '';
  const email = website?.contact_email || websiteSettings?.contact_email || '';
  const address = website?.address || websiteSettings?.address || '';
  const eiin = website?.eiin_number || websiteSettings?.eiin || '';
  const mapUrl = websiteSettings?.map_url || null;

  const renderFooterMap = () => {
    if (!mapUrl) return null;

    if (mapUrl.includes('<iframe')) {
      return (
        <div
          className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
          dangerouslySetInnerHTML={{ __html: mapUrl }}
        />
      );
    }

    let iframeSrc = mapUrl;
    if (mapUrl.includes('google.com/maps') && !mapUrl.includes('embed') && address) {
      iframeSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    }

    return (
      <iframe
        src={iframeSrc}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        title="Campus Map"
      />
    );
  };

  const linkColClass = 'flex flex-col space-y-1.5 text-xs';
  const navLinkClass =
    'text-slate-400 hover:text-white dark:hover:text-slate-100 transition-colors py-0.5';

  return (
    <footer className="w-full bg-slate-900 dark:bg-slate-950 text-slate-300 border-t border-slate-800 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Top Tier: Institution Profile & Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1 & 2: Institution Meta */}
          <div className="lg:col-span-2 space-y-3">
            <div className="space-y-1">
              <span className="text-base font-semibold text-white tracking-tight">
                {schoolName}
              </span>
              {eiin && (
                <p className="text-xs font-mono text-slate-400">
                  Government EIIN: {eiin}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Dedicated to academic rigor, integrity, and future-ready education. Official institutional management portal and digital registry.
            </p>

            <div className="space-y-1 text-xs text-slate-400 pt-1">
              {address && (
                <p>
                  <span className="font-semibold text-slate-300">Address: </span>
                  {address}
                </p>
              )}
              {phone && (
                <p>
                  <span className="font-semibold text-slate-300">Telephone: </span>
                  {phone}
                </p>
              )}
              {email && (
                <p>
                  <span className="font-semibold text-slate-300">Email: </span>
                  {email}
                </p>
              )}
            </div>

            {/* Theme Switcher */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="px-2.5 py-1 text-xs font-medium rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              >
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>

          {/* Col 3: Academic & Admissions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Academics
            </h3>
            <div className={linkColClass}>
              <Link href={tenantUrl('/classes')} className={navLinkClass}>
                Class Programs
              </Link>
              <Link href={tenantUrl('/admission')} className={navLinkClass}>
                Admission Circular
              </Link>
              <Link href={tenantUrl('/apply')} className={navLinkClass}>
                Apply Online
              </Link>
              <Link href={tenantUrl('/student-fees')} className={navLinkClass}>
                Tuition Fees
              </Link>
              <Link href={tenantUrl('/results')} className={navLinkClass}>
                Results Archive
              </Link>
              <Link href={tenantUrl('/clubs')} className={navLinkClass}>
                Clubs &amp; Societies
              </Link>
            </div>
          </div>

          {/* Col 4: Faculty & Campus */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Campus Life
            </h3>
            <div className={linkColClass}>
              <Link href={tenantUrl('/teachers')} className={navLinkClass}>
                Faculty Roster
              </Link>
              <Link href={tenantUrl('/staffs')} className={navLinkClass}>
                Staff Directory
              </Link>
              <Link href={tenantUrl('/notices')} className={navLinkClass}>
                Official Notices
              </Link>
              <Link href={tenantUrl('/events')} className={navLinkClass}>
                Academic Calendar
              </Link>
              <Link href={tenantUrl('/news')} className={navLinkClass}>
                News &amp; Media
              </Link>
              <Link href={tenantUrl('/gallery')} className={navLinkClass}>
                Campus Gallery
              </Link>
            </div>
          </div>

          {/* Col 5: Institutional Verification & Portals */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Verification &amp; Portals
            </h3>
            <div className={linkColClass}>
              <Link href={tenantUrl('/verify-student')} className={navLinkClass}>
                Verify Student
              </Link>
              <Link href={tenantUrl('/verify-id-card')} className={navLinkClass}>
                Verify ID Card
              </Link>
              <Link href={tenantUrl('/verify-testimonial')} className={navLinkClass}>
                Verify Testimonial
              </Link>
              <Link href={tenantUrl('/verify-tc')} className={navLinkClass}>
                Verify Transfer Cert
              </Link>
              <Link href={tenantUrl('/auth/student')} className={navLinkClass}>
                Student Portal
              </Link>
              <Link href={tenantUrl('/auth/access')} className={navLinkClass}>
                Staff &amp; Teacher Login
              </Link>
            </div>
          </div>
        </div>

        {/* Middle Tier: Map if present */}
        {mapUrl && (
          <div className="w-full aspect-[21/9] max-h-52 rounded border border-slate-800 overflow-hidden bg-slate-800">
            {renderFooterMap()}
          </div>
        )}

        {/* Bottom Tier: Copyright & Disclaimers */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Copyright &copy; {new Date().getFullYear()} {schoolName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href={tenantUrl('/policies')} className="hover:text-slate-400 transition-colors">
              Campus Policies
            </Link>
            <Link href={tenantUrl('/faqs')} className="hover:text-slate-400 transition-colors">
              FAQs
            </Link>
            <Link href={tenantUrl('/contact')} className="hover:text-slate-400 transition-colors">
              Contact Office
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;