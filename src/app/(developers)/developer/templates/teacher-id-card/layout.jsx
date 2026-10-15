import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Faculty ID Card Templates | Developer Portal | ${SITE_NAME}`,
  description: `Design printable faculty and staff identity cards with institutional branding on ${SITE_NAME}.`,
};

export default function DeveloperTemplateTeacherIDLayout({ children }) {
  return <>{children}</>;
}
