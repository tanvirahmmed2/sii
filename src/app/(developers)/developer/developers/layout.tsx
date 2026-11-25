import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Developer Team Management | ${SITE_NAME}`,
  description: `Manage platform developers, role assignments, and access privileges on ${SITE_NAME}.`,
};

export default async function AdminAdminsLayout({ children }: any) {
  const auth = await hasModulePermission(undefined, 'developers');
  if (!auth || !auth.success) {
    redirect('/developer');
  }
  return <>{children}</>;
}
