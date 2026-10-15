import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Visual Template Builder Studio | Developer Portal | ${SITE_NAME}`,
  description: `Interactive visual template designer for certificates, IDs, and campus documents on ${SITE_NAME}.`,
};

export default function DeveloperTemplateBuilderLayout({ children }) {
  return <>{children}</>;
}
