import { redirect } from 'next/navigation';
import { hasModulePermission } from '@/lib/middleware/developer';

export default async function AdminAdminsLayout({ children }) {
  const auth = await hasModulePermission(undefined, 'developers');
  if (!auth || !auth.success) {
    redirect('/developer');
  }

  return <>{children}</>;
}
