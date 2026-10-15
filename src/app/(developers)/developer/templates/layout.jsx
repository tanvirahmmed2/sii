import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Design Templates Studio | Developer Portal | ${SITE_NAME}`,
  description: `Browse and manage institutional document and graphic design templates on ${SITE_NAME}.`,
};

export default function DeveloperTemplatesLayout({ children }) {
  return <>{children}</>;
}
