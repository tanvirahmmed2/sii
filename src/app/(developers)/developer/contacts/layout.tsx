import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Contact Submissions | ${SITE_NAME}`,
    description: `Supervise public contact inquiries and client messages on ${SITE_NAME}.`,
};
export default async function ContactsLayout({ children }: any) {
    const auth = await hasModulePermission(undefined, 'contacts');
    if (!auth || !auth.success) {
        redirect('/developer');
    }
    return <>{children}</>;
}
