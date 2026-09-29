import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Product Updates & Releases | ${SITE_NAME}`,
  description: `Publish and manage changelogs, feature drops, and system release announcements on ${SITE_NAME}.`,
};

export default async function UpdatesLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'updates');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}
