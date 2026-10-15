import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Student ID Card Templates | Developer Portal | ${SITE_NAME}`,
  description: `Configure printable student ID card layouts, QR code placement, and styles on ${SITE_NAME}.`,
};

export default function DeveloperTemplateStudentIDLayout({ children }) {
  return <>{children}</>;
}
