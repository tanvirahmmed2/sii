import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Development Tasks & Workflows | Developer Portal | ${SITE_NAME}`,
    description: `Manage development sprints, bug tracking, and operational tasks on ${SITE_NAME}.`,
};
export default function DeveloperTasksLayout({ children }: any) {
    return <>{children}</>;
}
