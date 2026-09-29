import React from 'react';
import { TenantWebsiteProvider } from '@/component/helper/TenantWebsiteContext';
import { ContextProvider } from '@/component/helper/Context';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || 'institution';
  const cleanName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${cleanName} - Academic Portal`,
    description: `Official website and institutional management portal for ${cleanName}.`,
  };
}

export default async function TenantWebsiteMasterLayout({ children, params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || '';

  return (
    <TenantWebsiteProvider slug={slug}>
      <ContextProvider>
        <div className="tenant-institute-scope min-h-screen w-full flex flex-col bg-slate-50 text-slate-800 antialiased">
          {children}
        </div>
      </ContextProvider>
    </TenantWebsiteProvider>
  );
}
