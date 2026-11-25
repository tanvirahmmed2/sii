import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Developer Portal | ${SITE_NAME}`,
  description: `System administration, module governance, and engineering console for ${SITE_NAME}.`,
};

export default function DevelopersRootLayout({ children }: any) {
  return <>{children}</>;
}
