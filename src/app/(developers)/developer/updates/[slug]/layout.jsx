import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Update Notice Editor | Developer Portal | ${SITE_NAME}`,
  description: `Edit product changelog notices and platform release announcements on ${SITE_NAME}.`,
};

export default function DeveloperUpdateEditorLayout({ children }) {
  return <>{children}</>;
}
