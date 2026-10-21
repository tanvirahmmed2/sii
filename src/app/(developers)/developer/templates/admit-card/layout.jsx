import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Admit Card Templates | Developer Studio | ${SITE_NAME}`,
  description: `Design and customize institutional admission exam admit card and hall ticket vector layouts on ${SITE_NAME}.`,
};

export default function AdmitCardTemplatesLayout({ children }) {
  return <>{children}</>;
}
