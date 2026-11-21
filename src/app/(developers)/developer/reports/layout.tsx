import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Issue Reports | ${SITE_NAME}`,
    description: `Investigate community reports, website abuse notices, and flags on ${SITE_NAME}.`,
};
export default async function ReportsLayout({ children }: any) {
    const auth = await hasModulePermission(undefined, 'reports');
    if (!auth || !auth.success) {
        redirect('/developer');
    }
    return <>{children}</>;
}
