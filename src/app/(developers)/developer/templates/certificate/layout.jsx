import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Certificate Templates | Developer Portal | ${SITE_NAME}`,
  description: `Design and customize official academic certificates and distinction awards on ${SITE_NAME}.`,
};

export default function DeveloperTemplateCertificateLayout({ children }) {
  return <>{children}</>;
}
