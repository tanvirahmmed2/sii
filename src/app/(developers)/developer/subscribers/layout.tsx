import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Newsletter Subscribers | ${SITE_NAME}`,
    description: `Manage newsletter subscribers and marketing audience lists on ${SITE_NAME}.`,
};
export default async function SubscribersLayout({ children }: any) {
    const auth = await hasModulePermission(undefined, 'subscribers');
    if (!auth || !auth.success) {
        redirect('/developer');
    }
    return <>{children}</>;
}
