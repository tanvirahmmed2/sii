'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Footer = () => {
  const {
    website,
    departments,
    websiteSettings,
    tenantUrl,
    isDark,
    toggleTheme,
    secondaryColor,
  } = useContext(TenantWebsiteContext);

  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;
  const phone = website?.contact_phone || websiteSettings?.contact_phone || '';
  const email = website?.contact_email || websiteSettings?.contact_email || '';
  const address = website?.address || websiteSettings?.address || '';
  const eiin = website?.eiin_number || websiteSettings?.eiin || '';
  const mapUrl = websiteSettings?.map_url || null;

  // Secondary brand background color
  const footerBg = secondaryColor || website?.secondary_color || '#0f172a';

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

  const linkColClass = 'flex flex-col space-y-2 text-xs';
  const navLinkClass =
    'text-white/80 hover:text-white transition-colors duration-150 py-0.5 inline-flex items-center gap-1.5';

  return (
    <footer
      className="w-full text-white/90 border-t border-white/10 transition-colors"
      style={{ backgroundColor: footerBg }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 space-y-10 max-w-7xl mx-auto">
        {/* Top Tier: Institution Profile & Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1 & 2: Institution Meta */}
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-1.5">
              <span className="text-lg font-bold text-white tracking-tight">
                {schoolName}
              </span>
              {eiin && (
                <p className="text-xs font-mono text-white/70">
                  Government EIIN: {eiin}
                </p>
              )}
            </div>

            <p className="text-xs text-white/75 leading-relaxed max-w-sm">
              Committed to academic excellence, innovative pedagogy, and developing future-ready leaders. Official institutional management portal and digital registry.
            </p>

            <div className="space-y-1.5 text-xs text-white/75 pt-1">
              {address && (
                <p className="flex items-start gap-1.5">
                  <span className="font-semibold text-white">Address:</span>
                  <span>{address}</span>
                </p>
              )}
              {phone && (
                <p className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Telephone:</span>
                  <span>{phone}</span>
                </p>
              )}
              {email && (
                <p className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Email:</span>
                  <span>{email}</span>
                </p>
              )}
            </div>

            {/* Theme Switcher */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-white/20 text-white/90 hover:bg-white/10 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              >
                <span>{isDark ? '☀ Switch to Light Mode' : '☾ Switch to Dark Mode'}</span>
              </button>
            </div>
          </div>

          {/* Col 3: Academic Departments & Admissions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/15 pb-1.5">
              Academic Departments
            </h3>
            <div className={linkColClass}>
              <Link href={tenantUrl('/departments')} className={`${navLinkClass} font-semibold text-white`}>
                All Departments &rarr;
              </Link>
              {departments && departments.slice(0, 3).map((dept) => (
                <Link
                  key={dept.id}
                  href={tenantUrl(`/departments/${dept.id}`)}
                  className={navLinkClass}
                >
                  {dept.name}
                </Link>
              ))}
              <Link href={tenantUrl('/admission')} className={navLinkClass}>
                Admission Circular
              </Link>
              <Link href={tenantUrl('/admission/apply')} className={navLinkClass}>
                Apply Online
              </Link>
              <Link href={tenantUrl('/student-fees')} className={navLinkClass}>
                Tuition Fees Schedule
              </Link>
              <Link href={tenantUrl('/results')} className={navLinkClass}>
                Examination Results
              </Link>
            </div>
          </div>

          {/* Col 4: Campus Life */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/15 pb-1.5">
              Campus Life
            </h3>
            <div className={linkColClass}>
              <Link href={tenantUrl('/teachers')} className={navLinkClass}>
                Faculty Members
              </Link>
              <Link href={tenantUrl('/clubs')} className={navLinkClass}>
                Clubs &amp; Societies
              </Link>
              <Link href={tenantUrl('/notices')} className={navLinkClass}>
                Official Notices
              </Link>
              <Link href={tenantUrl('/events')} className={navLinkClass}>
                Campus Events
              </Link>
              <Link href={tenantUrl('/news')} className={navLinkClass}>
                News &amp; Updates
              </Link>
              <Link href={tenantUrl('/gallery')} className={navLinkClass}>
                Campus Gallery
              </Link>
              <Link href={tenantUrl('/facilities')} className={navLinkClass}>
                Campus Facilities
              </Link>
            </div>
          </div>

          {/* Col 5: Verification & Portals */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/15 pb-1.5">
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

        {/* Middle Tier: Campus Map (if configured) */}
        {mapUrl && (
          <div className="w-full aspect-[21/9] max-h-52 rounded-xl border border-white/15 overflow-hidden bg-black/20 shadow-md">
            {renderFooterMap()}
          </div>
        )}

        {/* Bottom Tier: Copyright & Disclaimers */}
        <div className="pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70">
          <p>
            Copyright &copy; {new Date().getFullYear()} {schoolName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={tenantUrl('/about')} className="hover:text-white transition-colors">
              About Us
            </Link>
            <Link href={tenantUrl('/policies')} className="hover:text-white transition-colors">
              Campus Policies
            </Link>
            <Link href={tenantUrl('/faqs')} className="hover:text-white transition-colors">
              FAQs
            </Link>
            <Link href={tenantUrl('/contact')} className="hover:text-white transition-colors">
              Contact Office
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;