import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Creator Purchases | ${SITE_NAME}`,
    description: `Manage platform package purchases, orders, and subscriptions on ${SITE_NAME}.`,
};
export default async function PurchasesLayout({ children }: any) {
    const auth = await hasModulePermission(undefined, ['purchases', 'payments']);
    if (!auth || !auth.success) {
        redirect('/developer');
    }
    return <>{children}</>;
}
