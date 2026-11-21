import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Verify Staff Account | ${SITE_NAME} Developer Portal`,
    description: `Verify administrator email and activate developer account on ${SITE_NAME}.`,
};
export default function VerifyLayout({ children }: any) {
    return <>{children}</>;
}
