import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Notices',
    description: `Explore Notices page at ${SCHOOL_NAME}.`,
};
export default function NoticesLayout({ children }: any) {
    return <>{children}</>;
}
