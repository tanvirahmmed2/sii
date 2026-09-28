import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';
import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Company Policies Management | ${SITE_NAME}`,
  description: `Manage platform legal documents, terms of service, privacy policy, and compliance standards on ${SITE_NAME}.`,
};

export default async function PoliciesLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'policies');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}
