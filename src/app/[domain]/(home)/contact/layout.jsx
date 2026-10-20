import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Contact',
  description: `Get in touch with ${SCHOOL_NAME} for support, inquiries, and admissions.`,
};

export default function ContactLayout({ children }) {
  return <>{children}</>;
}
