import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Changelog & Platform Updates | ${SITE_NAME}`,
    description: `Latest features, bug fixes, and improvements for creators on ${SITE_NAME}.`,
};
export default function CreatorUpdatesLayout({ children }: any) {
    return <>{children}</>;
}
