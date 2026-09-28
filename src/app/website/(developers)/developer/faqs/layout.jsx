import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `FAQs Management | ${SITE_NAME}`,
  description: `Manage platform help articles and frequently asked questions on ${SITE_NAME}.`,
};

export default async function FaqsLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'faqs');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}
