import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Platform Features | ${SITE_NAME}`,
  description: `Manage platform feature entitlements and plan capabilities on ${SITE_NAME}.`,
};

export default async function FeaturesLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'features');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}
