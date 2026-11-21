import { redirect } from 'next/navigation';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Platform Blogs | ${SITE_NAME}`,
    description: `Create and publish editorial blog posts, technical guides, and announcements on ${SITE_NAME}.`,
};
export default async function BlogsLayout({ children }: any) {
    const auth = await hasModulePermission(undefined, 'blogs');
    if (!auth || !auth.success) {
        redirect('/developer');
    }
    return <>{children}</>;
}
