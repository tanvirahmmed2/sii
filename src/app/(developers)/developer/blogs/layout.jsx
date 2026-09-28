import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Platform Blogs | ${SITE_NAME}`,
  description: `Create and publish editorial blog posts, technical guides, and announcements on ${SITE_NAME}.`,
};

export default async function BlogsLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'blogs');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}
