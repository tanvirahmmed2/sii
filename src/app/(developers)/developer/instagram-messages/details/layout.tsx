import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Instagram Conversation Details | Developer Portal | ${SITE_NAME}`,
    description: `View full Instagram conversation transcript, media attachments, and customer replies on ${SITE_NAME}.`,
};
export default function DeveloperInstagramDetailsLayout({ children }: any) {
    return <>{children}</>;
}
