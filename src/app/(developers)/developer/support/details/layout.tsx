import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Support Incident Information | Developer Portal | ${SITE_NAME}`,
    description: `Comprehensive support incident breakdown, logs, and resolution audit trail on ${SITE_NAME}.`,
};
export default function DeveloperSupportDetailsLayout({ children }: any) {
    return <>{children}</>;
}
