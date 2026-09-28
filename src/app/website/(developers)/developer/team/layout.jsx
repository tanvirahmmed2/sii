import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Developer Team | ${SITE_NAME}`,
  description: `Manage platform administrator team on ${SITE_NAME}.`,
};

export default async function AdminTeamLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'team');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}
