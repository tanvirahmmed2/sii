import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Creator Console | ${SITE_NAME}`,
  description: `Manage your digital institutions, workspaces, subscriptions, and web properties on ${SITE_NAME}.`,
};

export default function CreatorRootLayout({ children }: any) {
  return <>{children}</>;
}
