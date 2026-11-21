import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Staff Login | ${SITE_NAME} Developer Portal`,
    description: `Login to access administrative and developer controls on ${SITE_NAME}.`,
};
export default function LoginLayout({ children }: any) {
    return <>{children}</>;
}
