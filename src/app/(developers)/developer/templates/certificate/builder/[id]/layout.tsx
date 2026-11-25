import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Certificate Template Studio | Developer Portal | ${SITE_NAME}`,
  description: `Visual canvas builder for graduation certificates and achievement diplomas on ${SITE_NAME}.`,
};

export default function DeveloperCertificateStudioLayout({ children }: any) {
  return <>{children}</>;
}
