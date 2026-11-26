import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Email Developers | ${SITE_NAME}`,
  description: `Send Redis-queued engineering advisories and team emails to developers on ${SITE_NAME}.`,
};

export default async function EmailDevelopersLayout({ children }: any) {
  const auth = await hasModulePermission(undefined, ['email-developers', 'emails', 'developers', 'marketing']);
  if (!auth || !auth.success) {
    redirect('/developer');
  }
  return <>{children}</>;
}
