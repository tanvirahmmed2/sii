import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Product Update Notice | ${SITE_NAME}`,
    description: `Read about this recent product update and improvement on ${SITE_NAME}.`,
};
export default function HomeUpdateNoticeLayout({ children }: any) {
    return <>{children}</>;
}
