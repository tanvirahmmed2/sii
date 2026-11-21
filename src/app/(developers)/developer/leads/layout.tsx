import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Leads Pipeline | ${SITE_NAME}`,
    description: `Manage prospective leads, marketing conversions, and prospective creators on ${SITE_NAME}.`,
};
export default async function LeadsLayout({ children }: any) {
    const auth = await hasModulePermission(undefined, 'leads');
    if (!auth || !auth.success) {
        redirect('/developer');
    }
    return <>{children}</>;
}
