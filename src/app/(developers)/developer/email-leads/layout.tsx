import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Email Leads | ${SITE_NAME}`,
  description: `Send Redis-queued follow-ups and campaign emails to sales leads on ${SITE_NAME}.`,
};

export default async function EmailLeadsLayout({ children }: any) {
  const auth = await hasModulePermission(undefined, ['email-leads', 'emails', 'leads', 'marketing']);
  if (!auth || !auth.success) {
    redirect('/developer');
  }
  return <>{children}</>;
}
