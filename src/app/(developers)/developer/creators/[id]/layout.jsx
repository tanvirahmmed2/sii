import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Creator Full Details | ${SITE_NAME}`,
  description: `Comprehensive portfolio creator details, subscription history, hosted websites, and audit logs.`,
};

export default async function CreatorDetailsLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'creators');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}
