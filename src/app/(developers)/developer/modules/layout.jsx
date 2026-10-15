import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `System Modules & Access Control | Developer Portal | ${SITE_NAME}`,
  description: `Configure platform system modules, endpoints, and developer access permissions on ${SITE_NAME}.`,
};

export default function DeveloperModulesLayout({ children }) {
  return <>{children}</>;
}
