import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Team & Real-Time Chats | Developer Portal | ${SITE_NAME}`,
    description: `Manage internal communications, team channels, and direct messaging on ${SITE_NAME}.`,
};
export default function DeveloperChatsLayout({ children }: any) {
    return <>{children}</>;
}
