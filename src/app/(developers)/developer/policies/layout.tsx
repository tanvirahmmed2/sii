import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Company Policies Management | ${SITE_NAME}`,
    description: `Manage platform legal documents, terms of service, privacy policy, and compliance standards on ${SITE_NAME}.`,
};
export default async function PoliciesLayout({ children }: any) {
    const auth = await hasModulePermission(undefined, 'policies');
    if (!auth || !auth.success) {
        redirect('/developer');
    }
    return <>{children}</>;
}
