import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Hosted Websites | ${SITE_NAME}`,
    description: `Manage your active portfolio websites, custom domains, and templates on ${SITE_NAME}.`,
};
export default function CreatorWebitesLayout({ children }: any) {
    return <>{children}</>;
}
