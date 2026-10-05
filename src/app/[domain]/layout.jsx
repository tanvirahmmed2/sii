import React from 'react';
import { notFound } from 'next/navigation';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { TenantWebsiteProvider } from 'src/component/helper/WebsiteContext';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const website = await resolveWebsiteFromRequest(null, { params: resolvedParams });

  if (!website || website.is_active === false) {
    return {
      title: '404 - Page Not Found | Campus Portal',
      description: 'The requested campus website or institution portal does not exist.',
    };
  }

  const cleanName = website.name || resolvedParams?.domain || 'Academic Portal';
  return {
    title: `${cleanName} - Academic Portal`,
    description: website.settings?.motto || `Official website and institutional management portal for ${cleanName}.`,
  };
}

export default async function TenantWebsiteMasterLayout({ children, params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.domain || resolvedParams?.slug || '';

  // Validate tenant website strictly against database (subdomain, custom domain, or preview slug)
  const website = await resolveWebsiteFromRequest(null, { params: resolvedParams });

  // If the website does not match a valid active tenant in the database, show the not found page
  if (!website || website.is_active === false) {
    notFound();
  }

  return (
    <TenantWebsiteProvider slug={slug} initialWebsite={website}>
      <div className="tenant-institute-scope min-h-screen w-full flex flex-col bg-slate-50 text-slate-800 antialiased">
        {children}
      </div>
    </TenantWebsiteProvider>
  );
}
