import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `FAQs Management | ${SITE_NAME}`,
    description: `Manage platform help articles and frequently asked questions on ${SITE_NAME}.`,
};
export default async function FaqsLayout({ children }: any) {
    const auth = await hasModulePermission(undefined, 'faqs');
    if (!auth || !auth.success) {
        redirect('/developer');
    }
    return <>{children}</>;
}
