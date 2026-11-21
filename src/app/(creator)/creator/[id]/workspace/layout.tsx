import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Creator Workspace | ${SITE_NAME}`,
    description: `Manage your deployed educational websites, custom domains, visual styling, and package subscriptions.`,
};
export default function CreatorWorkspaceLayout({ children }: any) {
    return <>{children}</>;
}
